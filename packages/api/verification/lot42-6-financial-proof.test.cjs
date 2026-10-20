const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
const sql = fs.readFileSync(path.join(root, 'migrations/20261020223000-usage-regularization-valid-settlement.cjs'),'utf8');
for (const pattern of [
  /p_at\s*>=\s*a\.payment_due_date/,
  /p\.adjustment\s*=\s*a\.id/,
  /p\.source_type\s*=\s*'ADJUSTMENT'/,
  /p\.billing_cycle\s+IS\s+NULL/,
  /p\.transaction_status::text\s*=\s*'COMPLETED'/,
  /p\.amount_usd\s*=\s*a\.total_amount_usd/,
  /p\.amount_local\s*=\s*a\.total_amount_local/,
  /p\.currency_code\s*=\s*a\.billing_currency_code/,
  /p\.exchange_rate_used\s*=\s*a\.exchange_rate_used/,
  /NOT EXISTS/,
]) assert.match(sql,pattern);
console.log('Lot 42.6 settlement proof structural checks passed (not PostgreSQL execution)');
