import { QueryTypes, type Sequelize, type Transaction } from 'sequelize';
import TenantManager from '../database/db.tenant-manager.js';
import { assertTransaction } from '../database/tenant.ownership.js';

export interface MemoPerson {
  id: number;
  guid: string;
  tenant: string;
  active: boolean;
  deleted_at: unknown;
  roles: string[];
}
interface DirectLink {
  id: number;
  subordinate: number;
  supervisor: number;
  relationship_type: string;
  effective_from: string;
  effective_to: string | null;
}
interface MemoGroup {
  id: number;
  manager: number;
  members: unknown;
}
export interface ResponsibilityProposal {
  state: 'ASSIGNED' | 'UNRESOLVED' | 'REVIEW_REQUIRED';
  responsibleUserId: number | null;
  reason: string;
  source: 'DIRECT_REPORT' | 'GROUP' | null;
  sourceIds: number[];
  /** A computed proposal is never a persisted responsibility certificate. */
  proposalOnly: true;
}

/** One server-time snapshot per read transaction; never cached across requests. */
export class MemoOrganization {
  readonly people: ReadonlyMap<number, MemoPerson>;
  private readonly links: Map<number, DirectLink[]> = new Map();
  constructor(
    people: MemoPerson[],
    links: DirectLink[],
    private readonly groups: MemoGroup[],
    readonly day: string,
    readonly now: string,
    private readonly tenantGuid: string,
  ) {
    this.people = new Map(people.map((p) => [p.id, p]));
    for (const link of links)
      this.links.set(link.subordinate, [...(this.links.get(link.subordinate) ?? []), link]);
  }
  activePerson(id: number): boolean {
    const p = this.people.get(id);
    return !!p && p.active === true && !p.deleted_at && p.tenant === this.tenantGuid;
  }
  manager(id: number): boolean {
    return (
      this.activePerson(id) &&
      this.people.get(id)!.roles.some((r) => r === 'MANAGER' || r === 'ADMIN-RH')
    );
  }
  private direct(id: number): { ids: number[]; sourceIds: number[]; invalid: boolean } {
    const current: DirectLink[] = [];
    for (const l of this.links.get(id) ?? []) {
      if (l.relationship_type !== 'direct_report') continue;
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(l.effective_from) ||
        (l.effective_to !== null &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(l.effective_to) || l.effective_to < l.effective_from))
      )
        return { ids: [], sourceIds: [], invalid: true };
      if (l.effective_from <= this.day && (l.effective_to === null || l.effective_to >= this.day))
        current.push(l);
    }
    return {
      ids: [...new Set(current.map((l) => l.supervisor))],
      sourceIds: current.map((l) => l.id).sort((a, b) => a - b),
      invalid: current.some(
        (l) => l.supervisor === id || !this.manager(l.supervisor) || !this.activePerson(id),
      ),
    };
  }
  private cyclic(start: number): boolean {
    const visiting = new Set<number>(),
      visited = new Set<number>();
    const walk = (id: number, depth: number): boolean => {
      if (visiting.has(id) || depth > 256) return true;
      if (visited.has(id)) return false;
      visiting.add(id);
      for (const parent of this.direct(id).ids) if (walk(parent, depth + 1)) return true;
      visiting.delete(id);
      visited.add(id);
      return false;
    };
    return walk(start, 0);
  }
  resolve(collaboratorId: number): ResponsibilityProposal {
    const result = (
      state: ResponsibilityProposal['state'],
      reason: string,
      id: number | null = null,
      source: ResponsibilityProposal['source'] = null,
      sourceIds: number[] = [],
    ): ResponsibilityProposal => ({
      state,
      responsibleUserId: id,
      reason,
      source,
      sourceIds,
      proposalOnly: true,
    });
    if (!this.activePerson(collaboratorId))
      return result('REVIEW_REQUIRED', 'COLLABORATOR_UNAVAILABLE');
    const direct = this.direct(collaboratorId);
    if (direct.invalid || this.cyclic(collaboratorId))
      return result('REVIEW_REQUIRED', 'DIRECT_STRUCTURE_INCOHERENT');
    if (direct.ids.length > 1) return result('UNRESOLVED', 'COMPETING_DIRECT_MANAGERS');
    if (direct.ids.length === 1)
      return result(
        'ASSIGNED',
        'UNIQUE_DIRECT_MANAGER',
        direct.ids[0],
        'DIRECT_REPORT',
        direct.sourceIds,
      );
    const candidates = new Set<number>(),
      sources: number[] = [];
    for (const group of this.groups) {
      if (!Array.isArray(group.members))
        return result('REVIEW_REQUIRED', 'GROUP_STRUCTURE_INCOHERENT');
      if (
        group.members.some(
          (m) =>
            !m ||
            typeof m !== 'object' ||
            !Number.isInteger((m as { user?: unknown }).user) ||
            Number((m as { user?: unknown }).user) <= 0,
        )
      )
        return result('REVIEW_REQUIRED', 'GROUP_STRUCTURE_INCOHERENT');
      const members = group.members.filter(
        (m) => m && typeof m === 'object' && (m as { user?: unknown }).user === collaboratorId,
      );
      if (members.length > 1) return result('REVIEW_REQUIRED', 'DUPLICATE_GROUP_MEMBER');
      if (!members.length) continue;
      const m = members[0] as { active?: unknown; joined_at?: unknown };
      if (m.active === false) continue;
      if (m.active !== undefined && m.active !== true)
        return result('REVIEW_REQUIRED', 'GROUP_MEMBER_ACTIVITY_INVALID');
      if (typeof m.joined_at !== 'string' || !Number.isFinite(Date.parse(m.joined_at)))
        return result('REVIEW_REQUIRED', 'GROUP_MEMBER_DATE_INVALID');
      if (Date.parse(m.joined_at) > Date.parse(this.now)) continue;
      if (
        group.manager === collaboratorId ||
        !this.manager(group.manager) ||
        this.cyclic(group.manager)
      )
        return result('REVIEW_REQUIRED', 'GROUP_MANAGER_UNRELIABLE');
      candidates.add(group.manager);
      sources.push(group.id);
    }
    if (candidates.size > 1) return result('UNRESOLVED', 'COMPETING_GROUP_MANAGERS');
    if (candidates.size === 1)
      return result(
        'ASSIGNED',
        'UNIQUE_GROUP_MANAGER',
        [...candidates][0],
        'GROUP',
        sources.sort((a, b) => a - b),
      );
    return result('UNRESOLVED', 'NO_RELIABLE_MANAGER');
  }
  /** Only a unique, currently valid DIRECT_REPORT chain grants supervision.
   * A group is never a hierarchy edge. Incoherent chains grant nobody. */
  supervisorsOf(responsibleId: number): number[] {
    if (!this.manager(responsibleId) || this.cyclic(responsibleId)) return [];
    const chain: number[] = [],
      seen = new Set<number>([responsibleId]);
    let current = responsibleId;
    for (let depth = 0; depth < 256; depth++) {
      const d = this.direct(current);
      if (d.invalid || d.ids.length > 1) return [];
      if (!d.ids.length) return chain;
      current = d.ids[0];
      if (seen.has(current)) return [];
      seen.add(current);
      chain.push(current);
    }
    return [];
  }
  readableResponsibilities(actorId: number): number[] {
    return [...this.people.keys()].filter(
      (id) => this.manager(id) && (id === actorId || this.supervisorsOf(id).includes(actorId)),
    );
  }
}

export async function loadMemoOrganization(
  connection: Sequelize,
  transaction: Transaction,
  tenantGuid: string,
): Promise<MemoOrganization> {
  TenantManager.assertConnection(connection);
  assertTransaction(transaction, connection);
  const query = <T extends object>(sql: string) =>
    connection.query<T>(sql, { type: QueryTypes.SELECT, transaction });
  const clock = (
    await query<{ day: string; now: string }>(
      "SELECT to_char(transaction_timestamp() AT TIME ZONE 'Africa/Douala','YYYY-MM-DD') AS day, transaction_timestamp()::text AS now",
    )
  )[0];
  const people = await query<MemoPerson>(`SELECT u.id,u.guid,u.tenant,u.active,u.deleted_at,
    ARRAY(SELECT r.code FROM public.xa_user_roles ur JOIN public.xa_roles r ON r.id=ur.role WHERE ur."user"=u.id) AS roles
    FROM public.xa_users u ORDER BY u.id LIMIT 20001`);
  const links = await query<DirectLink>(
    'SELECT id,subordinate,supervisor,relationship_type,effective_from::text,effective_to::text FROM public.xa_org_hierarchy ORDER BY id LIMIT 20001',
  );
  const groups = await query<MemoGroup>(
    'SELECT id,manager,members FROM public.xa_groups WHERE deleted_at IS NULL ORDER BY id LIMIT 20001',
  );
  if ([people, links, groups].some((rows) => rows.length > 20000))
    throw new Error('MEMO_ORGANIZATION_CAPACITY_EXCEEDED');
  return new MemoOrganization(people, links, groups, clock.day, clock.now, tenantGuid);
}
