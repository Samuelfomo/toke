import { USER_ROLES_ERRORS, UserRolesValidationUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class UserRoleModel extends BaseModel {
  public readonly db = {
    tableName: tableName.USER_ROLES,
    id: 'id',
    guid: 'guid',
    user: 'user',
    role: 'role',
    assigned_by: 'assigned_by',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;
  protected id?: number;
  protected guid?: string;
  protected user?: number;
  protected role?: number;
  protected assigned_by?: number;
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

  protected async findByUserRole(user: number, role: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.user]: user, [this.db.role]: role });
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
  protected async listAllByUser(
    user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ) {
    return await this.listAll({ [this.db.user]: user }, paginationOptions);
  }
  protected async listAllByRole(
    role: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.role]: role }, paginationOptions);
  }

  protected async create(): Promise<void> {
    await this.validate();

    const guid = await this.uuidTokenGenerator(this.db.tableName);
    if (!guid) {
      throw new Error(USER_ROLES_ERRORS.GUID_GENERATION_FAILED);
    }
    const existingUserRole = await this.findByUserRole(this.user!, this.role!);
    if (existingUserRole) {
      throw new Error(USER_ROLES_ERRORS.DUPLICATE_ASSIGNMENT);
    }
    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.user]: this.user,
      [this.db.role]: this.role,
      [this.db.assigned_by]: this.assigned_by,
    });
    if (!lastID) {
      throw new Error(USER_ROLES_ERRORS.CREATION_FAILED);
    }
    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    await this.validate();
    const updateData: Record<string, any> = {};
    if (this.user !== undefined) {
      updateData[this.db.user] = this.user;
    }
    if (this.role !== undefined) {
      updateData[this.db.role] = this.role;
    }
    if (this.assigned_by !== undefined) {
      updateData[this.db.assigned_by] = this.assigned_by;
    }
    const affected = await this.updateOne(this.db.tableName, { [this.db.id]: this.id }, updateData);
    if (!affected) {
      throw new Error(USER_ROLES_ERRORS.UPDATE_FAILED);
    }
  }
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  private async validate(): Promise<void> {
    if (!this.user) {
      throw new Error(USER_ROLES_ERRORS.USER_REQUIRED);
    }
    if (!UserRolesValidationUtils.validateUserId(this.user)) {
      throw new Error(USER_ROLES_ERRORS.USER_INVALID);
    }
    if (!this.role) {
      throw new Error(USER_ROLES_ERRORS.ROLE_REQUIRED);
    }
    if (!UserRolesValidationUtils.validateRoleId(this.role)) {
      throw new Error(USER_ROLES_ERRORS.ROLE_INVALID);
    }
    if (!this.assigned_by) {
      throw new Error(USER_ROLES_ERRORS.ASSIGNED_BY_REQUIRED);
    }
    if (!UserRolesValidationUtils.validateAssignedBy(this.assigned_by)) {
      throw new Error(USER_ROLES_ERRORS.ASSIGNED_BY_INVALID);
    }

    const cleaned = UserRolesValidationUtils.cleanUserRoleData(this);
    Object.assign(this, cleaned);
  }
}
