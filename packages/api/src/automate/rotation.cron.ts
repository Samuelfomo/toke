import { TimezoneConfigUtils } from '@toke/shared';

import RotationAssignment from '../tenant/class/RotationAssignments.js';
import RotationAssignmentLog from '../tenant/class/RotationAssignmentLog.js';

// ============================================================
// ROTATION CRON JOB
// ============================================================
// Ce cron agit comme un "assistant manager automatique".
// Il tourne chaque jour à minuit (Africa/Douala) et vérifie
// pour chaque assignation active si un nouveau cycle s'est
// écoulé depuis le dernier passage, en se basant sur le
// start_date du RotationGroup — pas sur un calendrier fixe.
//
// Exemple :
//   - Manager crée une rotation mercredi avec cycle_unit=week
//   - Le cron passera chaque nuit mais ne fera rien
//   - Le mercredi suivant à minuit : getCyclesElapsed() passe
//     de 0 à 1 → l'offset avance
//
// Tous les changements sont tracés dans RotationAssignmentLog.
// ============================================================

export interface RotationCronResult {
  executedAt: Date;
  processed: number;
  skipped: number;
  failed: number;
  errors: Array<{ assignmentId: number; reason: string }>;
}

/**
 * Fait avancer les assignations actives dont un cycle complet
 * s'est écoulé depuis le start_date de leur RotationGroup.
 *
 * La décision d'avancer repose sur getCyclesElapsed() comparé
 * à last_cycle_index stocké sur l'assignation — pas sur le
 * jour de la semaine ou le cycleUnit.
 */
export async function runRotationCron(): Promise<RotationCronResult> {
  const executedAt = TimezoneConfigUtils.getCurrentTime();

  const result: RotationCronResult = {
    executedAt,
    processed: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  console.log(`[RotationCron] Starting — at=${executedAt.toISOString()}`);

  // ── 1. Récupère toutes les assignations actives ──────────────────────────
  const activeAssignments = await RotationAssignment._list({ active: true });

  if (!activeAssignments || activeAssignments.length === 0) {
    console.log('[RotationCron] No active assignments found. Exiting.');
    return result;
  }

  // ── 2. Itère sur chaque assignation ─────────────────────────────────────
  for (const assignment of activeAssignments) {
    const assignmentId = assignment.getId();

    if (!assignmentId) {
      result.skipped++;
      continue;
    }

    try {
      // ── 2a. Charge le rotation group associé ──────────────────────────
      const rotationGroup = await assignment.getRotationGroupObj();

      if (!rotationGroup) {
        console.warn(`[RotationCron] Assignment #${assignmentId} has no rotation group. Skipping.`);
        result.skipped++;
        continue;
      }

      const cycleLength = rotationGroup.getCycleLength();

      if (!cycleLength || cycleLength < 1) {
        console.warn(
          `[RotationCron] Assignment #${assignmentId}: invalid cycle_length=${cycleLength}. Skipping.`,
        );
        result.skipped++;
        continue;
      }

      // ── 2b. Vérifie si un nouveau cycle s'est écoulé ──────────────────
      // getCyclesElapsed() calcule le nombre de cycles complets depuis
      // le start_date du group — indépendant du jour de la semaine
      const currentCycle = rotationGroup.getCyclesElapsed();
      const lastCycle = assignment.getLastCycleIndex();

      if (currentCycle <= lastCycle) {
        // Pas encore un cycle complet depuis le dernier passage
        result.skipped++;
        continue;
      }

      // ── 2c. Calcule le nouvel offset ──────────────────────────────────
      // Gère le cas où plusieurs cycles se sont écoulés d'un coup
      // (ex: cron arrêté quelques jours puis redémarré)
      const cyclesPassed = currentCycle - lastCycle;
      const previousOffset = assignment.getOffset() ?? 0;
      const newOffset = (previousOffset + cyclesPassed) % cycleLength;

      // ── 2d. Met à jour l'assignation ──────────────────────────────────
      assignment.setOffset(newOffset).setLastCycleIndex(currentCycle);
      await assignment.save();

      // ── 2e. Crée un log traçable ───────────────────────────────────────
      const log = new RotationAssignmentLog();
      log
        .setRotationAssignment(assignmentId)
        .setPreviousOffset(previousOffset)
        .setNewOffset(newOffset)
        .setCycleLength(cycleLength)
        .setExecutedAt(executedAt);

      await log.save();

      console.log(
        `[RotationCron] Assignment #${assignmentId}: offset ${previousOffset} → ${newOffset} ` +
          `(cyclesPassed=${cyclesPassed}, cycleLength=${cycleLength}, cycleUnit=${rotationGroup.getCycleUnit()})`,
      );

      result.processed++;
    } catch (error: any) {
      const reason = error?.message ?? String(error);
      console.error(`[RotationCron] Assignment #${assignmentId} failed: ${reason}`);
      result.failed++;
      result.errors.push({ assignmentId, reason });
      // Continue — une erreur sur une assignation ne bloque pas les autres
    }
  }

  // ── 3. Résumé ────────────────────────────────────────────────────────────
  console.log(
    `[RotationCron] Done — processed=${result.processed}, skipped=${result.skipped}, failed=${result.failed}`,
  );

  return result;
}

// import { CycleUnit, TimezoneConfigUtils } from '@toke/shared';
//
// import RotationAssignment from '../tenant/class/RotationAssignments.js';
// import RotationAssignmentLog from '../tenant/class/RotationAssignmentLog.js';
//
// // ============================================================
// // ROTATION CRON JOB
// // ============================================================
// // Ce cron agit comme un "assistant manager automatique".
// // Il tourne périodiquement (configurer via node-cron ou équivalent)
// // et fait avancer d'un cran l'offset de chaque assignation active.
// //
// // Fréquence recommandée :
// //   - Si cycle_unit = 'day'  → lancer chaque jour  (ex: "0 0 * * *")
// //   - Si cycle_unit = 'week' → lancer chaque lundi (ex: "0 0 * * 1")
// //
// // Le cron ne touche jamais aux règles du manager ni aux assignations
// // inactives. Tous les changements sont tracés dans RotationAssignmentLog.
// // ============================================================
//
// // Résultat retourné après l'exécution
// export interface RotationCronResult {
//   executedAt: Date;
//   cycleUnit: CycleUnit;
//   processed: number;
//   skipped: number;
//   failed: number;
//   errors: Array<{ assignmentId: number; reason: string }>;
// }
//
// /**
//  * Fait avancer d'un cran toutes les assignations actives dont le
//  * rotation group correspond au cycleUnit fourni.
//  *
//  * @param cycleUnit - 'day' ou 'week' : filtre les rotation groups à traiter
//  *
//  * Exemple d'intégration avec node-cron :
//  *
//  * ```ts
//  * import cron from 'node-cron';
//  * import { runRotationCron, CycleUnit } from './crons/rotation.cron.js';
//  *
//  * // Rotation journalière — minuit chaque jour
//  * cron.schedule('0 0 * * *', () => runRotationCron(CycleUnit.DAY));
//  *
//  * // Rotation hebdomadaire — minuit chaque lundi
//  * cron.schedule('0 0 * * 1', () => runRotationCron(CycleUnit.WEEK));
//  * ```
//  */
// export async function runRotationCron(cycleUnit: CycleUnit): Promise<RotationCronResult> {
//   const executedAt = TimezoneConfigUtils.getCurrentTime();
//
//   const result: RotationCronResult = {
//     executedAt,
//     cycleUnit,
//     processed: 0,
//     skipped: 0,
//     failed: 0,
//     errors: [],
//   };
//
//   console.log(`[RotationCron] Starting — cycleUnit=${cycleUnit}, at=${executedAt.toISOString()}`);
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
//       // ── 2a. Charge le rotation group associé ──────────────────────────
//       const rotationGroup = await assignment.getRotationGroupObj();
//
//       if (!rotationGroup) {
//         console.warn(`[RotationCron] Assignment #${assignmentId} has no rotation group. Skipping.`);
//         result.skipped++;
//         continue;
//       }
//
//       // ── 2b. Filtre sur le cycleUnit demandé ───────────────────────────
//       if (rotationGroup.getCycleUnit() !== cycleUnit) {
//         // Ce cron ne traite pas les groupes d'une autre unité de cycle
//         result.skipped++;
//         continue;
//       }
//
//       const cycleLength = rotationGroup.getCycleLength();
//
//       if (!cycleLength || cycleLength < 1) {
//         console.warn(
//           `[RotationCron] Assignment #${assignmentId}: invalid cycle_length=${cycleLength}. Skipping.`,
//         );
//         result.skipped++;
//         continue;
//       }
//
//       // ── 2c. Calcule le nouvel offset ──────────────────────────────────
//       const previousOffset = assignment.getOffset() ?? 0;
//       const newOffset = (previousOffset + 1) % cycleLength;
//
//       // ── 2d. Met à jour l'assignation ──────────────────────────────────
//       assignment.setOffset(newOffset);
//       await assignment.save();
//
//       // ── 2e. Crée un log traçable dans RotationAssignmentLog ───────────
//       const log = new RotationAssignmentLog();
//       log
//         .setRotationAssignment(assignmentId)
//         .setPreviousOffset(previousOffset)
//         .setNewOffset(newOffset)
//         .setCycleLength(cycleLength)
//         .setExecutedAt(executedAt);
//
//       await log.save();
//
//       console.log(
//         `[RotationCron] Assignment #${assignmentId}: offset ${previousOffset} → ${newOffset} (cycle=${cycleLength})`,
//       );
//
//       result.processed++;
//     } catch (error: any) {
//       const reason = error?.message ?? String(error);
//       console.error(`[RotationCron] Assignment #${assignmentId} failed: ${reason}`);
//       result.failed++;
//       result.errors.push({ assignmentId, reason });
//       // Continue — une erreur sur une assignation ne bloque pas les autres
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
