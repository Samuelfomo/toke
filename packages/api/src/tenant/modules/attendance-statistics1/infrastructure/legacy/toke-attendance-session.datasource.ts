import { Op } from 'sequelize';

import TimeEntries from '../../../../class/TimeEntries.js';
import WorkSessions from '../../../../class/WorkSessions.js';
import type {
  LegacyAttendanceSessionDataSource,
  LegacyTimeEntryRow,
  LegacyWorkSessionRow,
} from './legacy-attendance-session.repository.js';

/** Adaptateur mince vers les classes existantes du tenant. */
export class TokeAttendanceSessionDataSource
  implements LegacyAttendanceSessionDataSource
{
  async loadWorkSessions(input: {
    employeeIds: readonly number[];
    start: Date;
    endExclusive: Date;
  }): Promise<readonly LegacyWorkSessionRow[]> {
    const sessions =
      (await WorkSessions._list({
        user: { [Op.in]: [...input.employeeIds] },
        session_start_at: {
          [Op.gte]: input.start,
          [Op.lt]: input.endExclusive,
        },
      })) ?? [];

    return sessions.map((session) => {
      const id = session.getId();
      const employeeId = session.getUser();
      const startedAt = session.getSessionStartAt();
      if (!id || !employeeId || !startedAt) {
        throw new Error('WorkSession incomplète reçue depuis la base tenant');
      }

      return {
        id,
        employeeId,
        status: String(session.getSessionStatus() ?? ''),
        startedAt,
        endedAt: session.getSessionEndAt() ?? null,
        totalWorkDuration: session.getTotalWorkDuration() ?? null,
        totalPauseDuration: session.getTotalPauseDuration() ?? null,
      };
    });
  }

  async loadTimeEntriesBySessionIds(
    sessionIds: readonly number[],
  ): Promise<readonly LegacyTimeEntryRow[]> {
    if (sessionIds.length === 0) return [];

    const entries =
      (await TimeEntries._list({ session: { [Op.in]: [...sessionIds] } })) ?? [];

    return entries.map((entry) => {
      const id = entry.getId();
      const sessionId = entry.getSession();
      const clockedAt = entry.getClockedAt();
      if (!id || !sessionId || !clockedAt) {
        throw new Error('TimeEntry de session incomplète reçue depuis la base tenant');
      }

      return {
        id,
        sessionId,
        type: String(entry.getPointageType() ?? ''),
        status: String(entry.getPointageStatus() ?? ''),
        clockedAt,
      };
    });
  }
}
