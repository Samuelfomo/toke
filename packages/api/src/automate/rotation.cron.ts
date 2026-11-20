import { CycleUnit, Direction, TimezoneConfigUtils } from '@toke/shared';
import { Op, Transaction } from 'sequelize';
import TenantManager from '../tenant/database/db.tenant-manager.js';

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
// Chaque assignation est relue FOR UPDATE dans sa propre transaction.
// Les règles d'éligibilité et le modulo restent inchangés. Les lectures du
// groupe/slots, l'UPDATE et le journal utilisent explicitement cette transaction.
// Les résultats ne sont publiés qu'après commit ; aucun retry automatique.
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

  // Keep the existing initial missing-group check; transaction decisions below
  // always use fresh rows, never these preloaded objects.
  const groupIds = [
    ...new Set(
      activeAssignments
        .map((assignment) => assignment.getRotationGroup())
        .filter((id): id is number => id != null),
    ),
  ];
  if (groupIds.length > 0) {
    const groups = await RotationGroup._list({ id: { [Op.in]: groupIds } });
    if (!groups) throw new Error('Failed to load rotation groups');
  }

  const sequelize = TenantManager.getConnectionSync();
  for (const candidate of activeAssignments) {
    const assignmentId = candidate.getId();
    if (!assignmentId) {
      result.skipped++;
      continue;
    }
    try {
      const publications: Array<() => void> = [];
      const publishAfterCommit = (publish: () => void) => {
        publications.push(publish);
      };
      const advanced = await sequelize.transaction(
        { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
        async (transaction) => {
          // A concurrent worker may have committed since the initial list.
          const assignment = await RotationAssignment._loadForRotation(assignmentId, transaction);
          if (!assignment || assignment.getLastAdvancedDate() === todayStr) return false;
          const groupId = assignment.getRotationGroup();
          const rotationGroup =
            groupId != null ? await RotationGroup._loadForRotation(groupId, transaction) : null;
          if (!rotationGroup || !rotationGroup.getAutoAdvance()) return false;

          const cycleUnit = rotationGroup.getCycleUnit();
          const direction = rotationGroup.getDirection() ?? Direction.FORWARD;
          const rotationStep = rotationGroup.getRotationStep();
          if (
            !cycleUnit ||
            !rotationStep ||
            !shouldAdvanceToday(cycleUnit, rotationStep, rotationGroup.getStartDate(), executedAt)
          )
            return false;
          const templateCount = await rotationGroup.getCycleSlotCountForRotation(transaction);
          if (templateCount < 1) return false;
          const previousOffset = assignment.getOffset() ?? 0;
          const newOffset = computeNextOffset(previousOffset, templateCount, direction);
          const updated = await assignment.applyRotationOffset(
            newOffset,
            todayStr,
            transaction,
            publishAfterCommit,
          );
          if (!updated)
            throw new Error(`Failed to apply rotation offset for assignment #${assignmentId}`);
          await new RotationAssignmentLog()
            .setRotationAssignment(assignmentId)
            .setPreviousOffset(previousOffset)
            .setNewOffset(newOffset)
            .setCycleLength(templateCount)
            .setExecutedAt(executedAt)
            .save(transaction, publishAfterCommit);
          return true;
        },
      );
      // Only a confirmed managed commit permits memory/counter publication.
      if (advanced) {
        publications.forEach((publish) => publish());
        result.processed++;
      } else result.skipped++;
    } catch (error: any) {
      // Includes commit-acknowledgement failures: report, never replay here.
      const reason = error?.message ?? String(error);
      console.error(`[RotationCron] Assignment #${assignmentId} failed: ${reason}`);
      result.failed++;
      result.errors.push({ assignmentId, reason });
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
