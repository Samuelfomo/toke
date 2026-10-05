const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const {stripTypeScriptTypes}=require('node:module');
const path=require('node:path');const root=path.resolve(__dirname,'..');
function load(file,dependencies={}){
 let source=stripTypeScriptTypes(fs.readFileSync(file,'utf8'),{mode:'transform'});
 source=source.replace(/^import .*;$/gm,'').replace(/export default class /g,'class ').replace(/export (class|function)/g,'$1');
 return vm.runInNewContext(source+'\n;({'+Object.keys(dependencies.exports||{}).join(',')+'});',{...dependencies,console});
}
const money=load(path.resolve(root,'verification/fixtures/renewal-amounts.ts'),{exports:{decimalUnits:1,centsText:1,renewalAmounts:1}});
const input=load(path.resolve(root,'verification/fixtures/activity-monitoring-input.ts'),{exports:{summarizeMonthlyMonitoring:1,ActivityMonitoringInputError:1}});
const {calculateMonthlyPreview}=load(path.join(root,'master/class/MonthlyBillingPreview.ts'),{...money,...input,MonthlyBillingPreviewModel:class{},exports:{calculateMonthlyPreview:1}});
const fixture=(employees)=>({usage:{minimum_seats:5,unit_price_usd:'3.00',employees},currency:'XAF',exchange_rate:'610.500000',taxes:[{guid:100001,tax_rate:'0.1925'}],tax_exempt:false});
let result=calculateMonthlyPreview(fixture([{active_days:1,contractual_status:'TERMINATED'},{active_days:0},{active_days:5,active_days_last_7_days:0}]));
assert.equal(result.billable_employees,2);assert.equal(result.billed_seats,5);
assert.equal(result.amounts.totalUsd,'17.89');assert.equal(result.amounts.totalLocal,'10920.32');
assert.equal(result.invoice_creation_allowed,false);assert.equal(result.mutates_access,false);
result=calculateMonthlyPreview(fixture(Array.from({length:29},()=>({active_days:1}))));
assert.equal(result.billed_seats,29);assert.equal(result.amounts.baseUsd,'87.00');
assert.equal(result.amounts.totalLocal,'63337.85');
const noTax=fixture([]);noTax.tax_exempt=true;noTax.taxes=[];
assert.equal(calculateMonthlyPreview(noTax).amounts.totalUsd,'15.00');
assert.throws(()=>calculateMonthlyPreview({...fixture([]),exchange_rate:'0'}));
assert.throws(()=>calculateMonthlyPreview({...fixture([]),usage:{...fixture([]).usage,unit_price_usd:'-3'}}));
for(const dir of ['routes','class','model'])for(const name of fs.readdirSync(path.join(root,'master',dir))){
 const text=fs.readFileSync(path.join(root,'master',dir,name),'utf8');
 assert(!/\b(SELECT|INSERT INTO|UPDATE xa_|DELETE FROM)\b/.test(text),name);
 stripTypeScriptTypes(text,{mode:'transform'});
}
for(const name of fs.readdirSync(path.join(root,'master/database')))stripTypeScriptTypes(fs.readFileSync(path.join(root,'master/database',name),'utf8'),{mode:'transform'});
const activity=fs.readFileSync(path.join(root,'master/database/db.activity-monitoring.ts'),'utf8');assert(activity.includes('sharedTransaction ? read(sharedTransaction)'));
const db=fs.readFileSync(path.join(root,'master/database/db.monthly-billing-preview.ts'),'utf8');assert(db.includes('SET TRANSACTION READ ONLY'));assert(db.includes('monthlyUsage(licenseGuid,start,end,transaction)'));
console.log('PASS: monthly usage, minimum, taxes, exact amounts, negative cases, architecture and syntax.');
