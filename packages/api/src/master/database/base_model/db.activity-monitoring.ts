import { Sequelize, Transaction } from 'sequelize';

import { TableInitializer } from '../db.initializer.js';

export interface MonitoringSignal {
  tenantGuid: number;
  employeeGuid: number;
  occurredAt: string;
}
export class ActivityMonitoringDataError extends Error {}

/** DBD spécialisée : SQL et transactions restent exclusivement dans cette couche. */
export default class ActivityMonitoringDb {
  private readonly connection?: Sequelize;
  constructor(connection?: Sequelize) {
    this.connection = connection;
  }

  async record(input: MonitoringSignal): Promise<Record<string, any>> {
    const db = this.database();
    return db.transaction<Record<string, any>>(async (transaction) => {
      const rows = async (sql: string, replacements: Record<string, any> = {}) => {
        const [result] = await db.query(sql, { transaction, replacements });
        return result as any[];
      };
      const employee = (
        await rows(
          `SELECT el.*, gl.tenant,t.guid AS tenant_guid,t.timezone FROM xa_employee_license el
        JOIN xa_global_license gl ON gl.id=el.global_license JOIN xa_tenant t ON t.id=gl.tenant
        WHERE el.guid = :guid FOR UPDATE OF el`,
          { guid: input.employeeGuid },
        )
      )[0];
      if (!employee || Number(employee.tenant_guid) !== input.tenantGuid)
        throw new ActivityMonitoringDataError('Employee license does not belong to tenant');
      const day = (
        await rows(`SELECT (CAST(:at AS timestamptz) AT TIME ZONE :zone)::date AS day`, {
          at: input.occurredAt,
          zone: employee.timezone || 'UTC',
        })
      )[0].day;
      const previous = (
        await rows(
          `SELECT last_punch_date FROM xa_activity_monitoring WHERE employee_license = :id
        AND monitoring_date = :day AND (last_punch_date AT TIME ZONE :zone)::date=monitoring_date`,
          { id: employee.id, day, zone: employee.timezone || 'UTC' },
        )
      )[0];
      const validity = (
        await rows(
          `SELECT CAST(:at AS timestamptz)<=CURRENT_TIMESTAMP
        AND CAST(:at AS timestamptz)>=CAST(:activation AS timestamptz)
        AND (CAST(:deactivation AS timestamptz) IS NULL OR CAST(:at AS timestamptz)<CAST(:deactivation AS timestamptz)) AS valid`,
          {
            at: input.occurredAt,
            activation: employee.activation_date,
            deactivation: employee.deactivation_date,
          },
        )
      )[0];
      if (!validity?.valid)
        throw new ActivityMonitoringDataError(
          'Activity outside employee activation period or in future',
        );
      await rows('SELECT public.record_monitoring_activity(:id,CAST(:at AS timestamptz))', {
        id: employee.id,
        at: input.occurredAt,
      });
      // Un événement retardé ne fait jamais reculer la dernière activité.
      const updated = (
        await rows(
          `UPDATE xa_employee_license SET last_activity_date=CAST(:at AS timestamptz),updated_at=NOW()
        WHERE id = :id AND (last_activity_date IS NULL OR last_activity_date<CAST(:at AS timestamptz)) RETURNING last_activity_date`,
          { id: employee.id, at: input.occurredAt },
        )
      )[0];
      const leave = (
        await rows(
          `SELECT EXISTS(SELECT 1 FROM xa_employee_leave WHERE employee_license = :id
        AND cancelled_at IS NULL AND valid_from<=CAST(:at AS timestamptz) AND CAST(:at AS timestamptz)<valid_until) AS during_leave`,
          { id: employee.id, at: input.occurredAt },
        )
      )[0];
      return {
        monitoring_date: day,
        day_already_observed: !!previous,
        last_activity_date: updated?.last_activity_date ?? employee.last_activity_date,
        activity_during_leave: !!leave?.during_leave,
      };
    });
  }

  async monthlyUsage(
    licenseGuid: number,
    start: string,
    end: string,
  ): Promise<Record<string, any>> {
    const db = this.database();
    return db.transaction<Record<string, any>>(
      { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
      async (transaction) => {
        const rows = async (sql: string, replacements: Record<string, any> = {}) => {
          const [result] = await db.query(sql, { transaction, replacements });
          return result as any[];
        };
        const license = (
          await rows(
            `SELECT gl.*,t.guid AS tenant_guid,t.timezone FROM xa_global_license gl
        JOIN xa_tenant t ON t.id=gl.tenant WHERE gl.guid = :guid`,
            { guid: licenseGuid },
          )
        )[0];
        if (!license) throw new ActivityMonitoringDataError('License not found');
        const period = (
          await rows(
            `SELECT
        CAST(:start AS timestamptz) AT TIME ZONE :zone AS local_start,
        (CAST(:start AS timestamptz) AT TIME ZONE :zone)=date_trunc('month',CAST(:start AS timestamptz) AT TIME ZONE :zone)
        AND CAST(:end AS timestamptz)=((CAST(:start AS timestamptz) AT TIME ZONE :zone)+INTERVAL '1 month') AT TIME ZONE :zone AS valid,
        CAST(:end AS timestamptz)<=NOW() AS closed, CAST(:start AS timestamptz)<=NOW() AS started`,
            { start, end, zone: license.timezone || 'UTC' },
          )
        )[0];
        if (!period?.valid || !period.started)
          throw new ActivityMonitoringDataError('Full calendar month in tenant timezone required');
        const employees = await rows(
          `SELECT el.guid AS employee_license_guid,el.contractual_status,
        COUNT(a.id)::integer AS active_days,MAX(a.last_punch_date) AS last_activity,
        COUNT(a.id) FILTER (WHERE a.last_punch_date>=LEAST(CAST(:end AS timestamptz),CURRENT_TIMESTAMP)-INTERVAL '7 days')::integer AS active_days_last_7_days,
        COUNT(a.id) FILTER (WHERE EXISTS(SELECT 1 FROM xa_employee_leave lv WHERE lv.employee_license=el.id
          AND lv.cancelled_at IS NULL AND lv.valid_from<=a.last_punch_date AND a.last_punch_date<lv.valid_until))::integer AS active_days_with_last_signal_during_leave
        FROM xa_employee_license el LEFT JOIN xa_activity_monitoring a ON a.employee_license=el.id
          AND (a.last_punch_date AT TIME ZONE :zone)::date=a.monitoring_date AND a.last_punch_date>=CAST(:start AS timestamptz) AND a.last_punch_date<CAST(:end AS timestamptz)
        WHERE el.global_license = :license AND el.activation_date<CAST(:end AS timestamptz)
          AND (el.deactivation_date IS NULL OR el.deactivation_date>CAST(:start AS timestamptz))
        GROUP BY el.id,el.guid,el.contractual_status ORDER BY el.guid`,
          { license: license.id, start, end, zone: license.timezone || 'UTC' },
        );
        // Signal réel pendant le mois : le congé ultérieur ou le statut actuel ne l'efface pas.
        return {
          license_guid: licenseGuid,
          tenant_guid: Number(license.tenant_guid),
          timezone: license.timezone || 'UTC',
          period_start: start,
          period_end: end,
          period_closed: !!period.closed,
          minimum_seats: Number(license.minimum_seats),
          unit_price_usd: String(license.base_price_usd),
          employees,
        };
      },
    );
  }

  private database(): Sequelize {
    const db = this.connection ?? TableInitializer.getModel('xa_employee_license').sequelize;
    if (!db) throw new Error('Master database connection unavailable');
    return db;
  }
}
