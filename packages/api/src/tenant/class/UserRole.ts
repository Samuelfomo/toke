import UserRoleModel from '../model/UserRoleModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import { responseStructure as RS, responseValue, ViewMode } from '../../utils/response.model.js';

import User from './User.js';
import Role from './Role.js';

export default class UserRole extends UserRoleModel {
  private userObject?: User;
  private roleObject?: Role;
  private assignedByObject?: User;

  constructor() {
    super();
  }

  // === MÉTHODES STATIQUES DE CHARGEMENT ===

  static _load(identifier: any, byGuid: boolean = false): Promise<UserRole | null> {
    return new UserRole().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<UserRole[] | null> {
    return new UserRole().list(conditions, paginationOptions);
  }

  static _listByUser(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<UserRole[] | null> {
    return new UserRole().listByUser(userId, paginationOptions);
  }

  static _listByRole(
    roleId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<UserRole[] | null> {
    return new UserRole().listByRole(roleId, paginationOptions);
  }

  static async exportable(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    let items: any[] = [];
    const userRoles = await this._list(conditions, paginationOptions);
    if (userRoles) {
      items = await Promise.all(userRoles.map(async (userRole) => await userRole.toJSON()));
    }
    return {
      revision: '',
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || items.length,
        count: items.length,
      },
      items,
    };
  }

  // === GETTERS FLUENT ===

  static async assignRole(userId: number, roleId: number, assignedBy: number): Promise<UserRole> {
    const userRole = new UserRole().setUser(userId).setRole(roleId).setAssignedBy(assignedBy);

    await userRole.save();
    return userRole;
  }

  static async removeRole(userId: number, roleId: number): Promise<boolean> {
    const userRole = await new UserRole().findByUserRole(userId, roleId);
    if (userRole) {
      const userRoleObj = new UserRole().hydrate(userRole);
      return await userRoleObj.delete();
    }
    return false;
  }

  static async getUserRoles(userId: number): Promise<Role[]> {
    const userRoles = await UserRole._listByUser(userId);
    if (!userRoles) return [];

    const roles: Role[] = [];
    for (const userRole of userRoles) {
      const role = await userRole.getRoleObject();
      if (role) {
        roles.push(role);
      }
    }
    return roles;
  }

  static async hasRole(userId: number, roleCode: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.some((role) => role.getCode() === roleCode);
  }

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getUser(): number | undefined {
    return this.user;
  }

  getRole(): number | undefined {
    return this.role;
  }

  getAssignedBy(): number | undefined {
    return this.assigned_by;
  }

  getCreatedAt(): Date | undefined {
    return this.created_at;
  }

  // === SETTERS FLUENT ===

  getUpdatedAt(): Date | undefined {
    return this.updated_at;
  }

  async getUserObject(): Promise<User | null> {
    if (!this.user) {
      return null;
    }
    if (!this.userObject) {
      this.userObject = (await User._load(this.user)) || undefined;
    }
    return this.userObject || null;
  }

  async getRoleObject(): Promise<Role | null> {
    if (!this.role) {
      return null;
    }
    if (!this.roleObject) {
      this.roleObject = (await Role._load(this.role)) || undefined;
    }
    return this.roleObject || null;
  }

  // === MÉTHODES MÉTIER ===

  async getAssignedByObject(): Promise<User | null> {
    if (!this.assigned_by) {
      return null;
    }
    if (!this.assignedByObject) {
      this.assignedByObject = (await User._load(this.assigned_by)) || undefined;
    }
    return this.assignedByObject || null;
  }

  setUser(userId: number): UserRole {
    this.user = userId;
    return this;
  }

  setRole(roleId: number): UserRole {
    this.role = roleId;
    return this;
  }

  setAssignedBy(assignedById: number): UserRole {
    this.assigned_by = assignedById;
    return this;
  }

  isNew(): boolean {
    return this.id === undefined;
  }

  async isValidAssignment(): Promise<boolean> {
    const user = await this.getUserObject();
    const role = await this.getRoleObject();
    return Boolean(user && role && user.isActive());
  }

  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        await this.create();
      } else {
        await this.update();
      }
    } catch (error: any) {
      throw new Error(error.message || error);
    }
  }

  async load(identifier: any, byGuid: boolean = false): Promise<UserRole | null> {
    let data = null;

    if (byGuid) {
      data = await this.findByGuid(identifier);
    } else {
      data = await this.find(Number(identifier));
    }

    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<UserRole[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new UserRole().hydrate(data));
  }

  async listByUser(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<UserRole[] | null> {
    const dataset = await this.listAllByUser(userId, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new UserRole().hydrate(data));
  }

  // === MÉTHODES PRIVÉES ===

  async listByRole(
    roleId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<UserRole[] | null> {
    const dataset = await this.listAllByRole(roleId, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new UserRole().hydrate(data));
  }

  // === MÉTHODES STATIQUES UTILITAIRES ===

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: UserRole Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const userObj = await this.getUserObject();
    const roleObj = await this.getRoleObject();
    const assignedByObj = await this.getAssignedByObject();

    const baseData = {
      [RS.GUID]: this.guid,
      [RS.CREATED_AT]: this.created_at,
    };
    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.USER]: userObj ? userObj.getGuid() : null,
        [RS.ROLE]: roleObj ? roleObj.getCode() : null,
        [RS.ASSIGNED_BY]: assignedByObj ? assignedByObj.getGuid() : null,
      };
    }

    return {
      ...baseData,
      [RS.USER]: userObj ? userObj.toJSON() : null,
      [RS.ROLE]: roleObj ? roleObj.toJSON() : null,
      [RS.ASSIGNED_BY]: assignedByObj ? assignedByObj.toJSON() : null,
    };
  }

  toSimpleJSON(): object {
    return {
      [RS.GUID]: this.guid,
      [RS.USER]: this.user,
      [RS.ROLE]: this.role,
      [RS.ASSIGNED_BY]: this.assigned_by,
      [RS.CREATED_AT]: this.created_at,
      [RS.UPDATED_AT]: this.updated_at,
    };
  }

  private hydrate(data: any): UserRole {
    this.id = data.id;
    this.guid = data.guid;
    this.user = data.user;
    this.role = data.role;
    this.assigned_by = data.assigned_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    return this;
  }
}
