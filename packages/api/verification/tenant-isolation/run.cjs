'use strict';
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const probes = process.argv[2] === '--framework-probes';
if (process.argv.length > 2 && !probes) throw Error('Only --framework-probes is supported; PostgreSQL integration has a separate explicit launcher');
const files = (probes
  ? ['als-feasibility', 'sequelize-framework-probes', 'express-context-probes']
  : ['acceptance', 'guarded-orm', 'lifecycle', 'business-boundaries', 'actual-http']).map(name => path.join(__dirname, name + '.test.cjs'));
if (!probes) files.push(path.join(__dirname, '../schedule-suggestion-approval.test.cjs'));
const result = spawnSync(process.execPath, ['--test', ...files], {
  stdio: 'inherit', env: { PATH: process.env.PATH, NODE_ENV: 'test' },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
