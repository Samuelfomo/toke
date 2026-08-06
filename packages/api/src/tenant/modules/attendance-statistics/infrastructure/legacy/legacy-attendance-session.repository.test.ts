import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  LegacyAttendanceSessionRepository,
  type LegacyAttendanceSessionDataSource,
  type LegacyTimeEntryRow,
  type LegacyWorkSessionRow,
} from './legacy-attendance-session.repository.js';

class FakeSource implements LegacyAttendanceSessionDataSource {
  constructor(
    private readonly sessions: readonly LegacyWorkSessionRow[],
    private readonly entries: readonly LegacyTimeEntryRow[],
  ) {}

  async loadWorkSessions(): Promise<readonly LegacyWorkSessionRow[]> {
    return this.sessions;
  }

  async loadTimeEntriesBySessionIds(): Promise<readonly LegacyTimeEntryRow[]> {
    return this.entries;
  }
}

describe('LegacyAttendanceSessionRepository', () => {
  it('normalise explicitement les instants dans Africa/Douala', async () => {
    const source = new FakeSource(
      [
        {
          id: 1,
          employeeId: 9,
          status: 'closed',
          startedAt: new Date('2026-08-04T23:30:00Z'),
          endedAt: new Date('2026-08-05T07:00:00Z'),
          totalWorkDuration: '7 hours 30 minutes',
          totalPauseDuration: '0 minutes',
        },
      ],
      [],
    );
    const repository = new LegacyAttendanceSessionRepository(source);
    const sessions = await repository.listForPeriod({
      employeeIds: [9],
      period: { startDate: '2026-08-05', endDate: '2026-08-05' },
      businessTimezone: 'Africa/Douala',
    });

    assert.equal(sessions[0]?.startedAt.businessDate, '2026-08-05');
    assert.equal(sessions[0]?.startedAt.businessTime, '00:30:00');
    assert.equal(sessions[0]?.status, 'CLOSED');
  });

  it('ignore les événements rejetés dans le calcul des pauses', async () => {
    const source = new FakeSource(
      [
        {
          id: 1,
          employeeId: 9,
          status: 'closed',
          startedAt: new Date('2026-08-05T07:00:00Z'),
          endedAt: new Date('2026-08-05T16:00:00Z'),
          totalWorkDuration: '9 hours',
          totalPauseDuration: null,
        },
      ],
      [
        {
          id: 10,
          sessionId: 1,
          type: 'pause_start',
          status: 'rejected',
          clockedAt: new Date('2026-08-05T11:00:00Z'),
        },
      ],
    );
    const repository = new LegacyAttendanceSessionRepository(source);
    const sessions = await repository.listForPeriod({
      employeeIds: [9],
      period: { startDate: '2026-08-05', endDate: '2026-08-05' },
      businessTimezone: 'Africa/Douala',
    });

    assert.deepEqual(sessions[0]?.entries, []);
  });
});
