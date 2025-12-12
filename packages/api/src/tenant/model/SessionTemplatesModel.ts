import {
  SESSION_TEMPLATE_DEFAULTS,
  SESSION_TEMPLATE_ERRORS,
  SessionTemplateValidationUtils,
} from '@toke/shared';
import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class SessionTemplateModel extends BaseModel {
  public readonly db = {
    tableName: tableName.SESSION_TEMPLATES,
    id: 'id',
    guid: 'guid',
    tenant: 'tenant',
    name: 'name',
    valid_from: 'valid_from',
    valid_to: 'valid_to',
    definition: 'definition',
    default: 'default',
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
  protected valid_from?: Date;
  protected valid_to?: Date | null;
  protected definition?: any;
  protected default: boolean = SESSION_TEMPLATE_DEFAULTS.IS_DEFAULT;
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

  protected async findDefault(includeDeleted: boolean = false): Promise<any> {
    const conditions: any = {
      [this.db.default]: !SESSION_TEMPLATE_DEFAULTS.IS_DEFAULT,
    };
    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }
    return await this.findOne(this.db.tableName, conditions);
  }

  // protected async findByName(
  //   tenant: string,
  //   name: string,
  //   includeDeleted: boolean = false,
  // ): Promise<any> {
  //   const conditions: any = {
  //     [this.db.tenant]: tenant,
  //     [this.db.name]: name,
  //   };
  //
  //   if (!includeDeleted) {
  //     conditions[this.db.deleted_at] = null;
  //   }
  //
  //   return await this.findOne(this.db.tableName, conditions);
  // }

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

  protected async listAllValidAt(
    date: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const conditions = {
      [this.db.valid_from]: { [Op.lte]: date },
      [Op.or]: [{ [this.db.valid_to]: null }, { [this.db.valid_to]: { [Op.gte]: date } }],
    };

    return await this.listAll(conditions, paginationOptions);
  }

  // ============================================
  // STATISTIQUES
  // ============================================

  protected async countAll(): Promise<Record<string, number>> {
    const where = {
      [this.db.deleted_at]: null,
    };

    return await this.countByGroup(this.db.tableName, this.db.tenant, where);
  }

  // ============================================
  // CRUD
  // ============================================

  protected async create(): Promise<void> {
    await this.validate();

    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error(SESSION_TEMPLATE_ERRORS.GUID_GENERATION_FAILED);
    }

    // // Vérification unicité nom par tenant
    // const existingName = await this.findByName(this.tenant!, this.name!);
    // if (existingName) {
    //   throw new Error(SESSION_TEMPLATE_ERRORS.NAME_ALREADY_EXISTS);
    // }

    const existingDefault = await this.findDefault();
    if (existingDefault && this.default === !SESSION_TEMPLATE_DEFAULTS.IS_DEFAULT) {
      throw new Error(SESSION_TEMPLATE_ERRORS.ACTIVE_DEFAULT_TEMPLATE_ALREADY_EXISTS);
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.tenant]: this.tenant,
      [this.db.name]: this.name,
      [this.db.valid_from]: this.valid_from ?? new Date(),
      [this.db.valid_to]: this.valid_to ?? null,
      [this.db.definition]: this.definition,
      [this.db.default]: this.default || SESSION_TEMPLATE_DEFAULTS.IS_DEFAULT,
    });

    if (!lastID) {
      throw new Error(SESSION_TEMPLATE_ERRORS.CREATION_FAILED);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error(SESSION_TEMPLATE_ERRORS.ID_REQUIRED);
    }

    const updateData: Record<string, any> = {};

    if (this.tenant !== undefined) {
      updateData[this.db.tenant] = this.tenant;
    }
    if (this.name !== undefined) {
      updateData[this.db.name] = this.name;
    }
    if (this.valid_from !== undefined) {
      updateData[this.db.valid_from] = this.valid_from;
    }
    if (this.valid_to !== undefined) {
      updateData[this.db.valid_to] = this.valid_to;
    }
    if (this.definition !== undefined) {
      updateData[this.db.definition] = this.definition;
    }
    if (this.default !== undefined) {
      updateData[this.db.default] = this.default;
    }

    // 🚨 VÉRIFICATION D'UNICITÉ DU MODÈLE PAR DÉFAUT
    if (this.default === !SESSION_TEMPLATE_DEFAULTS.IS_DEFAULT) {
      const existingDefault = await this.findDefault();

      // On vérifie s'il existe un modèle par défaut différent de celui en cours de modification.
      if (existingDefault && existingDefault.id !== this.id) {
        throw new Error(SESSION_TEMPLATE_ERRORS.ACTIVE_DEFAULT_TEMPLATE_ALREADY_EXISTS);
      }
    }

    // const existingDefault = await this.findDefault();
    // if (
    //   existingDefault &&
    //   existingDefault.id !== this.id &&
    //   this.default === !SESSION_TEMPLATE_DEFAULTS.IS_DEFAULT
    // ) {
    //   throw new Error(SESSION_TEMPLATE_ERRORS.ACTIVE_DEFAULT_TEMPLATE_ALREADY_EXISTS);
    // }

    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });

    if (!updated) {
      throw new Error(SESSION_TEMPLATE_ERRORS.UPDATE_FAILED);
    }
  }

  protected async trash(id: number): Promise<boolean> {
    const affected = await this.updateOne(
      this.db.tableName,
      {
        [this.db.deleted_at]: new Date(),
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
    //   throw new Error(SESSION_TEMPLATE_ERRORS.TENANT_REQUIRED);
    // }
    // if (!SessionTemplateValidationUtils.validateTenant(this.tenant)) {
    //   throw new Error(SESSION_TEMPLATE_ERRORS.TENANT_INVALID);
    // }

    if (!this.name) {
      throw new Error(SESSION_TEMPLATE_ERRORS.NAME_REQUIRED);
    }
    if (!SessionTemplateValidationUtils.validateName(this.name)) {
      throw new Error(SESSION_TEMPLATE_ERRORS.NAME_INVALID);
    }

    if (!this.valid_from) {
      throw new Error(SESSION_TEMPLATE_ERRORS.VALID_FROM_REQUIRED);
    }
    if (!SessionTemplateValidationUtils.validateValidFrom(this.valid_from)) {
      throw new Error(SESSION_TEMPLATE_ERRORS.VALID_FROM_INVALID);
    }

    if (this.valid_to && !SessionTemplateValidationUtils.validateValidTo(this.valid_to)) {
      throw new Error(SESSION_TEMPLATE_ERRORS.VALID_TO_INVALID);
    }

    if (!this.definition) {
      throw new Error(SESSION_TEMPLATE_ERRORS.DEFINITION_REQUIRED);
    }
    if (!SessionTemplateValidationUtils.validateDefinition(this.definition)) {
      throw new Error(SESSION_TEMPLATE_ERRORS.DEFINITION_INVALID);
    }

    const cleaned = SessionTemplateValidationUtils.cleanSessionTemplateData(this);
    Object.assign(this, cleaned);
  }
}
