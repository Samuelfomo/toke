import { SCHEDULE_EXCEPTION_DEFAULTS, TimezoneConfigUtils } from '@toke/shared';

import ScheduleExceptionModel from '../model/ScheduleExceptionsModel.js';
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
import User from './User.js';
import RotationGroup from './RotationGroups.js';

export default class ScheduleException extends ScheduleExceptionModel {
  private sessionTemplateObj?: SessionTemplate;
  private userObj?: User;
  private groupObj?: RotationGroup;
  private createdByObj?: User;

  constructor() {
    super();
  }

  // ============================================
  // MÉTHODES STATIQUES DE CHARGEMENT
  // ============================================

  static _load(identifier: any, byGuid: boolean = false): Promise<ScheduleException | null> {
    return new ScheduleException().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleException[] | null> {
    return new ScheduleException().list(conditions, paginationOptions);
  }

  static _listByUser(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleException[] | null> {
    return new ScheduleException().listByUser(userId, paginationOptions);
  }

  static _listByGroup(
    groupId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleException[] | null> {
    return new ScheduleException().listByGroup(groupId, paginationOptions);
  }

  static _listByActiveStatus(
    isActive: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleException[] | null> {
    return new ScheduleException().listByActiveStatus(isActive, paginationOptions);
  }

  static _listByDateRange(
    startDate: string,
    endDate: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleException[] | null> {
    return new ScheduleException().listByDateRange(startDate, endDate, paginationOptions);
  }

  static _listForUserOnDate(
    userId: number,
    date: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleException[] | null> {
    return new ScheduleException().listForUserOnDate(userId, date, paginationOptions);
  }

  static _listForGroupOnDate(
    groupId: number,
    date: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleException[] | null> {
    return new ScheduleException().listForGroupOnDate(groupId, date, paginationOptions);
  }

  static async exportable(
    conditions: Record<string, any> = {
      ['active']: SCHEDULE_EXCEPTION_DEFAULTS.ACTIVE,
    },
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    let items: any[] = [];
    const exceptions = await this._list(conditions, paginationOptions);
    if (exceptions) {
      items = await Promise.all(exceptions.map(async (exception) => await exception.toJSON()));
    }
    return {
      revision: await TenantRevision.getRevision(tableName.SCHEDULE_EXCEPTIONS),
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

  getUser(): number | null | undefined {
    return this.user;
  }

  async getUserObj(): Promise<User | null> {
    if (!this.user) return null;
    if (!this.userObj) {
      this.userObj = (await User._load(this.user)) || undefined;
    }
    return this.userObj || null;
  }

  getGroup(): number | null | undefined {
    return this.group;
  }

  async getGroupObj(): Promise<RotationGroup | null> {
    if (!this.group) return null;
    if (!this.groupObj) {
      this.groupObj = (await RotationGroup._load(this.group)) || undefined;
    }
    return this.groupObj || null;
  }

  getSessionTemplate(): number | undefined {
    return this.session_template;
  }

  async getSessionTemplateObj(): Promise<SessionTemplate | null> {
    if (!this.session_template) return null;
    if (!this.sessionTemplateObj) {
      this.sessionTemplateObj = (await SessionTemplate._load(this.session_template)) || undefined;
    }
    return this.sessionTemplateObj || null;
  }

  getStartDate(): string | undefined {
    return this.start_date;
  }

  getEndDate(): string | undefined {
    return this.end_date;
  }

  getCreatedBy(): number | null | undefined {
    return this.created_by;
  }

  async getCreatedByObj(): Promise<User | null> {
    if (!this.created_by) return null;
    if (!this.createdByObj) {
      this.createdByObj = (await User._load(this.created_by)) || undefined;
    }
    return this.createdByObj || null;
  }

  getReason(): string | null | undefined {
    return this.reason;
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

  setTenant(tenant: string): ScheduleException {
    this.tenant = tenant;
    return this;
  }

  setUser(userId: number | null): ScheduleException {
    this.user = userId;
    this.userObj = undefined; // Reset cache
    return this;
  }

  setGroup(groupId: number | null): ScheduleException {
    this.group = groupId;
    this.groupObj = undefined; // Reset cache
    return this;
  }

  setSessionTemplate(sessionTemplateId: number): ScheduleException {
    this.session_template = sessionTemplateId;
    this.sessionTemplateObj = undefined; // Reset cache
    return this;
  }

  setStartDate(startDate: string): ScheduleException {
    this.start_date = startDate;
    return this;
  }

  setEndDate(endDate: string): ScheduleException {
    this.end_date = endDate;
    return this;
  }

  setCreatedBy(createdBy: number | null): ScheduleException {
    this.created_by = createdBy;
    this.createdByObj = undefined; // Reset cache
    return this;
  }

  setReason(reason: string | null): ScheduleException {
    this.reason = reason;
    return this;
  }

  setActive(active: boolean): ScheduleException {
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
   * Vérifie si l'exception est pour un utilisateur spécifique
   */
  isUserException(): boolean {
    return this.user !== null && this.user !== undefined;
  }

  /**
   * Vérifie si l'exception est pour un groupe
   */
  isGroupException(): boolean {
    return this.group !== null && this.group !== undefined;
  }

  /**
   * Vérifie si une date est couverte par cette exception
   */
  coversDate(date: string): boolean {
    if (!this.start_date || !this.end_date) return false;
    return date >= this.start_date && date <= this.end_date;
  }

  /**
   * Calcule la durée de l'exception en jours
   */
  getDurationInDays(): number {
    if (!this.start_date || !this.end_date) return 0;

    const start = new Date(this.start_date);
    const end = new Date(this.end_date);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 pour inclure le dernier jour
  }

  /**
   * Vérifie si l'exception est dans le passé
   */
  isInPast(): boolean {
    if (!this.end_date) return false;
    const today = TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0];
    return this.end_date < today;
  }

  /**
   * Vérifie si l'exception est dans le futur
   */
  isInFuture(): boolean {
    if (!this.start_date) return false;
    const today = TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0];
    return this.start_date > today;
  }

  /**
   * Vérifie si l'exception est en cours
   */
  isCurrentlyActive(): boolean {
    if (!this.active) return false;
    const today = TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0];
    return this.coversDate(today);
  }

  /**
   * Vérifie si l'exception est pour un seul jour
   */
  isSingleDay(): boolean {
    return this.start_date === this.end_date;
  }

  hasReason(): boolean {
    return Boolean(this.reason && this.reason.trim().length > 0);
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

  async load(identifier: any, byGuid: boolean = false): Promise<ScheduleException | null> {
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
  ): Promise<ScheduleException[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new ScheduleException().hydrate(data));
  }

  async listByUser(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleException[] | null> {
    const dataset = await this.listAllByUser(userId, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new ScheduleException().hydrate(data));
  }

  async listByGroup(
    groupId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleException[] | null> {
    const dataset = await this.listAllByGroup(groupId, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new ScheduleException().hydrate(data));
  }

  async listByActiveStatus(
    isActive: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleException[] | null> {
    const dataset = await this.listAllByActiveStatus(isActive, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new ScheduleException().hydrate(data));
  }

  async listByDateRange(
    startDate: string,
    endDate: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleException[] | null> {
    const dataset = await this.listAllByDateRange(startDate, endDate, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new ScheduleException().hydrate(data));
  }

  async listForUserOnDate(
    userId: number,
    date: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleException[] | null> {
    const dataset = await this.listAllForUserOnDate(userId, date, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new ScheduleException().hydrate(data));
  }

  async listForGroupOnDate(
    groupId: number,
    date: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleException[] | null> {
    const dataset = await this.listAllForGroupOnDate(groupId, date, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new ScheduleException().hydrate(data));
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: ScheduleException Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const userObj = await this.getUserObj();
    const groupObj = await this.getGroupObj();
    const sessionTemplateObj = await this.getSessionTemplateObj();
    const createdByObj = await this.getCreatedByObj();

    const baseData = {
      [RS.GUID]: this.guid,
      [RS.TENANT]: this.tenant,
      [RS.START_DATE]: this.start_date,
      [RS.END_DATE]: this.end_date,
      [RS.REASON]: this.reason,
      [RS.ACTIVE]: this.active,
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.USER]: userObj ? userObj.getGuid() : null,
        [RS.GROUP]: groupObj ? groupObj.getGuid() : null,
        [RS.SESSION_TEMPLATE]: sessionTemplateObj ? sessionTemplateObj.getGuid() : null,
        [RS.CREATED_BY]: createdByObj ? createdByObj.getGuid() : null,
      };
    }

    return {
      ...baseData,
      [RS.USER]: userObj ? await userObj.toJSON() : null,
      [RS.GROUP]: groupObj ? await groupObj.toJSON(responseValue.MINIMAL) : null,
      [RS.SESSION_TEMPLATE]: sessionTemplateObj
        ? sessionTemplateObj.toJSON(responseValue.MINIMAL)
        : null,
      [RS.CREATED_BY]: createdByObj ? await createdByObj.toJSON() : null,
    };
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  private hydrate(data: any): ScheduleException {
    this.id = data.id;
    this.guid = data.guid;
    this.tenant = data.tenant;
    this.user = data.user;
    this.group = data.group;
    this.session_template = data.session_template;
    this.start_date = data.start_date;
    this.end_date = data.end_date;
    this.created_by = data.created_by;
    this.reason = data.reason;
    this.active = data.active;
    this.deleted_at = data.deleted_at;
    return this;
  }
}
