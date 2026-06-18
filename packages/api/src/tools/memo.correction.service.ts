import { SessionStatus, TimeCorrectionInput } from '@toke/shared';

import TimeEntries from '../tenant/class/TimeEntries.js';
import WorkSessions from '../tenant/class/WorkSessions.js';
import Memos from '../tenant/class/Memos.js';

import ScheduleResolutionService from './schedule.resolution.service.js';
import { AnomalyType } from './anomaly.detection.service.js';

// ============================================================================
// TYPES
// ============================================================================

export interface CorrectionResult {
  applied: boolean;
  source: 'manual' | 'auto_schedule';
  corrections_applied: AppliedCorrection[];
  corrections_skipped: SkippedCorrection[];
}

interface AppliedCorrection {
  target: 'entry' | 'session';
  guid: string;
  field: string;
  old_value: Date | string;
  new_value: Date | string;
}

interface SkippedCorrection {
  target: 'entry' | 'session';
  guid: string;
  reason: string;
}

// Mapping anomaly type → champs à corriger automatiquement
const ANOMALY_CORRECTION_MAP: Partial<
  Record<
    AnomalyType,
    {
      target: 'entry' | 'session';
      field: 'clocked_at' | 'session_start_at' | 'session_end_at';
      schedule_ref: 'expected_start' | 'expected_end';
    }
  >
> = {
  [AnomalyType.LATE_ARRIVAL]: {
    target: 'entry',
    field: 'clocked_at',
    schedule_ref: 'expected_start',
  },
  [AnomalyType.EARLY_DEPARTURE]: {
    target: 'session',
    field: 'session_end_at',
    schedule_ref: 'expected_end',
  },
  [AnomalyType.SESSION_TOO_LONG]: {
    target: 'session',
    field: 'session_end_at',
    schedule_ref: 'expected_end',
  },
  [AnomalyType.SESSION_ALREADY_OPEN]: {
    target: 'session',
    field: 'session_end_at',
    schedule_ref: 'expected_end',
  },
  [AnomalyType.SESSION_NOT_FOUND]: {
    target: 'session',
    field: 'session_start_at',
    schedule_ref: 'expected_start',
  },
};

// ============================================================================
// SERVICE
// ============================================================================

class MemoCorrectionService {
  /**
   * Point d'entrée principal.
   * Applique les corrections manuelles si fournies,
   * sinon applique les corrections automatiques depuis le planning.
   */
  async applyCorrections(
    memoObj: Memos,
    timeCorrections?: TimeCorrectionInput[],
  ): Promise<CorrectionResult> {
    // Récupérer les entries affectées
    const affectedEntries = await memoObj.getAffectedEntries();
    if (!affectedEntries || affectedEntries.length === 0) {
      return {
        applied: false,
        source: 'manual',
        corrections_applied: [],
        corrections_skipped: [],
      };
    }

    if (timeCorrections && timeCorrections.length > 0) {
      return this.applyManualCorrections(timeCorrections, affectedEntries);
    }

    return this.applyAutoCorrections(memoObj, affectedEntries);
  }

  // ============================================================================
  // CORRECTIONS MANUELLES
  // ============================================================================

  private async applyManualCorrections(
    timeCorrections: TimeCorrectionInput[],
    affectedEntries: TimeEntries[],
  ): Promise<CorrectionResult> {
    const corrections_applied: AppliedCorrection[] = [];
    const corrections_skipped: SkippedCorrection[] = [];

    for (const correction of timeCorrections) {
      // --- Correction sur une TimeEntry ---
      if (correction.entry_guid && correction.clocked_at) {
        const entry = affectedEntries.find((e) => e.getGuid() === correction.entry_guid);

        if (!entry) {
          corrections_skipped.push({
            target: 'entry',
            guid: correction.entry_guid,
            reason: 'Entry not found in affected entries of this memo',
          });
          continue;
        }

        const old_value = entry.getClockedAt()!;
        const new_value = new Date(correction.clocked_at);

        entry.setClockedAt(new_value);
        entry.setRealClockedAt(new_value);
        await entry.save();

        corrections_applied.push({
          target: 'entry',
          guid: correction.entry_guid,
          field: 'clocked_at',
          old_value,
          new_value,
        });
      }

      // --- Correction sur une WorkSession ---
      if (correction.session_guid) {
        // Retrouver la session à partir d'une entry liée ou directement par guid
        const session = await this.resolveSession(correction.session_guid, affectedEntries);

        if (!session) {
          corrections_skipped.push({
            target: 'session',
            guid: correction.session_guid,
            reason: 'Session not found or not linked to affected entries',
          });
          continue;
        }

        if (correction.session_start_at) {
          const old_value = session.getSessionStartAt()!;
          const new_value = new Date(correction.session_start_at);

          session.setSessionStartAt(new_value);

          corrections_applied.push({
            target: 'session',
            guid: correction.session_guid,
            field: 'session_start_at',
            old_value,
            new_value,
          });
        }

        if (correction.session_end_at) {
          const old_value = session.getSessionEndAt() ?? 'not_set';
          const new_value = new Date(correction.session_end_at);

          session.setSessionEndAt(new_value);

          corrections_applied.push({
            target: 'session',
            guid: correction.session_guid,
            field: 'session_end_at',
            old_value,
            new_value,
          });
        }

        // Recalculer les durées si la session est fermée
        if (session.getSessionEndAt()) {
          session.setSessionStatus(SessionStatus.CORRECTED);
          const durations = await session.calculateDurations();
          if (durations.total_work_duration) {
            session.setTotalWorkDuration(durations.total_work_duration);
          }
          if (durations.total_pause_duration) {
            session.setTotalPauseDuration(durations.total_pause_duration);
          }
        }

        await session.save();
      }
    }

    return {
      applied: corrections_applied.length > 0,
      source: 'manual',
      corrections_applied,
      corrections_skipped,
    };
  }

  // ============================================================================
  // CORRECTIONS AUTOMATIQUES PAR PLANNING
  // ============================================================================

  private async applyAutoCorrections(
    memoObj: Memos,
    affectedEntries: TimeEntries[],
  ): Promise<CorrectionResult> {
    const corrections_applied: AppliedCorrection[] = [];
    const corrections_skipped: SkippedCorrection[] = [];

    // Extraire les types d'anomalies depuis le memo_content
    const anomalyTypes = this.extractAnomalyTypesFromMemo(memoObj);

    if (anomalyTypes.length === 0) {
      return {
        applied: false,
        source: 'auto_schedule',
        corrections_applied: [],
        corrections_skipped: [
          {
            target: 'entry',
            guid: memoObj.getGuid()!,
            reason: 'No recognizable anomaly types found in memo content',
          },
        ],
      };
    }

    for (const entry of affectedEntries) {
      const incidentDate = entry.getClockedAt() ?? memoObj.getIncidentDatetime();
      if (!incidentDate) continue;

      // Charger le planning actif de l'employé pour la date de l'incident
      const scheduleResult = await ScheduleResolutionService.getApplicableSchedule(
        entry.getUser()!,
        incidentDate,
      );

      if (!scheduleResult.success || !scheduleResult.applicable_schedule) {
        corrections_skipped.push({
          target: 'entry',
          guid: entry.getGuid()!,
          reason: `No applicable schedule found for date ${incidentDate.toISOString().split('T')[0]}`,
        });
        continue;
      }

      const schedule = scheduleResult.applicable_schedule;

      if (!schedule.is_work_day || schedule.expected_blocks.length === 0) {
        corrections_skipped.push({
          target: 'entry',
          guid: entry.getGuid()!,
          reason: 'Schedule found but it is a rest day — no correction applied',
        });
        continue;
      }

      const firstBlock = schedule.expected_blocks[0];
      const lastBlock = schedule.expected_blocks[schedule.expected_blocks.length - 1];

      // Construire les dates cibles depuis les heures du planning
      const expectedStart = this.buildDateFromTimeString(incidentDate, firstBlock.work[0]);
      const expectedEnd = this.buildDateFromTimeString(incidentDate, lastBlock.work[1]);

      // Appliquer les corrections pour chaque type d'anomalie détecté
      for (const anomalyType of anomalyTypes) {
        const correctionDef = ANOMALY_CORRECTION_MAP[anomalyType];
        if (!correctionDef) continue;

        if (correctionDef.target === 'entry') {
          const targetDate =
            correctionDef.schedule_ref === 'expected_start' ? expectedStart : expectedEnd;

          const old_value = entry.getClockedAt()!;
          entry.setClockedAt(targetDate);
          entry.setRealClockedAt(targetDate);
          await entry.save();

          corrections_applied.push({
            target: 'entry',
            guid: entry.getGuid()!,
            field: correctionDef.field,
            old_value,
            new_value: targetDate,
          });
        }

        if (correctionDef.target === 'session') {
          const session = await this.getSessionFromEntry(entry);

          if (!session) {
            corrections_skipped.push({
              target: 'session',
              guid: entry.getGuid()!,
              reason: 'Could not resolve session from entry',
            });
            continue;
          }

          const targetDate =
            correctionDef.schedule_ref === 'expected_start' ? expectedStart : expectedEnd;

          if (correctionDef.field === 'session_start_at') {
            const old_value = session.getSessionStartAt()!;
            session.setSessionStartAt(targetDate);
            corrections_applied.push({
              target: 'session',
              guid: session.getGuid()!,
              field: 'session_start_at',
              old_value,
              new_value: targetDate,
            });
          }

          if (correctionDef.field === 'session_end_at') {
            const old_value = session.getSessionEndAt() ?? 'not_set';
            session.setSessionEndAt(targetDate);
            corrections_applied.push({
              target: 'session',
              guid: session.getGuid()!,
              field: 'session_end_at',
              old_value,
              new_value: targetDate,
            });
          }

          session.setSessionStatus(SessionStatus.CORRECTED);
          const durations = await session.calculateDurations();
          if (durations.total_work_duration) {
            session.setTotalWorkDuration(durations.total_work_duration);
          }
          if (durations.total_pause_duration) {
            session.setTotalPauseDuration(durations.total_pause_duration);
          }
          await session.save();
        }
      }
    }

    return {
      applied: corrections_applied.length > 0,
      source: 'auto_schedule',
      corrections_applied,
      corrections_skipped,
    };
  }

  // ============================================================================
  // UTILITAIRES PRIVÉS
  // ============================================================================

  /**
   * Extrait les types d'anomalies depuis le memo_content
   * Les anomalies sont stockées comme : { type: MessageType.TEXT, content: anomaly.type }
   */
  private extractAnomalyTypesFromMemo(memoObj: Memos): AnomalyType[] {
    const content = memoObj.getMemoContent();
    if (!content || content.length === 0) return [];

    const anomalyTypes: AnomalyType[] = [];
    const validAnomalyTypes = new Set(Object.values(AnomalyType));

    for (const block of content) {
      for (const msg of block.message) {
        const value = msg.content as string;
        if (validAnomalyTypes.has(value as AnomalyType)) {
          anomalyTypes.push(value as AnomalyType);
        }
      }
    }

    return [...new Set(anomalyTypes)]; // dédupliquer
  }

  /**
   * Retrouve une session à partir de son guid,
   * en vérifiant qu'elle est bien liée à une des entries affectées
   */
  private async resolveSession(
    sessionGuid: string,
    affectedEntries: TimeEntries[],
  ): Promise<WorkSessions | null> {
    const session = await WorkSessions._load(sessionGuid, true);
    if (!session) return null;

    // Vérifier que la session est bien liée à au moins une entry affectée
    const isLinked = affectedEntries.some((e) => e.getSession() === session.getId());

    return isLinked ? session : null;
  }

  /**
   * Retrouve la session directement depuis une entry
   */
  private async getSessionFromEntry(entry: TimeEntries): Promise<WorkSessions | null> {
    const sessionId = entry.getSession();
    if (!sessionId) return null;
    return WorkSessions._load(sessionId);
  }

  /**
   * Construit une Date complète en combinant la date d'incident avec une heure "HH:MM"
   * Ex: incidentDate = 2025-06-03T09:45:00, timeString = "08:00" → 2025-06-03T08:00:00
   */
  private buildDateFromTimeString(referenceDate: Date, timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(referenceDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}

export default new MemoCorrectionService();
