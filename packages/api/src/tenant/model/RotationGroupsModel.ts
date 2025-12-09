import {
  CycleUnit,
  ROTATION_GROUP_DEFAULTS,
  ROTATION_GROUP_ERRORS,
  RotationGroupValidationUtils,
} from '@toke/shared';
import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class RotationGroupModel extends BaseModel {
  public readonly db = {
    tableName: tableName.ROTATION_GROUPS,
    id: 'id',
    guid: 'guid',
    tenant: 'tenant',
    name: 'name',
    cycle_length: 'cycle_length',
    cycle_unit: 'cycle_unit',
    cycle_templates: 'cycle_templates',
    start_date: 'start_date',
    active: 'active',
    deleted_at: 'deleted_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  // ============================================
  // PROPRIÉTÉS PROTÉGÉES
  // ============================================

  protected id?: number;
  protected guid?: string;
  protected tenant?: string;
  protected name?: string;
  protected cycle_length?: number;
  protected cycle_unit?: CycleUnit;
  protected cycle_templates?: number[];
  protected start_date?: string;
  protected active?: boolean;
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

  protected async listAllByActiveStatus(
    isActive: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.active]: isActive }, paginationOptions);
  }

  protected async listAllByCycleUnit(
    cycleUnit: CycleUnit,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.cycle_unit]: cycleUnit }, paginationOptions);
  }

  // ============================================
  // STATISTIQUES
  // ============================================

  protected async getActiveStatusCount(): Promise<{ active: number; inactive: number }> {
    const activeCount = await this.count(this.db.tableName, {
      [this.db.active]: true,
      [this.db.deleted_at]: null,
    });

    const inactiveCount = await this.count(this.db.tableName, {
      [this.db.active]: false,
      [this.db.deleted_at]: null,
    });

    return { active: activeCount, inactive: inactiveCount };
  }

  protected async countAll(): Promise<Record<string, number>> {
    const where = {
      [this.db.deleted_at]: null,
    };

    return await this.countByGroup(this.db.tableName, this.db.tenant, where);
  }

  protected async countByCycleUnit(): Promise<Record<string, number>> {
    const where = {
      [this.db.cycle_unit]: { [Op.not]: null },
      [this.db.deleted_at]: null,
    };

    return await this.countByGroup(this.db.tableName, this.db.cycle_unit, where);
  }

  // ============================================
  // CRUD
  // ============================================

  protected async create(): Promise<void> {
    await this.validate();

    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error(ROTATION_GROUP_ERRORS.GUID_GENERATION_FAILED);
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.tenant]: this.tenant,
      [this.db.name]: this.name,
      [this.db.cycle_length]: this.cycle_length,
      [this.db.cycle_unit]: this.cycle_unit,
      [this.db.cycle_templates]: this.cycle_templates,
      [this.db.start_date]: this.start_date,
      [this.db.active]: this.active ?? ROTATION_GROUP_DEFAULTS.ACTIVE,
    });

    if (!lastID) {
      throw new Error(ROTATION_GROUP_ERRORS.CREATION_FAILED);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error(ROTATION_GROUP_ERRORS.ID_REQUIRED);
    }

    const updateData: Record<string, any> = {};

    if (this.tenant !== undefined) {
      updateData[this.db.tenant] = this.tenant;
    }
    if (this.name !== undefined) {
      updateData[this.db.name] = this.name;
    }
    if (this.cycle_length !== undefined) {
      updateData[this.db.cycle_length] = this.cycle_length;
    }
    if (this.cycle_unit !== undefined) {
      updateData[this.db.cycle_unit] = this.cycle_unit;
    }
    if (this.cycle_templates !== undefined) {
      updateData[this.db.cycle_templates] = this.cycle_templates;
    }
    if (this.start_date !== undefined) {
      updateData[this.db.start_date] = this.start_date;
    }
    if (this.active !== undefined) {
      updateData[this.db.active] = this.active;
    }

    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });

    if (!updated) {
      throw new Error(ROTATION_GROUP_ERRORS.UPDATE_FAILED);
    }
  }

  protected async trash(id: number): Promise<boolean> {
    const affected = await this.updateOne(
      this.db.tableName,
      {
        [this.db.deleted_at]: new Date(),
        [this.db.active]: false,
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
    // if (!this.tenant) {
    //   throw new Error(ROTATION_GROUP_ERRORS.TENANT_REQUIRED);
    // }
    // if (!RotationGroupValidationUtils.validateTenant(this.tenant)) {
    //   throw new Error(ROTATION_GROUP_ERRORS.TENANT_INVALID);
    // }

    if (!this.name) {
      throw new Error(ROTATION_GROUP_ERRORS.NAME_REQUIRED);
    }
    if (!RotationGroupValidationUtils.validateName(this.name)) {
      throw new Error(ROTATION_GROUP_ERRORS.NAME_INVALID);
    }

    if (!this.cycle_length) {
      throw new Error(ROTATION_GROUP_ERRORS.CYCLE_LENGTH_REQUIRED);
    }
    if (!RotationGroupValidationUtils.validateCycleLength(this.cycle_length)) {
      throw new Error(ROTATION_GROUP_ERRORS.CYCLE_LENGTH_INVALID);
    }

    if (!this.cycle_unit) {
      throw new Error(ROTATION_GROUP_ERRORS.CYCLE_UNIT_REQUIRED);
    }
    if (!RotationGroupValidationUtils.validateCycleUnit(this.cycle_unit)) {
      throw new Error(ROTATION_GROUP_ERRORS.CYCLE_UNIT_INVALID);
    }

    if (!this.cycle_templates || this.cycle_templates.length === 0) {
      throw new Error(ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_REQUIRED);
    }
    // if (!RotationGroupValidationUtils.validateCycleTemplates(this.cycle_templates)) {
    //   throw new Error(ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_INVALID);
    // }

    if (!this.start_date) {
      throw new Error(ROTATION_GROUP_ERRORS.START_DATE_REQUIRED);
    }
    if (!RotationGroupValidationUtils.validateStartDate(this.start_date)) {
      throw new Error(ROTATION_GROUP_ERRORS.START_DATE_INVALID);
    }

    if (this.active !== undefined && !RotationGroupValidationUtils.validateActive(this.active)) {
      throw new Error(ROTATION_GROUP_ERRORS.ACTIVE_INVALID);
    }

    const cleaned = RotationGroupValidationUtils.cleanRotationGroupData(this);
    Object.assign(this, cleaned);
  }
}
