import SeatAssignmentModel from '../model/SeatAssignmentModel.js';
import { SeatAssignmentError } from '../database/base_model/db.seat-assignment.js';

export { SeatAssignmentError } from '../database/base_model/db.seat-assignment.js';
export default class SeatAssignment extends SeatAssignmentModel {
  async change(
    value: unknown,
    body: Record<string, any>,
    action: 'ASSIGN' | 'RELEASE',
  ): Promise<Record<string, any>> {
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new SeatAssignmentError('Object body required');
    const license = String(value),
      employee = String(body.employee_license_guid ?? '');
    if (!/^[1-9][0-9]{5}$/.test(license) || !/^[1-9][0-9]{5}$/.test(employee))
      throw new SeatAssignmentError('Invalid GUID');
    const actor = body.actor_user_guid;
    if (typeof actor !== 'string' || !actor.trim() || actor.length > 128)
      throw new SeatAssignmentError('User GUID is required');
    if (action !== 'ASSIGN' && action !== 'RELEASE')
      throw new SeatAssignmentError('Invalid assignment action');
    const result = await this.changeData(
      { licenseGuid: Number(license), employeeLicenseGuid: Number(employee), actorUserGuid: actor },
      action,
    );
    // Projection explicite : aucun objet DB, ID interne ou attribut futur n'est exporte.
    return {
      license_guid: Number(license),
      employee_license_guid: Number(employee),
      action,
      replayed: result.replayed === true,
      ...(action === 'RELEASE' ? { released: result.released === true } : { assigned: true }),
    };
  }
}
