import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parsePostgresIntervalMinutes } from './postgres-interval.js';

describe('parsePostgresIntervalMinutes', () => {
  it('lit le format textuel PostgreSQL', () => {
    assert.equal(parsePostgresIntervalMinutes('8 hours 30 minutes'), 510);
  });

  it('lit le format horloge', () => {
    assert.equal(parsePostgresIntervalMinutes('08:30:00'), 510);
  });

  it('additionne les jours et le composant horloge', () => {
    assert.equal(parsePostgresIntervalMinutes('1 day 02:15:00'), 1575);
  });

  it('arrondit les secondes à la minute la plus proche', () => {
    assert.equal(parsePostgresIntervalMinutes('00:45:30'), 46);
  });

  it('ne transforme pas une valeur absente ou invalide en zéro', () => {
    assert.equal(parsePostgresIntervalMinutes(null), null);
    assert.equal(parsePostgresIntervalMinutes(''), null);
    assert.equal(parsePostgresIntervalMinutes('inconnu'), null);
  });
});
