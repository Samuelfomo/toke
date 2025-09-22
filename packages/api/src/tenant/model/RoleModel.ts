import { ROLES_DEFAULTS, ROLES_ERRORS, RolesValidationUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model';

export default class RoleModel extends BaseModel {
  public readonly db = {
    tableName: tableName.ROLES,
    id: 'id',
    guid: 'guid',
    code: 'code',
    name: 'name',
    description: 'description',
    permissions: 'permissions',
    system_role: 'system_role',
    created_at: 'created_at',
    updated_at: 'updated_at',
  };

  protected id?: number;
  protected guid?: string;
  protected code?: string;
  protected name?: string;
  protected description?: string;
  protected permissions?: Record<string, any> | string[];
  protected system_role?: boolean;
  protected created_at?: Date;
  protected updated_at?: Date;
  protected constructor() {
    super();
  }

  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }
  protected async findByGuid(guid: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }
  protected async findByCode(code: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.code]: code });
  }
  protected async findByAttribut(attribute: string, value: any): Promise<any> {
    return await this.findOne(this.db.tableName, { [attribute]: value });
  }

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }
  protected async listAllBySystemRole(
    is_system_role: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.system_role]: is_system_role }, paginationOptions);
  }

  protected async create(): Promise<void> {
    await this.validate();
    const guid = await this.uuidTokenGenerator(this.db.tableName);
    if (!guid) {
      throw new Error(ROLES_ERRORS.GUID_GENERATED_FAILED);
    }
    const existingCode = await this.findByCode(this.code!);
    if (existingCode) {
      throw new Error(ROLES_ERRORS.CODE_ALREADY_EXISTS);
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.code]: this.code?.toUpperCase(),
      [this.db.name]: this.name,
      [this.db.description]: this.description,
      [this.db.permissions]: this.permissions,
      [this.db.system_role]: this.system_role ? this.system_role : ROLES_DEFAULTS.SYSTEM_ROLE,
    });
    if (!lastID) {
      throw new Error(ROLES_ERRORS.CREATION_FAILED);
    }
    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }
  protected async update(): Promise<void> {
    await this.validate();
    if (!this.id) {
      throw new Error(ROLES_ERRORS.ID_REQUIRED);
    }
    const updateData: Record<string, any> = {};
    if (this.code !== undefined) {
      updateData[this.db.code] = this.code?.toUpperCase();
    }
    if (this.name !== undefined) {
      updateData[this.db.name] = this.name;
    }
    if (this.description !== undefined) {
      updateData[this.db.description] = this.description;
    }
    if (this.permissions !== undefined) {
      updateData[this.db.permissions] = this.permissions;
    }
    if (this.system_role !== undefined) {
      updateData[this.db.system_role] = this.system_role;
    }
    const affected = await this.updateOne(this.db.tableName, { [this.db.id]: this.id }, updateData);
    if (!affected) {
      throw new Error(ROLES_ERRORS.UPDATE_FAILED);
    }
  }
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }
  private async validate(): Promise<void> {
    if (!this.code) {
      throw new Error(ROLES_ERRORS.CODE_REQUIRED);
    }
    if (!RolesValidationUtils.validateCode(this.code)) {
      throw new Error(ROLES_ERRORS.CODE_INVALID);
    }
    if (!this.name) {
      throw new Error(ROLES_ERRORS.NAME_REQUIRED);
    }
    if (!RolesValidationUtils.validateName(this.name)) {
      throw new Error(ROLES_ERRORS.NAME_INVALID);
    }
    if (this.description && !RolesValidationUtils.validateDescription(this.description)) {
      throw new Error(ROLES_ERRORS.DESCRIPTION_INVALID);
    }
    if (!this.permissions) {
      throw new Error(ROLES_ERRORS.PERMISSIONS_REQUIRED);
    }
    if (!RolesValidationUtils.validatePermissions(this.permissions)) {
      throw new Error(ROLES_ERRORS.PERMISSIONS_INVALID);
    }
    if (this.system_role && !RolesValidationUtils.validateSystemRole(this.system_role)) {
      throw new Error(ROLES_ERRORS.SYSTEM_ROLE_INVALID);
    }

    const cleaned = RolesValidationUtils.cleanRoleData(this);
    Object.assign(this, cleaned);
  }
}
