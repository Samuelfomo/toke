import { TimezoneConfigUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class ScheduleAssignmentsLogModel extends BaseModel {
  public readonly db = {
    tableName: tableName.SCHEDULE_ASSIGNMENTS_LOGS,
    id: 'id',
    guid: 'guid',
    assignment: 'assignment',
    previous_template: 'previous_template',
    new_template: 'new_template',
    previous_version: 'previous_version',
    new_version: 'new_version',
    modified_by: 'modified_by',
    old_creator: 'old_creator',
    modification_reason: 'modification_reason',
    changed_fields: 'changed_fields',
    created_at: 'created_at',
  } as const;

  // ============================================
  // PROPRIÉTÉS PROTÉGÉES
  // ============================================

  protected id?: number;
  protected guid?: string;
  protected assignment?: number;
  protected previous_template?: any | null;
  protected new_template?: any;
  protected previous_version?: number | null;
  protected new_version?: number;
  protected modified_by?: number;
  protected old_creator?: number;
  protected modification_reason?: string | null;
  protected changed_fields?: any | null;
  protected created_at?: Date;

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

  protected async listAllByAssignment(
    assignmentId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.assignment]: assignmentId }, paginationOptions);
  }

  protected async listAllByModifiedBy(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.modified_by]: userId }, paginationOptions);
  }

  protected async listAllByOldCreator(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.old_creator]: userId }, paginationOptions);
  }

  protected async getLatestLogForAssignment(assignmentId: number): Promise<any> {
    const logs = await this.listAllByAssignment(assignmentId, { limit: 1 });
    return logs.length > 0 ? logs[0] : null;
  }

  // ============================================
  // STATISTIQUES
  // ============================================

  protected async countAll(): Promise<number> {
    return await this.count(this.db.tableName, {});
  }

  protected async countByAssignment(assignmentId: number): Promise<number> {
    return await this.count(this.db.tableName, { [this.db.assignment]: assignmentId });
  }

  // ============================================
  // CRUD (création uniquement, pas de modification/suppression)
  // ============================================

  protected async create(): Promise<void> {
    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error('Failed to generate GUID for Schedule Assignments Logs');
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.assignment]: this.assignment,
      [this.db.previous_template]: this.previous_template ?? null,
      [this.db.new_template]: this.new_template,
      [this.db.previous_version]: this.previous_version ?? null,
      [this.db.new_version]: this.new_version,
      [this.db.modified_by]: this.modified_by,
      [this.db.old_creator]: this.old_creator,
      [this.db.modification_reason]: this.modification_reason ?? null,
      [this.db.changed_fields]: this.changed_fields ?? null,
      [this.db.created_at]: this.created_at ?? TimezoneConfigUtils.getCurrentTime(),
    });

    if (!lastID) {
      throw new Error('Failed to create Schedule Assignments Logs');
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }
}
