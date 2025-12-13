import { CycleUnit, ROTATION_GROUP_DEFAULTS } from '@toke/shared';

import RotationGroupModel from '../model/RotationGroupsModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import {
  responseStructure as RS,
  responseValue,
  tableName,
  ViewMode,
} from '../../utils/response.model.js';
import { TenantRevision } from '../../tools/revision.js';

import SessionTemplate from './SessionTemplates.js';

export default class RotationGroup extends RotationGroupModel {
  private sessionTemplatesObjs?: SessionTemplate[];

  constructor() {
    super();
  }

  // ============================================
  // MÉTHODES STATIQUES DE CHARGEMENT
  // ============================================

  static _load(identifier: any, byGuid: boolean = false): Promise<RotationGroup | null> {
    return new RotationGroup().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroup[] | null> {
    return new RotationGroup().list(conditions, paginationOptions);
  }

  static _listByActiveStatus(
    isActive: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroup[] | null> {
    return new RotationGroup().listByActiveStatus(isActive, paginationOptions);
  }

  static _listByCycleUnit(
    cycleUnit: CycleUnit,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroup[] | null> {
    return new RotationGroup().listByCycleUnit(cycleUnit, paginationOptions);
  }

  static async exportable(
    conditions: Record<string, any> = {
      [RS.ACTIVE]: ROTATION_GROUP_DEFAULTS.ACTIVE,
    },
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    let items: any[] = [];
    const groups = await this._list(conditions, paginationOptions);
    if (groups) {
      items = await Promise.all(groups.map(async (group) => await group.toJSON()));
    }
    return {
      revision: await TenantRevision.getRevision(tableName.ROTATION_GROUPS),
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

  getTenant(): string | undefined {
    return this.tenant;
  }

  getName(): string | undefined {
    return this.name;
  }

  getCycleLength(): number | undefined {
    return this.cycle_length;
  }

  getCycleUnit(): CycleUnit | undefined {
    return this.cycle_unit;
  }

  getCycleTemplates(): number[] | undefined {
    return this.cycle_templates;
  }

  async getSessionTemplates(): Promise<SessionTemplate[]> {
    if (!this.cycle_templates || this.cycle_templates.length === 0) return [];

    if (!this.sessionTemplatesObjs) {
      this.sessionTemplatesObjs = [];
      for (const templateId of this.cycle_templates) {
        const template = await SessionTemplate._load(templateId);
        if (template) {
          this.sessionTemplatesObjs.push(template);
        }
      }
    }

    return this.sessionTemplatesObjs;
  }

  getStartDate(): string | undefined {
    return this.start_date;
  }

  isActive(): boolean | undefined {
    return this.active;
  }

  getDeletedAt(): Date | null | undefined {
    return this.deleted_at;
  }

  // ============================================
  // SETTERS FLUENT
  // ============================================

  setTenant(tenant: string): RotationGroup {
    this.tenant = tenant;
    return this;
  }

  setName(name: string): RotationGroup {
    this.name = name;
    return this;
  }

  setCycleLength(cycleLength: number): RotationGroup {
    this.cycle_length = cycleLength;
    return this;
  }

  setCycleUnit(cycleUnit: CycleUnit): RotationGroup {
    this.cycle_unit = cycleUnit;
    return this;
  }

  setCycleTemplates(cycleTemplates: number[]): RotationGroup {
    this.cycle_templates = cycleTemplates;
    this.sessionTemplatesObjs = undefined; // Reset cache
    return this;
  }

  setStartDate(startDate: string): RotationGroup {
    this.start_date = startDate;
    return this;
  }

  setActive(active: boolean): RotationGroup {
    this.active = active;
    return this;
  }

  // ============================================
  // MÉTHODES MÉTIER
  // ============================================

  isNew(): boolean {
    return this.id === undefined;
  }

  /**
   * Calcule quel template appliquer pour un utilisateur à une date donnée
   * @param offset Position de l'utilisateur dans le cycle (0, 1, 2, etc.)
   * @param targetDate Date pour laquelle calculer le template
   * @returns L'ID du template à appliquer
   */
  getTemplateForDate(offset: number, targetDate: Date): number | null {
    if (!this.cycle_templates || this.cycle_templates.length === 0) return null;
    if (!this.start_date) return null;

    const startDate = new Date(this.start_date);
    const diffTime = targetDate.getTime() - startDate.getTime();

    let cyclesPassed: number;

    if (this.cycle_unit === CycleUnit.DAY) {
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      cyclesPassed = Math.floor(diffDays / this.cycle_length!);
    } else {
      // CycleUnit.WEEK
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      cyclesPassed = Math.floor(diffWeeks / this.cycle_length!);
    }

    const position = (cyclesPassed + offset) % this.cycle_templates.length;
    return this.cycle_templates[position];
  }

  /**
   * Vérifie si la rotation est dans le futur
   */
  isInFuture(): boolean {
    if (!this.start_date) return false;
    const startDate = new Date(this.start_date);
    return startDate > new Date();
  }

  /**
   * Calcule combien de cycles se sont écoulés depuis le début
   */
  getCyclesElapsed(): number {
    if (!this.start_date) return 0;

    const startDate = new Date(this.start_date);
    const now = new Date();
    const diffTime = now.getTime() - startDate.getTime();

    if (diffTime < 0) return 0;

    if (this.cycle_unit === CycleUnit.DAY) {
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return Math.floor(diffDays / this.cycle_length!);
    } else {
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      return Math.floor(diffWeeks / this.cycle_length!);
    }
  }

  /**
   * Obtient la position actuelle dans le cycle (0, 1, 2, etc.)
   */
  getCurrentCyclePosition(): number {
    if (!this.cycle_templates) return 0;
    const cyclesElapsed = this.getCyclesElapsed();
    return cyclesElapsed % this.cycle_templates.length;
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

  async load(identifier: any, byGuid: boolean = false): Promise<RotationGroup | null> {
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
  ): Promise<RotationGroup[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new RotationGroup().hydrate(data));
  }

  async listByActiveStatus(
    isActive: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroup[] | null> {
    const dataset = await this.listAllByActiveStatus(isActive, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new RotationGroup().hydrate(data));
  }

  async listByCycleUnit(
    cycleUnit: CycleUnit,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroup[] | null> {
    const dataset = await this.listAllByCycleUnit(cycleUnit, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new RotationGroup().hydrate(data));
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: RotationGroup Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const templates = await this.getSessionTemplates();

    const baseData = {
      [RS.GUID]: this.guid,
      [RS.TENANT]: this.tenant,
      [RS.NAME]: this.name,
      [RS.CYCLE_LENGTH]: this.cycle_length,
      [RS.CYCLE_UNIT]: this.cycle_unit,
      [RS.START_DATE]: this.start_date,
      [RS.ACTIVE]: this.active,
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.CYCLE_TEMPLATES]: templates.map((t) => t.getGuid()),
      };
    }

    return {
      ...baseData,
      [RS.CYCLE_TEMPLATES]: await Promise.all(
        templates.map(async (t) => t.toJSON(responseValue.MINIMAL)),
      ),
    };
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  private hydrate(data: any): RotationGroup {
    this.id = data.id;
    this.guid = data.guid;
    this.tenant = data.tenant;
    this.name = data.name;
    this.cycle_length = data.cycle_length;
    this.cycle_unit = data.cycle_unit;
    this.cycle_templates = data.cycle_templates;
    this.start_date = data.start_date;
    this.active = data.active;
    this.deleted_at = data.deleted_at;
    return this;
  }
}
