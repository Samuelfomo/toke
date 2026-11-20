'use strict';
const { load } = require('./harness.cjs'),
  real = require('sequelize'),
  hooks = require('node:async_hooks'),
  crypto = require('node:crypto');
module.exports = function runtime(pg, sequelize = real) {
  const context = load('tenant/database/tenant.context.ts', {
    'node:async_hooks': hooks,
    'node:crypto': crypto,
  });
  const ownership = load('tenant/database/tenant.ownership.ts', { './tenant.context.js': context });
  const guard = load('tenant/database/tenant.sql-guard.ts', {
    sequelize: real,
    pg: { default: pg },
    'node:async_hooks': hooks,
    './tenant.context.js': context,
    './tenant.ownership.js': ownership,
  });
  const manager = load('tenant/database/db.tenant-manager.ts', {
    sequelize,
    '@toke/shared': { TimezoneConfigUtils: { getCurrentTime: () => new Date() } },
    'node:crypto': crypto,
    './tenant.context.js': context,
    './tenant.ownership.js': ownership,
    './tenant.sql-guard.js': guard,
  }).default;
  const schemas = require('./postgres-schemas.cjs')(real);
  const initializer = load('tenant/database/db.initializer.ts', {
    sequelize: real,
    ...schemas.dependencies,
    './db.tenant-manager.js': { default: manager },
    './tenant.context.js': context,
    './tenant.ownership.js': ownership,
  }).TableInitializer;
  return { manager, initializer, context, ownership, guard, sequelize: real };
};
