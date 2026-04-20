import { ROTATION_GROUP_ERRORS, TimezoneConfigUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

// ============================================================
// Shape d'un snapshot de SessionTemplate stocké dans cette table.
// Correspond exactement aux champs capturés par createTemplateSnapshot()
// dans ScheduleAssignments, pour rester cohérent à travers le projet.
// ============================================================
export interface RotationTemplateSnapshot {
  id: number;
  guid: string;
  name: string;
  definition: any;
  version: number;
  is_default: boolean;
  snapshot_date: string; // ISO string
}

export default class RotationGroupTemplateModel extends BaseModel {
  public readonly db = {
    tableName: tableName.ROTATION_GROUP_TEMPLATE,
    id: 'id',
    guid: 'guid',
    rotation_group: 'rotation_group',
    position: 'position',
    template_snapshot: 'template_snapshot',
    source_template: 'source_template',
    source_template_guid: 'source_template_guid',
    deleted_at: 'deleted_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  // ============================================
  // PROPRIÉTÉS PROTÉGÉES
  // ============================================

  protected id?: number;
  protected guid?: string;
  protected rotation_group?: number;
  protected position?: number;
  protected template_snapshot?: RotationTemplateSnapshot;
  protected source_template?: number | null;
  protected source_template_guid?: string | null;
  protected deleted_at?: Date | null;
  protected created_at?: Date;
  protected updated_at?: Date;

  protected constructor() {
    super();
  }

  // ============================================
  // MÉTHODES DE RECHERCHE
  // ============================================

  protected async find(id: number, includeDeleted: boolean = false): Promise<any> {
    const conditions: any = { [this.db.id]: id };
    if (!includeDeleted) conditions[this.db.deleted_at] = null;
    return await this.findOne(this.db.tableName, conditions);
  }

  protected async findByGuid(guid: string, includeDeleted: boolean = false): Promise<any> {
    const conditions: any = { [this.db.guid]: guid };
    if (!includeDeleted) conditions[this.db.deleted_at] = null;
    return await this.findOne(this.db.tableName, conditions);
  }

  protected async findByGroupAndPosition(
    rotationGroupId: number,
    position: number,
    includeDeleted: boolean = false,
  ): Promise<any> {
    const conditions: any = {
      [this.db.rotation_group]: rotationGroupId,
      [this.db.position]: position,
    };
    if (!includeDeleted) conditions[this.db.deleted_at] = null;
    return await this.findOne(this.db.tableName, conditions);
  }

  // ============================================
  // MÉTHODES DE LISTAGE
  // ============================================

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    if (conditions[this.db.deleted_at] === undefined) {
      conditions[this.db.deleted_at] = null;
    }
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  /**
   * Retourne tous les slots du cycle d'un RotationGroup, triés par position.
   * C'est la méthode de lecture principale pour reconstruire le cycle complet.
   */
  protected async listAllByRotationGroup(
    rotationGroupId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const rows = await this.listAll(
      { [this.db.rotation_group]: rotationGroupId },
      paginationOptions,
    );
    // Tri défensif côté applicatif — l'index DB garantit l'ordre mais on
    // s'assure d'un résultat déterministe quelles que soient les options de pagination.
    return rows.sort((a, b) => a.position - b.position);
  }

  // ============================================
  // CRUD
  // ============================================

  protected async create(): Promise<void> {
    this.validateRequiredFields();

    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) throw new Error(ROTATION_GROUP_ERRORS.GUID_GENERATION_FAILED);

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.rotation_group]: this.rotation_group,
      [this.db.position]: this.position,
      [this.db.template_snapshot]: this.template_snapshot,
      [this.db.source_template]: this.source_template ?? null,
      [this.db.source_template_guid]: this.source_template_guid ?? null,
    });

    if (!lastID) throw new Error(ROTATION_GROUP_ERRORS.CREATION_FAILED);

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  /**
   * Met à jour le snapshot uniquement — position et rotation_group sont immuables
   * après création (la position définit l'identité de la ligne dans le cycle).
   */
  protected async updateSnapshot(newSnapshot: RotationTemplateSnapshot): Promise<void> {
    if (!this.id) throw new Error(ROTATION_GROUP_ERRORS.ID_REQUIRED);

    const updated = await this.updateOne(
      this.db.tableName,
      { [this.db.template_snapshot]: newSnapshot },
      { [this.db.id]: this.id },
    );

    if (!updated) throw new Error(ROTATION_GROUP_ERRORS.UPDATE_FAILED);

    this.template_snapshot = newSnapshot;
  }

  protected async trash(id: number): Promise<boolean> {
    const affected = await this.updateOne(
      this.db.tableName,
      { [this.db.deleted_at]: TimezoneConfigUtils.getCurrentTime() },
      { [this.db.id]: id },
    );
    return affected > 0;
  }

  protected async restore(id: number): Promise<boolean> {
    const affected = await this.updateOne(
      this.db.tableName,
      { [this.db.deleted_at]: null },
      { [this.db.id]: id },
    );
    return affected > 0;
  }

  // ============================================
  // VALIDATION INTERNE
  // ============================================

  private validateRequiredFields(): void {
    if (!this.rotation_group) {
      throw new Error('rotation_group is required for RotationGroupTemplate');
    }
    if (this.position === undefined || this.position < 0) {
      throw new Error('position must be a non-negative integer for RotationGroupTemplate');
    }
    if (!this.template_snapshot) {
      throw new Error('template_snapshot is required for RotationGroupTemplate');
    }
  }
}
