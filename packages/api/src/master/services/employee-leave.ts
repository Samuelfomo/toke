import type { Sequelize } from 'sequelize';

export class EmployeeLeaveError extends Error {}
const types = ['PARENTAL', 'MEDICAL', 'TECHNICAL', 'SABBATICAL', 'OTHER'];
export function leaveDate(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new EmployeeLeaveError('Date with timezone required');
  if (
    Number(value.slice(11, 13)) > 23 ||
    Number(value.slice(14, 16)) > 59 ||
    Number(value.slice(17, 19)) > 59
  )
    throw new EmployeeLeaveError('Invalid time');
  const day = value.slice(0, 10);
  if (new Date(day + 'T00:00:00Z').toISOString().slice(0, 10) !== day)
    throw new EmployeeLeaveError('Invalid calendar date');
  return new Date(value).toISOString();
}
function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new EmployeeLeaveError('Required text is invalid');
  return value.trim();
}
export async function manageEmployeeLeave(
  db: Sequelize,
  employeeGuid: number,
  action: 'DECLARE' | 'CANCEL' | 'LIST',
  input: any,
) {
  if (!Number.isInteger(employeeGuid) || employeeGuid < 100000 || employeeGuid > 999999)
    throw new EmployeeLeaveError('Invalid employee license GUID');
  if (!['DECLARE', 'CANCEL', 'LIST'].includes(action))
    throw new EmployeeLeaveError('Invalid action');
  const actor = action === 'LIST' ? null : text(input.actor_user_guid, 128);
  const data =
    action === 'DECLARE'
      ? {
          start: leaveDate(input.valid_from),
          end: leaveDate(input.valid_until),
          type: input.leave_type,
          reason: text(input.reason, 500),
          key: text(input.idempotency_key, 128),
        }
      : null;
  if (data && (!types.includes(data.type) || Date.parse(data.start) >= Date.parse(data.end)))
    throw new EmployeeLeaveError('Invalid leave type or period');
  const cancellation =
    action === 'CANCEL'
      ? { guid: text(input.leave_guid, 36), reason: text(input.reason, 500) }
      : null;
  if (
    cancellation &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cancellation.guid)
  )
    throw new EmployeeLeaveError('Invalid leave GUID');
  return db.transaction(async (transaction) => {
    async function rows(sql: string, replacements: Record<string, any> = {}): Promise<any[]> {
      const [r] = await db.query(sql, { transaction, replacements });
      return r as any[];
    }
    const employee = (
      await rows('SELECT * FROM xa_employee_license WHERE guid= :guid FOR UPDATE', {
        guid: employeeGuid,
      })
    )[0];
    if (!employee) throw new EmployeeLeaveError('Employee license not found');
    if (action === 'LIST')
      return rows(
        'SELECT * FROM xa_employee_leave WHERE employee_license= :id ORDER BY valid_from,id',
        { id: employee.id },
      );
    let result: any;
    if (data) {
      const prior = (
        await rows(
          'SELECT * FROM xa_employee_leave WHERE employee_license= :id AND idempotency_key= :key',
          { id: employee.id, key: data.key },
        )
      )[0];
      if (prior) {
        if (
          new Date(prior.valid_from).toISOString() !== data.start ||
          new Date(prior.valid_until).toISOString() !== data.end ||
          prior.leave_type !== data.type ||
          prior.reason !== data.reason ||
          prior.declared_by_user_guid !== actor
        )
          throw new EmployeeLeaveError('Idempotency key conflict');
        return { ...prior, replayed: true };
      }
      if (employee.contractual_status !== 'ACTIVE')
        throw new EmployeeLeaveError('Employee license is not active');
      if (
        employee.declared_long_leave &&
        (
          await rows('SELECT id FROM xa_employee_leave WHERE employee_license= :id LIMIT 1', {
            id: employee.id,
          })
        ).length === 0
      )
        throw new EmployeeLeaveError(
          'Existing undated leave requires reconciliation before declaration',
        );
      if (
        (
          await rows(
            `SELECT id FROM xa_employee_leave WHERE employee_license= :id AND cancelled_at IS NULL
    AND valid_from<CAST(:end AS timestamptz) AND CAST(:start AS timestamptz)<valid_until`,
            { id: employee.id, ...data },
          )
        ).length
      )
        throw new EmployeeLeaveError('Overlapping leave');
      result = (
        await rows(
          `INSERT INTO xa_employee_leave(employee_license,valid_from,valid_until,leave_type,reason,declared_by_user_guid,idempotency_key)
    VALUES(:id,:start,:end,:type,:reason,:actor,:key) RETURNING *`,
          { id: employee.id, ...data, actor },
        )
      )[0];
    } else if (cancellation) {
      const prior = (
        await rows(
          'SELECT * FROM xa_employee_leave WHERE guid= :guid AND employee_license= :id FOR UPDATE',
          { guid: cancellation.guid, id: employee.id },
        )
      )[0];
      if (!prior) throw new EmployeeLeaveError('Leave not found for this employee');
      if (prior.cancelled_at) {
        if (
          prior.cancelled_by_user_guid !== actor ||
          prior.cancellation_reason !== cancellation.reason
        )
          throw new EmployeeLeaveError('Cancellation already recorded with other details');
        return { ...prior, replayed: true };
      }
      result = (
        await rows(
          `UPDATE xa_employee_leave SET cancelled_at=NOW(),cancelled_by_user_guid= :actor,cancellation_reason= :reason WHERE id= :id RETURNING *`,
          { id: prior.id, actor, reason: cancellation.reason },
        )
      )[0];
    }
    // Compatibility projection for existing declaration-based anomaly triggers.
    const latest = (
      await rows(
        'SELECT * FROM xa_employee_leave WHERE employee_license= :id AND cancelled_at IS NULL ORDER BY declared_at DESC,id DESC LIMIT 1',
        { id: employee.id },
      )
    )[0];
    await rows(
      `UPDATE xa_employee_license SET declared_long_leave= :declared,
   long_leave_declared_by= :author,long_leave_declared_at= :at,long_leave_type= :type,long_leave_reason= :reason
   WHERE id= :id RETURNING id`,
      {
        id: employee.id,
        declared: !!latest,
        author: latest?.declared_by_user_guid ?? null,
        at: latest?.declared_at ?? null,
        type: latest?.leave_type ?? null,
        reason: latest?.reason ?? null,
      },
    );
    return { ...result, replayed: false };
  });
}
