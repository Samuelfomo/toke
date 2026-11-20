'use strict';
const assert = require('node:assert/strict'),
  express = require('express');
const targets = {
  810001: { db: 'v01_http_new', role: 'v01_http_new_role', domain: 'v01httpnew' },
  810002: { db: 'v01_http_fail', role: 'v01_http_fail_role', domain: 'v01httpfail' },
  810003: { db: 'v01_concurrent_new', role: 'v01_concurrent_role', domain: 'v01concurrent' },
};
module.exports = async function provisioningFixture(env) {
  const { sequelize, localPG, socket, port, manager, initializer } = env;
  const master = new sequelize.Sequelize('postgres', 'v01_control', '', {
    host: socket,
    port,
    dialect: 'postgres',
    dialectModule: localPG,
    logging: false,
  });
  const catalog = master.define(
    'v01_provision_catalog',
    {
      guid: { type: sequelize.DataTypes.INTEGER, primaryKey: true },
      subdomain: { type: sequelize.DataTypes.TEXT, unique: true },
      database: sequelize.DataTypes.TEXT,
      username: sequelize.DataTypes.TEXT,
      password: sequelize.DataTypes.TEXT,
    },
    { timestamps: false },
  );
  // Parent initializes this fixture once; children must only read it.
  if (env.createCatalog) {
    await catalog.sync();
    for (const guid of Object.keys(targets)) await catalog.create({ guid: Number(guid) });
  }
  let loader, failAt;
  class TenantFacade {
    constructor(row) {
      this.row = row;
    }
    static async _load(guid) {
      const row = await catalog.findByPk(Number(guid));
      return row ? new TenantFacade(row) : null;
    }
    getId() {
      return this.row.guid;
    }
    getGuid() {
      return this.row.guid;
    }
    getName() {
      return 'V01 Fixture';
    }
    isActive() {
      return true;
    }
    getSubdomain() {
      return this.row.subdomain;
    }
    setSubdomain(value) {
      this.row.subdomain = value;
    }
    async defineDbSubdomain() {
      await this.row.save();
    }
    getDatabaseName() {
      return this.row.database;
    }
    getDatabaseUsername() {
      return this.row.username;
    }
    getDatabasePassword() {
      return this.row.password;
    }
    setDatabaseConfig(database, username, password) {
      Object.assign(this.row, { database, username, password });
    }
    async defineDatabaseConfig() {
      await this.row.save();
    }
    getBillingAddress() {
      return 'Fixture';
    }
    getCountryCode() {
      return 'CM';
    }
    getBillingEmail() {
      return 'fixture@v01.invalid';
    }
    getBillingPhone() {
      return '000000000';
    }
  }
  class AdministrativeSequelize extends sequelize.Sequelize {
    constructor(database, username, password, options) {
      assert.ok(['postgres', ...Object.values(targets).map((t) => t.db)].includes(database));
      assert.equal(username, 'v01_control');
      assert.equal(options.host, socket);
      assert.equal(options.port, port);
      super(database, username, password, { ...options, dialectModule: localPG, logging: false });
    }
  }
  const caches = new Map();
  const denied = () => {
    throw Error('NON_PROVISIONING_PATH_DENIED');
  };
  const stubDefaults = { default: {} };
  const overrides = {
    'packages/api/src/master/class/Tenant.ts': { default: TenantFacade },
    'packages/api/src/master/class/GlobalLicense.ts': {
      default: {
        _load: async () => ({
          getGuid: () => 830001,
          getLicenseStatus: () => loader.shared.LicenseStatus.ACTIVE,
        }),
      },
    },
    'packages/api/src/master/database/db.initializer.ts': {
      TableInitializer: { getModel: () => catalog },
    },
    'packages/api/src/master/database/base_model/db.onboarding-subscription.ts': {
      default: class {
        constructor() {
          denied();
        }
      },
    },
    'packages/api/src/tools/tenant-onboarding-token.ts': {
      default: {},
      OnboardingError: class extends Error {},
    },
    'packages/api/src/master/class/OnboardingPayment.ts': {
      default: class {
        constructor() {
          denied();
        }
      },
    },
    'packages/api/src/master/class/PaymentMethod.ts': stubDefaults,
    'packages/api/src/master/class/onboarding-commercial.ts': {
      availableMethod: denied,
      calculateOnboardingEstimate: denied,
      enrichOnboardingStatus: denied,
      OnboardingCommercialError: class extends Error {},
      onboardingOffer: denied,
    },
    'packages/api/src/master/class/onboarding-subscription-input.ts': {
      onboardingChoice: denied,
      onboardingRequest: denied,
    },
    'packages/api/src/master/class/Country.ts': stubDefaults,
    'packages/api/src/master/class/Contact.ts': { Contact: {} },
    'packages/api/src/tools/otp-cache.service.ts': stubDefaults,
    'packages/api/src/tools/send.otp.service.ts': stubDefaults,
    'packages/api/src/tools/send.email.service.ts': stubDefaults,
    'packages/api/src/tools/user.authentication.service.ts': { UserAuthenticationService: {} },
    'packages/api/src/tools/cache.data.service.ts': stubDefaults,
    'packages/api/src/tools/user-session.runtime.ts': { managerSessionAuthority: denied },
    'packages/api/src/tools/user-session.authority.ts': { SessionError: class extends Error {} },
    'packages/api/src/master/routes/user-session.route.ts': { sessionFailure: denied },
    'packages/api/src/utils/generate.tenant.config.ts': {
      default: {
        generateTenantConfig: async (name, guid) => {
          const target = targets[guid];
          assert.ok(target);
          return {
            database_name: target.db,
            database_username: target.role,
            database_password: 'V01-only-http-fixture',
          };
        },
      },
    },
    'packages/api/src/tools/tenant-cache.service.ts': {
      default: {
        setTenantConfig: async (domain, config) => {
          caches.set(domain, config);
          if (failAt === 'cache') throw Error('V01_HTTP_PROVISION_FAILURE');
        },
        getTenantConfig: async (domain) => caches.get(domain),
      },
    },
  };
  loader = require('./postgres-business-loader.cjs')({
    ...env,
    overrides,
    externals: { express, sequelize: { ...sequelize, Sequelize: AdministrativeSequelize } },
    environment: {
      DB_HOST: socket,
      DB_PORT: String(port),
      DB_SUPERUSER: 'v01_control',
      DB_SUPERPASS: '',
    },
  });
  const app = express();
  app.use(express.json());
  app.use('/tenants', loader.load('master/routes/tenant.route.ts').default);
  app.use((error, req, res, next) => res.status(500).json({ error: error.message }));
  const server = await require('./local-http.cjs')(app, socket, env.serverName || 'provision');
  return {
    catalog,
    master,
    targets,
    loader,
    caches,
    async request(guid) {
      const target = targets[guid];
      assert.ok(target);
      return server.request('PATCH', '/tenants/' + guid + '/subdomain', {
        subdomain: target.domain,
      });
    },
    setFailure(stage) {
      failAt = stage;
    },
    async close() {
      await server.close();
      await master.close();
    },
  };
};
module.exports.targets = targets;
