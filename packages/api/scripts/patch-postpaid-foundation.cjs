'use strict';
const fs = require('node:fs'),
  path = require('node:path');
const root = path.resolve(
  process.argv.find((x) => x.startsWith('--root='))?.slice(7) || process.cwd(),
);
const apply = process.argv.includes('--apply'),
  changes = new Map();
function insert(file, anchor, addition, marker) {
  const full = path.join(root, 'src/master', file),
    source = changes.get(full) ?? fs.readFileSync(full, 'utf8');
  if (source.includes(marker)) return;
  const at = source.indexOf(anchor);
  if (at < 0) throw new Error('Anchor not found; no files written: ' + file);
  changes.set(full, source.slice(0, at) + addition + source.slice(at));
}
try {
  insert(
    'database/data/global.license.db.ts',
    '    billing_cycle_months: {',
    "    billing_mode: { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'PREPAID', validate: { isIn: [['PREPAID', 'POSTPAID']] } },\n    postpaid_from: { type: DataTypes.DATE, allowNull: true },\n",
    '    postpaid_from: {',
  );
  insert(
    'database/data/billing.cycle.db.ts',
    '    global_license: {',
    "    billing_mode: { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'PREPAID', validate: { isIn: [['PREPAID', 'POSTPAID']] } },\n",
    '    billing_mode: {',
  );
  insert(
    'model/GlobalLicenseModel.ts',
    "    billing_cycle_months: 'billing_cycle_months',",
    "    billing_mode: 'billing_mode',\n    postpaid_from: 'postpaid_from',\n",
    "    postpaid_from: 'postpaid_from',",
  );
  insert(
    'model/GlobalLicenseModel.ts',
    '  protected billing_cycle_months?:',
    "  protected billing_mode?: 'PREPAID' | 'POSTPAID';\n  protected postpaid_from?: Date | null;\n",
    '  protected postpaid_from?:',
  );
  insert(
    'class/GlobalLicense.ts',
    '      [RS.BILLING_CYCLE_MONTHS]: this.billing_cycle_months,',
    "      billing_mode: this.billing_mode ?? 'PREPAID',\n      postpaid_from: this.postpaid_from ?? null,\n",
    '      postpaid_from: this.postpaid_from',
  );
  insert(
    'class/GlobalLicense.ts',
    '    this.billing_cycle_months = data.billing_cycle_months;',
    '    this.billing_mode = data.billing_mode;\n    this.postpaid_from = data.postpaid_from;\n',
    '    this.postpaid_from = data.postpaid_from;',
  );
  insert(
    'model/BillingCycleModel.ts',
    "    global_license: 'global_license',",
    "    billing_mode: 'billing_mode',\n",
    "    billing_mode: 'billing_mode',",
  );
  insert(
    'model/BillingCycleModel.ts',
    '  protected global_license?:',
    "  protected billing_mode?: 'PREPAID' | 'POSTPAID';\n",
    '  protected billing_mode?:',
  );
  insert(
    'class/BillingCycle.ts',
    '    this.global_license = data.global_license;',
    '    this.billing_mode = data.billing_mode;\n',
    '    this.billing_mode = data.billing_mode;',
  );
  insert(
    'class/BillingCycle.ts',
    '      [RS.GUID]: this.guid,',
    "      billing_mode: this.billing_mode ?? 'PREPAID',\n",
    '      billing_mode: this.billing_mode',
  );
  const guards = [
    [
      'db.renewal-preview.ts',
      "  if (!license) throw new RenewalPreviewError('License not found');",
      "  if(license?.billing_mode==='POSTPAID')throw new RenewalPreviewError('Postpaid closure is required; prepaid renewal is forbidden');",
    ],
    [
      'db.renewal-preparation.ts',
      "  if (!license) throw new RenewalPreparationError('License not found');",
      "  if(license?.billing_mode==='POSTPAID')throw new RenewalPreparationError('Postpaid closure is required; prepaid preparation is forbidden');",
    ],
    [
      'db.seat-assignment.ts',
      "    if (!license) throw new SeatAssignmentError('License not found');",
      "    if(action==='ASSIGN' && license?.billing_mode==='POSTPAID')throw new SeatAssignmentError('Paid-seat allocation is reserved for prepaid licenses');",
    ],
    [
      'db.cash-confirmation.ts',
      "    if (!license) throw new CashConfirmationError('License not found');",
      "    if(license?.billing_mode==='POSTPAID'||debt?.billing_mode==='POSTPAID')throw new CashConfirmationError('Use postpaid settlement; prepaid rights must not be issued');",
    ],
    [
      'db.cash-installment.ts',
      "  if (!l) throw new CashInstallmentError('License missing');",
      "  if(l?.billing_mode==='POSTPAID'||c?.billing_mode==='POSTPAID')throw new CashInstallmentError('Use postpaid settlement; prepaid rights must not be issued');",
    ],
  ];
  for (const [file, anchor, guard] of guards) {
    insert('database/base_model/' + file, anchor, guard + '\n', guard);
  }
  if (!apply) {
    console.log('PREVIEW: ' + changes.size + ' files; add --apply to modify sources.');
    process.exit(0);
  }
  const backup = path.join(root, 'verification', 'lot29-source-backup-' + Date.now());
  // Validate all anchors before writing any file; preserve every original source in a backup.
  for (const full of changes.keys()) {
    const dest = path.join(backup, path.relative(root, full));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(full, dest);
  }
  for (const [full, source] of changes) fs.writeFileSync(full, source);
  console.log('APPLIED: ' + changes.size + ' files. Backup: ' + backup);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
