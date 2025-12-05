import { DEPARTMENT_DEFAULTS, DEPARTMENT_ERRORS, DepartmentValidationUtils } from '@toke/shared';
import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class DepartmentModel extends BaseModel {
  public readonly db = {
    tableName: tableName.DEPARTMENT,
    id: 'id',
    guid: 'guid',
    name: 'name',
    code: 'code',
    description: 'description',
    manager: 'manager',
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
  protected name?: string;
  protected code?: string;
  protected description?: string;
  protected manager?: number;
  protected active?: boolean;
  protected deleted_at?: Date;

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

  protected async findByCode(code: string, includeDeleted: boolean = false): Promise<any> {
    const conditions: any = { [this.db.code]: code };

    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }

    return await this.findOne(this.db.tableName, conditions);
  }

  protected async findByName(name: string, includeDeleted: boolean = false): Promise<any> {
    const conditions: any = { [this.db.name]: name };

    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }

    return await this.findOne(this.db.tableName, conditions);
  }

  protected async findByManager(manager: number, includeDeleted: boolean = false): Promise<any> {
    const conditions: any = { [this.db.manager]: manager };

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
    is_active: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.active]: is_active }, paginationOptions);
  }

  protected async listAllByManager(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.manager]: manager }, paginationOptions);
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

  protected async countByManager(): Promise<Record<string, number>> {
    const where = {
      [this.db.manager]: { [Op.not]: null },
      [this.db.deleted_at]: null,
    };

    return await this.countByGroup(this.db.tableName, this.db.manager, where);
  }

  // ============================================
  // CRUD
  // ============================================

  protected async create(): Promise<void> {
    await this.validate();

    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error(DEPARTMENT_ERRORS.GUID_GENERATION_FAILED);
    }

    // Vérifications unicité
    if (this.code) {
      const existingCode = await this.findByCode(this.code);
      if (existingCode) {
        throw new Error(DEPARTMENT_ERRORS.CODE_ALREADY_EXISTS);
      }
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.name]: this.name,
      [this.db.code]: this.code,
      [this.db.description]: this.description,
      [this.db.manager]: this.manager,
      [this.db.active]: this.active ?? DEPARTMENT_DEFAULTS.ACTIVE,
    });

    if (!lastID) {
      throw new Error(DEPARTMENT_ERRORS.CREATION_FAILED);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error(DEPARTMENT_ERRORS.ID_REQUIRED);
    }

    const updateData: Record<string, any> = {};

    if (this.name !== undefined) {
      updateData[this.db.name] = this.name;
    }
    if (this.code !== undefined) {
      updateData[this.db.code] = this.code;
    }
    if (this.description !== undefined) {
      updateData[this.db.description] = this.description;
    }
    if (this.manager !== undefined) {
      updateData[this.db.manager] = this.manager;
    }
    if (this.active !== undefined) {
      updateData[this.db.active] = this.active;
    }

    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });

    if (!updated) {
      throw new Error(DEPARTMENT_ERRORS.UPDATE_FAILED);
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
    if (!this.name) {
      throw new Error(DEPARTMENT_ERRORS.NAME_REQUIRED);
    }
    if (!DepartmentValidationUtils.validateName(this.name)) {
      throw new Error(DEPARTMENT_ERRORS.NAME_INVALID);
    }

    if (!this.code) {
      throw new Error(DEPARTMENT_ERRORS.CODE_REQUIRED);
    }
    if (!DepartmentValidationUtils.validateCode(this.code)) {
      throw new Error(DEPARTMENT_ERRORS.CODE_INVALID);
    }

    if (this.description && !DepartmentValidationUtils.validateDescription(this.description)) {
      throw new Error(DEPARTMENT_ERRORS.DESCRIPTION_INVALID);
    }

    if (this.active !== undefined && !DepartmentValidationUtils.validateActive(this.active)) {
      throw new Error(DEPARTMENT_ERRORS.ACTIVE_INVALID);
    }

    const cleaned = DepartmentValidationUtils.cleanDepartmentData(this);
    Object.assign(this, cleaned);
  }
}
