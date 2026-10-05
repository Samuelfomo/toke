const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const {stripTypeScriptTypes}=require('node:module');
const ctx={Date};vm.createContext(ctx);vm.runInContext(stripTypeScriptTypes(fs.readFileSync(__dirname+'/../master/database/db.cash-confirmation.ts','utf8').replace(/import type[^;]+;/g,'').replace(/export /g,''))+';globalThis.confirm=confirmCashPayment',ctx);
const start=new Date(Date.now()-86400000),end=new Date(Date.now()+86400000*30);
const base={payment:{id:1,guid:123456,source_type:'CYCLE',billing_cycle:2,amount_local:'75127.50',currency_code:'XAF',transaction_status:'PENDING'},debt:{id:2,global_license:3,base_employee_count:5,billing_status:'PENDING',total_amount_local:'75127.50',billing_currency_code:'XAF',period_start:start,period_end:end},license:{id:3,tenant:4,license_status:'PENDING_PAYMENT',current_period_start:start,current_period_end:end},grants:[],receipts:[]};
function fake(){let state=structuredClone(base);let failInsert=false;return {get state(){return state;},set failInsert(v){failInsert=v;},async transaction(fn){const previous=structuredClone(state);try{return await fn({});}catch(e){state=previous;throw e;}},async query(sql,{replacements:r}){
 if(sql.startsWith('SELECT * FROM xa_payment_transaction'))return [[state.payment],{}];
 if(sql.startsWith('SELECT * FROM xa_cash_receipt'))return [state.receipts.filter(x=>x.idempotency_key===r.key||x.payment_transaction===r.id),{}];
 if(sql.startsWith('SELECT id FROM xa_paid_seat_grant'))return [/billing_cycle\s*=\s*:cycle AND source_type='CYCLE'/.test(sql) ? [{id:8}] : [],{}];
 if(sql.startsWith('SELECT * FROM xa_payment_method'))return [[{method_type:'CASH',active:true,supported_currencies:['XAF']}],{}];
 if(sql.startsWith('SELECT * FROM xa_billing_cycle'))return [[state.debt],{}];
 if(sql.startsWith('SELECT * FROM xa_global_license'))return [[state.license],{}];
 if(sql.startsWith('UPDATE xa_global_license')){state.license.license_status='ACTIVE';return [[{id:3}],{}];}
 if(sql.startsWith('UPDATE xa_billing_cycle')){state.debt.billing_status='COMPLETED';return [[{id:2}],{}];}
 if(sql.startsWith('UPDATE xa_payment_transaction')){state.payment.transaction_status='COMPLETED';return [[{id:1}],{}];}
 if(sql.startsWith('INSERT INTO xa_paid_seat_grant')){state.grants.push({...r});return [[{id:'8'}],{}];}
 if(sql.startsWith('INSERT')){if(failInsert)throw new Error('receipt insert failed');const receipt={id:'9',payment_transaction:r.payment,idempotency_key:r.key,actor_user_guid:r.actor,receipt_reference:r.reference,currency_code:r.currency,amount_local:r.amount,received_at:r.received,access_action:r.action};state.receipts.push(receipt);return [[{id:'9'}],{}];}
 throw new Error('Unexpected SQL '+sql);
 }};}
const input={transactionGuid:123456,amountLocal:'75127.50',currency:'XAF',receiptReference:'CASH-001',idempotencyKey:'cash-one',receivedAt:new Date(Date.now()-1000)};const authority={actorUserGuid:'user-guid-commercial-1'};
(async()=>{
 const db=fake();await assert.rejects(()=>ctx.confirm(db,input,{actorUserGuid:''}),/GUID/);assert.equal(db.state.receipts.length,0);
 await assert.rejects(()=>ctx.confirm(db,{...input,amountLocal:'75127.51'},authority),/exactly/);
 const result=await ctx.confirm(db,input,authority);assert.equal(result.accessAction,'ACTIVE');assert.equal(db.state.debt.billing_status,'COMPLETED');assert.equal(db.state.receipts.length,1);assert.equal(db.state.grants[0].seats,5);
 assert.equal((await ctx.confirm(db,input,authority)).replayed,true);assert.equal(db.state.receipts.length,1);
 await assert.rejects(()=>ctx.confirm(db,{...input,receiptReference:'OTHER'},authority),/Conflicting/);
 const failure=fake();failure.failInsert=true;await assert.rejects(()=>ctx.confirm(failure,input,authority),/insert failed/);assert.equal(failure.state.grants.length,0);assert.equal(failure.state.payment.transaction_status,'PENDING');assert.equal(failure.state.license.license_status,'PENDING_PAYMENT');
 const future=fake();future.state.debt.period_start=new Date(Date.now()+86400000);future.state.debt.period_end=new Date(Date.now()+86400000*60);assert.equal((await ctx.confirm(future,input,authority)).accessAction,'SCHEDULED');assert.equal(future.state.license.license_status,'PENDING_PAYMENT');
 console.log('PASS: GUID auteur requis, montant exact, activation courante, replay, conflit, rollback simulé et période future.');
})().catch(e=>{console.error(e);process.exitCode=1;});
