import { DEPARTMENT_DEFAULTS } from '@toke/shared';

import DepartmentModel from '../model/DepartmentModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import {
  responseStructure as RS,
  responseValue,
  tableName,
  ViewMode,
} from '../../utils/response.model.js';
import { TenantRevision } from '../../tools/revision.js';

import User from './User.js';

export default class Department extends DepartmentModel {
  private managerObj?: User;
  constructor() {
    super();
  }

  // ============================================
  // MÉTHODES STATIQUES DE CHARGEMENT
  // ============================================

  static _load(
    identifier: any,
    byGuid: boolean = false,
    byCode: boolean = false,
    byName: boolean = false,
  ): Promise<Department | null> {
    return new Department().load(identifier, byGuid, byCode, byName);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Department[] | null> {
    return new Department().list(conditions, paginationOptions);
  }

  static _listByActiveStatus(
    isActive: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Department[] | null> {
    return new Department().listByActiveStatus(isActive, paginationOptions);
  }

  static _listByManager(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Department[] | null> {
    return new Department().listByManager(manager, paginationOptions);
  }

  static async exportable(
    conditions: Record<string, any> = {
      ['active']: DEPARTMENT_DEFAULTS.ACTIVE,
    },
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    let items: any[] = [];
    const departments = await this._list(conditions, paginationOptions);
    if (departments) {
      items = departments.map(async (department) => await department.toJSON());
    }
    return {
      revision: await TenantRevision.getRevision(tableName.DEPARTMENT),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || items.length,
        count: items.length,
      },
      items,
    };
  }

  // ============================================
  // GETTERS FLUENT
  // ============================================

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getName(): string | undefined {
    return this.name;
  }

  getCode(): string | undefined {
    return this.code;
  }

  getDescription(): string | undefined {
    return this.description;
  }

  getManager(): number | undefined {
    return this.manager;
  }

  async getManagerObj(): Promise<User | null> {
    if (!this.manager) return null;
    if (!this.managerObj) {
      this.managerObj = (await User._load(this.manager)) || undefined;
    }

    return this.managerObj || null;
  }

  isActive(): boolean | undefined {
    return this.active;
  }

  getDeletedAt(): Date | undefined {
    return this.deleted_at;
  }

  // ============================================
  // SETTERS FLUENT
  // ============================================

  setName(name: string): Department {
    this.name = name;
    return this;
  }

  setCode(code: string): Department {
    this.code = code;
    return this;
  }

  setDescription(description: string): Department {
    this.description = description;
    return this;
  }

  setManager(manager: number): Department {
    this.manager = manager;
    return this;
  }

  setActive(active: boolean): Department {
    this.active = active;
    return this;
  }

  // ============================================
  // MÉTHODES MÉTIER
  // ============================================

  isNew(): boolean {
    return this.id === undefined;
  }

  hasManager(): boolean {
    return this.manager !== undefined && this.manager !== null;
  }

  hasDescription(): boolean {
    return Boolean(this.description);
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

  // ============================================
  // CHARGEMENT ET LISTING
  // ============================================

  async load(
    identifier: any,
    byGuid: boolean = false,
    byCode: boolean = false,
    byName: boolean = false,
  ): Promise<Department | null> {
    let data = null;

    if (byGuid) {
      data = await this.findByGuid(identifier);
    } else if (byCode) {
      data = await this.findByCode(identifier);
    } else if (byName) {
      data = await this.findByName(identifier);
    } else {
      data = await this.find(Number(identifier));
    }

    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Department[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Department().hydrate(data));
  }

  async listByActiveStatus(
    isActive: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Department[] | null> {
    const dataset = await this.listAllByActiveStatus(isActive, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Department().hydrate(data));
  }

  async listByManager(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Department[] | null> {
    const dataset = await this.listAllByManager(manager, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Department().hydrate(data));
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: Department Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const managerObj = await this.getManagerObj();

    const baseData = {
      [RS.GUID]: this.guid,
      [RS.NAME]: this.name,
      [RS.CODE]: this.code,
      [RS.DESCRIPTION]: this.description,
      [RS.ACTIVE]: this.active,
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.MANAGER]: managerObj ? managerObj.getGuid() : null,
      };
    }

    return {
      ...baseData,
      [RS.MANAGER]: managerObj ? managerObj.toJSON() : null,
    };
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  private hydrate(data: any): Department {
    this.id = data.id;
    this.guid = data.guid;
    this.name = data.name;
    this.code = data.code;
    this.description = data.description;
    this.manager = data.manager;
    this.active = data.active;
    this.deleted_at = data.deleted_at;
    return this;
  }
}
