import {
  ROTATION_ASSIGNMENT_DEFAULTS,
  ROTATION_ASSIGNMENT_ERRORS,
  RotationAssignmentValidationUtils,
  TimezoneConfigUtils,
} from '@toke/shared';
import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class RotationAssignmentModel extends BaseModel {
  public readonly db = {
    tableName: tableName.ROTATION_ASSIGNMENTS,
    id: 'id',
    guid: 'guid',
    user: 'user',
    groups: 'groups',
    rotation_group: 'rotation_group',
    assigned_by: 'assigned_by',
    active: 'active',
    offset: 'offset',
    assigned_at: 'assigned_at',
    deleted_at: 'deleted_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  // ============================================
  // PROPRIÉTÉS PROTÉGÉES
  // ============================================

  protected id?: number;
  protected guid?: string;
  protected user?: number | null;
  protected groups?: number | null;
  protected rotation_group?: number;
  protected assigned_by?: number;
  protected active: boolean = true;
  protected offset?: number;
  protected assigned_at?: Date;
  protected deleted_at?: Date | null;

  protected constructor() {
    super();
  }

  // ============================================
  // MÉTHODES DE RECHERCHE
  // ============================================

  protected async find(id: number, includeDeleted: boolean = false): Promise<any> {
    const conditions: any = { [this.db.id]: id };

    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }

    return await this.findOne(this.db.tableName, conditions);
  }

  protected async findByGuid(guid: string, includeDeleted: boolean = false): Promise<any> {
    const conditions: any = { [this.db.guid]: guid };

    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }

    return await this.findOne(this.db.tableName, conditions);
  }

  protected async findByUserAndGroup(
    userId: number,
    rotationGroupId: number,
    includeDeleted: boolean = false,
  ): Promise<any> {
    const conditions: any = {
      [this.db.user]: userId,
      [this.db.rotation_group]: rotationGroupId,
    };

    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }

    return await this.findOne(this.db.tableName, conditions);
  }

  protected async findByGroupsAndGroupRotation(
    groupsId: number,
    rotationGroupId: number,
    includeDeleted: boolean = false,
  ): Promise<any> {
    const conditions: any = {
      [this.db.groups]: groupsId,
      [this.db.rotation_group]: rotationGroupId,
    };

    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }

    return await this.findOne(this.db.tableName, conditions);
  }

  // ============================================
  // MÉTHODES LISTAGE
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

  protected async listAllByUser(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.user]: userId }, paginationOptions);
  }

  protected async listAllByAssignedBy(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.assigned_by]: manager }, paginationOptions);
  }

  protected async listAllByGroups(
    groupsId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.groups]: groupsId }, paginationOptions);
  }

  protected async listAllByRotationGroup(
    rotationGroupId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.rotation_group]: rotationGroupId }, paginationOptions);
  }

  protected async listAllByOffset(
    offset: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.offset]: offset }, paginationOptions);
  }

  protected async listByStatus(
    isActive: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.active]: isActive }, paginationOptions);
  }

  // ============================================
  // STATISTIQUES
  // ============================================

  protected async countByRotationGroup(): Promise<Record<string, number>> {
    const where = {
      [this.db.rotation_group]: { [Op.not]: null },
      [this.db.deleted_at]: null,
    };

    return await this.countByGroup(this.db.tableName, this.db.rotation_group, where);
  }

  protected async countByOffset(): Promise<Record<string, number>> {
    const where = {
      [this.db.offset]: { [Op.not]: null },
      [this.db.deleted_at]: null,
    };

    return await this.countByGroup(this.db.tableName, this.db.offset, where);
  }

  // ============================================
  // CRUD
  // ============================================

  protected async create(): Promise<void> {
    await this.validate();

    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error(ROTATION_ASSIGNMENT_ERRORS.GUID_GENERATION_FAILED);
    }

    // Vérification unicité user + rotation_group
    if (this.user) {
      const existing = await this.findByUserAndGroup(this.user, this.rotation_group!);
      if (existing) {
        throw new Error(ROTATION_ASSIGNMENT_ERRORS.USER_ALREADY_ASSIGNED);
      }
    }

    // Vérification unicité groups + rotation_group
    if (this.groups) {
      const existing = await this.findByGroupsAndGroupRotation(this.groups, this.rotation_group!);
      if (existing) {
        throw new Error(ROTATION_ASSIGNMENT_ERRORS.GROUPS_ALREADY_ASSIGNED);
      }
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.user]: this.user,
      [this.db.groups]: this.groups,
      [this.db.rotation_group]: this.rotation_group,
      [this.db.assigned_by]: this.assigned_by,
      [this.db.active]: this.active || true,
      [this.db.offset]: this.offset ?? ROTATION_ASSIGNMENT_DEFAULTS.OFFSET,
      [this.db.assigned_at]: this.assigned_at ?? ROTATION_ASSIGNMENT_DEFAULTS.ASSIGNED_AT,
    });

    if (!lastID) {
      throw new Error(ROTATION_ASSIGNMENT_ERRORS.CREATION_FAILED);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error(ROTATION_ASSIGNMENT_ERRORS.ID_REQUIRED);
    }

    const updateData: Record<string, any> = {};

    // if (this.user !== undefined) {
    //   updateData[this.db.user] = this.user;
    // }
    //
    // if (this.groups !== undefined) {
    //   updateData[this.db.groups] = this.groups;
    // }
    // if (this.rotation_group !== undefined) {
    //   updateData[this.db.rotation_group] = this.rotation_group;
    // }

    if (this.offset !== undefined) {
      updateData[this.db.offset] = this.offset;
    }
    if (this.active !== undefined) {
      updateData[this.db.active] = this.active;
    }
    if (this.assigned_at !== undefined) {
      updateData[this.db.assigned_at] = this.assigned_at;
    }

    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });

    if (!updated) {
      throw new Error(ROTATION_ASSIGNMENT_ERRORS.UPDATE_FAILED);
    }
  }

  protected async trash(id: number): Promise<boolean> {
    const affected = await this.updateOne(
      this.db.tableName,
      {
        [this.db.deleted_at]: TimezoneConfigUtils.getCurrentTime(),
      },
      { [this.db.id]: id },
    );

    return affected > 0;
  }

  protected async restore(id: number): Promise<boolean> {
    const affected = await this.updateOne(
      this.db.tableName,
      {
        [this.db.deleted_at]: null,
      },
      { [this.db.id]: id },
    );

    return affected > 0;
  }

  // ============================================
  // VALIDATION
  // ============================================

  private async validate(): Promise<void> {
    if (!this.user && !this.groups) {
      throw new Error(ROTATION_ASSIGNMENT_ERRORS.USER_OR_GROUPS_REQUIRED);
    }
    if (this.user && this.groups) {
      throw new Error(ROTATION_ASSIGNMENT_ERRORS.ONLY_ONE_USER_OR_GROUPS_ALLOWED);
    }

    if (!this.rotation_group) {
      throw new Error(ROTATION_ASSIGNMENT_ERRORS.ROTATION_GROUP_REQUIRED);
    }

    if (!this.assigned_by) {
      throw new Error(ROTATION_ASSIGNMENT_ERRORS.ASSIGNED_BY_REQUIRED);
    }

    if (
      this.offset !== undefined &&
      !RotationAssignmentValidationUtils.validateOffset(this.offset)
    ) {
      throw new Error(ROTATION_ASSIGNMENT_ERRORS.OFFSET_INVALID);
    }

    if (
      this.assigned_at &&
      !RotationAssignmentValidationUtils.validateAssignedAt(this.assigned_at)
    ) {
      throw new Error(ROTATION_ASSIGNMENT_ERRORS.ASSIGNED_AT_INVALID);
    }

    const cleaned = RotationAssignmentValidationUtils.cleanRotationAssignmentData(this);
    Object.assign(this, cleaned);
  }
}
