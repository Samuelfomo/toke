'use strict';
const assert = require('node:assert/strict'),
  express = require('express');
module.exports = async function pointageHTTP(env) {
  const { A, B, cfg, scope, fixtures, seed, initializer, T, manager, socket } = env;
  const effects = new Map();
  function sent(tenant, kind) {
    assert.ok([A,B].includes(tenant));
    const last=env.wire.filter(q=>q.database===cfg(tenant).database&&/^(?:START TRANSACTION|COMMIT|ROLLBACK)/i.test(q.text)).at(-1);
    assert.match(last?.text||'',/^COMMIT/i,'external effect must follow confirmed commit');
    const key=tenant+kind;effects.set(key,(effects.get(key)||0)+1);
  }
  const loader = require('./postgres-business-loader.cjs')({
    ...env,
    externals: { express },
    overrides: {
      'packages/api/src/tools/activity.sevice.ts': { default: { sendEmployeeLastActivity:async data=>{sent(data.tenant,'activity');return {status:200,fixture:true};} } },
      'packages/api/src/tools/notification.service.ts': { FCMService: { sendToToken:async token=>{sent(token,'notification');} } },
      'packages/api/src/tools/tenant-cache.service.ts': {
        default: {
          getTenantConfig: async (domain) => {
            assert.ok([A, B].includes(domain));
            return { ...cfg(domain), reference: domain };
          },
        },
      },
      'packages/api/src/tools/credential-extractor.service.ts': {
        default: {
          extractCredentials: (req) => ({ subdomain: req.headers['x-v01-tenant'] }),
          validateCredentials: (c) => ({ valid: [A, B].includes(c.subdomain) }),
        },
      },
    },
  });
  const qr = new Map();
  for (const tenant of [A, B])
    await scope(tenant, async () => {
      const f = fixtures.get(tenant);
      await initializer
        .getModel(T.SITES)
        .update({ geofence_radius: 150 }, { where: { id: f.site.id } });
      qr.set(
        tenant,
        await seed('QR_CODE_GENERATION', {
          guid: '710001',
          name: 'V01 QR ' + tenant,
          site: f.site.id,
          manager: f.managerUser.id,
          active: true,
          shared: false,
        }),
      );
    });
  const app = express();
  app.use(express.json());
  const middle = loader.load('middle/tenant.middleware.ts').tenantMiddleware;
  app.use((req, res, next) => Promise.resolve(middle(req, res, next)));
  app.use('/entries', loader.load('tenant/routes/time.entries.route.ts').default);
  app.use((error, req, res, next) => res.status(500).json({ error: error.message }));
  const server = await require('./local-http.cjs')(app, socket, 'pointage');
  const { PointageType: P } = loader.shared;
  const base = Date.now() - 4 * 3600000;
  async function post(tenant, type, index, extra = {}, pin = '1234') {
    const f = fixtures.get(tenant);
    const body = {
      user: f.employee.guid,
      device: f.device.guid,
      site: f.site.guid,
      qr_code: qr.get(tenant).guid,
      pointage_type: type,
      clocked_at: new Date(base + index * 60000).toISOString(),
      latitude: 4,
      longitude: 9,
      gps_accuracy: 5,
      ...extra,
    };
    return server.request('POST', '/entries', body, { 'x-v01-tenant': tenant, 'x-api-pin': pin });
  }
  try {
    const adminAssignment = await scope(A, async () => {
      const role = await seed('ROLES', { code: 'ADMIN-RH', name: 'Admin RH', permissions: {} });
      return seed('USER_ROLES', {
        user: fixtures.get(A).employee.id, role: role.id, assigned_by: null,
      });
    });
    try {
      const start = env.wire.length;
      const denied = await post(A, P.CLOCK_OUT, 0, { latitude: 2.5 });
      assert.equal(denied.status, 403, JSON.stringify(denied.body));
      assert.equal(denied.body.error.code, 'pointage_role_forbidden');
      const waypoint = await server.request('POST', '/entries/waypoint', {
        user: fixtures.get(A).employee.guid,
      }, { 'x-v01-tenant': A, 'x-api-pin': '1234' });
      assert.equal(waypoint.status, 403, JSON.stringify(waypoint.body));
      assert.ok(env.wire.slice(start).every(query => !/^(INSERT|UPDATE|DELETE|START TRANSACTION)/i.test(query.text)));
      assert.equal(effects.size, 0);
    } finally {
      await scope(A, () => initializer.getModel(T.USER_ROLES).destroy({ where: { id: adminAssignment.id } }));
    }
    console.log('PASS POINTAGE ADMIN-RH: both endpoints reject before pointage or licence writes');

    const bad = await post(A, P.CLOCK_IN, 0, {}, '9999');
    assert.equal(bad.status, 401);
    await Promise.all(
      [A, B].map(async (tenant) => {
        const baseline = await scope(tenant, async () => ({
          entries: await initializer.getModel(T.TIME_ENTRIES).count(),
          memos: await initializer.getModel(T.MEMOS).count(),
        }));
        const posted = [],
          responses = [];
        for (const [index, type] of [
          P.CLOCK_IN,
          P.PAUSE_START,
          P.PAUSE_END,
          P.CLOCK_OUT,
        ].entries()) {
          const res = await post(tenant, type, index * 20);
          assert.equal(res.status, 201, tenant + ' ' + type + ' ' + JSON.stringify(res.body));
          assert.equal(res.body.success, true);
          posted.push(String(res.body.data.entry.guid));
          responses.push(res.body.data);
        }
        await scope(tenant, async () => {
          const f = fixtures.get(tenant);
          const rows = await initializer
            .getModel(T.TIME_ENTRIES)
            .findAll({ where: { user: f.employee.id }, order: [['id', 'ASC']] });
          assert.ok(rows.length >= baseline.entries + 4);
          assert.deepEqual(
            rows.filter((row) => posted.includes(String(row.guid))).map((row) => row.pointage_type),
            [P.CLOCK_IN, P.PAUSE_START, P.PAUSE_END, P.CLOCK_OUT],
          );
          const extra = rows
            .slice(baseline.entries)
            .filter((row) => !posted.includes(String(row.guid)));
          assert.ok(
            responses.reduce((n, r) => n + (r.corrections_applied || 0), 0) >= extra.length,
            'extra entries must be declared automatic corrections',
          );
          const session = await initializer.getModel(T.WORK_SESSIONS).findByPk(rows.at(-1).session);
          assert.ok(session.session_end_at);
          assert.equal(
            (await initializer.getModel(T.USERS).findByPk(f.employee.id)).first_name,
            tenant,
          );
        });
        // Existing product rule accepts anomalous clock-ins and records evidence.
        const outside = await post(tenant, P.CLOCK_IN, 100, { latitude: 1, longitude: 1 });
        assert.equal(outside.status, 201, JSON.stringify(outside.body));
        assert.ok(outside.body.data.anomalies_detected > 0);
        assert.equal(outside.body.data.auto_memo_created, true);
        await scope(tenant, async () => {
          assert.ok((await initializer.getModel(T.MEMOS).count()) > baseline.memos);
          assert.ok((await initializer.getModel(T.FRAUD_ALERTS).count()) > 0);
        });
      }),
    );
    assert.throws(() => manager.getCurrentTenant(), /TENANT_CONTEXT_MISSING/);
    console.log(
      'PASS POINTAGE HTTP: real routes/PIN/geofencing/session/pauses/closure/anomaly memos+alerts A/B; outbound activity/license/notifications inert',
    );
    for(const [tenant,coordinate] of [[A,{latitude:0,longitude:9}],[B,{latitude:4,longitude:0}]]){
      const zero=await post(tenant,P.CLOCK_IN,130,coordinate);
      assert.equal(zero.status,201,JSON.stringify(zero.body));
      await scope(tenant,async()=>{
        const entry=await initializer.getModel(T.TIME_ENTRIES).findOne({where:{guid:String(zero.body.data.entry.guid)}});
        assert.equal(Number(entry.latitude),coordinate.latitude);assert.equal(Number(entry.longitude),coordinate.longitude);
        assert.ok(zero.body.data.anomalies_detected>0,'zero outside fixture fence must retain anomaly rules');
      });
      for(const invalid of [{latitude:91},{longitude:181},{latitude:null},{longitude:null},{latitude:'invalid'}]){
        const snapshot=()=>scope(tenant,async()=>Promise.all([T.TIME_ENTRIES,T.WORK_SESSIONS,T.MEMOS,T.FRAUD_ALERTS].map(t=>initializer.getModel(t).count())));
        const before=await snapshot();
        const refused=await post(tenant,P.CLOCK_IN,140,invalid);
        assert.equal(refused.status,400,JSON.stringify(refused.body));
        assert.deepEqual(await snapshot(),before,'invalid coordinate must cause zero partial writes');
      }
    }
    console.log('PASS POINTAGE GPS ZERO: latitude=0 A, longitude=0 B persist accurately with geofence anomalies; invalid/null coordinates rejected before any session/entry/memo/alert write');

    // Separate acceptance: a real INSERT failure must not leave a new session.
    // Do not infer general pointage atomicity from validation-only errors.
    const partialFailures=[];
    for(const [index,tenant] of [A,B].entries()){
      const control=env.controls[index];
      const snapshot=()=>scope(tenant,async()=>Promise.all([T.TIME_ENTRIES,T.WORK_SESSIONS,T.MEMOS,T.FRAUD_ALERTS].map(t=>initializer.getModel(t).count())));
      const before=await snapshot();
      await control.query(`CREATE FUNCTION public.v01_pointage_insert_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'V01_POINTAGE_INSERT_FAILURE'; END $$`);
      try{
        await control.query(`CREATE TRIGGER v01_pointage_insert_failure BEFORE INSERT ON public.tk_time_entries FOR EACH ROW WHEN (NEW.latitude=2.5) EXECUTE FUNCTION public.v01_pointage_insert_failure()`);
        const refused=await post(tenant,P.CLOCK_IN,160,{latitude:2.5});
        assert.ok(refused.status>=400,JSON.stringify(refused.body));
        assert.match(JSON.stringify(refused.body),/V01_POINTAGE_INSERT_FAILURE/);
        const after=await snapshot();
        if(JSON.stringify(before)!==JSON.stringify(after)){
          console.error('OBSERVED POINTAGE SQL ATOMICITY '+tenant+': counts before='+JSON.stringify(before)+' after='+JSON.stringify(after));
          partialFailures.push(tenant);
        }
      }finally{
        await control.query('DROP TRIGGER IF EXISTS v01_pointage_insert_failure ON public.tk_time_entries');
        await control.query('DROP FUNCTION public.v01_pointage_insert_failure()');
      }
    }
    assert.equal(partialFailures.length,0,'POINTAGE_SQL_ATOMICITY_REQUIRED: failed entry INSERT must not retain a session; separate pre-existing defect, not repaired by GPS presence validation');
    const snapshotClockOut = () => scope(A, async () => Promise.all(
      [T.WORK_SESSIONS, T.TIME_ENTRIES, T.MEMOS, T.FRAUD_ALERTS].map(table =>
        initializer.getModel(table).findAll({ raw: true, order: [['id', 'ASC']] }),
      ),
    ));
    const control = env.controls[0];
    const beforeClockOut = await snapshotClockOut();
    const beforeEffects = [...effects];
    await control.query("CREATE FUNCTION public.v01_clockout_memo_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'V01_CLOCKOUT_MEMO_FAILURE'; END $$");
    try {
      await control.query('CREATE TRIGGER v01_clockout_memo_failure BEFORE INSERT ON public.tk_memos FOR EACH ROW EXECUTE FUNCTION public.v01_clockout_memo_failure()');
      for (const [index, type] of [P.CLOCK_OUT, P.PAUSE_START, P.EXTERNAL_MISSION, P.EXTERNAL_MISSION_END].entries()) {
        const result = await post(A, type, 165 + index, { latitude: 2.5 });
        assert.ok(result.status >= 400, JSON.stringify(result.body));
        assert.match(JSON.stringify(result.body), /V01_CLOCKOUT_MEMO_FAILURE/);
        assert.deepEqual(await snapshotClockOut(), beforeClockOut, type);
        assert.deepEqual([...effects], beforeEffects, type);
      }
    } finally {
      await control.query('DROP TRIGGER IF EXISTS v01_clockout_memo_failure ON public.tk_memos');
      await control.query('DROP FUNCTION public.v01_clockout_memo_failure()');
    }
    console.log('PASS POINTAGE ATOMICITY: memo failure rolls back clock-out, pause start and both mission types');

    await require('./postgres-clockin-atomicity.cjs')({...env,post,P,effects});

  } finally {
    await server.close();
  }
};
