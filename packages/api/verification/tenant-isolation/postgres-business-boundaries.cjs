'use strict';
const assert = require('node:assert/strict');
module.exports = async function boundaries(env) {
  const {
    manager,
    initializer,
    context,
    ownership,
    sequelize,
    cfg,
    A,
    B,
    fixtures,
    check,
    localPG,
    socket,
    port,
  } = env;
  const master = new sequelize.Sequelize('postgres', 'v01_control', '', {
    host: socket,
    port,
    dialect: 'postgres',
    dialectModule: localPG,
    logging: false,
  });
  try {
    const records = master.define(
      'v01_master_fixture',
      {
        domain: { type: sequelize.DataTypes.TEXT, primaryKey: true },
        marker: sequelize.DataTypes.TEXT,
      },
      { timestamps: false },
    );
    await records.sync();
    for (const tenant of [A, B]) await records.create({ domain: tenant, marker: tenant });
    await check('Master real SQL/CRUD independent of tenant context', async () => {
      const loader = require('./postgres-business-loader.cjs')({
        ...env,
        overrides: {
          'packages/api/src/master/database/db.initializer.ts': {
            TableInitializer: { getModel: () => records },
          },
          'packages/api/src/master/database/db.config.ts': {
            default: { getInstance: async () => master },
          },
        },
      });
      const Base = loader.load('master/database/db.base.ts').default;
      class Crud extends Base {
        async read(domain) {
          return this.findOne('v01_master_fixture', { domain });
        }
      }
      assert.equal((await new Crud().read(A)).marker, A);
      await manager.runTenantOperation(B, async () => {
        assert.equal((await new Crud().read(A)).marker, A);
      });
      assert.throws(() => manager.getCurrentTenant(), /TENANT_CONTEXT_MISSING/);
    });
    await check('integrator three real handlers SQL A/B and errors', async () => {
      const routes = [];
      const router = new Proxy(
        {},
        {
          get(_, method) {
            return (route, ...handlers) => routes.push({ method, route, handler: handlers.at(-1) });
          },
        },
      );
      class Redis {
        on() {}
        async set() {}
        async sadd() {}
        async expire() {}
      }
      const wrap = (row) => ({
        getSubdomain: () => row.domain,
        getDatabaseName: () => cfg(row.domain).database,
        getGuid: () => (row.domain === A ? '800001' : '800002'),
        toJSON: () => ({
          guid: row.domain === A ? '800001' : '800002',
          name: row.domain,
          status: 'ACTIVE',
        }),
      });
      let broken = false;
      const loader = require('./postgres-business-loader.cjs')({
        ...env,
        externals: { express: { Router: () => router }, ioredis: { default: Redis } },
        overrides: {
          'packages/api/src/master/class/Tenant.ts': {
            default: {
              _list: async () => (await records.findAll()).map(wrap),
              _load: async (domain) => {
                const row = await records.findByPk(domain);
                return row ? wrap(row) : null;
              },
            },
          },
          'packages/api/src/tools/tenant-cache.service.ts': {
            default: {
              getTenantConfig: async (domain) => {
                if (broken && domain === A) throw Error('FIXTURE_INTEGRATOR_FAILURE');
                return cfg(domain);
              },
            },
          },
          'packages/api/src/tools/send.email.service.ts': { default: {} },
          'packages/api/src/tools/user.authentication.service.ts': {
            UserAuthenticationService: {
              auth: async (email, domain) =>
                manager.runTenantOperation(domain, async () => {
                  const db = await manager.getConnectionForTenant(domain, cfg(domain));
                  await initializer.initialize(db);
                  const table = loader.load('utils/response.model.ts').tableName.USERS;
                  const user = await initializer.getModel(table).findOne({ where: { email } });
                  return {
                    status: 200,
                    response: { guid: user.guid, first_name: user.first_name },
                  };
                }),
            },
          },
        },
      });
      loader.load('master/routes/integrator.route.ts');
      async function invoke(method, route, req) {
        const res = {
          code: 200,
          locals: {
            integratorToken: 'v01-fixture-token',
            integratorSession: { email: 'fixture@v01.invalid' },
          },
          status(n) {
            this.code = n;
            return this;
          },
          json(v) {
            this.body = v;
            return this;
          },
        };
        await routes.find((r) => r.method === method && r.route === route).handler(req, res);
        assert.throws(() => manager.getCurrentTenant(), /TENANT_CONTEXT_MISSING/);
        return res;
      }
      const list = await invoke('get', '/tenants', {});
      assert.equal(list.code, 200);
      assert.equal(list.body.tenants.length, 2);
      await Promise.all(
        [A, B].map(async (tenant) => {
          const responsibles = await invoke('get', '/tenants/:subdomain/responsibles', {
            params: { subdomain: tenant },
          });
          assert.equal(responsibles.code, 200);
          assert.ok(responsibles.body.profiles.length > 0);
          const selected = await invoke('post', '/context/select', {
            body: { subdomain: tenant, userGuid: fixtures.get(tenant).managerUser.guid },
          });
          assert.equal(selected.code, 200, JSON.stringify(selected.body));
          assert.equal(selected.body.user.first_name, tenant);
        }),
      );
      broken = true;
      assert.equal(
        (await invoke('get', '/tenants/:subdomain/responsibles', { params: { subdomain: A } }))
          .code,
        503,
      );
      assert.equal(
        (await invoke('get', '/tenants/:subdomain/responsibles', { params: { subdomain: B } }))
          .code,
        200,
      );
    });
    await check('controlled new fictitious tenant provisioning + utility existing', async () => {
      // Only this admin test adapter injects local options. The actual utility's
      // CREATE ROLE/DB/extensions SQL and its scope implementation are executed.
      class ProvisioningSequelize extends sequelize.Sequelize {
        constructor(database, username, password, options) {
          assert.ok(['postgres', 'v01_provisioned'].includes(database));
          assert.equal(username, 'v01_control');
          assert.equal(options.host, socket);
          assert.equal(options.port, port);
          super(database, username, password, {
            ...options,
            dialectModule: localPG,
            logging: false,
          });
        }
      }
      const loader = require('./postgres-business-loader.cjs')({
        ...env,
        externals: { sequelize: { ...sequelize, Sequelize: ProvisioningSequelize } },
        environment: {
          DB_SUPERUSER: 'v01_control',
          DB_SUPERPASS: '',
          DB_HOST: socket,
          DB_PORT: String(port),
        },
      });
      const util = loader.load('utils/generate.database.ts').default;
      const created = await util.createDatabase(
        'v01_provisioned',
        'v01_provisioned_role',
        'V01-only-fictitious',
      );
      assert.equal(created.success, true, created.error);
      assert.equal(created.created, true);
      const C = 'provisioned.v01.invalid',
        config = {
          host: socket,
          port,
          database: 'v01_provisioned',
          username: 'v01_provisioned_role',
          password: 'V01-only-fictitious',
        };
      await manager.runTenantOperation(C, async () => {
        const db = await manager.getConnectionForTenant(C, config);
        await initializer.initialize(db, { mode: 'bootstrap' });
        assert.equal(initializer.getStats().tableCount, 30);
      });
      await util.initializeDatabase(
        C,
        port,
        socket,
        config.database,
        config.username,
        config.password,
      );
      assert.throws(() => manager.getCurrentTenant(), /TENANT_CONTEXT_MISSING/);
      const existing = await util.createDatabase(config.database, config.username, config.password);
      assert.equal(existing.success, true, existing.error);
      assert.equal(existing.created, false);
      await manager.closeTenant(C);
      initializer.cleanupTenant(C);
    });
  } finally {
    await master.close();
  }
};
