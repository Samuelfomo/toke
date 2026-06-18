import ScheduleSuggestionModel, { SuggestionStatus } from '../model/ScheduleSuggestionModel.js';
import { responseStructure as RS, responseValue, ViewMode } from '../../utils/response.model.js';

import ScheduleSuggestionItem from './ScheduleSuggestionItem.js';
import User from './User.js';

// ─────────────────────────────────────────────────────────────────────────────
// ScheduleSuggestion — classe métier
// ─────────────────────────────────────────────────────────────────────────────

export default class ScheduleSuggestion extends ScheduleSuggestionModel {
  private managerObj?: User;
  private itemsCache?: ScheduleSuggestionItem[];

  constructor() {
    super();
  }

  // ── Factory statiques ─────────────────────────────────────────────────────

  static _load(guid: string): Promise<ScheduleSuggestion | null> {
    return new ScheduleSuggestion().load(guid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleSuggestion[] | null> {
    return new ScheduleSuggestion().list(conditions, paginationOptions);
  }

  static _listByManager(
    managerId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleSuggestion[] | null> {
    return new ScheduleSuggestion().listByManager(managerId, paginationOptions);
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  getId(): number | undefined {
    return this.id;
  }
  getGuid(): string | undefined {
    return this.guid;
  }
  getTenant(): string | undefined {
    return this.tenant;
  }
  getManagerId(): number | undefined {
    return this.manager;
  }
  getPeriodFrom(): string | undefined {
    return this.period_from;
  }
  getPeriodTo(): string | undefined {
    return this.period_to;
  }
  getHistoryWeeks(): number {
    return this.history_weeks;
  }
  getConformityScore(): number | null | undefined {
    return this.conformity_score;
  }
  getStatus(): SuggestionStatus {
    return this.status;
  }
  getApprovedAt(): Date | null | undefined {
    return this.approved_at;
  }
  getRejectedAt(): Date | null | undefined {
    return this.rejected_at;
  }
  getCreatedAt(): Date | undefined {
    return this.created_at;
  }

  isDraft(): boolean {
    return this.status === 'draft';
  }
  isApproved(): boolean {
    return this.status === 'approved';
  }
  isRejected(): boolean {
    return this.status === 'rejected';
  }

  // ── Setters ───────────────────────────────────────────────────────────────

  setTenant(v: string): this {
    this.tenant = v;
    return this;
  }
  setManager(v: number): this {
    this.manager = v;
    return this;
  }
  setPeriodFrom(v: string): this {
    this.period_from = v;
    return this;
  }
  setPeriodTo(v: string): this {
    this.period_to = v;
    return this;
  }
  setHistoryWeeks(v: number): this {
    this.history_weeks = v;
    return this;
  }
  setConformityScore(v: number): this {
    this.conformity_score = v;
    return this;
  }

  // ── Chargement de l'objet manager ────────────────────────────────────────

  async getManagerObj(): Promise<User | null> {
    if (this.managerObj) return this.managerObj;
    if (!this.manager) return null;
    const u = await User._load(this.manager);
    if (u) this.managerObj = u;
    return u;
  }

  // ── Chargement des items ──────────────────────────────────────────────────

  async getItems(): Promise<ScheduleSuggestionItem[]> {
    if (this.itemsCache) return this.itemsCache;
    if (!this.id) return [];
    const items = await ScheduleSuggestionItem._listBySuggestion(this.id);
    this.itemsCache = items ?? [];
    return this.itemsCache;
  }

  // ── Cycle de vie ─────────────────────────────────────────────────────────

  async save(): Promise<void> {
    await this.create();
  }

  async approve(): Promise<void> {
    if (!this.isDraft()) {
      throw new Error('Only draft suggestions can be approved');
    }
    await this.updateStatus('approved', 'approved_at');
  }

  async reject(): Promise<void> {
    if (!this.isDraft()) {
      throw new Error('Only draft suggestions can be rejected');
    }
    await this.updateStatus('rejected', 'rejected_at');
  }

  async softDelete(): Promise<boolean> {
    if (!this.id) return false;
    return await this.trash(this.id);
  }

  // ── Méthodes de listage interne ───────────────────────────────────────────

  async toJSON(view: ViewMode = responseValue.FULL, withItems: boolean = false): Promise<object> {
    const manager = await this.getManagerObj();

    const base: Record<string, any> = {
      [RS.GUID]: this.guid,
      [RS.PERIOD_FROM]: this.period_from,
      [RS.PERIOD_TO]: this.period_to,
      [RS.STATUS]: this.status,
      [RS.CONFORMITY_SCORE]: this.conformity_score ?? null,
      [RS.HISTORY_WEEKS]: this.history_weeks,
      [RS.GENERATED_AT]: this.created_at,
      [RS.APPROVED_AT]: this.approved_at ?? null,
      [RS.REJECTED_AT]: this.rejected_at ?? null,
      [RS.MANAGER]: manager
        ? { [RS.GUID]: manager.getGuid(), [RS.NAME]: manager.getFullName() }
        : null,
    };

    if (withItems) {
      const items = await this.getItems();
      base[RS.ITEMS] = await Promise.all(items.map((item) => item.toJSON()));
    }

    return base;
  }

  hydrate(data: any): ScheduleSuggestion {
    this.id = data.id;
    this.guid = data.guid;
    this.tenant = data.tenant;
    this.manager = data.manager;
    this.period_from = data.period_from;
    this.period_to = data.period_to;
    this.history_weeks = data.history_weeks ?? 8;
    this.conformity_score = data.conformity_score ?? null;
    this.status = data.status;
    this.approved_at = data.approved_at ?? null;
    this.rejected_at = data.rejected_at ?? null;
    this.deleted_at = data.deleted_at ?? null;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    return this;
  }

  private async load(guid: string): Promise<ScheduleSuggestion | null> {
    const data = await this.findByGuid(guid);
    if (!data) return null;
    return this.hydrate(data);
  }

  // ── toJSON ────────────────────────────────────────────────────────────────

  private async list(
    conditions: Record<string, any>,
    paginationOptions: { offset?: number; limit?: number },
  ): Promise<ScheduleSuggestion[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((d) => new ScheduleSuggestion().hydrate(d));
  }

  // ── Hydratation ───────────────────────────────────────────────────────────

  private async listByManager(
    managerId: number,
    paginationOptions: { offset?: number; limit?: number },
  ): Promise<ScheduleSuggestion[] | null> {
    const dataset = await this.listAllByManager(managerId, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((d) => new ScheduleSuggestion().hydrate(d));
  }
}
