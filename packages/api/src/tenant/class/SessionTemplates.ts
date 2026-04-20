import { SESSION_TEMPLATE_DEFAULTS, VALID_DAYS } from '@toke/shared';

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

import SessionModel from './SessionModel.js';

export default class SessionTemplate extends SessionTemplateModel {
  private sessionModelObj?: SessionModel;
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

  static _listForRotation(
    rotation?: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<SessionTemplate[] | null> {
    return new SessionTemplate().listForRotation(rotation, paginationOptions);
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

  static toObject(data: any): SessionTemplate {
    return new SessionTemplate().hydrate(data);
  }

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getName(): string | undefined {
    return this.name;
  }

  getDefinition(): any | undefined {
    return this.definition;
  }

  getSessionModel(): number | undefined {
    return this.session_model;
  }

  async getSessionModelObj(): Promise<SessionModel | null> {
    if (!this.session_model) return null;
    if (!this.sessionModelObj) {
      this.sessionModelObj = (await SessionModel._load(this.session_model)) || undefined;
    }
    return this.sessionModelObj || null;
  }

  // ✅ NOUVEAU GETTER
  getVersion(): number | undefined {
    return this.version;
  }

  getDeletedAt(): Date | null | undefined {
    return this.deleted_at;
  }
  isDefaultSessionTemplate(): boolean {
    return this.defaults;
  }

  ForRotation(): boolean {
    return this.for_rotation;
  }

  isCurrent(): boolean {
    return this.current;
  }

  // ============================================
  // SETTERS FLUENT
  // ============================================

  setName(name: string): SessionTemplate {
    this.name = name;
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
  setForRotation(value: boolean): SessionTemplate {
    this.for_rotation = value;
    return this;
  }

  setCurrent(value: boolean): SessionTemplate {
    this.current = value;
    return this;
  }

  setSessionModel(value: number): SessionTemplate {
    this.session_model = value;
    return this;
  }

  // getDaysWithWork(): string[] {
  //   if (!this.definition) return [];
  //
  //   return Object.keys(this.definition).filter(
  //     (day) => this.definition[day] && this.definition[day].length > 0,
  //   );
  // }

  isNew(): boolean {
    return this.id === undefined;
  }

  // ============================================
  // MÉTHODES MÉTIER
  // ============================================

  // hasWorkOnDay(day: string): boolean {
  //   if (!this.definition || !this.definition[day]) return false;
  //   return this.definition[day].length > 0;
  // }

  /**
   * 🔧 MÉTHODE MODIFIÉE
   * Retourne les jours avec du travail (exclut null et [])
   */
  getDaysWithWork(): string[] {
    if (!this.definition) return [];

    return Object.keys(this.definition).filter((day) => {
      const dayValue = this.definition[day];
      // ✅ Exclure null (férié) ET [] (repos)
      return dayValue !== null && Array.isArray(dayValue) && dayValue.length > 0;
    });
  }

  /**
   * 🔧 MÉTHODE MODIFIÉE
   * Vérifie si un jour a du travail
   */
  hasWorkOnDay(day: string): boolean {
    if (!this.definition || !this.definition[day]) return false;
    const dayValue = this.definition[day];
    // ✅ null = férié → pas de travail
    if (dayValue === null) return false;
    return Array.isArray(dayValue) && dayValue.length > 0;
  }

  /**
   * 🔧 NOUVELLE MÉTHODE
   * Vérifie si un jour est férié
   */
  isHoliday(day: string): boolean {
    if (!this.definition) return false;
    return this.definition[day] === null;
  }

  // getTotalWorkBlocksForDay(day: string): number {
  //   if (!this.definition || !this.definition[day]) return 0;
  //   return this.definition[day].length;
  // }

  /**
   * 🔧 NOUVELLE MÉTHODE
   * Vérifie si un jour est un jour de repos ([] mais pas null)
   */
  isRestDay(day: string): boolean {
    if (!this.definition) return false;
    const dayValue = this.definition[day];
    return Array.isArray(dayValue) && dayValue.length === 0;
  }

  // getWorkHoursForDay(day: string): number {
  //   if (!this.definition || !this.definition[day]) return 0;
  //
  //   let totalMinutes = 0;
  //
  //   for (const block of this.definition[day]) {
  //     const [startHour, startMin] = block.work[0].split(':').map(Number);
  //     const [endHour, endMin] = block.work[1].split(':').map(Number);
  //
  //     const startMinutes = startHour * 60 + startMin;
  //     const endMinutes = endHour * 60 + endMin;
  //
  //     totalMinutes += endMinutes - startMinutes;
  //
  //     // Soustraire la pause si elle existe
  //     if (block.pause) {
  //       const [pauseStartHour, pauseStartMin] = block.pause[0].split(':').map(Number);
  //       const [pauseEndHour, pauseEndMin] = block.pause[1].split(':').map(Number);
  //
  //       const pauseStartMinutes = pauseStartHour * 60 + pauseStartMin;
  //       const pauseEndMinutes = pauseEndHour * 60 + pauseEndMin;
  //
  //       totalMinutes -= pauseEndMinutes - pauseStartMinutes;
  //     }
  //   }
  //
  //   return totalMinutes / 60;
  // }

  /**
   * 🔧 MÉTHODE MODIFIÉE
   * Retourne le nombre de blocks pour un jour
   */
  getTotalWorkBlocksForDay(day: string): number {
    if (!this.definition || !this.definition[day]) return 0;
    const dayValue = this.definition[day];
    // ✅ null = férié → 0 blocks
    if (dayValue === null) return 0;
    return Array.isArray(dayValue) ? dayValue.length : 0;
  }

  /**
   * 🔧 MÉTHODE MODIFIÉE
   * Calcule les heures de travail pour un jour
   */
  getWorkHoursForDay(day: string): number {
    if (!this.definition || !this.definition[day]) return 0;
    const dayValue = this.definition[day];

    // ✅ null = férié → 0 heures
    if (dayValue === null) return 0;

    // ✅ [] = repos → 0 heures
    if (!Array.isArray(dayValue) || dayValue.length === 0) return 0;

    let totalMinutes = 0;

    for (const block of dayValue) {
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

  /**
   * 🔧 NOUVELLE MÉTHODE
   * Retourne les statistiques détaillées par type de jour
   */
  getDayStatistics(): {
    working_days: number;
    rest_days: number;
    holidays: number;
    details: Record<string, 'working' | 'rest' | 'holiday'>;
  } {
    if (!this.definition) {
      return { working_days: 0, rest_days: 0, holidays: 0, details: {} };
    }

    const stats = {
      working_days: 0,
      rest_days: 0,
      holidays: 0,
      details: {} as Record<string, 'working' | 'rest' | 'holiday'>,
    };

    for (const day of VALID_DAYS) {
      const dayValue = this.definition[day];

      if (dayValue === null) {
        stats.holidays++;
        stats.details[day] = 'holiday';
      } else if (Array.isArray(dayValue) && dayValue.length === 0) {
        stats.rest_days++;
        stats.details[day] = 'rest';
      } else if (Array.isArray(dayValue) && dayValue.length > 0) {
        stats.working_days++;
        stats.details[day] = 'working';
      }
    }

    return stats;
  }

  // ============================================
  // CHARGEMENT ET LISTING
  // ============================================

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

  async listForRotation(
    rotation?: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<SessionTemplate[] | null> {
    const dataset = await this.listAllForRotation(rotation, paginationOptions);
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

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const sessionModel = await this.getSessionModelObj();
    const baseData = {
      [RS.GUID]: this.guid,
      [RS.NAME]: this.name,
      [RS.DEFINITION]: this.definition,
      [RS.IS_DEFAULT]: this.defaults,
      [RS.IS_CURRENT]: this.current,
      [RS.FOR_ROTATION]: this.for_rotation,
      [RS.SESSION_MODEL]: {
        [RS.GUID]: sessionModel?.getGuid() || null,
        [RS.NAME]: sessionModel?.getName() || null,
      },
    };

    if (view === responseValue.MINIMAL) {
      return {
        [RS.GUID]: this.guid,
        [RS.NAME]: this.name,
        [RS.SESSION_MODEL]: sessionModel?.getGuid() || null,
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
    this.name = data.name;
    this.definition = data.definition;
    this.session_model = data.session_model;
    this.version = data.version;
    this.defaults = data.defaults;
    this.current = data.current;
    this.for_rotation = data.for_rotation;
    this.deleted_at = data.deleted_at;
    return this;
  }

  // ✅ NOUVEAU SETTER (usage interne)
  private setVersion(version: number): SessionTemplate {
    this.version = version;
    return this;
  }
}
