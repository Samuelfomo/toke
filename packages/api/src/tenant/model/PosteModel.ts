import { Level, POSTE_DEFAULTS, POSTE_ERRORS, PosteValidationUtils } from '@toke/shared';
import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class PosteModel extends BaseModel {
  public readonly db = {
    tableName: tableName.POSTE,
    id: 'id',
    guid: 'guid',
    title: 'title',
    code: 'code',
    department: 'department',
    salary_base: 'salary_base',
    description: 'description',
    level: 'level',
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
  protected title?: string;
  protected code?: string;
  protected department?: number;
  protected salary_base?: number;
  protected description?: string;
  protected level?: Level;
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

  protected async findByTitle(title: string, includeDeleted: boolean = false): Promise<any> {
    const conditions: any = { [this.db.title]: title };

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

  protected async listAllByDepartment(
    department: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.department]: department }, paginationOptions);
  }

  protected async listAllByLevel(
    level: Level,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.level]: level }, paginationOptions);
  }

  protected async listAllByActiveStatus(
    is_active: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.active]: is_active }, paginationOptions);
  }

  protected async listAllBySalaryRange(
    minSalary: number,
    maxSalary: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const conditions = {
      [this.db.salary_base]: {
        [Op.between]: [minSalary, maxSalary],
      },
    };
    return await this.listAll(conditions, paginationOptions);
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

  protected async countByDepartment(): Promise<Record<string, number>> {
    const where = {
      [this.db.department]: { [Op.not]: null },
      [this.db.deleted_at]: null,
    };

    return await this.countByGroup(this.db.tableName, this.db.department, where);
  }

  protected async countByLevel(): Promise<Record<string, number>> {
    const where = {
      [this.db.level]: { [Op.not]: null },
      [this.db.deleted_at]: null,
    };

    return await this.countByGroup(this.db.tableName, this.db.level, where);
  }

  // ============================================
  // CRUD
  // ============================================

  protected async create(): Promise<void> {
    await this.validate();

    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error(POSTE_ERRORS.GUID_GENERATION_FAILED);
    }

    // Vérifications unicité
    if (this.code) {
      const existingCode = await this.findByCode(this.code);
      if (existingCode) {
        throw new Error(POSTE_ERRORS.CODE_ALREADY_EXISTS);
      }
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.title]: this.title,
      [this.db.code]: this.code,
      [this.db.department]: this.department,
      [this.db.salary_base]: this.salary_base,
      [this.db.description]: this.description,
      [this.db.level]: this.level ?? POSTE_DEFAULTS.LEVEL,
      [this.db.active]: this.active ?? POSTE_DEFAULTS.ACTIVE,
    });

    if (!lastID) {
      throw new Error(POSTE_ERRORS.CREATION_FAILED);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error(POSTE_ERRORS.ID_REQUIRED);
    }

    const updateData: Record<string, any> = {};

    if (this.title !== undefined) {
      updateData[this.db.title] = this.title;
    }
    if (this.code !== undefined) {
      updateData[this.db.code] = this.code;
    }
    if (this.department !== undefined) {
      updateData[this.db.department] = this.department;
    }
    if (this.salary_base !== undefined) {
      updateData[this.db.salary_base] = this.salary_base;
    }
    if (this.description !== undefined) {
      updateData[this.db.description] = this.description;
    }
    if (this.level !== undefined) {
      updateData[this.db.level] = this.level;
    }
    if (this.active !== undefined) {
      updateData[this.db.active] = this.active;
    }

    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });

    if (!updated) {
      throw new Error(POSTE_ERRORS.UPDATE_FAILED);
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
    if (!this.title) {
      throw new Error(POSTE_ERRORS.TITLE_REQUIRED);
    }
    if (!PosteValidationUtils.validateTitle(this.title)) {
      throw new Error(POSTE_ERRORS.TITLE_INVALID);
    }

    if (!this.code) {
      throw new Error(POSTE_ERRORS.CODE_REQUIRED);
    }
    if (!PosteValidationUtils.validateCode(this.code)) {
      throw new Error(POSTE_ERRORS.CODE_INVALID);
    }

    if (!this.department) {
      throw new Error(POSTE_ERRORS.DEPARTMENT_REQUIRED);
    }

    if (this.salary_base && !PosteValidationUtils.validateSalaryBase(this.salary_base)) {
      throw new Error(POSTE_ERRORS.SALARY_BASE_INVALID);
    }

    if (this.description && !PosteValidationUtils.validateDescription(this.description)) {
      throw new Error(POSTE_ERRORS.DESCRIPTION_INVALID);
    }

    if (this.level && !PosteValidationUtils.validateLevel(this.level)) {
      throw new Error(POSTE_ERRORS.LEVEL_INVALID);
    }

    if (this.active !== undefined && !PosteValidationUtils.validateActive(this.active)) {
      throw new Error(POSTE_ERRORS.ACTIVE_INVALID);
    }

    const cleaned = PosteValidationUtils.cleanPosteData(this);
    Object.assign(this, cleaned);
  }
}
