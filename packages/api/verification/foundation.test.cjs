const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os'),
  assert = require('node:assert/strict'),
  { execFileSync } = require('node:child_process');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'toke-lot29-'));
try {
  fs.cpSync(path.join(__dirname, 'fixtures/master'), path.join(temp, 'src/master'), {
    recursive: true,
  });
  const script = path.join(root, 'scripts/patch-postpaid-foundation.cjs');
  assert.match(
    execFileSync(process.execPath, [script, '--root=' + temp], { encoding: 'utf8' }),
    /PREVIEW/,
  );
  const before = fs.readFileSync(path.join(temp, 'src/master/class/GlobalLicense.ts'), 'utf8');
  assert(!before.includes('    this.postpaid_from = data.postpaid_from;'));
  assert.match(
    execFileSync(process.execPath, [script, '--root=' + temp, '--apply'], { encoding: 'utf8' }),
    /APPLIED: 11 files/,
  );
  assert.match(
    execFileSync(process.execPath, [script, '--root=' + temp, '--apply'], { encoding: 'utf8' }),
    /APPLIED: 0 files/,
  );
  function walk(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) walk(full);
      else if (f.name.endsWith('.ts'))
        stripTypeScriptTypes(fs.readFileSync(full, 'utf8'), { mode: 'transform' });
    }
  }
  walk(path.join(temp, 'src/master'));
  let sql = '';
  const migration = require(
    path.join(root, 'migrations/20261006180000-postpaid-mode-foundation.cjs'),
  );
  (async () => {
    await migration.up({
      sequelize: {
        transaction: async (cb) => cb({}),
        query: async (q) => {
          sql += q;
        },
      },
    });
    assert(!sql.includes('CREATE TABLE'));
    assert(sql.includes("billing_mode='POSTPAID' AND postpaid_from IS NOT NULL"));
    assert(sql.includes('cycle_billing_mode_immutable'));
    assert(!/UPDATE.*xa_global_license/.test(sql));
    await assert.rejects(() => migration.down());
    console.log(
      'PASS: source merge preview/apply/idempotence, TS syntax, mode constraints and immutable cycle snapshot. SQL not executed against PostgreSQL.',
    );
  })().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
