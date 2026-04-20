import { TimezoneConfigUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';
import { EventEntityType, Source } from '../database/data/event.log.db.js';

export default class EventLogModel extends BaseModel {
  public readonly db = {
    tableName: tableName.EVENT_LOG,
    id: 'id',
    guid: 'guid',
    entity_type: 'entity_type',
    entity_id: 'entity_id',
    previous_state: 'previous_state',
    new_state: 'new_state',
    changed_fields: 'changed_fields',
    source: 'source',
    modified_by: 'modified_by',
    executed_at: 'executed_at',
  } as const;

  // ============================================
  // PROPRIÉTÉS PROTÉGÉES
  // ============================================

  protected id?: number;
  protected guid?: string;
  protected entity_type?: EventEntityType;
  protected entity_id?: string;
  protected previous_state?: any | null;
  protected new_state?: any | null;
  protected changed_fields?: any | null;
  protected source?: Source;
  protected modified_by?: number | null;
  protected executed_at?: Date;

  protected constructor() {
    super();
  }

  // ============================================
  // MÉTHODES DE RECHERCHE
  // ============================================

  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }

  protected async findByGuid(guid: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }

  // ============================================
  // MÉTHODES LISTAGE
  // ============================================

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  protected async listAllByEntity(
    entityType: EventEntityType,
    entityId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      {
        [this.db.entity_type]: entityType,
        [this.db.entity_id]: entityId,
      },
      paginationOptions,
    );
  }

  protected async listAllByEntityType(
    entityType: EventEntityType,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.entity_type]: entityType }, paginationOptions);
  }

  protected async listAllByModifiedBy(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.modified_by]: userId }, paginationOptions);
  }

  protected async listAllBySource(
    source: Source,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.source]: source }, paginationOptions);
  }

  protected async getLatestLogForEntity(
    entityType: EventEntityType,
    entityId: number,
  ): Promise<any> {
    const logs = await this.listAllByEntity(entityType, entityId, { limit: 1 });
    return logs.length > 0 ? logs[0] : null;
  }

  // ============================================
  // STATISTIQUES
  // ============================================

  protected async countAll(): Promise<number> {
    return await this.count(this.db.tableName, {});
  }

  protected async countByEntity(entityType: EventEntityType, entityId: number): Promise<number> {
    return await this.count(this.db.tableName, {
      [this.db.entity_type]: entityType,
      [this.db.entity_id]: entityId,
    });
  }

  protected async countByEntityType(entityType: EventEntityType): Promise<number> {
    return await this.count(this.db.tableName, { [this.db.entity_type]: entityType });
  }

  protected async countBySource(source: Source): Promise<number> {
    return await this.count(this.db.tableName, { [this.db.source]: source });
  }

  // ============================================
  // CRUD (création uniquement, pas de modification/suppression)
  // ============================================

  protected async create(): Promise<void> {
    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error('Failed to generate GUID for Event Log');
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.entity_type]: this.entity_type,
      [this.db.entity_id]: this.entity_id,
      [this.db.previous_state]: this.previous_state ?? null,
      [this.db.new_state]: this.new_state ?? null,
      [this.db.changed_fields]: this.changed_fields ?? null,
      [this.db.source]: this.source ?? Source.SYSTEM,
      [this.db.modified_by]: this.modified_by ?? null,
      [this.db.executed_at]: this.executed_at ?? TimezoneConfigUtils.getCurrentTime(),
    });

    if (!lastID) {
      throw new Error('Failed to create Event Log');
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }
}
