import EventLogModel from '../model/EventLogModel.js';
import { responseStructure as RS, responseValue, ViewMode } from '../../utils/response.model.js';
import { EventEntityType, Source } from '../database/data/event.log.db.js';

export default class EventLog extends EventLogModel {
  constructor() {
    super();
  }

  // ============================================
  // MÉTHODES STATIQUES DE CHARGEMENT
  // ============================================

  static _load(identifier: any, byGuid: boolean = false): Promise<EventLog | null> {
    return new EventLog().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EventLog[] | null> {
    return new EventLog().list(conditions, paginationOptions);
  }

  static _listByEntity(
    entityType: EventEntityType,
    entityId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EventLog[] | null> {
    return new EventLog().listByEntity(entityType, entityId, paginationOptions);
  }

  static _listByEntityType(
    entityType: EventEntityType,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EventLog[] | null> {
    return new EventLog().listByEntityType(entityType, paginationOptions);
  }

  static _listByModifiedBy(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EventLog[] | null> {
    return new EventLog().listByModifiedBy(userId, paginationOptions);
  }

  static _listBySource(
    source: Source,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EventLog[] | null> {
    return new EventLog().listBySource(source, paginationOptions);
  }

  static async exportable(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<{
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    let items: any[] = [];
    const logs = await this._list(conditions, paginationOptions);
    if (logs) {
      items = await Promise.all(logs.map(async (log) => log.toJSON()));
    }
    return {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || items.length,
        count: items.length,
      },
      items,
    };
  }

  // ============================================
  // GETTERS FLUENT
  // ============================================

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getEntityType(): EventEntityType | undefined {
    return this.entity_type;
  }

  getEntityId(): string | undefined {
    return this.entity_id;
  }

  getPreviousState(): any | null | undefined {
    return this.previous_state;
  }

  getNewState(): any | null | undefined {
    return this.new_state;
  }

  getChangedFields(): any | null | undefined {
    return this.changed_fields;
  }

  getSource(): Source | undefined {
    return this.source;
  }

  getModifiedBy(): number | null | undefined {
    return this.modified_by;
  }

  getExecutedAt(): Date | undefined {
    return this.executed_at;
  }

  // ============================================
  // SETTERS FLUENT
  // ============================================

  setEntityType(entityType: EventEntityType): EventLog {
    this.entity_type = entityType;
    return this;
  }

  setEntityId(entityId: string): EventLog {
    this.entity_id = entityId;
    return this;
  }

  setPreviousState(state: any | null): EventLog {
    this.previous_state = state;
    return this;
  }

  setNewState(state: any | null): EventLog {
    this.new_state = state;
    return this;
  }

  setChangedFields(fields: any | null): EventLog {
    this.changed_fields = fields;
    return this;
  }

  setSource(source: Source): EventLog {
    this.source = source;
    return this;
  }

  setModifiedBy(userId: number | null): EventLog {
    this.modified_by = userId;
    return this;
  }

  setExecutedAt(executedAt: Date): EventLog {
    this.executed_at = executedAt;
    return this;
  }

  // ============================================
  // MÉTHODES MÉTIER
  // ============================================

  isNew(): boolean {
    return this.id === undefined;
  }

  isSystemEvent(): boolean {
    return this.source === Source.SYSTEM;
  }

  isUserEvent(): boolean {
    return this.source === Source.USER;
  }

  async save(): Promise<void> {
    try {
      if (!this.isNew()) {
        throw new Error('Event logs cannot be updated, only created');
      }
      await this.create();
    } catch (error: any) {
      throw new Error(error.message || error);
    }
  }

  // ============================================
  // CHARGEMENT ET LISTING
  // ============================================

  async load(identifier: any, byGuid: boolean = false): Promise<EventLog | null> {
    const data = byGuid ? await this.findByGuid(identifier) : await this.find(Number(identifier));

    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EventLog[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new EventLog().hydrate(data));
  }

  async listByEntity(
    entityType: EventEntityType,
    entityId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EventLog[] | null> {
    const dataset = await this.listAllByEntity(entityType, entityId, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new EventLog().hydrate(data));
  }

  async listByEntityType(
    entityType: EventEntityType,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EventLog[] | null> {
    const dataset = await this.listAllByEntityType(entityType, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new EventLog().hydrate(data));
  }

  async listByModifiedBy(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EventLog[] | null> {
    const dataset = await this.listAllByModifiedBy(userId, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new EventLog().hydrate(data));
  }

  async listBySource(
    source: Source,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<EventLog[] | null> {
    const dataset = await this.listAllBySource(source, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new EventLog().hydrate(data));
  }

  toJSON(view: ViewMode = responseValue.FULL): object {
    const baseData = {
      [RS.GUID]: this.guid,
      [RS.ENTITY_TYPE]: this.entity_type,
      [RS.PREVIOUS_STATE]: this.previous_state,
      [RS.ENTITY_ID]: this.entity_id,
      [RS.NEW_STATE]: this.new_state,
      [RS.CHANGED_FIELDS]: this.changed_fields,
      [RS.SOURCE]: this.source,
      [RS.MODIFIED_BY]: this.modified_by,
      [RS.EXECUTED_AT]: this.executed_at,
    };

    if (view === responseValue.MINIMAL) {
      return {
        [RS.GUID]: this.guid,
        [RS.ENTITY_TYPE]: this.entity_type,
        [RS.ENTITY_ID]: this.entity_id,
        [RS.SOURCE]: this.source,
        [RS.EXECUTED_AT]: this.executed_at,
      };
    }

    return baseData;
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  private hydrate(data: any): EventLog {
    this.id = data.id;
    this.guid = data.guid;
    this.entity_type = data.entity_type;
    this.entity_id = data.entity_id;
    this.previous_state = data.previous_state;
    this.new_state = data.new_state;
    this.changed_fields = data.changed_fields;
    this.source = data.source;
    this.modified_by = data.modified_by;
    this.executed_at = data.executed_at;
    return this;
  }
}
