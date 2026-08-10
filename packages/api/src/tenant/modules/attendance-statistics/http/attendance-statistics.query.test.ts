import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseAttendanceOverviewQuery } from './attendance-statistics.query.js';

describe('parseAttendanceOverviewQuery', () => {
  it('utilise le mois métier courant lorsque les dates sont absentes', () => {
    assert.deepEqual(
      parseAttendanceOverviewQuery({ manager: '123456' }, '2026-08-05'),
      {
        ok: true,
        value: {
          managerGuid: '123456',
          siteGuid: null,
          startDate: '2026-08-01',
          endDate: '2026-08-05',
        },
      },
    );
  });

  it('rejette une date impossible', () => {
    const result = parseAttendanceOverviewQuery(
      {
        manager: '123456',
        start_date: '2026-02-30',
        end_date: '2026-03-01',
      },
      '2026-08-05',
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'invalid_date_value');
  });

  it('rejette une période inversée', () => {
    const result = parseAttendanceOverviewQuery(
      {
        manager: '123456',
        start_date: '2026-08-05',
        end_date: '2026-08-01',
      },
      '2026-08-05',
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'invalid_date_range');
  });

  it('rejette une fin future', () => {
    const result = parseAttendanceOverviewQuery(
      {
        manager: '123456',
        start_date: '2026-08-01',
        end_date: '2026-08-06',
      },
      '2026-08-05',
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'future_date_not_allowed');
  });

  it('exige les deux bornes ensemble', () => {
    const result = parseAttendanceOverviewQuery(
      { manager: '123456', start_date: '2026-08-01' },
      '2026-08-05',
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'date_pair_required');
  });

  it('rejette une période supérieure à 366 jours', () => {
    const result = parseAttendanceOverviewQuery(
      {
        manager: '123456',
        start_date: '2025-08-01',
        end_date: '2026-08-05',
      },
      '2026-08-05',
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'period_too_large');
  });

  it('rejette les paramètres répétés sous forme de tableau', () => {
    const result = parseAttendanceOverviewQuery(
      { manager: ['123456', '654321'] },
      '2026-08-05',
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'invalid_query_value');
  });

});
