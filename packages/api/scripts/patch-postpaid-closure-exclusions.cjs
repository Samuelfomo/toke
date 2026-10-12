'use strict';
const fs = require('node:fs'),
  path = require('node:path');
const root = path.resolve(
  process.argv.find((s) => s.startsWith('--root='))?.slice(7) || process.cwd(),
);
const file = path.join(root, 'src/master/database/base_model/db.postpaid-closure.ts');
try {
  const old = fs.readFileSync(file, 'utf8');
  const pattern =
    /(SELECT\s+id\s+FROM\s+public\.xa_billing_cycle\s+WHERE\s+global_license\s*=\s*:license)(\s+AND\s+period_start\s*<)/g;
  const matches = [...old.matchAll(pattern)];
  if (
    matches.length === 0 &&
    /global_license\s*=\s*:license\s+AND\s+billing_status\s*<>\s*'CANCELLED'/.test(old)
  ) {
    console.log('Already patched');
    process.exit(0);
  }
  if (matches.length !== 1) throw Error('Exactly one overlap query required; no source written');
  const updated = old.replace(pattern, "$1 AND billing_status<>'CANCELLED'$2");
  if (!process.argv.includes('--apply')) {
    console.log('PREVIEW: one cancelled-cycle filter; add --apply');
    process.exit(0);
  }
  const backup = file + '.lot32-' + Date.now() + '.bak';
  fs.copyFileSync(file, backup);
  fs.writeFileSync(file, updated);
  console.log('APPLIED. Backup: ' + backup);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
