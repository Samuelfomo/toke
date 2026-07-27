import ScheduleSuggestionModel, { SuggestionStatus } from '../model/ScheduleSuggestionModel.js';
import { responseStructure as RS, responseValue, ViewMode } from '../../utils/response.model.js';

import PlanningSuggestionConfig from './PlanningSuggestionConfig.js';
import ScheduleSuggestionItem from './ScheduleSuggestionItem.js';
import User from './User.js';

export default class ScheduleSuggestion extends ScheduleSuggestionModel {
  private managerObj?: User;
  private configObj?: PlanningSuggestionConfig;
  private itemsCache?: ScheduleSuggestionItem[];

  constructor() {
    super();
  }

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

  getConfigId(): number | null | undefined {
    return this.config;
  }

  getEngineVersion(): string {
    return this.engine_version;
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

  getDiagnostics(): Record<string, any> | null | undefined {
    return this.diagnostics;
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

  setTenant(value: string): this {
    this.tenant = value;
    return this;
  }

  setManager(value: number): this {
    this.manager = value;
    this.managerObj = undefined;
    return this;
  }

  setConfig(value: number | null): this {
    this.config = value;
    this.configObj = undefined;
    return this;
  }

  setEngineVersion(value: string): this {
    this.engine_version = value;
    return this;
  }

  setPeriodFrom(value: string): this {
    this.period_from = value;
    return this;
  }

  setPeriodTo(value: string): this {
    this.period_to = value;
    return this;
  }

  setHistoryWeeks(value: number): this {
    this.history_weeks = value;
    return this;
  }

  setConformityScore(value: number): this {
    this.conformity_score = value;
    return this;
  }

  setDiagnostics(value: Record<string, any> | null): this {
    this.diagnostics = value;
    return this;
  }

  async getManagerObj(): Promise<User | null> {
    if (this.managerObj) return this.managerObj;
    if (!this.manager) return null;

    const user = await User._load(this.manager);
    if (user) this.managerObj = user;
    return user;
  }

  async getConfigObj(): Promise<PlanningSuggestionConfig | null> {
    if (this.configObj) return this.configObj;
    if (!this.config) return null;

    const config = await PlanningSuggestionConfig._load(this.config);
    if (config) this.configObj = config;
    return config;
  }

  async getItems(): Promise<ScheduleSuggestionItem[]> {
    if (this.itemsCache) return this.itemsCache;
    if (!this.id) return [];

    const items = await ScheduleSuggestionItem._listBySuggestion(this.id);

    this.itemsCache = items ?? [];
    return this.itemsCache;
  }

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

  async toJSON(view: ViewMode = responseValue.FULL, withItems: boolean = false): Promise<object> {
    const manager = await this.getManagerObj();
    const config = await this.getConfigObj();

    const base: Record<string, any> = {
      [RS.GUID]: this.guid,
      [RS.PERIOD_FROM]: this.period_from,
      [RS.PERIOD_TO]: this.period_to,
      [RS.STATUS]: this.status,
      [RS.CONFORMITY_SCORE]: this.conformity_score ?? null,
      [RS.HISTORY_WEEKS]: this.history_weeks,
      engine_version: this.engine_version,
      diagnostics: this.diagnostics ?? null,
      configuration: config
        ? {
            guid: config.getGuid(),
            name: config.getName(),
            version: config.getVersion(),
          }
        : null,
      [RS.GENERATED_AT]: this.created_at,
      [RS.APPROVED_AT]: this.approved_at ?? null,
      [RS.REJECTED_AT]: this.rejected_at ?? null,
      [RS.MANAGER]: manager
        ? {
            [RS.GUID]: manager.getGuid(),
            [RS.NAME]: manager.getFullName(),
          }
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
    this.config = data.config ?? null;
    this.engine_version = data.engine_version ?? 'historical-v1.5';
    this.period_from = data.period_from;
    this.period_to = data.period_to;
    this.history_weeks = data.history_weeks ?? 8;
    this.conformity_score = data.conformity_score ?? null;
    this.diagnostics = data.diagnostics ?? null;
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

  private async list(
    conditions: Record<string, any>,
    paginationOptions: { offset?: number; limit?: number },
  ): Promise<ScheduleSuggestion[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset?.length) return null;

    return dataset.map((data) => new ScheduleSuggestion().hydrate(data));
  }

  private async listByManager(
    managerId: number,
    paginationOptions: { offset?: number; limit?: number },
  ): Promise<ScheduleSuggestion[] | null> {
    const dataset = await this.listAllByManager(managerId, paginationOptions);
    if (!dataset?.length) return null;

    return dataset.map((data) => new ScheduleSuggestion().hydrate(data));
  }
}
