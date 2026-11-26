import { QueryTypes, Transaction, type Sequelize } from 'sequelize';
import type { SessionPrincipal } from '../../tools/user-session.authority.js';
import TenantManager from '../database/db.tenant-manager.js';
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
  kind: 'list' | 'detail' | 'events' | 'statistics' | 'state' | 'mark-read';
  guid?: string;
  seenAt?: unknown;
  filters?: Record<string, string>;
}
export type MemoReadPrincipal = Readonly<SessionPrincipal | {
  kind: 'delegated-integrator';
  userGuid: string;
  tenantGuid: string;
  subdomain: string;
  auditRef: string;
}>;

export async function memoWritesAvailable(db: Sequelize, transaction: Transaction): Promise<boolean> {
  if (process.env.MEMO_B1_MANAGER_WRITES !== '1') return false;
  const [row] = await db.query<{ enabled: boolean }>(
    `SELECT coalesce(has_function_privilege(to_regprocedure(
      'public.toke_b1_write_memo(uuid,text,text,text,integer,text,bigint,jsonb,integer)'), 'EXECUTE'),false) AS enabled`,
    { transaction, type: QueryTypes.SELECT },
  );
  return row?.enabled === true;
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
    principal: MemoReadPrincipal,
    selection: MemoReadSelection,
  ): Promise<unknown> {
    const db = TenantManager.getConnectionSync();
    if (
      (principal.kind === 'manager' &&
        (principal.v !== 2 || principal.exp <= Math.floor(Date.now() / 1000))) ||
      principal.subdomain !== TenantManager.getCurrentTenant()
    )
      throw new MemoReadError(403, 'tenant_session_mismatch');
    const run = () => db.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
      async (tx) => {
        if (selection.kind !== 'mark-read')
          await db.query('SET TRANSACTION READ ONLY', { transaction: tx });
        // Both B1 profiles expose this marker to the runtime role. The SQL
        // below checks access to the actual tables used by this read.
        const [foundation] = await db.query<{ version: string }>(
          'SELECT public.toke_b1_version() AS version',
          { type: QueryTypes.SELECT, transaction: tx },
        ).catch((error: unknown) => {
          const databaseError = error as { parent?: { code?: string }; code?: string };
          const code = databaseError?.parent?.code ?? databaseError?.code;
          if (code === '42883' || code === '42501')
            throw new MemoReadError(503, 'memo_b1_not_ready');
          throw error;
        });
        if (foundation?.version !== 'b1-v1')
          throw new MemoReadError(503, 'memo_b1_not_ready');
        const writesEnabled = (selection.kind === 'list' || selection.kind === 'detail') &&
          await memoWritesAvailable(db, tx);
        const [receiptSchema] = await db.query<{ enabled: boolean }>(
          `SELECT coalesce(has_table_privilege(to_regclass('public.tk_memo_reads'), 'SELECT')
            AND has_table_privilege(to_regclass('public.tk_memo_reads'), 'INSERT')
            AND has_table_privilege(to_regclass('public.tk_memo_reads'), 'UPDATE')
            AND EXISTS (SELECT FROM pg_index WHERE indexrelid=to_regclass('public.uq_tk_memo_reads_memo_user')
                AND indrelid=to_regclass('public.tk_memo_reads') AND indisvalid AND indisunique), false) AS enabled`,
          { transaction: tx, type: QueryTypes.SELECT },
        );
        const receiptsEnabled = receiptSchema?.enabled === true;
        const organization = await loadMemoOrganization(db, tx, principal.tenantGuid);
        const actor = [...organization.people.values()].find((p) => p.guid === principal.userGuid);
        if (!actor || !organization.activePerson(actor.id))
          throw new MemoReadError(401, 'session_account_unavailable');
        if (principal.kind === 'delegated-integrator' && !organization.manager(actor.id))
          throw new MemoReadError(403, 'memo_manager_role_required');
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
        const modified = 'coalesce(m.updated_at,m.created_at)';
        const receiptJoin = receiptsEnabled ? 'LEFT JOIN public.tk_memo_reads r ON r.memo_id=m.id AND r.user_id=$actor' : '';
        const unread = receiptsEnabled ? `(r.read_at IS NULL OR r.read_at<${modified})` : 'false';
        const from = `FROM public.tk_memos m LEFT JOIN public.tk_memo_workflows w ON w.memo_id=m.id
          ${receiptJoin} WHERE ${conditions.join(' AND ')}`;
        const query = <T extends object>(sql: string, extra: Record<string, unknown> = {}) =>
          db.query<T>(sql, {
            bind: { ...bind, ...extra },
            type: QueryTypes.SELECT,
            transaction: tx,
          });
        if (selection.kind === 'state') {
          const [state] = await query<{ revision: string; unreadTotal: number }>(
            `SELECT count(*) FILTER (WHERE ${unread})::integer AS "unreadTotal",
              count(*)::text || ':' || coalesce(sum(hashtextextended(
                concat(m.id, ':', ${modified}, ':', w.version, ':', ${unread}), 0)::numeric),0)::text AS revision
              ${from}`,
          );
          return state;
        }
        if (selection.kind === 'mark-read') {
          if (!receiptsEnabled) throw new MemoReadError(503, 'memo_receipts_unavailable');
          const seenAt = selection.seenAt;
          if (typeof seenAt !== 'string' ||
              !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(seenAt) ||
              !Number.isFinite(Date.parse(seenAt)) ||
              new Date(seenAt).toISOString().slice(0, 19) !== seenAt.slice(0, 19)) invalid();
          const [memo] = await query<{ id: number; seen_at: string }>(
            `SELECT m.id, greatest(m.created_at,least($seenAt::timestamptz,${modified}))::text AS seen_at ${from}`,
            { seenAt },
          );
          if (!memo) throw new MemoReadError(404, 'memo_not_found');
          const { default: MemoReads } = await import('../class/MemoReads.js');
          const readAt = await MemoReads._markRead(memo.id, actor.id, memo.seen_at, tx);
          return { readAt };
        }
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
        const columns = `m.id,m.guid,m.author_user,m.target_user,m.validator_user,m.memo_status,m.memo_type,m.title,m.created_at,m.updated_at,m.incident_datetime,m.auto_generated,
        to_char(${modified} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS seen_at,
        ${receiptsEnabled ? 'r.read_at' : 'NULL'} AS read_at, ${receiptsEnabled ? 'NOT ' + unread : 'true'} AS is_read,
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
            memos: rows.map((row) => this.present(row, organization, actor, writesEnabled)),
            writesEnabled: writesEnabled && organization.manager(actor.id),
            receiptsEnabled,
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
            ...this.present(row, organization, actor, writesEnabled),
            details: row.details,
            exchanges: legacyContent(row.memo_content),
            receiptsEnabled,
          },
          history_completeness: row.history_completeness ?? 'LEGACY_INCOMPLETE',
        };
      },
    );
    try {
      return await run();
    } catch (error) {
      if (selection.kind !== 'mark-read' ||
          (error as { parent?: { code?: string } })?.parent?.code !== '40001') throw error;
      return run();
    }
  }
  private static present(
    row: Record<string, any>,
    org: MemoOrganization,
    actor: MemoPerson,
    writesEnabled: boolean,
  ): Record<string, unknown> {
    const participant = (id: number) => {
      const person = org.people.get(id);
      if (!person || person.tenant !== actor.tenant) return null;
      return { guid: person.guid, first_name: person.first_name ?? '', last_name: person.last_name ?? '' };
    };
    const author = participant(row.author_user);
    const target = participant(row.target_user);
    const canWrite = writesEnabled && org.manager(actor.id);
    const authorIsActor = row.author_user === actor.id;
    const responsible = row.responsibility_state === 'ASSIGNED' && row.responsible_user_id === actor.id;
    const open = ['pending', 'submitted'].includes(row.memo_status);
    const draft = row.memo_status === 'pending' && row.history_completeness === 'COMPLETE_SINCE_B';
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
      updated_at: row.updated_at,
      seen_at: row.seen_at,
      read_at: row.read_at,
      is_read: row.is_read,
      incident_datetime: row.incident_datetime,
      auto_generated: row.auto_generated,
      author_guid: author?.guid ?? null,
      target_guid: target?.guid ?? null,
      author_user: author,
      target_user: target,
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
        comment: canWrite && open && !draft && (authorIsActor || row.target_user === actor.id || responsible),
        edit: canWrite && draft && authorIsActor && !row.auto_generated,
        submit: canWrite && draft && authorIsActor && !row.auto_generated,
        reopen: false,
        validate: canWrite && open && responsible,
        reject: canWrite && open && responsible,
        revoke: canWrite && ((open && authorIsActor && !row.auto_generated) ||
          (['approved', 'rejected'].includes(row.memo_status) && responsible && row.validator_user === actor.id)),
        correct: false,
        transfer: false,
        media: false,
      },
    };
  }
}
