'use strict';
// Regression for WORKER-IDS only; deliberately separate from V01 mechanisms.
const assert = require('node:assert/strict');
module.exports = async function workerGroupFilter(env) {
  const { A, B, cfg, manager, scope, seed } = env;
  const schedules = [];
  const loader = require('./postgres-business-loader.cjs')({
    ...env,
    overrides: {
      'packages/api/src/tools/tenant-cache.service.ts': {
        default: {
          getTenantConfig: async (tenant) => cfg(tenant),
          listTenants: async () => [A, B],
        },
      },
    },
    externals: { 'node-cron': { default: { schedule: (...args) => schedules.push(args) } } },
  });
  const Groups = loader.load('tenant/class/RotationGroups.ts').default;
  const worker = loader.load('automate/automate.ts');
  assert.equal(schedules.length, 1); // Recorded, never scheduled.
  let listCalls = 0;
  const original = Groups._list;
  Groups._list = function (...args) {
    listCalls++;
    return original.apply(this, args);
  };
  // No assignments yet: the real worker returns without requesting groups.
  const empty = await Promise.all([worker.runForTenant(A), worker.runForTenant(B)]);
  assert.ok(empty.every((result) => result.processed === 0));
  assert.equal(listCalls, 0);
  const expected = new Map();
  for (const tenant of [A, B])
    await scope(tenant, async () => {
      const rows = [];
      for (const suffix of ['first', 'second', 'excluded'])
        rows.push(
          await seed('ROTATION_GROUPS', {
            tenant,
            name: tenant + ':' + suffix,
            auto_advance: false,
            cycle_unit: 'day',
            start_date: '2026-01-01',
            direction: 'forward',
            rotation_step: 1,
          }),
        );
      expected.set(tenant, rows);
    });
  await Promise.all(
    [A, B].map((tenant) =>
      scope(tenant, async () => {
        const rows = expected.get(tenant),
          ids = rows.slice(0, 2).map((row) => row.id);
        const groups = await Groups._list({ id: { [env.sequelize.Op.in]: ids } });
        assert.deepEqual(
          groups.map((group) => group.getId()).sort((a, b) => a - b),
          ids,
        );
        assert.deepEqual(groups.map((group) => group.getName()).sort(), [
          tenant + ':first',
          tenant + ':second',
        ]);
        assert.ok(groups.every((group) => group.getTenant() === tenant));
        assert.equal(await Groups._list({ id: { [env.sequelize.Op.in]: [] } }), null);
        assert.equal(await Groups._list({ id: { [env.sequelize.Op.in]: [-1] } }), null);
      }),
    ),
  );
  assert.throws(() => manager.getCurrentTenant(), /TENANT_CONTEXT_MISSING/);
  console.log(
    'PASS WORKER-IDS: real class/model/BaseModel/Op.in selects exact groups A/B, excludes other groups, empty list and empty worker are safe',
  );
};
