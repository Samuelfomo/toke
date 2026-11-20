'use strict';
// Final V01 evidence only. Same owned fixture cluster, no new connection target.
const assert = require('node:assert/strict');
module.exports = async function finalIsolation(env) {
  const { manager, initializer, ownership, cfg, A, B, wire } = env;
  const scope = (tenant, work) => manager.runTenantOperation(tenant, async () => {
    const db = await manager.getConnectionForTenant(tenant, cfg(tenant));
    await initializer.initialize(db);
    return work(db);
  });
  let dbA, modelA;
  await scope(A, db => { dbA = db; modelA = [...initializer.getAllModels().values()][0]; });
  const before = wire.length;
  assert.throws(() => ownership.registerConnection(dbA, { ...ownership.connectionOwner(dbA), tenant: B }), /TENANT_CONNECTION_ALREADY_OWNED/);
  await manager.runTenantOperation(B, async () => {
    await assert.rejects(initializer.initialize(dbA), /TENANT_CONTEXT_MISMATCH/);
    await assert.rejects(modelA.findAll(), /TENANT_CONTEXT_MISMATCH/);
  });
  assert.equal(wire.length, before, 'foreign registration/initialization/model must send no SQL');
  console.log('PASS FINAL ISOLATION AC06/35: real connection cannot be re-owned or initialized as B; captured A model refused before native SQL');
  await scope(A, async db => {
    await db.transaction(async tx => {
      const start = wire.length;
      await manager.runTenantOperation(A, async () => {
        await assert.rejects(db.query('SELECT 1', { transaction: tx }), /TENANT_TRANSACTION_MISMATCH/);
        assert.throws(() => tx.connection.query('SELECT 1'), /TENANT_TRANSACTION_MISMATCH/);
        assert.throws(() => tx.commit(), /TENANT_TRANSACTION_MISMATCH/);
      });
      assert.equal(wire.length, start, 'same tenant is insufficient: another operation must send zero SQL');
      const [identity] = await db.query('SELECT current_database() AS db', { transaction: tx });
      assert.equal(identity[0].db, cfg(A).database, 'original transaction remains usable only in its owning operation');
    });
    const parent = manager.getCurrentTenant();
    await assert.rejects(scope(B, async dbB => {
      assert.equal((await dbB.query('SELECT current_database() AS db'))[0][0].db, cfg(B).database);
      throw Error('V01_FINAL_CHILD_FAILURE');
    }), /V01_FINAL_CHILD_FAILURE/);
    assert.equal(manager.getCurrentTenant(), parent);
    assert.equal((await db.query('SELECT current_database() AS db'))[0][0].db, cfg(A).database);
  });
  assert.throws(() => manager.getCurrentTenant(), /TENANT_CONTEXT_MISSING/);
  console.log('PASS FINAL ISOLATION AC16/21: same-tenant foreign operation rejects SQL/native/commit; parent A restored after failed B child on real PostgreSQL');
};
