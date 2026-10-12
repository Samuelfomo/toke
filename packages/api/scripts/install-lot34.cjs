'use strict';
const fs = require('node:fs'),
  path = require('node:path');
const root = process.cwd(),
  files = new Map();
const fragment = (name) => fs.readFileSync(path.join(root, 'patches', name), 'utf8');
const read = (relative) => fs.readFileSync(path.join(root, 'src/master', relative), 'utf8');
function once(source, anchor, value) {
  let positions = [],
    at = source.indexOf(anchor);
  while (at >= 0) {
    const prefix = source.slice(source.lastIndexOf('\n', at - 1) + 1, at);
    if (!prefix.includes('//')) positions.push(at);
    at = source.indexOf(anchor, at + anchor.length);
  }
  if (positions.length !== 1) throw Error('Missing or ambiguous anchor: ' + anchor);
  const p = positions[0];
  return source.slice(0, p) + value + source.slice(p + anchor.length);
}

function handler(source, verb, replacement) {
  const expression = new RegExp('^router\\.' + verb + '\\([^\\n]*[\\s\\S]*?^\\}\\);', 'gm');
  const found = [...source.matchAll(expression)];
  if (found.length !== 1) throw Error('Expected one ' + verb + ' handler');
  return source.replace(expression, replacement.trim());
}
try {
  let route = read('routes/global.license.route.ts'),
    entity = read('class/GlobalLicense.ts'),
    model = read('model/GlobalLicenseModel.ts');
  if ([route, entity, model].every((s) => s.includes('LOT34_INPLACE'))) {
    console.log('Already installed');
    process.exit(0);
  }
  if ([route, entity, model].some((s) => s.includes('LOT34_INPLACE')))
    throw Error('Partial installation: restore source backup before retry');
  if (route.includes('LOT34_SUBSCRIPTION_ROUTER') || route.includes('LicenseSubscriptionRoute'))
    throw Error('Parallel lot34 detected; restore pre-lot34 route before applying');
  route =
    "// LOT34_INPLACE\nimport {LicenseSubscriptionError} from '../class/GlobalLicense.js';\nimport {LicenseSubscriptionInputError} from '../class/license-subscription-input.js';\n" +
    route;
  route = once(
    route,
    'const router = Router();',
    `const router = Router();
function subscriptionFailure(res:Response,e:any){
 return R.handleError(res,e instanceof LicenseSubscriptionInputError?400:e instanceof LicenseSubscriptionError?e.status:e?.name==='SequelizeUniqueConstraintError'?409:500,{code:'license_subscription_failed',message:e instanceof LicenseSubscriptionError||e instanceof LicenseSubscriptionInputError?e.message:'Subscription failed; review server logs'});
}
` + fragment('global-license.routes.ts.txt'),
  );
  route = handler(route, 'post', fragment('global-license.post.ts.txt'));
  for (const verb of ['put', 'delete'])
    route = handler(
      route,
      verb,
      `router.${verb}('/:guid',Ensure.${verb}(),(_req:Request,res:Response)=>R.handleError(res,410,{code:'license_direct_mutation_disabled',message:'Use dedicated payment, renewal, release or administrative operations'}));`,
    );
  // Existing async serializers must be awaited in every list handler.
  route = route.replace(
    /licensesData\?\.map\(\(license\) => license\.toJSON\(\)\) \|\| \[\]/g,
    'await Promise.all((licensesData ?? []).map((license) => license.toJSON()))',
  );
  route = route.replace(
    'R.handleSuccess(res, license.toJSON());',
    'R.handleSuccess(res, await license.toJSON());',
  );
  const publicLookup =
    /      \/\/ Essayer par ID d'abord[\s\S]*?      if \(!license\) \{\n        license = await GlobalLicense\._load\(numericId, true\);\n      \}/;
  if (!publicLookup.test(route)) throw Error('Public GUID lookup anchor missing; no files written');
  route = route.replace(
    publicLookup,
    `      // Public identifiers are GUIDs; internal IDs are never accepted here.
      license = await GlobalLicense._load(GL.validateGlobalLicenseGuid(numericId), true);`,
  );

  entity =
    "// LOT34_INPLACE\nimport {subscriptionInput,subscriptionGuid,subscriptionOffers,LicenseSubscriptionInputError} from './license-subscription-input.js';\nimport type {SubscriptionInput} from './license-subscription-input.js';\nexport {LicenseSubscriptionError} from '../database/base_model/db.license-subscription.js';\n" +
    entity;
  const commented = entity.indexOf('\n// import { BillingCycle, LicenseStatus, Type }');
  if (commented >= 0) entity = entity.slice(0, commented) + '\n';
  entity = once(
    entity,
    'export default class GlobalLicense extends GlobalLicenseModel {',
    'export default class GlobalLicense extends GlobalLicenseModel {\n' +
      fragment('GlobalLicense.members.ts.txt') +
      '\n' +
      fragment('GlobalLicense.serializer.ts.txt'),
  );
  entity = once(
    entity,
    '  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {',
    '  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {\n    if(this.subscriptionResult)return this.subscriptionToJSON();',
  );
  // Global-license responses export tenant GUID; never a raw database relation or unresolved Promise.
  entity = entity.replace('[RS.TENANT]: tenant?.toJSON(),', '[RS.TENANT]: tenant?.getGuid(),');
  const save = /^  async save\(\): Promise<void> \{[\s\S]*?^  \}/m;
  if (!save.test(entity)) throw Error('Save anchor missing');
  entity = entity.replace(
    save,
    `  async save(): Promise<void> {
    if(this.isNew())throw new Error('Initial creation must use GlobalLicense.subscribe()');
    await this.update();
  }`,
  );
  // Remove only the three legacy methods, preserving any later user-added members.
  for (const name of [
    'createInitialBillingCycle',
    'createInitialPaymentTransaction',
    'sendPaymentEmail',
  ]) {
    const expression = new RegExp('^  private async ' + name + '\\([\\s\\S]*?^  \\}\\n', 'm');
    const match = expression.exec(entity);
    if (!match) throw Error('Legacy method requires review: ' + name);
    let begin = match.index;
    const prefix = entity.slice(0, begin);
    const documentation = /  \/\*\*[\s\S]*?\*\/\s*$/.exec(prefix);
    // Only remove the immediately preceding comment, never other members.
    if (documentation) {
      const last = prefix.lastIndexOf('  /**');
      if (
        last >= 0 &&
        prefix.slice(last).includes('*/') &&
        !prefix.slice(last, prefix.lastIndexOf('*/')).includes('\n  private ')
      )
        begin = last;
    }
    entity = entity.slice(0, begin) + entity.slice(match.index + match[0].length);
  }
  // Remove the already-commented complete legacy implementation, if present.
  const old = entity.indexOf('\n// import { BillingCycle, LicenseStatus, Type }');
  if (old >= 0) entity = entity.slice(0, old) + '\n';
  for (const line of [
    "import ExchangeRate from './ExchangeRate.js';",
    "import Billing from './BillingCycle.js';",
    "import PaymentMethod from './PaymentMethod.js';",
    "import LicenseAdjustment from './LicenseAdjustment.js';",
    "import PaymentTransaction from './PaymentTransaction.js';",
    "import TaxRule from './TaxRule.js';",
  ])
    entity = entity.replace(line + '\n', '');
  model =
    "// LOT34_INPLACE\nimport LicenseSubscriptionDb from '../database/base_model/db.license-subscription.js';\nimport type {SubscriptionInput,SubscriptionOffer} from '../class/license-subscription-input.js';\n" +
    model;
  model = once(
    model,
    'export default class GlobalLicenseModel extends BaseModel {',
    'export default class GlobalLicenseModel extends BaseModel {\n' +
      fragment('GlobalLicenseModel.members.ts.txt'),
  );
  // Preserve lot29 additions when present; complete the existing entity mapping otherwise.
  if (!/protected billing_mode\??:/.test(model))
    model = once(
      model,
      '  protected constructor() {',
      "  protected billing_mode?: 'PREPAID'|'POSTPAID';\n  protected constructor() {",
    );
  if (!/protected postpaid_from\??:/.test(model))
    model = once(
      model,
      '  protected constructor() {',
      '  protected postpaid_from?: Date|null;\n  protected constructor() {',
    );
  if (!model.includes("billing_mode: 'billing_mode'"))
    model = once(
      model,
      "    billing_cycle_months: 'billing_cycle_months',",
      "    billing_mode: 'billing_mode',\n    postpaid_from: 'postpaid_from',\n    billing_cycle_months: 'billing_cycle_months',",
    );
  if (!entity.includes('this.billing_mode = data.billing_mode;'))
    entity = once(
      entity,
      '    this.billing_cycle_months = data.billing_cycle_months;',
      '    this.billing_mode = data.billing_mode;\n    this.postpaid_from = data.postpaid_from;\n    this.billing_cycle_months = data.billing_cycle_months;',
    );
  if (!entity.includes('getBillingMode()'))
    entity = once(
      entity,
      '  // LOT34_EXISTING_ENTITY',
      `  getBillingMode(): 'PREPAID'|'POSTPAID' {return this.billing_mode ?? 'PREPAID';}
  getPostpaidFrom():Date|null {return this.postpaid_from ?? null;}
  // LOT34_EXISTING_ENTITY`,
    );
  if (!entity.includes('setBillingMode('))
    entity = once(
      entity,
      '  // LOT34_EXISTING_ENTITY',
      `  setBillingMode(value:'PREPAID'|'POSTPAID'):GlobalLicense {
    if(value!=='PREPAID'&&value!=='POSTPAID')throw new Error('Invalid billing mode');this.billing_mode=value;return this;
  }
  setPostpaidFrom(value:Date|null):GlobalLicense {
    if(value!==null&&!(value instanceof Date&&Number.isFinite(value.getTime())))throw new Error('Invalid postpaid start');this.postpaid_from=value;return this;
  }
  // LOT34_EXISTING_ENTITY`,
    );
  if (!entity.includes('billing_mode: this.billing_mode'))
    entity = once(
      entity,
      '    const baseData = {',
      "    const baseData = {\n      billing_mode: this.billing_mode ?? 'PREPAID',\n      postpaid_from: this.postpaid_from ?? null,",
    );
  files.set('routes/global.license.route.ts', route);
  files.set('class/GlobalLicense.ts', entity);
  files.set('model/GlobalLicenseModel.ts', model);
  if (!process.argv.includes('--apply')) {
    console.log('PREVIEW: 3 existing files; no duplicate route/entity, no file written');
    process.exit(0);
  }
  const backup = path.join(root, 'verification', 'lot34-inplace-backup-' + Date.now());
  for (const [relative] of files) {
    const dest = path.join(backup, relative);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, 'src/master', relative), dest);
  }
  for (const [relative, source] of files)
    fs.writeFileSync(path.join(root, 'src/master', relative), source);
  console.log('APPLIED: 3 files. Backup: ' + backup);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
