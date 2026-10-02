import type { Sequelize } from 'sequelize';
export class SeatAssignmentError extends Error {}
export interface SeatRequest { licenseGuid: number; employeeLicenseGuid: number; actorUserGuid: string; }
function validate(input: SeatRequest) {
  if (![input.licenseGuid,input.employeeLicenseGuid].every(n=>Number.isInteger(n)&&n>=100000&&n<=999999)) throw new SeatAssignmentError('Invalid license or employee license GUID');
  if (typeof input.actorUserGuid !== 'string' || !input.actorUserGuid.trim() || input.actorUserGuid.length>128) throw new SeatAssignmentError('User GUID is required');
}
export async function changeSeatAssignment(db: Sequelize, input: SeatRequest, action: 'ASSIGN' | 'RELEASE') {
  validate(input);
  if (!['ASSIGN','RELEASE'].includes(action)) throw new SeatAssignmentError('Invalid assignment action');
  return db.transaction(async transaction=>{
    async function rows(sql:string,replacements:Record <string,any>={}):Promise <any[]> {
      const [result]=await db.query(sql,{replacements,transaction});return result as any[];
    }
    const license=(await rows('SELECT * FROM xa_global_license WHERE guid= :guid FOR UPDATE',{guid:input.licenseGuid}))[0];
    if (!license) throw new SeatAssignmentError('License not found');
    const employee=(await rows('SELECT * FROM xa_employee_license WHERE guid= :guid FOR UPDATE',{guid:input.employeeLicenseGuid}))[0];
    if (!employee || employee.global_license!==license.id) throw new SeatAssignmentError('Employee license does not belong to this license');
    // Fermer les anciennes affectations sans modifier leur date de début ni leur auteur.
    await rows(`UPDATE xa_seat_assignment SET released_at=valid_until, release_reason='PERIOD_ENDED'
      WHERE global_license= :license AND released_at IS NULL AND valid_until<=CURRENT_TIMESTAMP RETURNING id`,{license:license.id});
    const open=(await rows(`SELECT * FROM xa_seat_assignment WHERE employee_license= :employee
      AND released_at IS NULL AND valid_until>CURRENT_TIMESTAMP`,{employee:employee.id}))[0];
    if (action==='RELEASE') {
      if (!open) return {released:false,replayed:true};
      await rows(`UPDATE xa_seat_assignment SET released_at=CURRENT_TIMESTAMP,
        released_by_user_guid= :actor, release_reason='USER_RELEASED' WHERE id= :id RETURNING id`,{actor:input.actorUserGuid,id:open.id});
      return {assignmentId:open.id,released:true,replayed:false};
    }
    if (license.license_status!=='ACTIVE') throw new SeatAssignmentError('License is not active');
    const eligibility=(await rows(`SELECT (contractual_status='ACTIVE' AND
      (deactivation_date IS NULL OR deactivation_date>CURRENT_TIMESTAMP) AND activation_date<=CURRENT_TIMESTAMP) AS eligible
      FROM xa_employee_license WHERE id= :id`,{id:employee.id}))[0];
    if (!eligibility?.eligible) throw new SeatAssignmentError('Employee license is not eligible for a place');
    if (open) return {assignmentId:open.id,replayed:true};
    const base=(await rows(`SELECT * FROM xa_paid_seat_grant WHERE global_license= :license AND source_type='CYCLE'
      AND valid_from<=CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP<valid_until ORDER BY valid_from DESC`,{license:license.id}));
    if (base.length!==1) throw new SeatAssignmentError('Exactly one reconciled paid cycle is required');
    const capacity=(await rows(`SELECT COALESCE(SUM(seats),0) AS seats FROM xa_paid_seat_grant
      WHERE billing_cycle= :cycle AND valid_from<=CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP<valid_until`,{cycle:base[0].billing_cycle}))[0];
    const occupied=(await rows(`SELECT COUNT(*) AS occupied FROM xa_seat_assignment WHERE global_license= :license
      AND released_at IS NULL AND assigned_at<=CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP<valid_until`,{license:license.id}))[0];
    if (Number(occupied.occupied)>=Number(capacity.seats)) throw new SeatAssignmentError('No paid place is available');
    const inserted=await rows(`INSERT INTO xa_seat_assignment (global_license,billing_cycle,employee_license,
      assigned_at,valid_until,assigned_by_user_guid) VALUES (:license,:cycle,:employee,CURRENT_TIMESTAMP,:end,:actor) RETURNING id`,
      {license:license.id,cycle:base[0].billing_cycle,employee:employee.id,end:base[0].valid_until,actor:input.actorUserGuid});
    return {assignmentId:inserted[0].id,replayed:false};
  });
}
