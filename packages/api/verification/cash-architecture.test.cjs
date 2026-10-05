const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function js(f){return stripTypeScriptTypes(read(f),{mode:'transform'}).replace(/^import .*;$/gm,'').replace(/export default class /g,'class ').replace(/export /g,'');}
const ctx={CashPaymentDb:class {},CashInstallmentError:class extends Error {},cashCents:v=>BigInt(String(v).replace('.',''))};vm.createContext(ctx);
vm.runInContext(js('master/model/CashPaymentModel.ts')+'\n'+js('master/class/CashPayment.ts')+'\nglobalThis.Business=CashPayment;',ctx);
(async()=>{
 let calls=[];
 const data={confirm:async(i,a)=>{calls.push(['confirm',i,a]);return {replayed:true};},record:async(i)=>{calls.push(['record',i]);return {billing_state:'PARTIALLY_PAID'};},balance:async()=>({outstanding_local:'0.00',received_local:'100.00'})};
 const b=new ctx.Business(data);
 assert.equal((await b.confirm({transactionGuid:100001},{actorUserGuid:'7173056141612204'})).replayed,true);
 assert.equal((await b.record({transactionGuid:100001})).billing_state,'PARTIALLY_PAID');
 assert.equal((await b.balance(100001)).billing_state,'PAID');
 data.balance=async()=>null;assert.equal(await b.balance(100001),null);
 await assert.rejects(()=>b.balance(1));assert.equal(calls.length,2);
 for(const dir of ['database','model','class','routes','services'])for(const file of fs.readdirSync(path.join(root,'master',dir)))if(file.endsWith('.ts')){
  stripTypeScriptTypes(read(`master/${dir}/${file}`),{mode:'transform'});
  if(['model','class','routes','services'].includes(dir))assert(!/\b(?:SELECT|INSERT INTO|UPDATE xa_|DELETE FROM)\b/.test(read(`master/${dir}/${file}`)),`SQL outside DBD: ${file}`);
 }
 assert(read('master/services/cash-payment-confirmation.ts').includes("from '../database/db.cash-confirmation.js'"));
 assert(read('master/services/cash-installment.ts').includes("from '../database/db.cash-installment.js'"));
 console.log('PASS: business/model delegation, compatible responses, balance validation, compatibility exports, SQL restricted to DBD and TS syntax.');
})().catch(e=>{console.error(e);process.exitCode=1;});
