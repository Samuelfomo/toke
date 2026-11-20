import { QueryTypes, Transaction } from 'sequelize';
import type { SessionPrincipal } from '../../tools/user-session.authority.js';
import TenantManager from '../database/db.tenant-manager.js';
import { MemoFoundationsPersistence } from '../persistence/memos/foundations.persistence.js';
import {
  loadMemoOrganization,
  type MemoOrganization,
  type MemoPerson,
} from './responsibility.policy.js';

export class MemoReadError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}
export interface MemoReadSelection {
  kind: 'list' | 'detail' | 'events' | 'statistics';
  guid?: string;
  filters?: Record<string, string>;
}
const statuses = ['submitted', 'pending', 'approved', 'rejected', 'revoked'];
const types = [
  'delay_justification',
  'absence_justification',
  'correction_request',
  'session_closure',
  'auto_generated',
  'other',
];
const queryKeys = new Set([
  'offset',
  'limit',
  'sort',
  'search',
  'memo_status',
  'memo_type',
  'responsibility_state',
  'supervisor',
  'author_user',
  'target_user',
  'validator_user',
  'auto_generated',
  'after',
  'responsible_self',
  'participant_self',
]);
function invalid(): never {
  throw new MemoReadError(400, 'memo_read_query_invalid');
}
function integer(value: string | undefined, fallback: number, maximum: number): number {
  if (value === undefined) return fallback;
  if (!/^\d{1,9}$/.test(value) || Number(value) > maximum) return invalid();
  return Number(value);
}
function legacyContent(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== 'object') return { legacy_unreadable: true };
    const messages = Array.isArray(item.message) ? item.message : [item.message];
    return {
      created_at: item.created_at,
      user: item.user,
      type: item.type,
      authorship_verified: false,
      message: messages
        .filter((m: any) => m?.type === 'text')
        .map((m: any) => ({
          type: 'text',
          content:
            typeof m.content === 'string'
              ? m.content
              : Array.isArray(m.content)
                ? m.content.filter((v: unknown) => typeof v === 'string')
                : '',
        })),
      restricted_content: messages.some((m: any) => m?.type !== 'text'),
    };
  });
}

/** Central read ACL: author OR target OR certified responsible/current superior.
 * validator_user, team/group membership and a resolver proposal grant no read. */
export class MemoReadsService {
  static async read(
    principal: Readonly<SessionPrincipal>,
    selection: MemoReadSelection,
  ): Promise<unknown> {
    const db = TenantManager.getConnectionSync();
    if (
      principal.v !== 2 ||
      principal.kind !== 'manager' ||
      principal.exp <= Math.floor(Date.now() / 1000) ||
      principal.subdomain !== TenantManager.getCurrentTenant()
    )
      throw new MemoReadError(403, 'tenant_session_mismatch');
    await MemoFoundationsPersistence.loadExisting(db);
    return db.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
      async (tx) => {
        await db.query('SET TRANSACTION READ ONLY', { transaction: tx });
        const organization = await loadMemoOrganization(db, tx, principal.tenantGuid);
        const actor = [...organization.people.values()].find((p) => p.guid === principal.userGuid);
        if (!actor || !organization.activePerson(actor.id))
          throw new MemoReadError(401, 'session_account_unavailable');
        const f = selection.filters ?? {};
        for (const key of Object.keys(f)) if (!queryKeys.has(key)) invalid();
        if (f.supervisor !== undefined && f.supervisor !== actor.guid)
          throw new MemoReadError(403, 'memo_actor_mismatch');
        if (f.memo_status && !statuses.includes(f.memo_status)) invalid();
        if (f.memo_type && !types.includes(f.memo_type)) invalid();
        if (
          f.responsibility_state &&
          !['UNRESOLVED', 'ASSIGNED', 'REVIEW_REQUIRED'].includes(f.responsibility_state)
        )
          invalid();
        if (f.sort && !['recent', 'oldest'].includes(f.sort)) invalid();
        if (f.auto_generated && !['true', 'false'].includes(f.auto_generated)) invalid();
        if (f.search && f.search.length > 200) invalid();
        const limit = integer(f.limit, 20, 100),
          offset = integer(f.offset, 0, 100000),
          after = integer(f.after, 0, 100000000);
        if (limit < 1) invalid();
        const bind: Record<string, unknown> = {
          actor: actor.id,
          responsibles: organization.readableResponsibilities(actor.id),
        };
        if (f.participant_self !== undefined && f.participant_self !== 'true') invalid();
        if (f.responsible_self !== undefined && f.responsible_self !== 'true') invalid();
        const conditions = [
          `(m.author_user=$actor OR m.target_user=$actor OR (w.responsibility_state='ASSIGNED' AND w.responsible_user_id=ANY($responsibles::integer[])))`,
        ];
        if (f.participant_self === 'true')
          conditions.push('(m.author_user=$actor OR m.target_user=$actor)');
        if (f.responsible_self === 'true')
          conditions.push("w.responsibility_state='ASSIGNED' AND w.responsible_user_id=$actor");
        for (const key of ['memo_status', 'memo_type', 'auto_generated'] as const)
          if (f[key] !== undefined) {
            conditions.push(`m.${key}=$${key}`);
            bind[key] = key === 'auto_generated' ? f[key] === 'true' : f[key];
          }
        if (f.search) {
          conditions.push("m.title ILIKE $search ESCAPE '\\'");
          bind.search = '%' + f.search.replace(/[\\%_]/g, '\\$&') + '%';
        }
        // Participant filters are predicates within the authorized scope, never identity evidence.
        for (const key of ['author_user', 'target_user', 'validator_user'] as const)
          if (f[key] !== undefined) {
            conditions.push(
              `EXISTS(SELECT 1 FROM public.xa_users x WHERE x.id=m.${key} AND x.guid=$${key})`,
            );
            bind[key] = f[key];
          }
        const unavailable = [...organization.people.keys()].filter(
          (id) => !organization.manager(id),
        );
        bind.unavailable = unavailable;
        const responsibilityState = `CASE WHEN w.memo_id IS NULL THEN 'UNRESOLVED' WHEN w.responsibility_state='ASSIGNED' AND w.responsible_user_id=ANY($unavailable::integer[]) THEN 'REVIEW_REQUIRED' ELSE w.responsibility_state END`;
        if (f.responsibility_state) {
          conditions.push(`(${responsibilityState})=$responsibility_state`);
          bind.responsibility_state = f.responsibility_state;
        }
        if (selection.guid) {
          conditions.push('m.guid=$guid');
          bind.guid = selection.guid;
        }
        const from = `FROM public.tk_memos m LEFT JOIN public.tk_memo_workflows w ON w.memo_id=m.id WHERE ${conditions.join(' AND ')}`;
        const query = <T extends object>(sql: string, extra: Record<string, unknown> = {}) =>
          db.query<T>(sql, {
            bind: { ...bind, ...extra },
            type: QueryTypes.SELECT,
            transaction: tx,
          });
        if (selection.kind === 'statistics') {
          const rows = await query<{ memo_status: string; memo_type: string; count: number }>(
            `SELECT m.memo_status,m.memo_type,count(*)::integer AS count ${from} GROUP BY m.memo_status,m.memo_type`,
          );
          return {
            scope: 'authorized_memos',
            total: rows.reduce((sum, r) => sum + r.count, 0),
            by_status: Object.fromEntries(
              statuses.map((s) => [
                s,
                rows.filter((r) => r.memo_status === s).reduce((sum, r) => sum + r.count, 0),
              ]),
            ),
            by_type: rows,
          };
        }
        const columns = `m.id,m.guid,m.author_user,m.target_user,m.validator_user,m.memo_status,m.memo_type,m.title,m.created_at,m.incident_datetime,m.auto_generated,
        w.responsible_user_id,w.responsibility_reason,w.history_completeness,w.decision_cycle::text,w.version::text,(${responsibilityState}) AS responsibility_state`;
        if (selection.kind === 'list') {
          const [{ total }] = await query<{ total: number }>(
            `SELECT count(*)::integer AS total ${from}`,
          );
          const direction = f.sort === 'oldest' ? 'ASC' : 'DESC';
          const rows = await query<Record<string, any>>(
            `SELECT ${columns} ${from} ORDER BY m.created_at ${direction},m.id ${direction} LIMIT $limit OFFSET $offset`,
            { limit, offset },
          );
          return {
            memos: rows.map((row) => this.present(row, organization, actor)),
            total,
            offset,
            limit,
          };
        }
        const rows = await query<Record<string, any>>(
          `SELECT ${columns},m.details,m.memo_content ${from}`,
        );
        if (!rows.length) throw new MemoReadError(404, 'memo_not_found');
        const row = rows[0];
        if (selection.kind === 'events') {
          // The memo ACL was checked in this same read-only repeatable snapshot.
          const events = await query<Record<string, any>>(
            `SELECT event_id,sequence::text,event_type,effective_author_id,responsible_user_id,decision_result,occurred_at,decision_cycle::text,version::text,previous_event_id,related_event_id,
          metadata->'observed_state'->>'memo_status' AS observed_status
          FROM public.tk_memo_events WHERE memo_id=$memo AND sequence>$after ORDER BY sequence LIMIT $limit`,
            { memo: row.id, after, limit },
          );
          return {
            events: events.map((e) => ({
              ...e,
              effective_author_id: undefined,
              responsible_user_id: undefined,
              author_guid: organization.people.get(e.effective_author_id)?.guid ?? null,
              responsible_guid: organization.people.get(e.responsible_user_id)?.guid ?? null,
            })),
            history_completeness: row.history_completeness ?? 'LEGACY_INCOMPLETE',
          };
        }
        return {
          memo: {
            ...this.present(row, organization, actor),
            details: row.details,
            exchanges: legacyContent(row.memo_content),
          },
          history_completeness: row.history_completeness ?? 'LEGACY_INCOMPLETE',
        };
      },
    );
  }
  private static present(
    row: Record<string, any>,
    org: MemoOrganization,
    actor: MemoPerson,
  ): Record<string, unknown> {
    const responsibility = row.responsibility_state;
    const relation =
      row.author_user === actor.id
        ? 'AUTHOR'
        : row.target_user === actor.id
          ? 'TARGET'
          : row.responsible_user_id === actor.id
            ? 'RESPONSIBLE'
            : 'SUPERVISOR';
    return {
      guid: row.guid,
      memo_status: row.memo_status,
      memo_type: row.memo_type,
      title: row.title,
      created_at: row.created_at,
      incident_datetime: row.incident_datetime,
      auto_generated: row.auto_generated,
      author_guid: org.people.get(row.author_user)?.guid ?? null,
      target_guid: org.people.get(row.target_user)?.guid ?? null,
      responsibility: {
        state: responsibility,
        responsible_guid: org.people.get(row.responsible_user_id)?.guid ?? null,
        label: responsibility === 'ASSIGNED' ? 'Responsable désigné' : 'Responsable à désigner',
        reason:
          row.responsibility_reason ??
          (responsibility === 'REVIEW_REQUIRED' ? 'RESPONSIBLE_UNAVAILABLE' : 'WORKFLOW_ABSENT'),
      },
      history_completeness: row.history_completeness ?? 'LEGACY_INCOMPLETE',
      decision_cycle: row.decision_cycle ?? null,
      version: row.version ?? null,
      access_relation: relation,
      capabilities: {
        read: true,
        comment: false,
        reopen: false,
        validate: false,
        reject: false,
        correct: false,
        transfer: false,
        media: false,
      },
    };
  }
}
