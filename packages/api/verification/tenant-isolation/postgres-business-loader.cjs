'use strict';
// Closed source loader: no .env, filesystem/network APIs, scheduler or service
// entrypoint is made available to application code. Sequelize/PG are injected.
const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm'),
  ts = require('typescript'),
  assert = require('node:assert/strict');
module.exports = function businessLoader({
  manager,
  initializer,
  context,
  ownership,
  sequelize,
  overrides = {},
  externals = {},
  environment = {},
}) {
  const root = path.resolve(__dirname, '../../../..'),
    cache = new Map(),
    loaded = new Set(),
    exportsIndex = new Map();
  const sharedRoot = 'packages/shared/src/';
  const businessSequelize = {
    ...sequelize,
    Sequelize: class extends sequelize.Sequelize {
      constructor() {
        throw Error('UNSCOPED_SEQUELIZE_CONSTRUCTION_DENIED');
      }
    },
  };
  function scan(dir) {
    for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = dir + ent.name;
      if (ent.isDirectory()) scan(rel + '/');
      else if (rel.endsWith('.ts')) {
        const ast = ts.createSourceFile(
          rel,
          fs.readFileSync(path.join(root, rel), 'utf8'),
          ts.ScriptTarget.Latest,
          true,
        );
        for (const node of ast.statements)
          if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
            const names = node.name
              ? [node.name.text]
              : node.declarationList
                ? node.declarationList.declarations.map((d) => d.name.getText(ast))
                : [];
            for (const name of names) {
              if (!exportsIndex.has(name)) exportsIndex.set(name, rel);
            }
          }
      }
    }
  }
  for (const sub of ['constants/', 'utils/', 'schemas/', 'types/']) scan(sharedRoot + sub);
  const shared = new Proxy(
    {},
    {
      get(_, name) {
        if (name === '__esModule') return false;
      if (name === 'TN') return read('packages/shared/src/schemas/tenant.ts');
        const rel = exportsIndex.get(name);
        assert.ok(rel, 'SHARED_EXPORT_DENIED: ' + String(name));
        return read(rel)[name];
      },
    },
  );
  const stubs = {
    'packages/api/src/tenant/database/db.tenant-manager.ts': { default: manager },
    'packages/api/src/tenant/database/db.initializer.ts': { TableInitializer: initializer },
    'packages/api/src/tenant/database/tenant.context.ts': context,
    'packages/api/src/tenant/database/tenant.ownership.ts': ownership,
    'packages/api/src/tools/revision.ts': {
      TenantRevision: {
        getRevision: async () => 'v01-fixture',
        generate: async () => 'v01-fixture',
      },
    },
    'packages/api/src/tools/notification.service.ts': {
      FCMService: new Proxy(
        {},
        {
          get() {
            return async () => {
              throw Error('EXTERNAL_NOTIFICATION_DENIED');
            };
          },
        },
      ),
    },
    'packages/api/src/tools/employee.license.service.ts': {
      default: {
        getEmployeeLicense: async () => ({
          status: 200,
          response: { data: { guid: 'v01-fixture-license' } },
        }),
      },
    },
    'packages/api/src/tools/activity.sevice.ts': {
      default: { sendEmployeeLastActivity: async () => ({ status: 200, fixture: true }) },
    },
    ...overrides,
  };
  function read(rel) {
    if (Object.hasOwn(stubs, rel)) return stubs[rel];
    if (cache.has(rel)) return cache.get(rel);
    assert.ok(
      (rel.startsWith(sharedRoot) && !rel.endsWith('/index.ts')) ||
        /^packages\/api\/src\/(tenant\/(class|model|routes)\/|utils\/|tools\/(watcher|glossary|response|country.phone.validation|schedule.suggestion.approval.service|schedule.assignment.adjustment.service|anomaly.detection.service|schedule.resolution.service)\.ts$|middle\/(user-auth|tenant.middleware|ensured-routes)\.ts$|automate\/(automate|rotation.cron)\.ts$|master\/(?:class\/TenantOnboarding\.ts$|model\/TenantOnboardingModel\.ts$|database\/base_model\/db\.tenant-onboarding\.ts$|routes\/(integrator|tenant)\.route\.ts$)|tenant\/database\/db.base\.ts$|master\/database\/db.base\.ts$)/.test(
          rel,
        ),
      'BUSINESS_SOURCE_DENIED: ' + rel,
    );
    const exports = {};
    cache.set(rel, exports);
    loaded.add(rel);
    const code = ts.transpileModule(fs.readFileSync(path.join(root, rel), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    try {
      vm.runInNewContext(
        code,
        {
          exports,
          Buffer,
          Date,
          Intl,
          URL,
          console: { log() {}, error() {}, warn() {}, info() {} },
          process: Object.freeze({ env: Object.freeze({ NODE_ENV: 'test', ...environment }) }),
          require(name) {
            if (Object.hasOwn(externals, name)) return externals[name];
            if (name === 'undici')
              return {
                Agent: class {},
                fetch: async () => {
                  throw Error('OUTBOUND_SOLVER_DENIED');
                },
              };
            if (name === 'libphonenumber-js') return require(name);
            if (name === '@toke/shared') return shared;
            if (name === 'sequelize') return businessSequelize;
            if (name === 'bcrypt') return { ...require('bcrypt'), default: require('bcrypt') };
            if (name === 'zod') return require('zod');
            if (name === 'crypto' || name === 'node:crypto')
              return { ...require('node:crypto'), default: require('node:crypto') };
            if (name === 'node:async_hooks') return require(name);
            if (name.startsWith('.'))
              return read(
                path.posix.normalize(
                  path.posix.join(path.posix.dirname(rel), name.replace(/\.js$/, '') + '.ts'),
                ),
              );
            throw Error('BUSINESS_DEPENDENCY_DENIED: ' + name);
          },
        },
        { filename: rel, timeout: 3000 },
      );
    } catch (error) {
      cache.delete(rel);
      throw error;
    }
    return exports;
  }
  return { load: (rel) => read('packages/api/src/' + rel), shared, loaded, stubs };
};
