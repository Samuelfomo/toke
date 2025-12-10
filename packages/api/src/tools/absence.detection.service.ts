/**
 * 🆕 DÉTECTION D'ABSENCES - À exécuter en tâche cron
 *
 * Recommandation:
 * - Tous les jours à 10h (pour absences du matin)
 * - Tous les jours à 15h (pour blocs après-midi manqués)
 *
 * Exemple cron: "0 10,15 * * *" (à 10h et 15h tous les jours)
 */

import cron from 'node-cron';
import {
  AlertSeverity,
  AlertType,
  MemoStatus,
  MemoType,
  MessageType,
  PointageType,
} from '@toke/shared';
import { Op } from 'sequelize';

import User from '../tenant/class/User.js';
import TimeEntries from '../tenant/class/TimeEntries.js';
import Role from '../tenant/class/Role';
import UserRole from '../tenant/class/UserRole';
import Memos from '../tenant/class/Memos';
import { RoleValues } from '../utils/response.model';
import FraudAlerts from '../tenant/class/FraudAlerts';

import ScheduleResolutionService from './schedule.resolution.service.js';

class AbsenceDetectionService {
  /**
   * Détecter les absences non justifiées pour une date donnée
   */
  async detectMissingClockIns(checkDate: Date = new Date()): Promise<void> {
    console.log(`🔍 [Absence Detection] Running for date: ${checkDate.toDateString()}`);

    try {
      // 1. Récupérer tous les utilisateurs actifs
      const activeUsers = await this.getActiveUsers();
      console.log(`📊 Found ${activeUsers.length} active users to check`);

      let absentCount = 0;
      let missedBlocksCount = 0;

      // 2. Pour chaque utilisateur, vérifier son horaire
      for (const user of activeUsers) {
        const userId = user.getId()!;

        // Résoudre l'horaire du jour
        const scheduleResult = await ScheduleResolutionService.getApplicableSchedule(
          userId,
          checkDate,
        );

        if (!scheduleResult.success || !scheduleResult.applicable_schedule) {
          continue; // Pas d'horaire défini
        }

        const schedule = scheduleResult.applicable_schedule;

        // Si pas jour de travail, skip
        if (!schedule.is_work_day) {
          continue;
        }

        // 3. Vérifier si l'utilisateur a pointé aujourd'hui
        const hasClockIn = await this.hasClockInToday(userId, checkDate);

        if (!hasClockIn) {
          // ❌ ABSENCE DÉTECTÉE
          await this.createAbsenceMemo(userId, schedule, checkDate);
          absentCount++;
          console.log(`❌ [User ${userId}] Absence detected`);
        } else {
          // ✅ A pointé, mais vérifier les blocs de travail manqués
          const missedBlocks = await this.detectMissedWorkBlocks(userId, schedule, checkDate);

          if (missedBlocks.length > 0) {
            await this.createMissedBlocksMemo(userId, schedule, checkDate, missedBlocks);
            missedBlocksCount++;
            console.log(`⚠️ [User ${userId}] Missed ${missedBlocks.length} work blocks`);
          }
        }
      }

      console.log(
        `✅ [Absence Detection] Complete - Absences: ${absentCount}, Missed blocks: ${missedBlocksCount}`,
      );
    } catch (error: any) {
      console.error(`❌ [Absence Detection] Error:`, error);
    }
  }

  /**
   * 🚀 DÉMARRER LE CRON JOB
   */
  startCronJob(): void {
    // Exécuter à 10h et 15h tous les jours
    cron.schedule('0 10,15 * * *', async () => {
      console.log('🕐 [Cron] Starting absence detection...');
      await this.detectMissingClockIns();
    });

    console.log('✅ [Cron] Absence detection scheduled (10h and 15h daily)');
  }

  /**
   * 🧪 EXÉCUTION MANUELLE POUR TESTS
   */
  async runManually(date?: Date): Promise<void> {
    await this.detectMissingClockIns(date);
  }

  /**
   * Récupérer tous les utilisateurs actifs (non supprimés)
   */
  private async getActiveUsers(): Promise<User[]> {
    // TODO: Implémenter selon votre logique User
    // Exemple: return await User._list({ deleted_at: null, active: true });
    return [];
  }

  /**
   * Vérifier si l'utilisateur a fait un CLOCK_IN aujourd'hui
   */
  private async hasClockInToday(userId: number, date: Date): Promise<boolean> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const entries = await TimeEntries._list({
      user: userId,
      pointage_type: PointageType.CLOCK_IN,
      clocked_at: {
        [Op.gte]: startOfDay,
        [Op.lte]: endOfDay,
      },
    });
    if (!entries) return false;

    return entries && entries.length > 0;
  }

  /**
   * Détecter les blocs de travail manqués dans la journée
   */
  private async detectMissedWorkBlocks(userId: number, schedule: any, date: Date): Promise<any[]> {
    const missedBlocks = [];
    const now = new Date();

    // Ne vérifier que les blocs passés
    for (const block of schedule.expected_blocks) {
      const blockEndTime = this.parseTime(date, block.work[1]);

      // Si le bloc est déjà terminé
      if (blockEndTime < now) {
        // Vérifier si pointage pendant ce bloc
        const hasEntryInBlock = await this.hasEntryInTimeRange(
          userId,
          this.parseTime(date, block.work[0]),
          blockEndTime,
        );

        if (!hasEntryInBlock) {
          missedBlocks.push(block);
        }
      }
    }

    return missedBlocks;
  }

  /**
   * Vérifier s'il y a un pointage dans une plage horaire
   */
  private async hasEntryInTimeRange(
    userId: number,
    startTime: Date,
    endTime: Date,
  ): Promise<boolean> {
    const entries = await TimeEntries._list({
      user: userId,
      clocked_at: {
        [Op.gte]: startTime,
        [Op.lte]: endTime,
      },
    });
    if (!entries) return false;

    return entries && entries.length > 0;
  }

  /**
   * Créer mémo pour absence complète
   */
  private async createAbsenceMemo(userId: number, schedule: any, date: Date): Promise<void> {
    const roleObj = await Role._load(RoleValues.EMPLOYEE, false, true);
    const identifier = { user: userId, role: roleObj?.getId()! };
    const userAuthor = await UserRole._load(identifier, false, true);

    const memo = new Memos()
      .setAuthorUser(userAuthor?.getAssignedBy()!)
      .setTargetUser(userId)
      .setMemoType(MemoType.ABSENCE_JUSTIFICATION)
      .setMemoStatus(MemoStatus.PENDING)
      .setTitle(`🚨 Absence Non Justifiée - ${date.toLocaleDateString('fr-FR')}`)
      .setDetails(
        `
⚠️ ABSENCE DÉTECTÉE

📅 HORAIRE ATTENDU:
- Template: ${schedule.template_name}
- Date: ${schedule.schedule_date}
- Plages horaires: ${schedule.expected_blocks.map((b: any) => `${b.work[0]}-${b.work[1]}`).join(', ')}

❌ CONSTAT:
Aucun pointage d'entrée (CLOCK_IN) n'a été enregistré pour cette journée de travail.

⏳ ACTION REQUISE:
Veuillez justifier cette absence dans les 48h ou contactez votre manager.
      `.trim(),
      )
      .setIncidentDatetime(date)
      .setMemoContent([
        {
          created_at: new Date().toISOString(),
          user: userAuthor?.getGuid()!,
          message: [
            {
              type: MessageType.TEXT,
              content: 'Absence non justifiée détectée automatiquement',
            },
          ],
        },
      ])
      .setAutoGenerated(true);

    await memo.save();

    // Créer FraudAlert associée
    const alert = new FraudAlerts()
      .setUser(userId)
      .setAlertType(AlertType.SCHEDULE_VIOLATION)
      .setAlertSeverity(AlertSeverity.CRITICAL)
      .setAlertDescription('Absence non justifiée')
      .setAlertData({
        absence_date: schedule.schedule_date,
        template_name: schedule.template_name,
        expected_blocks: schedule.expected_blocks,
        detection_time: new Date().toISOString(),
      });

    await alert.save();

    console.log(`📝 Absence memo created: ${memo.getGuid()}`);
  }

  /**
   * Créer mémo pour blocs de travail manqués
   */
  private async createMissedBlocksMemo(
    userId: number,
    schedule: any,
    date: Date,
    missedBlocks: any[],
  ): Promise<void> {
    const roleObj = await Role._load(RoleValues.EMPLOYEE, false, true);
    const identifier = { user: userId, role: roleObj?.getId()! };
    const userAuthor = await UserRole._load(identifier, false, true);

    const memo = new Memos()
      .setAuthorUser(userAuthor?.getAssignedBy()!)
      .setTargetUser(userId)
      .setMemoType(MemoType.CORRECTION_REQUEST)
      .setMemoStatus(MemoStatus.PENDING)
      .setTitle(`⚠️ Blocs de Travail Manqués - ${date.toLocaleDateString('fr-FR')}`)
      .setDetails(
        `
⚠️ BLOCS DE TRAVAIL MANQUÉS

📅 HORAIRE ATTENDU:
- Template: ${schedule.template_name}
- Date: ${schedule.schedule_date}

❌ BLOCS MANQUÉS (${missedBlocks.length}):
${missedBlocks.map((b: any) => `• ${b.work[0]}-${b.work[1]}`).join('\n')}

ℹ️ CONSTAT:
Des pointages ont été enregistrés aujourd'hui, mais certains blocs de travail prévus n'ont pas été couverts.

⏳ ACTION REQUISE:
Veuillez justifier ces absences partielles ou corriger vos pointages.
      `.trim(),
      )
      .setIncidentDatetime(date)
      .setMemoContent([
        {
          created_at: new Date().toISOString(),
          user: userAuthor?.getGuid()!,
          message: [
            {
              type: MessageType.TEXT,
              content: `${missedBlocks.length} bloc(s) de travail manqué(s)`,
            },
          ],
        },
      ])
      .setAutoGenerated(true);

    await memo.save();

    console.log(`📝 Missed blocks memo created: ${memo.getGuid()}`);
  }

  /**
   * Parser une heure "HH:MM" en Date pour une journée donnée
   */
  private parseTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}

// Export singleton
export default new AbsenceDetectionService();

// === EXEMPLE D'UTILISATION ===

// Dans votre fichier d'initialisation de l'app:
/*
import AbsenceDetectionService from './services/absence-detection.service.js';

// Démarrer le cron au lancement de l'app
AbsenceDetectionService.startCronJob();

// Ou exécution manuelle pour tests:
// await AbsenceDetectionService.runManually(new Date('2024-12-10'));
*/