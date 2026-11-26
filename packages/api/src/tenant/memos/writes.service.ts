import { QueryTypes, Transaction } from 'sequelize';
import TenantManager from '../database/db.tenant-manager.js';
import { MemoReadError, memoWritesAvailable, type MemoReadPrincipal } from './reads.service.js';
import { loadMemoOrganization, type MemoOrganization } from './responsibility.policy.js';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const guid = /^(?:[0-9]{1,255}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i;
const actions = ['CREATE', 'EDIT', 'SUBMIT', 'REPLY', 'APPROVE', 'REJECT', 'REVOKE'];
const types = ['other', 'delay_justification', 'absence_justification', 'correction_request', 'session_closure'];

function recipient(org: MemoOrganization, actor: number, target: number) {
  if (actor === target || !org.activePerson(target)) return null;
  const proposal = org.resolve(target);
  const responsible = proposal.responsibleUserId;
  return responsible !== null &&
    (responsible === actor || org.supervisorsOf(responsible).includes(actor)) ? responsible : null;
}

export class MemoWritesService {
  static async run(principal: MemoReadPrincipal, route: 'recipients' | 'commands', body: unknown) {
    const db = TenantManager.getConnectionSync();
    if (principal.subdomain !== TenantManager.getCurrentTenant())
      throw new MemoReadError(403, 'tenant_session_mismatch');
    try {
      return await db.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async (transaction) => {
        if (!await memoWritesAvailable(db, transaction))
          throw new MemoReadError(503, 'memo_writes_unavailable');
        const org = await loadMemoOrganization(db, transaction, principal.tenantGuid);
        const actor = [...org.people.values()].find(person => person.guid === principal.userGuid);
        if (!actor || !org.manager(actor.id)) throw new MemoReadError(403, 'memo_manager_role_required');
        if (route === 'recipients') {
          return { recipients: [...org.people.values()]
            .filter(person => recipient(org, actor.id, person.id) !== null)
            .map(({ guid, first_name, last_name }) => ({ guid, first_name, last_name })) };
        }

        if (!body || typeof body !== 'object' || Array.isArray(body))
          throw new MemoReadError(400, 'memo_command_invalid');
        const command = body as Record<string, unknown>;
        const invalid = () => new MemoReadError(400, 'memo_command_invalid');
        const text = (key: string, limit: number) => {
          const value = command[key];
          if (typeof value !== 'string' || !value.trim() || value.length > limit) throw invalid();
          return value.trim();
        };
        const action = text('action', 16);
        const commandId = text('commandId', 36).toLowerCase();
        if (!actions.includes(action) || !uuid.test(commandId)) throw invalid();
        const memoGuid = action === 'CREATE' ? commandId : text('guid', 128);
        if (!guid.test(memoGuid)) throw invalid();
        const version = command.version ?? null;
        if (action !== 'CREATE' && version !== null &&
          (typeof version !== 'string' || !/^[1-9][0-9]{0,17}$/.test(version))) throw invalid();
        const payload: Record<string, unknown> = {};
        let responsible: number | null = null;
        if (['CREATE', 'EDIT', 'REPLY'].includes(action)) payload.text = text('text', 3000);
        if (['CREATE', 'EDIT'].includes(action)) payload.title = text('title', 200);
        if (action === 'CREATE') {
          const targetGuid = text('targetGuid', 255);
          const target = [...org.people.values()].find(person => person.guid === targetGuid);
          if (!target || recipient(org, actor.id, target.id) === null)
            throw new MemoReadError(403, 'memo_recipient_forbidden');
          payload.targetId = target.id;
          const type = text('type', 32);
          if (!types.includes(type)) throw invalid();
          payload.type = type;
        } else {
          const [memo] = await db.query<{ target_user: number; author_user: number; responsible_user_id: number | null;
            responsibility_state: string | null }>(
            `SELECT m.target_user,m.author_user,w.responsible_user_id,w.responsibility_state
             FROM public.tk_memos m LEFT JOIN public.tk_memo_workflows w ON w.memo_id=m.id WHERE m.guid=$guid`,
            { bind: { guid: memoGuid }, transaction, type: QueryTypes.SELECT },
          );
          if (!memo || !(memo.author_user === actor.id || memo.target_user === actor.id ||
            (memo.responsibility_state === 'ASSIGNED' && memo.responsible_user_id !== null &&
              org.readableResponsibilities(actor.id).includes(memo.responsible_user_id))))
            throw new MemoReadError(404, 'memo_not_found');
          if (action === 'SUBMIT') {
            responsible = recipient(org, actor.id, memo.target_user);
            if (responsible === null) throw new MemoReadError(403, 'memo_recipient_forbidden');
          }
        }
        if (principal.kind === 'manager' && principal.exp <= Math.floor(Date.now() / 1000))
          throw new MemoReadError(401, 'invalid_user_session');
        const [row] = await db.query<{ result: { guid: string; version: string } }>(
          `SELECT public.toke_b1_write_memo($command::uuid,$action,$guid,$tenant,$actor,
             $delegated,$version::bigint,$payload::jsonb,$responsible) AS result`, {
            bind: { command: commandId, action, guid: memoGuid, tenant: principal.tenantGuid,
              actor: actor.id, delegated: principal.kind === 'delegated-integrator' ? principal.auditRef : null,
              version: action === 'CREATE' ? null : version, payload: JSON.stringify(payload), responsible },
            transaction, type: QueryTypes.SELECT,
          });
        return row.result;
      });
    } catch (error) {
      if (error instanceof MemoReadError) throw error;
      const pg = (error as { parent?: { code?: string; message?: string } }).parent;
      if (pg?.code === '40001' || pg?.code === '40P01' || pg?.message === 'MEMO_CONFLICT')
        throw new MemoReadError(409, 'memo_conflict');
      if (pg?.message === 'MEMO_FORBIDDEN') throw new MemoReadError(403, 'memo_action_forbidden');
      if (pg?.message === 'MEMO_NOT_FOUND') throw new MemoReadError(404, 'memo_not_found');
      if (pg?.message === 'MEMO_INVALID') throw new MemoReadError(400, 'memo_command_invalid');
      throw error;
    }
  }
}
