import { Level, POSTE_DEFAULTS } from '@toke/shared';

import PosteModel from '../model/PosteModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import { responseStructure as RS, tableName } from '../../utils/response.model.js';
import { TenantRevision } from '../../tools/revision.js';

export default class Poste extends PosteModel {
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
    byTitle: boolean = false,
  ): Promise<Poste | null> {
    return new Poste().load(identifier, byGuid, byCode, byTitle);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Poste[] | null> {
    return new Poste().list(conditions, paginationOptions);
  }

  static _listByDepartment(
    department: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Poste[] | null> {
    return new Poste().listByDepartment(department, paginationOptions);
  }

  static _listByLevel(
    level: Level,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Poste[] | null> {
    return new Poste().listByLevel(level, paginationOptions);
  }

  static _listByActiveStatus(
    isActive: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Poste[] | null> {
    return new Poste().listByActiveStatus(isActive, paginationOptions);
  }

  static _listBySalaryRange(
    minSalary: number,
    maxSalary: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Poste[] | null> {
    return new Poste().listBySalaryRange(minSalary, maxSalary, paginationOptions);
  }

  static async exportable(
    conditions: Record<string, any> = {
      ['active']: POSTE_DEFAULTS.ACTIVE,
    },
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    let items: any[] = [];
    const postes = await this._list(conditions, paginationOptions);
    if (postes) {
      items = postes.map((poste) => poste.toJSON());
    }
    return {
      revision: await TenantRevision.getRevision(tableName.POSTE),
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

  getTitle(): string | undefined {
    return this.title;
  }

  getCode(): string | undefined {
    return this.code;
  }

  getDepartment(): number | undefined {
    return this.department;
  }

  getSalaryBase(): number | undefined {
    return this.salary_base;
  }

  getDescription(): string | undefined {
    return this.description;
  }

  getLevel(): Level | undefined {
    return this.level;
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

  setTitle(title: string): Poste {
    this.title = title;
    return this;
  }

  setCode(code: string): Poste {
    this.code = code;
    return this;
  }

  setDepartment(department: number): Poste {
    this.department = department;
    return this;
  }

  setSalaryBase(salaryBase: number): Poste {
    this.salary_base = salaryBase;
    return this;
  }

  setDescription(description: string): Poste {
    this.description = description;
    return this;
  }

  setLevel(level: Level): Poste {
    this.level = level;
    return this;
  }

  setActive(active: boolean): Poste {
    this.active = active;
    return this;
  }

  // ============================================
  // MÉTHODES MÉTIER
  // ============================================

  isNew(): boolean {
    return this.id === undefined;
  }

  hasSalary(): boolean {
    return this.salary_base !== undefined && this.salary_base !== null;
  }

  hasDescription(): boolean {
    return Boolean(this.description);
  }

  isManagementLevel(): boolean {
    return [Level.MANAGER, Level.DIRECTOR, Level.HEAD, Level.CEO, Level.CTO, Level.CFO].includes(
      this.level as Level,
    );
  }

  isExecutiveLevel(): boolean {
    return [Level.CEO, Level.CTO, Level.CFO].includes(this.level as Level);
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
    byTitle: boolean = false,
  ): Promise<Poste | null> {
    let data = null;

    if (byGuid) {
      data = await this.findByGuid(identifier);
    } else if (byCode) {
      data = await this.findByCode(identifier);
    } else if (byTitle) {
      data = await this.findByTitle(identifier);
    } else {
      data = await this.find(Number(identifier));
    }

    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Poste[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Poste().hydrate(data));
  }

  async listByDepartment(
    department: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Poste[] | null> {
    const dataset = await this.listAllByDepartment(department, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Poste().hydrate(data));
  }

  async listByLevel(
    level: Level,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Poste[] | null> {
    const dataset = await this.listAllByLevel(level, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Poste().hydrate(data));
  }

  async listByActiveStatus(
    isActive: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Poste[] | null> {
    const dataset = await this.listAllByActiveStatus(isActive, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Poste().hydrate(data));
  }

  async listBySalaryRange(
    minSalary: number,
    maxSalary: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Poste[] | null> {
    const dataset = await this.listAllBySalaryRange(minSalary, maxSalary, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Poste().hydrate(data));
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: Poste Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  toJSON(): object {
    return {
      [RS.GUID]: this.guid,
      [RS.TITLE]: this.title,
      [RS.CODE]: this.code,
      [RS.DEPARTMENT]: this.department,
      [RS.SALARY_BASE]: this.salary_base,
      [RS.DESCRIPTION]: this.description,
      [RS.LEVEL]: this.level,
      [RS.ACTIVE]: this.active,
    };
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  private hydrate(data: any): Poste {
    this.id = data.id;
    this.guid = data.guid;
    this.title = data.title;
    this.code = data.code;
    this.department = data.department;
    this.salary_base = data.salary_base;
    this.description = data.description;
    this.level = data.level;
    this.active = data.active;
    this.deleted_at = data.deleted_at;
    return this;
  }
}
