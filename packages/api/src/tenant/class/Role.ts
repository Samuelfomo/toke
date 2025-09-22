import { ROLES_DEFAULTS } from '@toke/shared';

import RoleModel from '../model/RoleModel.js';
import W from '../../tools/watcher';
import G from '../../tools/glossary';
import { responseStructure as RS } from '../../utils/response.model';

export default class Role extends RoleModel {
  constructor() {
    super();
  }

  static _load(
    identifier: any,
    byGuid: boolean = false,
    byCode: boolean = false,
  ): Promise<Role | null> {
    return new Role().load(identifier, byGuid, byCode);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Role[] | null> {
    return new Role().list(conditions, paginationOptions);
  }
  static _listBySystemRole(
    systemRole: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Role[] | null> {
    return new Role().listBySystemRole(systemRole, paginationOptions);
  }

  static async exportable(paginationOptions: { offset?: number; limit?: number } = {}): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    let items: any[] = [];
    const roles = await this._list(
      { [RS.SYSTEM_ROLE]: ROLES_DEFAULTS.SYSTEM_ROLE },
      paginationOptions,
    );
    if (roles) {
      items = roles.map((role) => role.toJSON());
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

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getCode(): string | undefined {
    return this.code?.toUpperCase();
  }

  getName(): string | undefined {
    return this.name;
  }

  getDescription(): string | undefined {
    return this.description;
  }

  getPermission(): Record<string, any> | String[] | undefined {
    return this.permissions;
  }

  // === SETTERS FLUENT ===

  isSystemRole(): boolean | undefined {
    return this.system_role;
  }

  setGuid(guid: string): Role {
    this.guid = guid;
    return this;
  }

  setCode(code: string): Role {
    this.code = code.toUpperCase();
    return this;
  }

  setName(name: string): Role {
    this.name = name;
    return this;
  }

  setDescription(description: string): Role {
    this.description = description;
    return this;
  }

  setPermission(permission: Record<string, any> | string[]): Role {
    this.permissions = permission;
    return this;
  }

  setSystemRole(systemRole: boolean): Role {
    this.system_role = systemRole;
    return this;
  }

  isNew(): boolean {
    return this.id === undefined;
  }

  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        await this.create();
      } else {
        await this.update();
      }
    } catch (error: any) {
      throw new Error(error);
    }
  }

  async load(
    identifier: any,
    byGuid: boolean = false,
    byCode: boolean = false,
  ): Promise<Role | null> {
    const data = byGuid
      ? await this.findByGuid(identifier)
      : byCode
        ? await this.findByCode(identifier)
        : await this.find(Number(identifier));
    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Role[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new Role().hydrate(data));
  }

  async listBySystemRole(
    systemRole: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Role[] | null> {
    const dataset = await this.listAllBySystemRole(systemRole, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new Role().hydrate(data));
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: Role Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  toJSON(): object {
    return {
      [RS.GUID]: this.guid,
      [RS.CODE]: this.code,
      [RS.NAME]: this.name,
      [RS.DESCRIPTION]: this.description,
      [RS.PERMISSIONS]: this.permissions,
      [RS.SYSTEM_ROLE]: this.system_role,
    };
  }

  private hydrate(data: any): Role {
    this.id = data.id;
    this.guid = data.guid;
    this.code = data.code;
    this.name = data.name;
    this.description = data.description;
    this.permissions = data.permissions;
    this.system_role = data.system_role;
    return this;
  }
}
