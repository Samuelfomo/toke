import type { Sequelize } from 'sequelize';
/** Only confirmed cash payments are supported until electronic confirmation is implemented. */
export async function activateScheduledCycle(db:Sequelize,cycleId:number){
 if(!Number.isSafeInteger(cycleId)||cycleId<1)throw new Error('Invalid cycle ID');
 return db.transaction(async transaction=>{
  async function rows(sql:string,replacements:Record <string,any>={}):Promise <any[]>{const [r]=await db.query(sql,{transaction,replacements});return r as any[];}
  const grant=(await rows("SELECT * FROM xa_paid_seat_grant WHERE billing_cycle= :id AND source_type='CYCLE'",{id:cycleId}))[0];
  if(!grant)return {cycleId,status:'NO_PAID_GRANT'};
  // Lock order matches cash confirmation: payment, cycle, license.
  const payment=(await rows('SELECT * FROM xa_payment_transaction WHERE id= :id FOR UPDATE',{id:grant.payment_transaction}))[0];
  const cycle=(await rows('SELECT * FROM xa_billing_cycle WHERE id= :id FOR UPDATE',{id:cycleId}))[0];
  const license=(await rows('SELECT * FROM xa_global_license WHERE id= :id FOR UPDATE',{id:grant.global_license}))[0];
  if(!payment||!cycle||!license)return {cycleId,status:'RECONCILIATION_REQUIRED'};
  const alreadyActivated=(await rows('SELECT id FROM xa_license_cycle_activation WHERE billing_cycle= :id',{id:cycleId})).length>0;
  const receipt=(await rows("SELECT * FROM xa_confirmed_cash_payment WHERE payment_transaction= :id AND access_action IN ('SCHEDULED','ACTIVE')",{id:payment.id}))[0];
  const checks=(await rows(`SELECT
   (p.transaction_status='COMPLETED' AND p.source_type='CYCLE' AND p.billing_cycle=c.id AND p.adjustment IS NULL
    AND c.billing_status='COMPLETED' AND c.global_license=g.global_license
    AND p.amount_local=c.total_amount_local AND p.amount_usd=c.total_amount_usd
    AND p.currency_code=c.billing_currency_code AND p.exchange_rate_used=c.exchange_rate_used
    AND g.valid_from=c.period_start AND g.valid_until=c.period_end AND g.seats=c.base_employee_count) AS consistent,
   (c.period_start<=CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP<c.period_end) AS current,
   (c.period_end<=CURRENT_TIMESTAMP) AS past
   FROM xa_billing_cycle c JOIN xa_payment_transaction p ON p.id= :payment
    JOIN xa_paid_seat_grant g ON g.id= :grant WHERE c.id= :cycle`,{payment:payment.id,grant:grant.id,cycle:cycleId}))[0];
  if(!receipt||!checks?.consistent||receipt.tenant!==license.tenant||Number(receipt.amount_local)!==Number(payment.amount_local)||receipt.currency_code!==payment.currency_code)return {cycleId,status:'RECONCILIATION_REQUIRED'};
  if(!checks.current)return {cycleId,status:checks.past?'PAST_PERIOD':'NOT_DUE'};
  if(!['ACTIVE','PENDING_PAYMENT','EXPIRED'].includes(license.license_status))return {cycleId,status:'MANUAL_REVIEW'};
  const same=new Date(license.current_period_start).getTime()===new Date(cycle.period_start).getTime()&&new Date(license.current_period_end).getTime()===new Date(cycle.period_end).getTime();
  const next=new Date(license.current_period_end).getTime()===new Date(cycle.period_start).getTime();
  if(!same&&!next)return {cycleId,status:'RECONCILIATION_REQUIRED'};
  if((await rows(`SELECT id FROM xa_paid_seat_grant WHERE global_license= :license AND source_type='CYCLE'
   AND billing_cycle<> :cycle AND valid_from< :end AND :start <valid_until`,{license:license.id,cycle:cycleId,start:cycle.period_start,end:cycle.period_end})).length)return {cycleId,status:'RECONCILIATION_REQUIRED'};
  const rollover=await rolloverSeatAssignments(rows,license.id,cycle);
  if(rollover.status==='CAPACITY_REVIEW'||rollover.status==='RECONCILIATION_REQUIRED')return {cycleId,status:rollover.status};
  if(alreadyActivated)return {cycleId,status:'ALREADY_ACTIVATED',rollover};
  const updated=(await rows(`UPDATE xa_global_license SET current_period_start= :start,current_period_end= :end,
   next_renewal_date= :end,license_status='ACTIVE',updated_at=CURRENT_TIMESTAMP WHERE id= :id RETURNING *`,{id:license.id,start:cycle.period_start,end:cycle.period_end}))[0];
  await rows(`INSERT INTO xa_license_cycle_activation(global_license,billing_cycle,payment_transaction,previous_license,new_license)
   VALUES(:license,:cycle,:payment,CAST(:previous AS jsonb),CAST(:next AS jsonb)) RETURNING id`,{license:license.id,cycle:cycleId,payment:payment.id,previous:JSON.stringify(license),next:JSON.stringify(updated)});
  return {cycleId,status:'ACTIVATED',rollover};
 });
}
export async function runScheduledActivations(db:Sequelize,limit=100){
 if(!Number.isInteger(limit)||limit<1||limit>1000)throw new Error('Invalid batch limit');
 const [result]=await db.query(`SELECT c.id FROM xa_billing_cycle c
  JOIN xa_paid_seat_grant g ON g.billing_cycle=c.id AND g.source_type='CYCLE'
  JOIN xa_confirmed_cash_payment r ON r.payment_transaction=g.payment_transaction AND r.access_action IN ('SCHEDULED','ACTIVE')
  JOIN xa_global_license l ON l.id=c.global_license
  WHERE c.period_start<=CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP<c.period_end
   AND l.license_status IN ('ACTIVE','PENDING_PAYMENT','EXPIRED')
   AND (NOT EXISTS(SELECT 1 FROM xa_license_cycle_activation a WHERE a.billing_cycle=c.id)
    OR NOT EXISTS(SELECT 1 FROM xa_seat_cycle_rollover s WHERE s.billing_cycle=c.id))
  ORDER BY c.period_start,c.id LIMIT :limit`,{replacements:{limit}});
 const outcomes=[];
 for(const candidate of result as any[]){try{outcomes.push(await activateScheduledCycle(db,Number(candidate.id)));}catch(error){
  console.error('Scheduled license activation failed for cycle',candidate.id,error);outcomes.push({cycleId:Number(candidate.id),status:'ERROR'});
 }}
 return outcomes;
}

/** Runs inside the activation transaction with the global license already locked. */
export async function rolloverSeatAssignments(
 rows:(sql:string,replacements?:Record <string,any>)=>Promise<any[]>,licenseId:number,cycle:any){
 const args={license:licenseId,cycle:cycle.id,start:cycle.period_start,end:cycle.period_end};
 const done=(await rows('SELECT * FROM xa_seat_cycle_rollover WHERE billing_cycle= :cycle',args))[0];
 if(done)return {status:'ALREADY_PROCESSED',carried:Number(done.carried_count)};
 // Lock employee rows before evaluating eligibility; align with assignment service lock order.
 await rows(`SELECT e.id FROM xa_employee_license e WHERE e.global_license= :license ORDER BY e.id FOR UPDATE`,args);
 const previous=await rows(`SELECT a.id,a.employee_license FROM xa_seat_assignment a
  JOIN xa_billing_cycle old_cycle ON old_cycle.id=a.billing_cycle
  WHERE a.global_license= :license AND a.billing_cycle<> :cycle AND old_cycle.period_end= :start
   AND a.valid_until= :start AND (a.released_at IS NULL OR a.release_reason='PERIOD_ENDED')
   AND public.license_employee_billing_status(a.employee_license,CURRENT_TIMESTAMP)='BILLABLE'
  ORDER BY a.id FOR UPDATE OF a`,args);
 const occupied=await rows(`SELECT id,employee_license,billing_cycle FROM xa_seat_assignment WHERE global_license= :license
  AND released_at IS NULL AND assigned_at<=CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP<valid_until FOR UPDATE`,args);
 if(occupied.some(a=>a.billing_cycle!==cycle.id))return {status:'RECONCILIATION_REQUIRED',carried:0};
 const existing=new Set(occupied.map(a=>a.employee_license));
 const candidates=previous.filter(a=>!existing.has(a.employee_license));
 if(new Set(candidates.map(a=>a.employee_license)).size!==candidates.length)return {status:'RECONCILIATION_REQUIRED',carried:0};
 const capacity=(await rows(`SELECT COALESCE(SUM(seats),0) AS seats FROM xa_paid_seat_grant
  WHERE billing_cycle= :cycle AND valid_from<=CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP<valid_until`,args))[0];
 const seats=Number(capacity?.seats);
 if(!Number.isSafeInteger(seats)||seats<1||occupied.length+candidates.length>seats)return {status:'CAPACITY_REVIEW',carried:0};
 await rows(`UPDATE xa_seat_assignment SET released_at=valid_until,release_reason='PERIOD_ENDED'
  WHERE global_license= :license AND released_at IS NULL AND valid_until<=CURRENT_TIMESTAMP RETURNING id`,args);
 const continuations=[];
 for(const candidate of candidates){
  const inserted=(await rows(`INSERT INTO xa_seat_assignment(global_license,billing_cycle,employee_license,assigned_at,
   valid_until,assigned_by_user_guid,assignment_origin,previous_assignment)
   VALUES(:license,:cycle,:employee,CURRENT_TIMESTAMP,:end,NULL,'SYSTEM',:previous) RETURNING id`,
   {...args,employee:candidate.employee_license,previous:candidate.id}))[0];
  continuations.push({previous_assignment:candidate.id,new_assignment:inserted.id,employee_license:candidate.employee_license});
 }
 await rows(`INSERT INTO xa_seat_cycle_rollover(global_license,billing_cycle,carried_count,details)
  VALUES(:license,:cycle,:count,CAST(:details AS jsonb)) RETURNING id`,{...args,count:continuations.length,
  details:JSON.stringify({continuations,already_assigned:occupied.map(a=>a.id),paid_seats:seats})});
 return {status:'PROCESSED',carried:continuations.length};
}
