const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
function source(f) {
  return stripTypeScriptTypes(read(f), { mode: 'transform' })
    .replace(/^import .*;$/gm, '')
    .replace(/export default class /g, 'class ');
}
const ctx = {
  RenewalDb: class {},
  RenewalPreviewError: class extends Error {},
  RenewalPreparationError: class extends Error {},
};
vm.createContext(ctx);
vm.runInContext(
  source('master/model/RenewalModel.ts') +
    '\n' +
    source('master/class/Renewal.ts') +
    '\nglobalThis.Business=Renewal;',
  ctx,
);
(async () => {
  const calls = [],
    body = {
      actor_user_guid: '7173056141612204',
      idempotency_key: 'renewal-202611',
      payment_method_guid: 100002,
    };
  const data = {
    preview: async (guid) => {
      calls.push(['preview', guid]);
      return { license_guid: guid, is_estimate: true };
    },
    prepare: async (guid, input) => {
      calls.push(['prepare', guid, input]);
      return { replayed: true, payment_transaction_guid: 100101 };
    },
  };
  const business = new ctx.Business(data);
  assert.equal((await business.preview('100020')).license_guid, 100020);
  assert.equal((await business.prepare(100020, body)).replayed, true);
  assert.equal(calls[1][2], body);
  await assert.rejects(() => business.preview('invalid'));
  await assert.rejects(() => business.prepare(1, body));
  await assert.rejects(() => business.prepare(100020, []));
  await assert.rejects(() => business.prepare(100020, null));
  assert.equal(calls.length, 2);
  data.prepare = async () => {
    throw new ctx.RenewalPreparationError('Reconciliation required');
  };
  await assert.rejects(() => business.prepare(100020, body), /Reconciliation/);
  for (const dir of ['database', 'model', 'class', 'routes', 'services'])
    for (const file of fs.readdirSync(path.join(root, 'master', dir))) {
      const text = read(`master/${dir}/${file}`);
      stripTypeScriptTypes(text, { mode: 'transform' });
      if (dir !== 'database')
        assert(
          !/\b(SELECT|INSERT INTO|UPDATE xa_|DELETE FROM)\b/.test(text),
          `SQL outside DBD: ${file}`,
        );
    }
  const route = read('master/routes/renewal.route.ts');
  assert(!route.includes('TableInitializer'));
  assert(!route.includes('.sequelize'));
  assert(route.includes("'/:licenseGuid/preview'"));
  assert(route.includes("'/:licenseGuid/prepare'"));
  assert(
    read('master/services/renewal-preview.ts').includes("from '../database/db.renewal-preview.js'"),
  );
  assert(
    read('master/services/renewal-preparation.ts').includes(
      "from '../database/db.renewal-preparation.js'",
    ),
  );
  console.log(
    'PASS: route/class/model/DBD delegation, input validation, compatible exports, errors and TypeScript syntax.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
