'use strict';

// Static, read-only inventory. Does not import or execute application modules.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../../..');
const ignored = new Set(['node_modules', 'dist', '.git', '.venv', 'verification', 'public', 'assets']);
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (/\.(ts|js|cjs)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) files.push(absolute);
  }
}
walk(path.join(root, 'packages'));
const direct = [], dependencies = [], asyncSites = [], imports = new Map();
for (const filename of files.sort()) {
  const text = fs.readFileSync(filename, 'utf8');
  const ast = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true);
  const relative = path.relative(root, filename);
  const localImports = [];
  imports.set(relative, localImports);
  let tenantCode = relative.includes('/tenant/') || relative.includes('/automate/');
  const record = (node, kind) => ({ file: relative, line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, kind, code: node.getText(ast).replace(/\s+/g, ' ').slice(0, 220) });
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const specifier = statement.moduleSpecifier.text;
    if (specifier.startsWith('.')) {
      const target = path.resolve(path.dirname(filename), specifier);
      const candidates = [target, target.replace(/\.js$/, '.ts'), `${target}.ts`, path.join(target, 'index.ts')];
      const found = candidates.find(candidate => files.includes(candidate));
      if (found) localImports.push(path.relative(root, found));
    }
    if (/db\.tenant-manager|(?:tenant\/database\/db\.(?:base|initializer|config))/.test(specifier)) {
      tenantCode = true;
      dependencies.push(record(statement, 'tenant-import'));
    } else if (relative.includes('/tenant/') && /database\/db\.(base|initializer|config)/.test(specifier)) {
      dependencies.push(record(statement, 'tenant-import'));
    }
  }
  function visit(node) {
    if (ts.isPropertyAccessExpression(node) && /^(currentTenant|setCurrentTenant|getCurrentTenant|getConnectionForTenant|getConnectionSync|closeAllConnections)$/.test(node.name.text) || ts.isPropertyAccessExpression(node) && node.name.text === 'getConnection' && node.expression.getText(ast) === 'TenantManager') direct.push(record(node.parent && ts.isCallExpression(node.parent) ? node.parent : node, 'direct-reference'));
    if (ts.isPropertyDeclaration(node) && node.name?.getText(ast) === 'currentTenant') direct.push(record(node, 'field'));
    if (tenantCode && ts.isCallExpression(node)) {
      const callee = node.expression.getText(ast);
      if (/\.transaction$|\.query$|\.getModel$|\.getAllModels$|\.getConnection$|\.initialize$|\.getInstance$/.test(callee)) dependencies.push(record(node, 'indirect-access'));
      if (/\.transaction$|\.afterCommit$|\.on$|\.once$|\.schedule$|^setTimeout$|^setInterval$|Promise\.all/.test(callee)) asyncSites.push(record(node, 'async-boundary'));
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
const affected = new Set(['packages/api/src/tenant/database/db.tenant-manager.ts', 'packages/api/src/tenant/database/db.initializer.ts', 'packages/api/src/tenant/database/db.base.ts', 'packages/api/src/tenant/database/db.config.ts']);
let changed = true;
while (changed) {
  changed = false;
  for (const [file, targets] of imports) if (!affected.has(file) && targets.some(target => affected.has(target))) { affected.add(file); changed = true; }
}
const result = { scope: 'Active AST nodes in packages, excluding dependencies/build output/tests/assets; comments excluded. Import closure is an overapproximation, not a runtime call graph; unresolved aliases/dynamic access require manual review.', counts: { files: files.length, direct: direct.length, dependencies: dependencies.length, asyncSites: asyncSites.length, affectedFiles: affected.size }, direct, dependencies, asyncSites, affectedFiles: [...affected].sort() };
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
