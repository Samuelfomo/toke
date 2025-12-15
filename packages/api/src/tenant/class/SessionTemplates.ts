import { SESSION_TEMPLATE_DEFAULTS, TimezoneConfigUtils, VALID_DAYS } from '@toke/shared';

import SessionTemplateModel from '../model/SessionTemplatesModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import {
  responseStructure as RS,
  responseValue,
  tableName,
  ViewMode,
} from '../../utils/response.model.js';
import { TenantRevision } from '../../tools/revision.js';

export default class SessionTemplate extends SessionTemplateModel {
  constructor() {
    super();
  }

  // ============================================
  // MÉTHODES STATIQUES DE CHARGEMENT
  // ============================================

  static _load(
    identifier: any,
    byGuid: boolean = false,
    defaults: boolean = false,
  ): Promise<SessionTemplate | null> {
    return new SessionTemplate().load(identifier, byGuid, defaults);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<SessionTemplate[] | null> {
    return new SessionTemplate().list(conditions, paginationOptions);
  }

  static _listValidAt(
    date: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<SessionTemplate[] | null> {
    return new SessionTemplate().listValidAt(date, paginationOptions);
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
    const templates = await this._list(conditions, paginationOptions);
    if (templates) {
      items = await Promise.all(templates.map(async (template) => template.toJSON()));
    }
    return {
      revision: await TenantRevision.getRevision(tableName.SESSION_TEMPLATES),
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

  getValidFrom(): Date | undefined {
    return this.valid_from;
  }

  getValidTo(): Date | null | undefined {
    return this.valid_to;
  }

  getDefinition(): any | undefined {
    return this.definition;
  }

  getDeletedAt(): Date | null | undefined {
    return this.deleted_at;
  }

  isDefaultSessionTemplate(): boolean {
    return this.defaults;
  }

  // ============================================
  // SETTERS FLUENT
  // ============================================

  setTenant(tenant: string): SessionTemplate {
    this.tenant = tenant;
    return this;
  }

  setName(name: string): SessionTemplate {
    this.name = name;
    return this;
  }

  setValidFrom(validFrom: Date): SessionTemplate {
    this.valid_from = validFrom;
    return this;
  }

  setValidTo(validTo: Date | null): SessionTemplate {
    this.valid_to = validTo;
    return this;
  }

  setDefinition(definition: any): SessionTemplate {
    this.definition = definition;
    return this;
  }

  setDefaultSessionTemplate(value: boolean): SessionTemplate {
    this.defaults = value;
    return this;
  }

  // ============================================
  // MÉTHODES MÉTIER
  // ============================================

  isNew(): boolean {
    return this.id === undefined;
  }

  isValidAt(date: Date): boolean {
    if (!this.valid_from) return false;

    if (date < this.valid_from) return false;

    return !(this.valid_to && date > this.valid_to);
  }

  hasExpired(): boolean {
    if (!this.valid_to) return false;
    return TimezoneConfigUtils.getCurrentTime() > this.valid_to;
  }

  getDaysWithWork(): string[] {
    if (!this.definition) return [];

    return Object.keys(this.definition).filter(
      (day) => this.definition[day] && this.definition[day].length > 0,
    );
  }

  hasWorkOnDay(day: string): boolean {
    if (!this.definition || !this.definition[day]) return false;
    return this.definition[day].length > 0;
  }

  getTotalWorkBlocksForDay(day: string): number {
    if (!this.definition || !this.definition[day]) return 0;
    return this.definition[day].length;
  }

  getWorkHoursForDay(day: string): number {
    if (!this.definition || !this.definition[day]) return 0;

    let totalMinutes = 0;

    for (const block of this.definition[day]) {
      const [startHour, startMin] = block.work[0].split(':').map(Number);
      const [endHour, endMin] = block.work[1].split(':').map(Number);

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      totalMinutes += endMinutes - startMinutes;

      // Soustraire la pause si elle existe
      if (block.pause) {
        const [pauseStartHour, pauseStartMin] = block.pause[0].split(':').map(Number);
        const [pauseEndHour, pauseEndMin] = block.pause[1].split(':').map(Number);

        const pauseStartMinutes = pauseStartHour * 60 + pauseStartMin;
        const pauseEndMinutes = pauseEndHour * 60 + pauseEndMin;

        totalMinutes -= pauseEndMinutes - pauseStartMinutes;
      }
    }

    return totalMinutes / 60;
  }

  getWeeklyWorkHours(): number {
    const days = VALID_DAYS;
    let totalHours = 0;

    for (const day of days) {
      totalHours += this.getWorkHoursForDay(day);
    }

    return totalHours;
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
    defaults: boolean = false,
  ): Promise<SessionTemplate | null> {
    let data = byGuid
      ? await this.findByGuid(identifier)
      : defaults
        ? await this.findDefault()
        : await this.find(Number(identifier));
    // if (byGuid) {
    //   data = await this.findByGuid(identifier);
    // } else if (defaults) {
    //   data = await this.findDefault();
    // } else {
    //   data = await this.find(Number(identifier));
    // }

    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<SessionTemplate[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new SessionTemplate().hydrate(data));
  }

  async listValidAt(
    date: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<SessionTemplate[] | null> {
    const dataset = await this.listAllValidAt(date, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new SessionTemplate().hydrate(data));
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: SessionTemplate Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  async setDefault(): Promise<void> {
    try {
      this.setDefaultSessionTemplate(!SESSION_TEMPLATE_DEFAULTS.IS_DEFAULT);
      await this.update();
    } catch (error: any) {
      throw new Error(error.message || error);
    }
  }

  async removeDefault(): Promise<void> {
    try {
      this.setDefaultSessionTemplate(SESSION_TEMPLATE_DEFAULTS.IS_DEFAULT);
      await this.update();
    } catch (error: any) {
      throw new Error(error.message || error);
    }
  }

  toJSON(view: ViewMode = responseValue.FULL): object {
    const baseData = {
      [RS.GUID]: this.guid,
      [RS.TENANT]: this.tenant,
      [RS.NAME]: this.name,
      [RS.VALID_FROM]: this.valid_from,
      [RS.VALID_TO]: this.valid_to,
      [RS.DEFINITION]: this.definition,
      [RS.IS_DEFAULT]: this.defaults,
    };

    if (view === responseValue.MINIMAL) {
      return {
        [RS.GUID]: this.guid,
        [RS.NAME]: this.name,
      };
    }

    return baseData;
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  private hydrate(data: any): SessionTemplate {
    this.id = data.id;
    this.guid = data.guid;
    this.tenant = data.tenant;
    this.name = data.name;
    this.valid_from = data.valid_from;
    this.valid_to = data.valid_to;
    this.definition = data.definition;
    this.defaults = data.defaults;
    this.deleted_at = data.deleted_at;
    return this;
  }
}
