'use strict';
// Reviewed schema/constant leaves only. Never load shared's barrel or app entrypoints.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
module.exports = function schemaDependencies(sequelize) {
  const root = path.resolve(__dirname, '../../../..');
  const sharedFiles = ['org.hierarchy', 'poste', 'sites', 'device', 'schedule.assignments', 'work.sessions', 'time.entries', 'rotation.groups', 'rotation.assignments', 'session.templates', 'memos'];
  const shared = {}, cache = new Map();
  const allowed = new Set([
    'packages/api/src/tools/glossary.ts', 'packages/api/src/utils/response.model.ts',
    'packages/shared/src/utils/timezone.config.validation.ts',
    ...sharedFiles.map(name => `packages/shared/src/constants/tenant/${name}.ts`),
  ]);
  const source = fs.readFileSync(path.join(root, 'packages/api/src/tenant/database/db.initializer.ts'), 'utf8');
  const imports = [...source.matchAll(/import \{ (\w+DbStructure) \} from '(\.\/data\/[^']+)';/g)];
  assert.equal(imports.length, 30);
  for (const [, , specifier] of imports) allowed.add('packages/api/src/tenant/database/' + specifier.slice(2).replace(/\.js$/, '.ts'));
  function read(relative) {
    assert.ok(allowed.has(relative), 'SCHEMA_DEPENDENCY_DENIED: ' + relative);
    if (cache.has(relative)) return cache.get(relative);
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, { exports, Date, Buffer, console: Object.freeze({log(){},error(){},warn(){}}),
      require(name) {
        if (name === 'sequelize') return sequelize;
        if (name === '@toke/shared') return shared;
        if (name === 'bcrypt') return { default: require('bcrypt') };
        assert.ok(name.startsWith('.'), 'SCHEMA_IMPORT_DENIED: ' + name);
        return read(path.posix.normalize(path.posix.join(path.posix.dirname(relative), name.replace(/\.js$/, '.ts'))));
      },
    }, { filename: relative, timeout: 2000 });
    cache.set(relative, exports); return exports;
  }
  Object.assign(shared, read('packages/shared/src/utils/timezone.config.validation.ts'));
  for (const name of sharedFiles) Object.assign(shared, read(`packages/shared/src/constants/tenant/${name}.ts`));
  const dependencies = {};
  for (const [, symbol, specifier] of imports) {
    dependencies[specifier] = read('packages/api/src/tenant/database/' + specifier.slice(2).replace(/\.js$/, '.ts'));
    assert.ok(dependencies[specifier][symbol]);
  }
  return { dependencies, shared, structures: imports.map(([,symbol,specifier])=>dependencies[specifier][symbol]) };
};
