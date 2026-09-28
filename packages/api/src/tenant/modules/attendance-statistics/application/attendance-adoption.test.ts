import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { AttendanceDay, AttendanceAdoptionSession } from '../domain/attendance-day.types.js';
import { assessAttendanceAdoption, calculateAdoptionMetrics } from './attendance-adoption.js';

const continuous: AttendanceAdoptionSession = {
  sessionGuid: 'session-1', startDate: '2026-09-07', startTime: '15:30',
  endDate: '2026-09-08', endTime: '08:30',
  clockInGuids: ['in-1'], clockOutGuids: ['out-1'],
  clockInAt: '2026-09-07T15:30', clockOutAt: '2026-09-08T08:30',
};

function day(date: string, startTime: string, endTime: string,
  operation: 'START' | 'CONTINUATION' | null,
  session: AttendanceAdoptionSession = continuous): AttendanceDay {
  return {
    employeeId: 1, employeeGuid: 'employee-1', date,
    schedule: {
      state: 'WORK_DAY', source: 'DIRECT', assignmentGuid: date,
      expectedBlocks: [{ startTime, endTime, toleranceMinutes: 0 }],
      attendanceOperation: operation ? {
        id: 'guard-1', kind: 'GUARD', role: operation, startDate: '2026-09-07',
      } : null,
    },
    result: { status: 'PRESENT', rateEligible: true },
    activity: { adoptionSessions: [session] },
  } as unknown as AttendanceDay;
}

it('compte une garde liée une fois avec une seule entrée et sortie valides', () => {
  const assessments = assessAttendanceAdoption([
    day('2026-09-07', '16:00', '23:59', 'START'),
    day('2026-09-08', '00:00', '08:00', 'CONTINUATION'),
  ]);
  assert.deepEqual(assessments.map((value) => value.state), ['COMPLETE', 'CONTINUATION']);
  assert.equal(calculateAdoptionMetrics(assessments).completeOperations, 1);
});

it('ne réutilise pas une session pour deux rotations distinctes', () => {
  const assessments = assessAttendanceAdoption([
    day('2026-09-07', '16:00', '23:59', null),
    day('2026-09-08', '00:00', '08:00', null),
  ]);
  assert.deepEqual(assessments.map((value) => value.state),
    ['UNDETERMINED', 'UNDETERMINED']);
  assert.equal(calculateAdoptionMetrics(assessments).evaluatedOperations, 0);
});

it('ne crédite pas une correction automatique ou une sortie manquante', () => {
  const corrected = { ...continuous, clockInGuids: [], clockOutGuids: [] };
  const assessments = assessAttendanceAdoption([
    day('2026-09-07', '16:00', '23:59', 'START', corrected),
    day('2026-09-08', '00:00', '08:00', 'CONTINUATION', corrected),
  ]);
  assert.equal(calculateAdoptionMetrics(assessments).incompleteOperations, 1);
});
