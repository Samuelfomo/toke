'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module');
(async()=>{
 const src=fs.readFileSync(require('node:path').join(__dirname,'../master/services/scheduled-license-activation.ts'),'utf8');
 const {activateScheduledCycle}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(src)).toString('base64'));
 const cycle={id:2,period_start:'2026-10-01T00:00:00Z',period_end:'2027-04-01T00:00:00Z'};
 const license={id:1,tenant:1,license_status:'ACTIVE',current_period_start:'2026-04-01T00:00:00Z',current_period_end:cycle.period_start};
 let activated=false,checks={consistent:true,current:true,past:false},receipt=true,failAudit=false,rolledBack=false;const queries=[];
 const db={transaction:async cb=>{try{return await cb({});}catch(e){rolledBack=true;throw e;}},query:async sql=>{
  queries.push(sql);let r=[];
  if(sql.startsWith('SELECT * FROM xa_paid_seat_grant'))r=[{id:1,global_license:1,payment_transaction:3}];
  else if(sql.startsWith('SELECT * FROM xa_payment_transaction'))r=[{id:3,amount_local:'100.00',currency_code:'XAF'}];
  else if(sql.startsWith('SELECT * FROM xa_billing_cycle'))r=[cycle];
  else if(sql.startsWith('SELECT * FROM xa_global_license'))r=[license];
  else if(sql.startsWith('SELECT id FROM xa_license_cycle_activation'))r=activated?[{id:1}]:[];
  else if(sql.startsWith('SELECT * FROM xa_confirmed_cash_payment'))r=receipt?[{tenant:1,amount_local:'100.00',currency_code:'XAF'}]:[];
  else if(sql.includes(' AS consistent'))r=[checks];
  else if(sql.includes('SUM(seats)'))r=[{seats:'5'}];
  else if(sql.startsWith('INSERT INTO xa_seat_cycle_rollover'))r=[{id:1}];
  else if(sql.startsWith('UPDATE xa_global_license'))r=[{...license,current_period_start:cycle.period_start,current_period_end:cycle.period_end}];
  else if(sql.startsWith('INSERT INTO xa_license_cycle_activation')){if(failAudit)throw new Error('Audit failure');activated=true;}
  return [r,{}];
 }};
 assert.equal((await activateScheduledCycle(db,2)).status,'ACTIVATED');
 assert.equal((await activateScheduledCycle(db,2)).status,'ALREADY_ACTIVATED');
 activated=false;checks.current=false;assert.equal((await activateScheduledCycle(db,2)).status,'NOT_DUE');
 checks.past=true;assert.equal((await activateScheduledCycle(db,2)).status,'PAST_PERIOD');
 checks.current=true;checks.past=false;license.license_status='SUSPENDED';assert.equal((await activateScheduledCycle(db,2)).status,'MANUAL_REVIEW');
 license.license_status='ACTIVE';receipt=false;assert.equal((await activateScheduledCycle(db,2)).status,'RECONCILIATION_REQUIRED');
 receipt=true;checks.consistent=false;assert.equal((await activateScheduledCycle(db,2)).status,'RECONCILIATION_REQUIRED');
 checks.consistent=true;failAudit=true;await assert.rejects(()=>activateScheduledCycle(db,2),/Audit failure/);assert.equal(rolledBack,true);
 assert.ok(!queries.some(q=>q.startsWith('UPDATE xa_confirmed_cash_payment')||q.startsWith('UPDATE xa_employee_license')));
 console.log('PASS: due activation, replay, future/past, suspension, receipts, consistency and error propagation; SQL mocked.');
})().catch(e=>{console.error(e);process.exitCode=1;});
