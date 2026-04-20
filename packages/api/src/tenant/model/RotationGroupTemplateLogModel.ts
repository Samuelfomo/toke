import { TimezoneConfigUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

import { RotationTemplateSnapshot } from './RotationGroupTemplateModel.js';

export default class RotationGroupTemplateLogModel extends BaseModel {
  public readonly db = {
    tableName: tableName.ROTATION_GROUP_TEMPLATE_LOG,
    id: 'id',
    guid: 'guid',
    rotation_group_template: 'rotation_group_template',
    position: 'position',
    previous_snapshot: 'previous_snapshot',
    new_snapshot: 'new_snapshot',
    previous_version: 'previous_version',
    new_version: 'new_version',
    modified_by: 'modified_by',
    modification_reason: 'modification_reason',
    changed_fields: 'changed_fields',
    executed_at: 'executed_at',
  } as const;

  // ============================================
  // PROPRIÉTÉS PROTÉGÉES
  // ============================================

  protected id?: number;
  protected guid?: string;
  protected rotation_group_template?: number;
  protected position?: number;
  protected previous_snapshot?: RotationTemplateSnapshot | null;
  protected new_snapshot?: RotationTemplateSnapshot;
  protected previous_version?: number | null;
  protected new_version?: number;
  protected modified_by?: number;
  protected modification_reason?: string | null;
  protected changed_fields?: any | null;
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

  protected async listAllByTemplate(
    rotationGroupTemplateId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.rotation_group_template]: rotationGroupTemplateId },
      paginationOptions,
    );
  }

  protected async listAllByModifiedBy(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.modified_by]: userId }, paginationOptions);
  }

  // ============================================
  // STATISTIQUES
  // ============================================

  protected async countByTemplate(rotationGroupTemplateId: number): Promise<number> {
    return await this.count(this.db.tableName, {
      [this.db.rotation_group_template]: rotationGroupTemplateId,
    });
  }

  // ============================================
  // CRUD (création uniquement — log immuable)
  // ============================================

  protected async create(): Promise<void> {
    if (!this.rotation_group_template) {
      throw new Error('rotation_group_template is required for RotationGroupTemplateLog');
    }
    if (this.position === undefined) {
      throw new Error('position is required for RotationGroupTemplateLog');
    }
    if (!this.new_snapshot) {
      throw new Error('new_snapshot is required for RotationGroupTemplateLog');
    }
    if (!this.new_version) {
      throw new Error('new_version is required for RotationGroupTemplateLog');
    }
    if (!this.modified_by) {
      throw new Error('modified_by is required for RotationGroupTemplateLog');
    }

    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) throw new Error('Failed to generate GUID for RotationGroupTemplateLog');

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.rotation_group_template]: this.rotation_group_template,
      [this.db.position]: this.position,
      [this.db.previous_snapshot]: this.previous_snapshot ?? null,
      [this.db.new_snapshot]: this.new_snapshot,
      [this.db.previous_version]: this.previous_version ?? null,
      [this.db.new_version]: this.new_version,
      [this.db.modified_by]: this.modified_by,
      [this.db.modification_reason]: this.modification_reason ?? null,
      [this.db.changed_fields]: this.changed_fields ?? null,
      [this.db.executed_at]: this.executed_at ?? TimezoneConfigUtils.getCurrentTime(),
    });

    if (!lastID) throw new Error('Failed to create RotationGroupTemplateLog');

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }
}
