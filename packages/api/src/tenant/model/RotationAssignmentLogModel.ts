import { TimezoneConfigUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class RotationAssignmentLogModel extends BaseModel {
  public readonly db = {
    tableName: tableName.ROTATION_ASSIGNMENT_LOGS,
    id: 'id',
    guid: 'guid',
    rotation_assignment: 'rotation_assignment',
    previous_offset: 'previous_offset',
    new_offset: 'new_offset',
    cycle_length: 'cycle_length',
    executed_at: 'executed_at',
  } as const;

  // ============================================
  // PROPRIÉTÉS PROTÉGÉES
  // ============================================

  protected id?: number;
  protected guid?: string;
  protected rotation_assignment?: number;
  protected previous_offset?: number;
  protected new_offset?: number;
  protected cycle_length?: number;
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
  // MÉTHODES DE LISTAGE
  // ============================================

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  protected async listAllByAssignment(
    rotationAssignmentId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.rotation_assignment]: rotationAssignmentId },
      paginationOptions,
    );
  }

  protected async getLatestLogForAssignment(rotationAssignmentId: number): Promise<any> {
    const logs = await this.listAllByAssignment(rotationAssignmentId, { limit: 1 });
    return logs.length > 0 ? logs[0] : null;
  }

  // ============================================
  // STATISTIQUES
  // ============================================

  protected async countByAssignment(rotationAssignmentId: number): Promise<number> {
    return await this.count(this.db.tableName, {
      [this.db.rotation_assignment]: rotationAssignmentId,
    });
  }

  // ============================================
  // CRUD (création uniquement — log immuable)
  // ============================================

  protected async create(): Promise<void> {
    if (this.previous_offset === undefined) {
      throw new Error('previous_offset is required to create a RotationAssignmentLog');
    }
    if (this.new_offset === undefined) {
      throw new Error('new_offset is required to create a RotationAssignmentLog');
    }
    if (!this.rotation_assignment) {
      throw new Error('rotation_assignment is required to create a RotationAssignmentLog');
    }
    if (!this.cycle_length) {
      throw new Error('cycle_length is required to create a RotationAssignmentLog');
    }

    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error('Failed to generate GUID for RotationAssignmentLog');
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.rotation_assignment]: this.rotation_assignment,
      [this.db.previous_offset]: this.previous_offset,
      [this.db.new_offset]: this.new_offset,
      [this.db.cycle_length]: this.cycle_length,
      [this.db.executed_at]: this.executed_at ?? TimezoneConfigUtils.getCurrentTime(),
    });

    if (!lastID) {
      throw new Error('Failed to create RotationAssignmentLog');
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }
}
