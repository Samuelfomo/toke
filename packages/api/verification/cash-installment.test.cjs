const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');const {stripTypeScriptTypes}=require('node:module');
let code=stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'../master/database/db.cash-installment.ts'),'utf8'),{mode:'transform'}).replace(/import .*?;\n/g,'').replace(/export /g,'');
const ctx={paymentAmountsConsistent:()=>true};vm.createContext(ctx);vm.runInContext(code+'\nthis.api={recordCashInstallment,cashCents};',ctx);const {recordCashInstallment,cashCents}=ctx.api;
function setup(){const end=new Date(Date.now()+86400000*30),start=new Date(Date.now()-60000);
 const state={p:{id:1,guid:100000,source_type:'CYCLE',billing_cycle:2,transaction_status:'PENDING',amount_local:'100.00',amount_usd:'1.00',currency_code:'XAF',exchange_rate_used:'100.000000',payment_method:3},c:{id:2,global_license:4,billing_status:'PENDING',total_amount_local:'100.00',total_amount_usd:'1.00',billing_currency_code:'XAF',exchange_rate_used:'100.000000',base_employee_count:5,period_start:start.toISOString(),period_end:end.toISOString()},l:{id:4,tenant:5,license_status:'ACTIVE',current_period_start:new Date(Date.now()-86400000).toISOString(),current_period_end:start.toISOString()},receipts:[],grants:[],settlement:[]};
 let failGrant=false;
 const db={async transaction(fn){const old=JSON.stringify(state);try{return await fn({});}catch(e){Object.assign(state,JSON.parse(old));throw e;}},async query(sql,{replacements:r={}}={}){
 if(sql.startsWith('SELECT * FROM xa_payment_transaction'))return [[state.p]];
 if(sql.includes('SELECT * FROM xa_cash_installment WHERE idempotency_key'))return [state.receipts.filter(x=>x.idempotency_key===r.key)];
 if(sql.startsWith('SELECT * FROM xa_billing_cycle'))return [[state.c]];
 if(sql.startsWith('SELECT * FROM xa_global_license'))return [[state.l]];
 if(sql.includes('SELECT rp.id'))return [[{id:1}]];
 if(sql.includes('SELECT global_license'))return [[{global_license:4}]];
 if(sql.includes('SELECT * FROM xa_payment_method'))return [[{active:true,method_type:'CASH',supported_currencies:['XAF']}]];
 if(sql.includes('SELECT payment_transaction FROM xa_cash_receipt')||sql.includes('SELECT p.id FROM xa_payment_transaction'))return [[]];
 if(sql.includes('COALESCE(SUM'))return [[{amount:String(state.receipts.reduce((n,x)=>n+Number(x.amount_local),0))}]];
 if(sql.includes('INSERT INTO xa_cash_installment(')){const row={id:state.receipts.length+1,payment_transaction:r.payment,actor_user_guid:r.actor,amount_local:r.amount,currency_code:r.currency,receipt_reference:r.reference,idempotency_key:r.key,received_at:r.date.toISOString()};state.receipts.push(row);return [[row]];}
 if(sql.includes('SELECT id FROM xa_paid_seat_grant'))return [state.grants];
 if(sql.startsWith('UPDATE xa_global_license')){state.l.license_status='ACTIVE';return [[{id:4}]];}
 if(sql.startsWith('UPDATE xa_payment_transaction')){state.p.transaction_status='COMPLETED';return [[{id:1}]];}
 if(sql.startsWith('UPDATE xa_billing_cycle')){state.c.billing_status='COMPLETED';return [[{id:2}]];}
 if(sql.includes('INSERT INTO xa_paid_seat_grant')){if(failGrant)throw Error('Grant failure');state.grants.push({id:1,seats:r.seats});return [[{id:1}]];}
 if(sql.includes('INSERT INTO xa_cash_installment_settlement')){state.settlement.push({access_action:r.action});return [[{payment_transaction:1}]];}
 if(sql.includes('SELECT * FROM xa_payment_balance')){const received=state.receipts.reduce((n,x)=>n+Number(x.amount_local),0);return [[{due_local:'100.00',received_local:received.toFixed(2),outstanding_local:(100-received).toFixed(2)}]];}
 if(sql.includes('SELECT access_action'))return [state.settlement];throw Error('Unexpected query '+sql);
 }};return {db,state,fail:()=>failGrant=true};}
(async()=>{
 const f=setup(),date=new Date(Date.now()-30000);const base={transactionGuid:100000,actorUserGuid:'7173056141612204',amountLocal:'40.00',currency:'XAF',receivedAt:date,receiptReference:'R1',idempotencyKey:'K1'};
 const first=await recordCashInstallment(f.db,base);assert.equal(first.billing_state,'PARTIALLY_PAID');assert.equal(first.outstanding_local,'60.00');assert.equal(f.state.p.transaction_status,'PENDING');assert.equal(f.state.grants.length,0);
 assert.equal((await recordCashInstallment(f.db,base)).replayed,true);assert.equal(f.state.receipts.length,1);
 await assert.rejects(()=>recordCashInstallment(f.db,{...base,amountLocal:'41.00'}),/Conflicting/);
 await assert.rejects(()=>recordCashInstallment(f.db,{...base,amountLocal:'61.00',receiptReference:'R2',idempotencyKey:'K2'}),/exceeds/);
 const last={...base,amountLocal:'60.00',receiptReference:'R2',idempotencyKey:'K2'};
 const full=await recordCashInstallment(f.db,last);assert.equal(full.billing_state,'PAID');assert.equal(full.outstanding_local,'0.00');assert.equal(full.access_action,'ACTIVE');assert.equal(f.state.grants.length,1);assert.equal(f.state.receipts.length,2);assert.equal(f.state.c.billing_status,'COMPLETED');
 assert.equal((await recordCashInstallment(f.db,last)).replayed,true);assert.equal(f.state.grants.length,1);
 const rollback=setup();await recordCashInstallment(rollback.db,base);rollback.fail();await assert.rejects(()=>recordCashInstallment(rollback.db,last),/Grant failure/);assert.equal(rollback.state.receipts.length,1);assert.equal(rollback.state.p.transaction_status,'PENDING');
 assert.equal(cashCents('0.01'),1n);assert.throws(()=>cashCents('1.001'));
 console.log('PASS: partial balance, no early rights, replay/conflict, overpayment, full settlement and simulated atomic rollback.');
})().catch(e=>{console.error(e);process.exitCode=1;});
