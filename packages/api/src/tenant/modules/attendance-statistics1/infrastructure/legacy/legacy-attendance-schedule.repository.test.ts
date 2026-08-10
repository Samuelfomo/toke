import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  LegacyAttendanceScheduleRepository,
  type LegacyAttendanceScheduleDataSource,
  type LegacyScheduleDataset,
} from './legacy-attendance-schedule.repository.js';

const employee = { id: 1, guid: 'employee-1' };

function snapshot(dayValue: unknown) {
  return {
    definition: {
      Mon: [],
      Tue: [],
      Wed: dayValue,
      Thu: [],
      Fri: [],
      Sat: [],
      Sun: [],
    },
  };
}

function dataset(
  overrides: Partial<LegacyScheduleDataset> = {},
): LegacyScheduleDataset {
  return {
    directAssignments: [],
    rotationAssignments: [],
    memberships: [],
    rotationGroups: [],
    ...overrides,
  };
}

class FakeSource implements LegacyAttendanceScheduleDataSource {
  constructor(private readonly value: LegacyScheduleDataset) {}

  async loadDataset(): Promise<LegacyScheduleDataset> {
    return this.value;
  }
}

async function resolve(value: LegacyScheduleDataset, date = '2026-08-05') {
  const repository = new LegacyAttendanceScheduleRepository(new FakeSource(value));
  const result = await repository.resolveForPeriod({
    employees: [employee],
    dates: [date],
    currentBusinessDate: '2026-08-05',
  });
  return result[0]?.schedule;
}

describe('LegacyAttendanceScheduleRepository', () => {
  it('résout un snapshot direct sans recharger le template mutable', async () => {
    const schedule = await resolve(
      dataset({
        directAssignments: [
          {
            id: 10,
            relatedType: 'USER',
            relatedGuid: employee.guid,
            active: true,
            startDate: '2026-08-01',
            endDate: null,
            version: 1,
            updatedBusinessDate: '2026-08-01',
            sortEpochMilliseconds: 10,
            snapshot: snapshot([
              { work: ['08:00', '17:00'], pause: null, tolerance: 10 },
            ]),
          },
        ],
      }),
    );

    assert.deepEqual(schedule, {
      state: 'WORK_DAY',
      source: 'DIRECT',
      expectedBlocks: [
        { startTime: '08:00', endTime: '17:00', toleranceMinutes: 10 },
      ],
    });
  });

  it('distingue un repos explicite d’un jour absent de la définition', async () => {
    const baseAssignment = {
      id: 10,
      relatedType: 'USER' as const,
      relatedGuid: employee.guid,
      active: true,
      startDate: '2026-08-01',
      endDate: null,
      version: 1,
      updatedBusinessDate: '2026-08-01',
      sortEpochMilliseconds: 10,
    };
    const rest = await resolve(
      dataset({
        directAssignments: [{ ...baseAssignment, snapshot: snapshot([]) }],
      }),
    );
    const invalid = await resolve(
      dataset({
        directAssignments: [
          { ...baseAssignment, snapshot: { definition: { Mon: [] } } },
        ],
      }),
    );

    assert.equal(rest?.state, 'REST_DAY');
    assert.deepEqual(invalid, {
      state: 'UNRESOLVED',
      source: 'DIRECT',
      expectedBlocks: [],
      issue: 'INVALID_SCHEDULE',
    });
  });

  it('utilise la position du slot et non son identifiant DB pour la rotation courante', async () => {
    const schedule = await resolve(
      dataset({
        rotationAssignments: [
          {
            id: 20,
            relatedType: 'USER',
            relatedGuid: employee.guid,
            active: true,
            assignedDate: '2026-08-01',
            sortEpochMilliseconds: 20,
            rotationGroupId: 4,
            offset: 1,
          },
        ],
        rotationGroups: [
          {
            id: 4,
            active: true,
            slots: [
              { position: 0, snapshot: snapshot([]) },
              {
                position: 1,
                snapshot: snapshot([
                  { work: ['16:00', '08:00'], tolerance: 0 },
                ]),
              },
            ],
          },
        ],
      }),
    );

    assert.equal(schedule?.state, 'WORK_DAY');
    assert.equal(schedule?.source, 'ROTATION');
    assert.deepEqual(
      schedule?.state === 'WORK_DAY' ? schedule.expectedBlocks[0] : null,
      { startTime: '16:00', endTime: '08:00', toleranceMinutes: 0 },
    );
  });

  it('refuse d’inventer la position passée d’une rotation mutable', async () => {
    const schedule = await resolve(
      dataset({
        rotationAssignments: [
          {
            id: 20,
            relatedType: 'USER',
            relatedGuid: employee.guid,
            active: true,
            assignedDate: '2026-07-01',
            sortEpochMilliseconds: 20,
            rotationGroupId: 4,
            offset: 1,
          },
        ],
      }),
      '2026-08-04',
    );

    assert.deepEqual(schedule, {
      state: 'UNRESOLVED',
      source: 'ROTATION',
      expectedBlocks: [],
      issue: 'HISTORICAL_SCHEDULE_UNAVAILABLE',
    });
  });

  it('signale un snapshot modifié après la date analysée', async () => {
    const schedule = await resolve(
      dataset({
        directAssignments: [
          {
            id: 10,
            relatedType: 'USER',
            relatedGuid: employee.guid,
            active: true,
            startDate: '2026-07-01',
            endDate: null,
            version: 2,
            updatedBusinessDate: '2026-08-05',
            sortEpochMilliseconds: 10,
            snapshot: snapshot([]),
          },
        ],
      }),
      '2026-08-04',
    );

    assert.equal(
      schedule?.state === 'UNRESOLVED' ? schedule.issue : null,
      'HISTORICAL_SCHEDULE_UNAVAILABLE',
    );
  });

  it('signale deux affectations de même priorité comme ambiguës', async () => {
    const common = {
      relatedType: 'USER' as const,
      relatedGuid: employee.guid,
      active: true,
      startDate: '2026-08-01',
      endDate: null,
      version: 1,
      updatedBusinessDate: '2026-08-01',
      sortEpochMilliseconds: 10,
      snapshot: snapshot([]),
    };
    const schedule = await resolve(
      dataset({
        directAssignments: [
          { id: 1, ...common },
          { id: 2, ...common },
        ],
      }),
    );

    assert.equal(
      schedule?.state === 'UNRESOLVED' ? schedule.issue : null,
      'AMBIGUOUS_SCHEDULE',
    );
  });
});
