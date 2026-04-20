import { CycleUnit, Direction, TimezoneConfigUtils } from '@toke/shared';

import RotationAssignment from '../tenant/class/RotationAssignments.js';
import RotationAssignmentLog from '../tenant/class/RotationAssignmentLog.js';
import RotationGroup from '../tenant/class/RotationGroups.js';

// ============================================================
// ROTATION CRON JOB
// ============================================================
// Tourne chaque jour à minuit (Africa/Douala).
//
// RÔLE DE CHAQUE ATTRIBUT DU ROTATIONGROUP :
//
//   auto_advance   → verrou on/off du cron pour ce groupe.
//                    false = contrôle manuel uniquement, le cron ne touche rien.
//
//   start_date     → point de départ absolu du cycle.
//                    Tant que today <= start_date, aucun avancement.
//
//   cycle_unit     → unité de temps de base : DAY ou WEEK.
//                    Définit la granularité du décompte.
//
//   rotation_step  → FRÉQUENCE uniquement (pas un déplacement).
//                    Nombre d'unités (jours ou semaines) à attendre
//                    entre deux avancements.
//                    Ex : step=1 + DAY  → avance chaque jour
//                         step=3 + DAY  → avance tous les 3 jours
//                         step=2 + WEEK → avance toutes les 2 semaines
//                    Le déplacement dans le cycle est TOUJOURS de 1 slot.
//                    rotation_step ne contrôle QUE la fréquence.
//
//   direction      → sens de progression dans le cycle.
//                    FORWARD  : 0 → 1 → 2 → 0 → …
//                    BACKWARD : 0 → 2 → 1 → 0 → …
//
// RÔLE DE CHAQUE ATTRIBUT DE L'ASSIGNATION :
//
//   offset              → position actuelle de l'employé dans le cycle.
//                         Initialisé par le manager à la création.
//                         Maintenu exclusivement par ce cron ensuite.
//
//   last_advanced_date  → date 'YYYY-MM-DD' du dernier avancement.
//                         Garde-fou d'idempotence : si le cron tourne
//                         deux fois le même jour (restart PM2, etc.),
//                         le deuxième passage est ignoré.
//
// BORNE DE L'OFFSET :
//   templateCount = nombre réel de slots dans le cycle (RotationGroupTemplate).
//   C'est la SEULE borne valide pour le modulo.
//   cycle_length est décoratif/informatif — il n'est PAS utilisé ici.
//
// ORDRE DES GARDE-FOUS (du moins coûteux au plus coûteux en DB) :
//   1. last_advanced_date = today  → skip (lecture mémoire, zéro DB)
//   2. auto_advance = false        → skip (déjà en mémoire via groupMap)
//   3. start_date + rotation_step  → skip (calcul arithmétique pur)
//   4. templateCount < 1           → skip (requête DB — en dernier)
//
// OPTIMISATION N+1 :
//   Les groupes sont préchargés en une seule requête avant la boucle.
//   groupMap<groupId, RotationGroup> permet un lookup O(1) par assignation.
//   Coût : 2 requêtes fixes (assignations + groupes) au lieu de 1 + N.
// ============================================================

export interface RotationCronResult {
  executedAt: Date;
  processed: number;
  skipped: number;
  failed: number;
  errors: Array<{ assignmentId: number; reason: string }>;
}

export async function runRotationCron(): Promise<RotationCronResult> {
  const executedAt = TimezoneConfigUtils.getCurrentTime();

  // Date du jour normalisée 'YYYY-MM-DD'.
  // Clé d'idempotence comparée à last_advanced_date en DB.
  const todayStr = toDateOnly(executedAt);

  const result: RotationCronResult = {
    executedAt,
    processed: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  console.log(`[RotationCron] Starting — at=${executedAt.toISOString()} (today=${todayStr})`);

  // ── 1. Récupère toutes les assignations actives ──────────────────────────
  // active=true filtre les assignations non supprimées et actives.
  const activeAssignments = await RotationAssignment._list({ active: true });

  if (!activeAssignments || activeAssignments.length === 0) {
    console.log('[RotationCron] No active assignments found. Exiting.');
    return result;
  }

  console.log(`[RotationCron] Processing ${activeAssignments.length} active assignment(s)…`);

  // ── 2. Préchargement des groupes (fix N+1) ───────────────────────────────
  // Collecte les groupIds distincts depuis les assignations en mémoire.
  // Une seule requête DB pour tous les groupes nécessaires.
  // Résultat : 2 requêtes fixes (assignations + groupes) au lieu de 1 + N.
  //
  // Pourquoi filter sur null : getRotationGroupId() peut retourner undefined
  // si l'assignation est orpheline — on exclut ces IDs invalides avant
  // de construire la Map pour éviter une clé `undefined` silencieuse.
  const groupIds = [
    ...new Set(
      activeAssignments.map((a) => a.getRotationGroup()).filter((id): id is number => id != null),
    ),
  ];

  const groupMap = new Map<number, InstanceType<typeof RotationGroup>>();

  if (groupIds.length > 0) {
    const groups = await RotationGroup._list({ ids: groupIds });
    if (!groups) throw new Error('Failed to load rotation groups');
    for (const g of groups) {
      const gId = g.getId();
      if (gId != null) groupMap.set(gId, g);
    }
  }

  console.log(
    `[RotationCron] Loaded ${groupMap.size} rotation group(s) for ${activeAssignments.length} assignment(s).`,
  );

  // ── 3. Itère sur chaque assignation ─────────────────────────────────────
  for (const assignment of activeAssignments) {
    const assignmentId = assignment.getId();

    if (!assignmentId) {
      result.skipped++;
      continue;
    }

    try {
      // ── Garde-fou 1 : idempotence ────────────────────────────────────
      // Comparaison en mémoire, zéro requête DB.
      // Protège contre le double avancement si PM2 redémarre le worker
      // après minuit le même jour (la valeur vient de l'hydratation
      // initiale — pas de re-fetch nécessaire).
      const lastAdvancedDate = assignment.getLastAdvancedDate();
      if (lastAdvancedDate === todayStr) {
        console.log(
          `[RotationCron] Assignment #${assignmentId}: ` +
            `already advanced today (${todayStr}). Skipping.`,
        );
        result.skipped++;
        continue;
      }

      // ── Lookup du groupe (O(1), zéro DB) ─────────────────────────────
      // Remplace l'ancien assignment.getRotationGroupObj() (1 requête/iter).
      // Si le groupId est manquant ou absent de la Map, l'assignation est
      // orpheline — on skip avec un warning explicite.
      const groupId = assignment.getRotationGroup();
      const rotationGroup = groupId != null ? groupMap.get(groupId) : undefined;

      if (!rotationGroup) {
        console.warn(
          `[RotationCron] Assignment #${assignmentId}: no rotation group found (groupId=${groupId}). Skipping.`,
        );
        result.skipped++;
        continue;
      }

      // ── Garde-fou 2 : auto_advance ───────────────────────────────────
      // Si le manager a désactivé l'avancement automatique sur ce groupe,
      // le cron ne doit PAS intervenir — contrôle 100% manuel.
      if (!rotationGroup.getAutoAdvance()) {
        console.log(
          `[RotationCron] Assignment #${assignmentId}: ` +
            `auto_advance=false on group "${rotationGroup.getName()}". Skipping.`,
        );
        result.skipped++;
        continue;
      }

      // ── Récupération des paramètres du cycle ─────────────────────────
      const cycleUnit = rotationGroup.getCycleUnit();
      const direction = rotationGroup.getDirection() ?? Direction.FORWARD;

      // rotation_step = FRÉQUENCE uniquement.
      // Répond à "tous les combien d'unités on avance".
      // Ne répond PAS à "de combien de slots on saute" (toujours 1).
      // getRotationStep() retourne toujours >= 1 (défaut garanti par le getter).
      const rotationStep = rotationGroup.getRotationStep();

      if (!cycleUnit) {
        console.warn(`[RotationCron] Assignment #${assignmentId}: missing cycleUnit. Skipping.`);
        result.skipped++;
        continue;
      }

      if (!rotationStep) {
        console.warn(`[RotationCron] Assignment #${assignmentId}: missing rotationStep. Skipping.`);
        result.skipped++;
        continue;
      }

      // ── Garde-fou 3 : start_date + rotation_step ─────────────────────
      // shouldAdvanceToday() réunit les deux conditions en un seul calcul
      // car elles partagent le même diffDays :
      //   A. diffDays > 0       → le cycle a commencé
      //   B. diffDays % step === 0 → c'est le bon intervalle
      // Aucune requête DB — calcul arithmétique pur.
      if (!shouldAdvanceToday(cycleUnit, rotationStep, rotationGroup.getStartDate(), executedAt)) {
        console.log(
          `[RotationCron] Assignment #${assignmentId}: not time to advance ` +
            `(unit=${cycleUnit}, step=${rotationStep}, ` +
            `start=${rotationGroup.getStartDate()}). Skipping.`,
        );
        result.skipped++;
        continue;
      }

      // ── Garde-fou 4 : cycle non vide ─────────────────────────────────
      // Requête DB placée en dernier, après tous les checks sans coût DB,
      // pour minimiser les accès inutiles.
      // templateCount est la borne réelle du modulo d'offset.
      // cycle_length n'est PAS utilisé ici — il est décoratif/informatif.
      const slots = await rotationGroup.getCycleSlots();
      const templateCount = slots.length;

      if (templateCount < 1) {
        console.warn(
          `[RotationCron] Assignment #${assignmentId}: ` + `no templates in cycle. Skipping.`,
        );
        result.skipped++;
        continue;
      }

      // ── Calcul du nouvel offset ───────────────────────────────────────
      // Séparation claire des responsabilités :
      //   shouldAdvanceToday  → QUAND avancer  (fréquence via rotation_step)
      //   computeNextOffset   → OÙ atterrir    (déplacement = 1, sens = direction)
      //
      // rotation_step n'a AUCUN rôle ici — il a déjà été consommé
      // par shouldAdvanceToday(). Le déplacement est toujours de 1 slot.
      //
      // Illustrations avec templateCount=3 :
      //   FORWARD  : 0→1, 1→2, 2→0  (boucle avant)
      //   BACKWARD : 0→2, 2→1, 1→0  (boucle arrière)
      const previousOffset = assignment.getOffset() ?? 0;
      const newOffset = computeNextOffset(previousOffset, templateCount, direction);

      // ── Application atomique ──────────────────────────────────────────
      // Une seule requête UPDATE : offset + last_advanced_date ensemble.
      // Bypass de validate() intentionnel — le cron modifie uniquement
      // la position dans le cycle, jamais la configuration de l'assignation.
      const updated = await assignment.applyRotationOffset(newOffset, todayStr);
      if (!updated) {
        throw new Error(`Failed to apply rotation offset for assignment #${assignmentId}`);
      }

      // ── Log immuable ──────────────────────────────────────────────────
      // setTemplateCount reçoit templateCount (borne réelle des slots),
      // PAS cycle_length qui est décoratif et peut être null.
      const log = new RotationAssignmentLog();
      log
        .setRotationAssignment(assignmentId)
        .setPreviousOffset(previousOffset)
        .setNewOffset(newOffset)
        // .setTemplateCount(templateCount) // borne réelle du cycle, ≠ cycle_length
        .setExecutedAt(executedAt);

      await log.save();

      console.log(
        `[RotationCron] Assignment #${assignmentId}: ` +
          `offset ${previousOffset} → ${newOffset} ` +
          `(templates=${templateCount}, unit=${cycleUnit}, ` +
          `step=${rotationStep}, direction=${direction})`,
      );

      result.processed++;
    } catch (error: any) {
      const reason = error?.message ?? String(error);
      console.error(`[RotationCron] Assignment #${assignmentId} failed: ${reason}`);
      result.failed++;
      result.errors.push({ assignmentId, reason });
      // Une erreur sur une assignation ne bloque PAS les suivantes.
    }
  }

  // ── 4. Résumé ────────────────────────────────────────────────────────────
  console.log(
    `[RotationCron] Done — ` +
      `processed=${result.processed}, ` +
      `skipped=${result.skipped}, ` +
      `failed=${result.failed}`,
  );

  return result;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Détermine si ce passage du cron doit faire avancer l'offset.
 *
 * Évalue deux conditions dans un seul calcul (même diffDays) :
 *   A. Le cycle a-t-il commencé ?     diffDays > 0
 *   B. Est-ce le bon intervalle ?     diffDays % (step × unitDays) === 0
 *
 * rotation_step contrôle UNIQUEMENT la FRÉQUENCE d'avancement.
 * Il ne détermine PAS le nombre de slots sautés — toujours 1 (voir computeNextOffset).
 *
 * Exemples :
 *   DAY  + step=1 → J+1, J+2, J+3…          (chaque jour)
 *   DAY  + step=3 → J+3, J+6, J+9…          (tous les 3 jours)
 *   WEEK + step=1 → J+7, J+14, J+21…        (chaque semaine)
 *   WEEK + step=2 → J+14, J+28, J+42…       (toutes les 2 semaines)
 *
 * Pourquoi diffDays <= 0 exclut J0 :
 *   Le premier avancement a lieu à J+step, pas le jour du démarrage.
 *   Un manager peut créer une rotation en avance sans risque d'avancement
 *   prématuré le jour même.
 *
 * Pourquoi Math.round() sur diffDays :
 *   Le passage heure été/hiver (DST) peut faire glisser diffMs de quelques
 *   millisecondes autour d'un multiple de 86 400 000. Sans Math.round(),
 *   un multiple exact pourrait manquer (diffDays = 6.9999… au lieu de 7).
 *
 * @param cycleUnit    - Unité de temps (DAY / WEEK)
 * @param rotationStep - Fréquence : nombre d'unités entre deux avancements (>= 1)
 * @param startDateStr - Date de départ du cycle 'YYYY-MM-DD'
 * @param executedAt   - Timestamp d'exécution du cron
 */
function shouldAdvanceToday(
  cycleUnit: CycleUnit,
  rotationStep: number,
  startDateStr: string | undefined,
  executedAt: Date,
): boolean {
  if (!startDateStr) return false;

  // Normalise à minuit — obligatoire car executedAt peut être 00:00:03
  // et startDateStr est une date pure sans heure.
  // Sans cette normalisation, diffMs serait légèrement positif à J0
  // et le garde-fou diffDays <= 0 ne fonctionnerait pas.
  //
  // Note : `new Date('YYYY-MM-DD')` est parsé en UTC par la spec ECMA-262.
  // Le setHours(0,0,0,0) qui suit corrige immédiatement l'écart en
  // ramenant à minuit heure locale — pas de bug en prod Africa/Douala.
  // Le suffixe 'T00:00:00' rend l'intention explicite sans changer
  // le comportement observable (setHours couvre les deux cas).
  const start = new Date(startDateStr + 'T00:00:00');
  start.setHours(0, 0, 0, 0);

  const today = new Date(executedAt);
  today.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Condition A : cycle non encore commencé.
  // diffDays = 0 → aujourd'hui = start_date → pas d'avancement J0.
  // diffDays < 0 → start_date dans le futur → pas d'avancement non plus.
  if (diffDays <= 0) return false;

  if (cycleUnit === CycleUnit.DAY) {
    // Condition B pour DAY :
    // Avance tous les `rotationStep` jours depuis start_date.
    // Ex : step=3, start=lundi → avance jeudi (J+3), dimanche (J+6)…
    return diffDays % rotationStep === 0;
  }

  // Condition B pour WEEK :
  // Avance tous les `rotationStep` × 7 jours depuis start_date.
  // Respecte le jour de la semaine du manager — pas un lundi fixe.
  // Ex : step=2, start=mercredi → avance 14 jours plus tard (un mercredi).
  return diffDays % (7 * rotationStep) === 0;
}

/**
 * Calcule la nouvelle position dans le cycle.
 *
 * SÉPARATION DES RESPONSABILITÉS — important :
 *   Cette fonction ne connaît PAS rotation_step et n'en a pas besoin.
 *   rotation_step a déjà joué son rôle dans shouldAdvanceToday() pour
 *   décider SI on avance aujourd'hui.
 *   Ici on décide uniquement OÙ on atterrit après l'avancement.
 *
 * Le déplacement est TOUJOURS de 1 slot, dans le sens de `direction`.
 * rotation_step ≠ nombre de slots sautés.
 *
 * Exemples avec templateCount=3 :
 *   FORWARD  : 0→1, 1→2, 2→0            (boucle avant)
 *   BACKWARD : 0→2, 2→1, 1→0            (boucle arrière)
 *
 * Pourquoi le double modulo ((x % n) + n) % n :
 *   En JavaScript, l'opérateur % peut retourner un négatif si x est négatif.
 *   Ex : (-1 % 3) === -1 en JS → index invalide dans le tableau de snapshots.
 *   Le double modulo corrige cela : ((-1 % 3) + 3) % 3 === 2 → dernier slot.
 *   Cas concret : BACKWARD depuis offset=0 → step=-1 → (-1+3)%3 = 2 ✅
 *
 * @param currentOffset  - Position actuelle dans le cycle (0-based)
 * @param templateCount  - Nombre total de slots (borne du modulo)
 * @param direction      - Sens de progression (FORWARD / BACKWARD)
 */
function computeNextOffset(
  currentOffset: number,
  templateCount: number,
  direction: Direction,
): number {
  // +1 pour FORWARD, -1 pour BACKWARD.
  // Déplacement toujours unitaire — rotation_step n'intervient pas ici.
  const step = direction === Direction.BACKWARD ? -1 : 1;
  return (((currentOffset + step) % templateCount) + templateCount) % templateCount;
}

/**
 * Convertit une Date en string 'YYYY-MM-DD' (timezone locale du process).
 *
 * N'utilise PAS toISOString() qui retourne toujours UTC — ce qui donnerait
 * la date de la veille à minuit en timezone UTC+1/+2 (Africa/Douala = UTC+1).
 * Ex : 2026-04-18T00:00:00+01:00 → toISOString() → "2026-04-17T23:00:00.000Z"
 *
 * Utilise les méthodes locales (getFullYear, getMonth, getDate) qui
 * respectent la timezone du process (TZ=Africa/Douala dans ecosystem.config).
 *
 * @param date - Date à convertir
 */
function toDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// import { CycleUnit, TimezoneConfigUtils } from '@toke/shared';
//
// import RotationAssignment from '../tenant/class/RotationAssignments.js';
// import RotationAssignmentLog from '../tenant/class/RotationAssignmentLog.js';
// import RotationGroup from '../tenant/class/RotationGroups.js';
//
// // ============================================================
// // ROTATION CRON JOB
// // ============================================================
// // Tourne chaque jour à minuit (Africa/Douala).
// // Pour chaque assignation active, décide si l'offset doit
// // avancer selon les règles du cycle, puis applique le changement.
// //
// // Règles d'avancement (shouldAdvanceToday) :
// //   DAY  → avance chaque jour APRÈS start_date
// //   WEEK → avance uniquement quand diffDays % 7 === 0
// //           (respecte le jour de départ du manager)
// //
// // Garde-fous :
// //   1. start_date  → skip si le cycle n'a pas encore commencé
// //   2. last_advanced_date → skip si déjà avancé aujourd'hui
// //      (protège contre le double avancement en cas de restart PM2)
// //
// // Correction offset :
// //   L'offset est borné par templateCount (nombre de slots dans le
// //   cycle), PAS par cycle_length (durée du cycle en jours/semaines).
// //   cycle_length = durée avant retour au début
// //   templateCount = nombre de postes distincts dans la rotation
// // ============================================================
//
// export interface RotationCronResult {
//   executedAt: Date;
//   processed: number;
//   skipped: number;
//   failed: number;
//   errors: Array<{ assignmentId: number; reason: string }>;
// }
//
// export async function runRotationCron(): Promise<RotationCronResult> {
//   const executedAt = TimezoneConfigUtils.getCurrentTime();
//
//   // Date du jour normalisée 'YYYY-MM-DD' — utilisée comme clé d'idempotence
//   const todayStr = toDateOnly(executedAt);
//
//   const result: RotationCronResult = {
//     executedAt,
//     processed: 0,
//     skipped: 0,
//     failed: 0,
//     errors: [],
//   };
//
//   console.log(`[RotationCron] Starting — at=${executedAt.toISOString()} (today=${todayStr})`);
//
//   // ── 1. Récupère toutes les assignations actives ──────────────────────────
//   const activeAssignments = await RotationAssignment._list({ active: true });
//
//   if (!activeAssignments || activeAssignments.length === 0) {
//     console.log('[RotationCron] No active assignments found. Exiting.');
//     return result;
//   }
//
//   // ── 2. Itère sur chaque assignation ─────────────────────────────────────
//   for (const assignment of activeAssignments) {
//     const assignmentId = assignment.getId();
//
//     if (!assignmentId) {
//       result.skipped++;
//       continue;
//     }
//
//     try {
//       // ── 2a. Garde-fou idempotence ──────────────────────────────────────
//       // Si le cron a déjà avancé cet assignment aujourd'hui (ex: restart PM2),
//       // on skip immédiatement sans toucher à la DB.
//       const lastAdvancedDate = assignment.getLastAdvancedDate();
//       if (lastAdvancedDate === todayStr) {
//         console.log(
//           `[RotationCron] Assignment #${assignmentId}: already advanced today (${todayStr}). Skipping.`,
//         );
//         result.skipped++;
//         continue;
//       }
//
//       // ── 2b. Charge le rotation group ──────────────────────────────────
//       const rotationGroup = await assignment.getRotationGroupObj();
//
//       if (!rotationGroup) {
//         console.warn(`[RotationCron] Assignment #${assignmentId}: no rotation group. Skipping.`);
//         result.skipped++;
//         continue;
//       }
//
//       const cycleUnit = rotationGroup.getCycleUnit();
//
//       if (!cycleUnit) {
//         console.warn(`[RotationCron] Assignment #${assignmentId}: missing cycleUnit. Skipping.`);
//         result.skipped++;
//         continue;
//       }
//
//       // ── 2c. Vérifie si ce passage doit faire avancer l'offset ─────────
//       const advance = shouldAdvanceToday(cycleUnit, rotationGroup, executedAt);
//
//       if (!advance) {
//         console.log(
//           `[RotationCron] Assignment #${assignmentId}: not yet time to advance ` +
//             `(cycleUnit=${cycleUnit}, start_date=${rotationGroup.getStartDate()}). Skipping.`,
//         );
//         result.skipped++;
//         continue;
//       }
//
//       // ── 2d. Charge les slots du cycle pour connaître templateCount ─────
//       // L'offset est borné par templateCount, PAS par cycle_length.
//       // Exemple : cycle_length=5 jours, 2 templates → offset ∈ {0, 1}
//       const slots = await rotationGroup.getCycleSlots();
//       const templateCount = slots.length;
//
//       if (templateCount < 1) {
//         console.warn(
//           `[RotationCron] Assignment #${assignmentId}: no templates in cycle. Skipping.`,
//         );
//         result.skipped++;
//         continue;
//       }
//
//       // ── 2e. Calcule le nouvel offset ──────────────────────────────────
//       const previousOffset = assignment.getOffset() ?? 0;
//       const newOffset = (previousOffset + 1) % templateCount;
//
//       // ── 2f. Applique l'offset + enregistre last_advanced_date ─────────
//       // Opération atomique — une seule requête UPDATE en DB.
//       const updated = await assignment.applyRotationOffset(newOffset, todayStr);
//       if (!updated) {
//         throw new Error(`Failed to apply rotation offset for assignment #${assignmentId}`);
//       }
//
//       // ── 2g. Log immuable ──────────────────────────────────────────────
//       const log = new RotationAssignmentLog();
//       log
//         .setRotationAssignment(assignmentId)
//         .setPreviousOffset(previousOffset)
//         .setNewOffset(newOffset)
//         .setCycleLength(templateCount) // on logue templateCount, la borne réelle
//         .setExecutedAt(executedAt);
//
//       await log.save();
//
//       console.log(
//         `[RotationCron] Assignment #${assignmentId}: offset ${previousOffset} → ${newOffset} ` +
//           `(templateCount=${templateCount}, cycleUnit=${cycleUnit})`,
//       );
//
//       result.processed++;
//     } catch (error: any) {
//       const reason = error?.message ?? String(error);
//       console.error(`[RotationCron] Assignment #${assignmentId} failed: ${reason}`);
//       result.failed++;
//       result.errors.push({ assignmentId, reason });
//       // Une erreur sur une assignation ne bloque pas les suivantes
//     }
//   }
//
//   // ── 3. Résumé ────────────────────────────────────────────────────────────
//   console.log(
//     `[RotationCron] Done — processed=${result.processed}, skipped=${result.skipped}, failed=${result.failed}`,
//   );
//
//   return result;
// }
//
// // ============================================================
// // HELPERS
// // ============================================================
//
// /**
//  * Détermine si ce passage du cron doit faire avancer l'offset.
//  *
//  * Règles :
//  *   1. diffDays <= 0 → start_date pas encore atteint → false
//  *   DAY  → true dès que diffDays >= 1
//  *   WEEK → true uniquement si diffDays % 7 === 0
//  *          (respecte le jour de départ du manager, pas un lundi fixe)
//  *
//  * Math.round() absorbe les micro-décalages DST (heure été/hiver).
//  */
// function shouldAdvanceToday(
//   cycleUnit: CycleUnit,
//   rotationGroup: RotationGroup,
//   executedAt: Date,
// ): boolean {
//   const startDateStr = rotationGroup.getStartDate();
//   if (!startDateStr) return false;
//
//   // Normalise les deux dates à minuit — élimine tout biais d'heure
//   const start = new Date(startDateStr);
//   start.setHours(0, 0, 0, 0);
//
//   const today = new Date(executedAt);
//   today.setHours(0, 0, 0, 0);
//
//   const diffMs = today.getTime() - start.getTime();
//   const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
//
//   // Le cycle n'a pas encore commencé
//   if (diffDays <= 0) return false;
//
//   if (cycleUnit === CycleUnit.DAY) {
//     return true;
//   }
//
//   // CycleUnit.WEEK — avance les jours anniversaires uniquement
//   return diffDays % 7 === 0;
// }
//
// /**
//  * Convertit une Date en string 'YYYY-MM-DD' (timezone locale).
//  * Utilisé pour la comparaison avec last_advanced_date (DATEONLY en DB).
//  */
// function toDateOnly(date: Date): string {
//   const y = date.getFullYear();
//   const m = String(date.getMonth() + 1).padStart(2, '0');
//   const d = String(date.getDate()).padStart(2, '0');
//   return `${y}-${m}-${d}`;
// }
