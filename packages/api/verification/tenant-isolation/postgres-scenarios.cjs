'use strict';
const assert = require('node:assert/strict');
module.exports = async function scenarios({ manager, initializer, context, ownership, sequelize, cfg, A, B, controls, wire, deferred }) {
  const scope = (tenant, work) => manager.runWithTenant(tenant, work);
  const schema = async control => (await control.query(`SELECT json_build_object(
    'columns',(SELECT json_agg(x ORDER BY table_name,ordinal_position) FROM (SELECT table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public') x),
    'indexes',(SELECT json_agg(x ORDER BY indexname) FROM (SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public') x),
    'constraints',(SELECT json_agg(x ORDER BY conname) FROM (SELECT c.conname,pg_get_constraintdef(c.oid) AS def FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public') x),
    'enums',(SELECT json_agg(x ORDER BY typname,enumsortorder) FROM (SELECT t.typname,e.enumsortorder,e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public') x)) AS snapshot`)).rows[0].snapshot;
  await manager.closeAllConnections(); initializer.cleanup();
  // The server itself rejects DDL by application roles in this phase.
  for (const control of controls) {
    await control.query(`CREATE FUNCTION public.v01_no_ddl() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN IF current_user IN ('v01_a','v01_b') THEN RAISE EXCEPTION 'V01_EXISTING_DDL_FORBIDDEN'; END IF; END $$`);
    await control.query('CREATE EVENT TRIGGER v01_no_ddl ON ddl_command_start EXECUTE FUNCTION public.v01_no_ddl()');
  }
  const before = await Promise.all(controls.map(schema));
  const start = wire.length;
  await Promise.all([A,B].flatMap(tenant => Array.from({length:4},()=>scope(tenant,async()=> {
    const db = await manager.getConnectionForTenant(tenant,cfg(tenant));
    await initializer.initialize(db);
    assert.equal(initializer.getAllModels().size,30);
  }))));
  assert.deepEqual(await Promise.all(controls.map(schema)),before);
  assert.equal(wire.slice(start).filter(q=>/^\s*(CREATE|ALTER|DROP|TRUNCATE|COMMENT|GRANT|REVOKE)\b/i.test(q.text)).length,0);
  console.log('PASS: existing real 30-model schemas A/B, concurrent initializations, server DDL prohibition and identical column/index/constraint/enum snapshots');
  for (const control of controls) {
    await control.query('DROP EVENT TRIGGER v01_no_ddl');
    await control.query('DROP FUNCTION public.v01_no_ddl()');
  }
  const dbs = new Map();
  await Promise.all([A,B].map(tenant=>scope(tenant,async()=>dbs.set(tenant,await manager.getConnectionForTenant(tenant,cfg(tenant))))));
  // Application Roles model has real unique, JSONB and NOT NULL constraints.
  await Promise.all([A,B].map(tenant=>scope(tenant,async()=>{
    const model = [...initializer.getAllModels().values()].find(model=>model.rawAttributes.permissions && model.rawAttributes.code);
    assert.ok(model);
    await model.create({code:'V01_SAME_CODE',name:tenant,permissions:{fixture:tenant}});
    await assert.rejects(model.create({code:'V01_SAME_CODE',name:'duplicate',permissions:{}}), {name:'SequelizeUniqueConstraintError'});
    const [rows] = await dbs.get(tenant).query(`SELECT name,permissions FROM "${model.getTableName()}" WHERE code=$1`,{bind:['V01_SAME_CODE']});
    assert.equal(rows[0].name,tenant); assert.equal(rows[0].permissions.fixture,tenant);
    const [available] = await dbs.get(tenant).query("SELECT extname FROM pg_extension WHERE extname='postgis'");
    if(available.length) {
      const [geo] = await dbs.get(tenant).query('SELECT ST_AsText(ST_SetSRID(ST_MakePoint(9.7,4.0),4326)) AS point');
      assert.equal(geo[0].point,'POINT(9.7 4)');
    }
  })));
  console.log('PASS: real application Roles CRUD A/B, JSONB, unique constraints and PostGIS SQL when available');
  const dbA=dbs.get(A), dbB=dbs.get(B);
  // No send to native driver when refused, including raw native connection.
  let native;
  await scope(A,async()=>{native=await dbA.connectionManager.getConnection({type:'SELECT'}); await dbA.connectionManager.releaseConnection(native);});
  let count=wire.length;
  await assert.rejects(dbA.query('SELECT 1'),/TENANT_CONTEXT_MISSING/);
  assert.throws(()=>native.query('SELECT 1'),/TENANT_CONTEXT_MISSING/);
  await assert.rejects(scope(B,()=>dbA.query('SELECT 1')),/TENANT_CONTEXT_MISMATCH/);
  assert.equal(wire.length,count);
  console.log('PASS: missing/foreign context rejected before native SQL send (wire counter unchanged)');
  await scope(A,async()=>{
    await dbA.query('CREATE TABLE v01_tx (id integer PRIMARY KEY, marker text NOT NULL)');
    await dbA.transaction(async parent=>{
      await dbA.query("INSERT INTO v01_tx VALUES (1,'parent')",{transaction:parent});
      await assert.rejects(dbA.transaction({transaction:parent},async child=>{
        await dbA.query("INSERT INTO v01_tx VALUES (2,'child')",{transaction:child}); throw Error('savepoint rollback');
      }),/savepoint rollback/);
      await dbA.query("INSERT INTO v01_tx VALUES (3,'parent after savepoint')",{transaction:parent});
    });
    const [rows]=await dbA.query('SELECT id FROM v01_tx ORDER BY id'); assert.deepEqual(rows.map(r=>r.id),[1,3]);
    await assert.rejects(dbA.transaction(async transaction=>{
      await dbA.query("INSERT INTO v01_tx VALUES (4,'committed')",{transaction});
      transaction.afterCommit(()=>{throw Error('afterCommit fixture');});
    }),/afterCommit fixture/);
    const [committed]=await dbA.query('SELECT id FROM v01_tx WHERE id=4'); assert.equal(committed.length,1);
  });
  const lifetime=context.createTenantLifetime();
  await context.runWithTenant(A,async()=>{
    await assert.rejects(dbA.transaction(async transaction=>{
      await dbA.query("INSERT INTO v01_tx VALUES (5,'revoked')",{transaction}); lifetime.close();
      await dbA.query('SELECT 1',{transaction});
    }),/TENANT_CONTEXT_CLOSED/);
  },{lifetime:lifetime.lifetime});
  await scope(A,async()=>assert.equal((await dbA.query('SELECT id FROM v01_tx WHERE id=5'))[0].length,0));
  console.log('PASS: real savepoints, parent continuation, durable afterCommit outcome and cleanup rollback after revoked context');
  const detached = deferred();
  let inherited;
  await scope(A, () => { inherited = detached.promise.then(() => dbA.query('SELECT 1')); });
  count=wire.length; detached.resolve();
  await assert.rejects(inherited,/TENANT_CONTEXT_CLOSED/); assert.equal(wire.length,count);
  await scope(A,()=>dbA.query('SELECT 1'));
  let cleanupAbandoned;
  await scope(A,async()=>{
    const transaction=await dbA.transaction();
    await dbA.query("INSERT INTO v01_tx VALUES (6,'unmanaged abandoned')",{transaction});
    cleanupAbandoned=require('node:async_hooks').AsyncResource.bind(()=>transaction.rollback());
    // Leaving this scope must clean up, rather than retain a checked-out client.
  });
  const closeAbandoned=manager.closeTenant(A);
  let timer;
  const closed=await Promise.race([closeAbandoned.then(()=>true),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),2000);})]);
  clearTimeout(timer);
  if(!closed) {
    // Teardown only, through the original owner's guarded rollback. The test
    // still FAILS; this does not manufacture acceptance or weaken a guard.
    await cleanupAbandoned(); await closeAbandoned; initializer.cleanupTenant(A);
    throw Error('V01_ABANDONED_TRANSACTION: no automatic rollback on scope close; pool drain blocked (test cleaned up its own transaction)');
  }
  initializer.cleanupTenant(A);
  assert.equal((await controls[0].query('SELECT id FROM v01_tx WHERE id=6')).rowCount,0);
  await scope(A,async()=>{
    const next=await manager.getConnectionForTenant(A,cfg(A)); await initializer.initialize(next);
    dbs.set(A,next);
  });
  console.log('PASS: inherited detached task sends no SQL after scope closure, fresh operation succeeds, abandoned unmanaged transaction rolls back and pool closes');
  const old= dbs.get(A), oldOwner=ownership.connectionOwner(old);
  await assert.rejects(scope(A,()=>manager.getConnectionForTenant(A,{...cfg(A),password:'rotated-fixture-only'})),/TENANT_CONFIG_CHANGED/);
  await Promise.all([manager.closeTenant(A),manager.closeTenant(A)]); initializer.cleanupTenant(A);
  await scope(A,async()=>{
    const next=await manager.getConnectionForTenant(A,{...cfg(A),password:'rotated-fixture-only'});
    assert.notEqual(next,old); assert.notEqual(ownership.connectionOwner(next).generation,oldOwner.generation);
    await assert.rejects(old.query('SELECT 1'),/TENANT_GENERATION_STALE/);
    await initializer.initialize(next); await next.query('SELECT 1');
  });
  await manager.closeTenant(A); initializer.cleanupTenant(A);
  console.log('PASS: configuration mismatch refusal, coalesced close, new pool/generation and stale connection rejection (local trust: not a password-authentication test)');
  // Hold real read-only catalog validation at an explicit JS barrier.
  const entered=deferred(), resume=deferred();
  const initialization=scope(A,async()=>{
    const db=await manager.getConnectionForTenant(A,cfg(A));
    const qi=db.getQueryInterface(), original=qi.tableExists.bind(qi); let first=true;
    qi.tableExists=async(...args)=>{if(first){first=false;entered.resolve();await resume.promise;}return original(...args);};
    await initializer.initialize(db);
  }).then(()=>({ok:true}),error=>({error}));
  await Promise.race([entered.promise,initialization.then(result=>{throw result.error||Error('no barrier');})]);
  const closing=manager.closeTenant(A); resume.resolve();
  const result=await initialization; assert.match(result.error?.message||'',/TENANT_GENERATION_STALE/); await closing;
  assert.equal(manager.hasLiveConnections(A),false); initializer.cleanupTenant(A);
  console.log('PASS: close during real catalog initialization prevents publication and drains pool');
  // Empty-only bootstrap check is run against the now-populated disposable B.
  await manager.closeTenant(B); initializer.cleanupTenant(B);
  await assert.rejects(scope(B,async()=>{
    const db=await manager.getConnectionForTenant(B,cfg(B)); await initializer.initialize(db,{mode:'bootstrap'});
  }),/TENANT_BOOTSTRAP_NOT_EMPTY/);
  await manager.closeTenant(B); initializer.cleanupTenant(B);
  console.log('PASS: bootstrap refuses populated disposable schema without repair');
};
