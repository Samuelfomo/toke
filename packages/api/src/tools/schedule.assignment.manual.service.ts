import { createHash } from 'node:crypto';
import { Op, Transaction } from 'sequelize';
import type { Request } from 'express';
import type { SAFamily } from '@toke/shared';

import OrgHierarchy from '../tenant/class/OrgHierarchy.js';
import type ScheduleAssignments from '../tenant/class/ScheduleAssignments.js';
import ScheduleAssignmentsLog from '../tenant/class/ScheduleAssignmentsLog.js';
import { TableInitializer } from '../tenant/database/db.initializer.js';
import TenantManager from '../tenant/database/db.tenant-manager.js';
import { createApiClient } from '../utils/axios.config.js';
import { sessionClientFromEnvironment } from './user-session.client.js';
import { tableName } from '../utils/response.model.js';
import {
  addDays,
  carveAssignmentPeriod,
  isExclusionConstraintError,
  type AssignmentPlain,
} from './schedule.assignment.adjustment.service.js';

export class ManualAssignmentError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: object,
  ) {
    super(message);
  }
}

export async function verifyManualReplacementActor(req: Request, tenant: string, creatorGuid: string): Promise<void> {
  const session = req.header('x-toke-user-session');
  const integrator = req.header('x-toke-integrator-session');
  const context = req.header('x-integrator-context');
  const subdomain = TenantManager.getCurrentTenant();
  const denied = new ManualAssignmentError(403, 'SCHEDULE_ASSIGNMENT_REPLACEMENT_FORBIDDEN',
    'Utilisez une session de manager ou une délégation valide pour remplacer cette affectation.');
  try {
    if (session && !integrator && !context) {
      const actor = await sessionClientFromEnvironment().verify(session, tenant, subdomain);
      if (actor.userGuid === creatorGuid) return;
    } else if (!session && integrator && /^[A-Za-z0-9_-]+$/.test(integrator)
      && context && /^[A-Za-z0-9_-]{32,128}$/.test(context)) {
      const { USER_SESSION_MASTER_URL: url, USER_SESSION_SERVICE_KEY: key, USER_SESSION_SERVICE_SECRET: secret } = process.env;
      if (url && key && secret) {
        const { data } = await createApiClient(url, secret, key).get(`/integrator/context/${encodeURIComponent(context)}`, {
          headers: { Authorization: `Bearer ${integrator}` }, timeout: 5000, maxRedirects: 0,
        });
        if (String(data?.tenantGuid ?? '') === tenant && data?.subdomain === subdomain
          && String(data?.userGuid ?? '') === creatorGuid) return;
      }
    }
  } catch {
    throw denied;
  }
  throw denied;
}

function calendarDate(date: Date, timezone: string): string {
  const offset = /^UTC([+-])(\d{1,2})(?::(\d{2}))?$/.exec(timezone);
  const zone = offset ? `${offset[1]}${offset[2]!.padStart(2, '0')}:${offset[3] ?? '00'}` : timezone;
  return new Intl.DateTimeFormat('sv-SE', { timeZone: zone, dateStyle: 'short' }).format(date);
}

interface ManualPeriod {
  tenant: string;
  family: SAFamily;
  related: string;
  from: string;
  to: string | null;
  creator: number;
  template: object;
  reason?: string | null;
  continuation?: string | null;
  timezone: string;
}

export async function createManualAssignment(
  assignment: ScheduleAssignments,
  input: ManualPeriod,
  verifyActor: () => Promise<void>,
  confirmation?: string,
): Promise<unknown> {
  const connection = TenantManager.getConnectionSync();
  const model = TableInitializer.getModel(tableName.SCHEDULE_ASSIGNMENTS);
  try {
    return await connection.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async transaction => {
      const today = calendarDate(new Date(), input.timezone);
      const invalidDate = [input.from, input.to].some(value => {
        if (value === null) return false;
        const date = new Date(`${value}T12:00:00Z`);
        return !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value;
      });
      if (invalidDate) {
        throw new ManualAssignmentError(422, 'SCHEDULE_ASSIGNMENT_INVALID_PERIOD', 'La période contient une date invalide.');
      }
      if (input.from < today) {
        throw new ManualAssignmentError(422, 'SCHEDULE_ASSIGNMENT_PAST_PERIOD', 'Une affectation active ne peut pas commencer dans le passé.');
      }

      const rows = await model.findAll({
        where: {
          tenant: input.tenant, family: input.family, related: input.related, active: true, deleted_at: null,
          ...(input.to === null ? {} : { start_date: { [Op.lte]: input.to } }),
          [Op.or]: [{ end_date: { [Op.gte]: input.from } }, { end_date: { [Op.is]: null } }],
        },
        order: [['id', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const affected = rows.map(row => row.get({ plain: true }) as AssignmentPlain & {
        continuation_of_guid?: string | null;
      });
      const impacts = affected.map(row => {
        const before = row.start_date < input.from ? { from: row.start_date, to: addDays(input.from, -1) } : null;
        const after = input.to !== null && (row.end_date === null || row.end_date > input.to)
          ? { from: addDays(input.to, 1), to: row.end_date } : null;
        return {
          guid: row.guid,
          template_name: row.session_template?.name ?? null,
          from: row.start_date,
          to: row.end_date,
          replaced: {
            from: row.start_date > input.from ? row.start_date : input.from,
            to: row.end_date !== null && (input.to === null || row.end_date < input.to) ? row.end_date : input.to,
          },
          preserved: [before, after].filter(Boolean),
        };
      });

      if (affected.length) {
        await verifyActor();
        if (!(await OrgHierarchy.hasManagerRole(input.creator))) {
          throw new ManualAssignmentError(403, 'SCHEDULE_ASSIGNMENT_REPLACEMENT_FORBIDDEN',
            'Ce remplacement doit être effectué par un manager.');
        }
        const linked = await model.findOne({
          where: {
            tenant: input.tenant, family: input.family, related: input.related, active: true, deleted_at: null,
            continuation_of_guid: { [Op.in]: affected.map(row => row.guid) },
          },
          transaction, lock: transaction.LOCK.UPDATE,
        });
        if (input.from === today || linked || input.continuation || affected.some(row =>
          row.continuation_of_guid || row.session_template?.publication_guard_start
          || row.session_template?.adjustment?.spans_next_day
          || row.session_template?.adjustment?.inherited_guard_continuation)) {
          throw new ManualAssignmentError(409, 'SCHEDULE_ASSIGNMENT_REPLACEMENT_REQUIRES_ADJUSTMENT',
            input.from === today
              ? 'Le remplacement doit commencer après aujourd’hui. Choisissez une date future.'
              : 'Le remplacement peut rompre une garde liée. Utilisez l’ajustement ponctuel du planning.',
            { affected: impacts });
        }

        // Exclude snapshot_date, which is generated afresh on each POST.
        const { snapshot_date: _snapshotDate, ...template } = input.template as Record<string, unknown>;
        const token = createHash('sha256').update(JSON.stringify([
          { ...input, template },
          affected,
        ])).digest('hex');
        if (confirmation !== token) {
          throw new ManualAssignmentError(409, 'SCHEDULE_ASSIGNMENT_OVERLAP',
            'Des affectations chevauchent cette période. Vérifiez les conséquences puis confirmez le remplacement.',
            { confirmation: token, affected: impacts });
        }

        for (const [index, row] of affected.entries()) {
          const outcome = await carveAssignmentPeriod(model, rows[index], row, input.from, input.to, transaction);
          await new ScheduleAssignmentsLog()
            .setAssignmentId(row.id)
            .setPreviousTemplate(row.session_template)
            .setNewTemplate(row.session_template)
            .setPreviousVersion(row.version)
            .setNewVersion(row.version)
            .setModifiedBy(input.creator)
            .setOldCreator(row.created_by)
            .setModificationReason(input.reason ?? 'Remplacement confirmé par une affectation manuelle')
            .setChangedFields({ replacement: impacts[index], ...outcome })
            .save(transaction);
        }
      } else if (confirmation) {
        throw new ManualAssignmentError(409, 'SCHEDULE_ASSIGNMENT_REPLACEMENT_STALE',
          'Le planning a changé. Vérifiez la période avant de réessayer.');
      }

      await assignment.save(transaction);
      return assignment.toJSON();
    });
  } catch (error) {
    const databaseCode = (error as { parent?: { code?: string } })?.parent?.code;
    if (isExclusionConstraintError(error) || databaseCode === '40001' || databaseCode === '40P01') {
      throw new ManualAssignmentError(409, 'SCHEDULE_ASSIGNMENT_REPLACEMENT_STALE',
        'Le planning a changé ou la période chevauche une autre affectation. Vérifiez la période avant de réessayer.');
    }
    throw error;
  }
}
