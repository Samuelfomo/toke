'use strict';
// Offline, explicit source/import allowlist, no application module execution.
const fs = require('node:fs'),
  path = require('node:path'),
  ts = require('typescript'),
  crypto = require('node:crypto'),
  { builtinModules, createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..'),
  target = process.argv[2];
if (!target || !path.isAbsolute(target) || fs.existsSync(target))
  throw Error('NEW_ABSOLUTE_RELEASE_DIRECTORY_REQUIRED');
const out = path.resolve(target);
if (out === root || out.startsWith(path.join(root, 'packages')))
  throw Error('RELEASE_MUST_NOT_REPLACE_WORKSPACE_PACKAGES');
fs.mkdirSync(out, { recursive: true, mode: 0o755 });
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const inputs = {},
  transformations = [],
  externals = new Set(),
  seen = new Set(),
  pending = ['packages/api/src/automate/automate.ts'];
const banned =
  /(?:\/routes\/|\/app\.ts$|\/server\.ts$|user-session|manager-session|memo-b2|\/persistence\/|\/tenant\/memos\/|provision|generate\.database)/;
function specs(code) {
  const ast = ts.createSourceFile(
      'module.js',
      code,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.JS,
    ),
    result = [];
  function visit(n) {
    if (
      (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
      n.moduleSpecifier &&
      ts.isStringLiteral(n.moduleSpecifier)
    )
      result.push(n.moduleSpecifier.text);
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
      if (!n.arguments[0] || !ts.isStringLiteral(n.arguments[0]))
        throw Error('NON_LITERAL_DYNAMIC_IMPORT');
      result.push(n.arguments[0].text);
    }
    ts.forEachChild(n, visit);
  }
  visit(ast);
  return result;
}
function resolveRelative(file, spec) {
  let p = path.posix.normalize(
    path.posix.join(path.posix.dirname(file), spec.replace(/\.js$/, '.ts')),
  );
  if (!fs.existsSync(path.join(root, p)) && !path.extname(p).endsWith('.ts')) p += '.ts';
  // extensionless filenames such as db.config are not TS extensions.
  if (!fs.existsSync(path.join(root, p))) p += '.ts';
  if (!fs.existsSync(path.join(root, p))) throw Error('UNRESOLVED_IMPORT ' + file + ' ' + spec);
  return p;
}
while (pending.length) {
  const file = pending.pop();
  if (seen.has(file)) continue;
  if (banned.test(file)) throw Error('FORBIDDEN_RUNTIME_MODULE ' + file);
  seen.add(file);
  inputs[file] = hash(path.join(root, file));
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  for (const spec of specs(code)) {
    if (spec.startsWith('.')) pending.push(resolveRelative(file, spec));
    else externals.add(spec);
  }
}
function compile(name, files, options = {}) {
  const config = path.join(out, name + '.build.json');
  const inputConfig = ts.readConfigFile(
    path.join(root, 'packages', name, 'tsconfig.json'),
    ts.sys.readFile,
  );
  if (inputConfig.error) throw Error('CONFIG_INVALID');
  const parsed = ts.parseJsonConfigFileContent(
    inputConfig.config,
    ts.sys,
    path.join(root, 'packages', name),
  );
  const program = ts.createProgram(files ?? parsed.fileNames, {
    ...parsed.options,
    outDir: path.join(out, name === 'api' ? 'dist' : 'node_modules/@toke/shared/dist'),
    rootDir: path.join(root, 'packages', name, 'src'),
    incremental: false,
    declaration: true,
    declarationMap: false,
    sourceMap: false,
    removeComments: true,
    noEmitOnError: true,
    ...options,
  });
  const errors = ts.getPreEmitDiagnostics(program);
  if (errors.length)
    throw Error(
      ts.formatDiagnosticsWithColorAndContext(errors, {
        getCanonicalFileName: (f) => f,
        getCurrentDirectory: () => root,
        getNewLine: () => '\n',
      }),
    );
  const emit = program.emit();
  if (emit.emitSkipped) throw Error('EMIT_FAILED');
  fs.writeFileSync(
    config,
    JSON.stringify(
      {
        sourceConfig: 'packages/' + name + '/tsconfig.json',
        compiler: 'typescript@' + ts.version,
        files: files?.map((f) => path.relative(root, f)) ?? 'shared tsconfig include',
        options: {
          target: 'ES2022/ES2020',
          module: 'ESNext',
          declaration: true,
          sourceMap: false,
          removeComments: true,
        },
      },
      null,
      2,
    ),
  );
}
compile('shared');
for (const file of (function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
})(path.join(root, 'packages/shared/src')).filter(
  (f) => f.endsWith('.ts') && !/\.(test|spec)\.ts$/.test(f),
))
  inputs[path.relative(root, file)] = hash(file);
compile(
  'api',
  [...seen]
    .map((f) => path.join(root, f))
    .concat(path.join(root, 'packages/api/src/tenant/database/pg.tenant-driver.d.ts')),
  {
    baseUrl: root,
    paths: { '@toke/shared': [path.join(out, 'node_modules/@toke/shared/dist/index.d.ts')] },
  },
);
inputs['packages/api/src/tenant/database/pg.tenant-driver.d.ts'] = hash(
  path.join(root, 'packages/api/src/tenant/database/pg.tenant-driver.d.ts'),
);
const allowedApi = new Set(
  [...seen].flatMap((f) => {
    const stem = f.replace('packages/api/src/', '').replace(/\.ts$/, '');
    return [stem + '.js'];
  }),
);
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}
for (const file of walk(path.join(out, 'dist')))
  if (!allowedApi.has(path.relative(path.join(out, 'dist'), file))) fs.unlinkSync(file);
// ESM normalization, including the existing extensionless dynamic import.
for (const file of walk(path.join(out, 'dist')).filter((f) => f.endsWith('.js'))) {
  let code = fs.readFileSync(file, 'utf8');
  for (const spec of specs(code))
    if (spec.startsWith('.') && !spec.endsWith('.js')) {
      const destination = path.resolve(path.dirname(file), spec + '.js');
      if (!fs.existsSync(destination)) throw Error('COMPILED_IMPORT_MISSING ' + spec);
      code = code
        .split(JSON.stringify(spec))
        .join(JSON.stringify(spec + '.js'))
        .split("'" + spec + "'")
        .join("'" + spec + ".js'");
      transformations.push({
        file: path.relative(out, file),
        kind: 'explicit-esm-extension',
        from: spec,
        to: spec + '.js',
      });
    }
  fs.writeFileSync(file, code);
}
const cacheFile = path.join(out, 'dist/tools/tenant-cache.service.js'),
  cacheCode = fs.readFileSync(cacheFile, 'utf8');
const old = "'/opt/toke/packages/api/cache/tenants.json'";
if (cacheCode.split(old).length !== 2) throw Error('CACHE_PATH_TRANSFORM_PRECONDITION');
fs.writeFileSync(cacheFile, cacheCode.replace(old, 'process.env.C_WORKER_TENANT_CACHE_FILE'));
transformations.push({
  file: 'dist/tools/tenant-cache.service.js',
  kind: 'release-configuration-only',
  from: '/opt/toke/packages/api/cache/tenants.json',
  to: 'explicit C_WORKER_TENANT_CACHE_FILE validated by run.mjs',
});
fs.writeFileSync(
  path.join(out, 'package.json'),
  JSON.stringify(
    {
      name: 'toke-c-worker-release',
      version: '1.0.0',
      private: true,
      type: 'module',
      scripts: { start: 'node run.mjs' },
    },
    null,
    2,
  ),
);
// Runtime Shared has no live @toke/api import. Remove the workspace metadata
// cycle rather than shipping the API application or linking to this workspace.
const sharedManifest = JSON.parse(
  fs.readFileSync(path.join(root, 'packages/shared/package.json'), 'utf8'),
);
fs.writeFileSync(
  path.join(out, 'node_modules/@toke/shared/package.json'),
  JSON.stringify(
    {
      name: sharedManifest.name,
      version: sharedManifest.version,
      type: 'module',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      dependencies: { zod: lock.packages['node_modules/zod'].version },
    },
    null,
    2,
  ),
);
for (const file of walk(path.join(out, 'node_modules/@toke/shared/dist')).filter((f) =>
  f.endsWith('.js'),
))
  for (const spec of specs(fs.readFileSync(file, 'utf8')))
    if (!spec.startsWith('.')) externals.add(spec);
fs.copyFileSync(path.join(__dirname, 'run.mjs'), path.join(out, 'run.mjs'));
inputs['packages/api/release/c-worker/run.mjs'] = hash(path.join(__dirname, 'run.mjs'));
fs.writeFileSync(
  path.join(out, 'ecosystem.config.cjs'),
  `module.exports={apps:[{name:'toke-rotation',cwd:__dirname,script:'run.mjs',instances:1,exec_mode:'fork',autorestart:false,kill_timeout:45000,env_production:{NODE_ENV:'production',TZ:'Africa/Douala',C_WORKER_TENANT_CACHE_FILE:process.env.C_WORKER_TENANT_CACHE_FILE}}]};\n`,
);
fs.copyFileSync(path.join(root, 'package-lock.json'), path.join(out, 'workspace.lock.json'));
const packages = [],
  copied = new Set();
const builtin = new Set(builtinModules.flatMap((x) => [x, 'node:' + x]));
function copyPackage(name, from) {
  if (builtin.has(name) || name === '@toke/shared') return;
  const req = createRequire(path.join(from, 'package.json'));
  let resolved;
  try {
    try {
      resolved = req.resolve(name + '/package.json');
    } catch {
      resolved = req.resolve(name);
    }
  } catch (e) {
    throw Error('MISSING_LOCKED_PACKAGE ' + name + ' ' + e.code);
  }
  let dir = path.dirname(resolved),
    manifest;
  for (;;) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      const d = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      if (d.name === name) {
        manifest = d;
        break;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) throw Error('PACKAGE_ROOT_MISSING ' + name);
    dir = parent;
  }
  const relative = path.relative(root, dir);
  if (!relative.startsWith('node_modules/')) throw Error('DEPENDENCY_OUTSIDE_NODE_MODULES ' + name);
  const pinned = lock.packages[relative];
  if (!pinned || pinned.version !== manifest.version) throw Error('LOCK_VERSION_MISMATCH ' + name);
  if (copied.has(relative)) return;
  copied.add(relative);
  const dest = path.join(out, relative);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(dir, dest, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(dir, src),
        base = path.basename(src);
      if (
        rel.split(path.sep).includes('node_modules') ||
        base === '.git' ||
        /^\.env/.test(base) ||
        base === '.npmrc'
      )
        return false;
      if (fs.lstatSync(src).isSymbolicLink()) throw Error('PACKAGE_SYMLINK_REFUSED ' + src);
      return true;
    },
  });
  packages.push({
    name,
    version: manifest.version,
    path: relative,
    lockIntegrity: pinned.integrity ?? null,
  });
  for (const dep of Object.keys(manifest.dependencies ?? {})) copyPackage(dep, dir);
  for (const dep of Object.keys(manifest.optionalDependencies ?? {})) {
    try {
      copyPackage(dep, dir);
    } catch (e) {
      if (!String(e.message).startsWith('MISSING_LOCKED_PACKAGE')) throw e;
    }
  }
}
for (const name of externals) copyPackage(name, root);
// Verify every compiled local import exists in the artifact, with no workspace symlink.
for (const folder of ['dist', 'node_modules/@toke/shared/dist'])
  for (const file of walk(path.join(out, folder)).filter((f) => f.endsWith('.js')))
    for (const spec of specs(fs.readFileSync(file, 'utf8')))
      if (spec.startsWith('.') && !fs.existsSync(path.resolve(path.dirname(file), spec)))
        throw Error('UNRESOLVED_RELEASE_IMPORT ' + file + ' ' + spec);
for (const f of [
  'package-lock.json',
  'packages/api/tsconfig.json',
  'packages/shared/tsconfig.json',
  'packages/api/package.json',
  'packages/shared/package.json',
  'packages/api/release/c-worker/build.cjs',
])
  inputs[f] = hash(path.join(root, f));
const manifest = {
  kind: 'C-WORKER-local-candidate',
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  typescript: ts.version,
  sourceFiles: [...seen].sort(),
  sourceSha256: inputs,
  transformations,
  packages: packages.sort((a, b) => a.path.localeCompare(b.path)),
  shared: {
    version: sharedManifest.version,
    runtimeDependencies: ['zod'],
    metadataWorkspaceCycleRemoved: true,
  },
  files: {},
};
for (const file of walk(out)) manifest.files[path.relative(out, file)] = hash(file);
fs.writeFileSync(path.join(out, 'MANIFEST.json'), JSON.stringify(manifest, null, 2));
console.log(
  JSON.stringify({
    artifact: out,
    files: Object.keys(manifest.files).length,
    sourceFiles: seen.size,
    packages: packages.length,
    manifestSha256: hash(path.join(out, 'MANIFEST.json')),
  }),
);
