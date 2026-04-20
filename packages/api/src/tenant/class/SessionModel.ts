import { SessionModelModel } from '../model/SessionModelModel.js';
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

export default class SessionModel extends SessionModelModel {
  private createdByObj?: User;
  constructor() {
    super();
  }

  // ============================================
  // MÉTHODES STATIQUES DE CHARGEMENT
  // ============================================

  static _load(identifier: any, byGuid: boolean = false): Promise<SessionModel | null> {
    return new SessionModel().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<SessionModel[] | null> {
    return new SessionModel().list(conditions, paginationOptions);
  }

  static _listByCreator(
    creatorId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<SessionModel[] | null> {
    return new SessionModel().listByCreator(creatorId, paginationOptions);
  }

  static _listPauseAllowed(
    pauseAllowed: boolean = true,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<SessionModel[] | null> {
    return new SessionModel().listPauseAllowed(pauseAllowed, paginationOptions);
  }

  static _listRotationAllowed(
    rotationAllowed: boolean = true,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<SessionModel[] | null> {
    return new SessionModel().listRotationAllowed(rotationAllowed, paginationOptions);
  }

  static _listEarlyLeaveAllowed(
    earlyLeaveAllowed: boolean = true,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<SessionModel[] | null> {
    return new SessionModel().listEarlyLeaveAllowed(earlyLeaveAllowed, paginationOptions);
  }

  static async exportable(paginationOptions: { offset?: number; limit?: number } = {}): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    const conditions: Record<string, any> = { active: true };
    let items: any[] = [];
    const models = await this._list(conditions, paginationOptions);
    if (models) {
      items = await Promise.all(models.map(async (model) => model.toJSON()));
    }
    return {
      revision: await TenantRevision.getRevision(tableName.SESSION_MODEL),
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

  static toObject(data: any): SessionModel {
    return new SessionModel().hydrate(data);
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
  getWorkday(): string[] | undefined {
    return this.workday;
  }

  getMaxWorkingTime(): number | undefined {
    return this.max_working_time;
  }

  getMinWorkingTime(): number | undefined {
    return this.min_working_time;
  }

  getNormalSessionTime(): number | undefined {
    return this.normal_session_time;
  }

  getAllowedTolerance(): number | undefined {
    return this.allowed_tolerance;
  }

  isPauseAllowed(): boolean | undefined {
    return this.pause_allowed;
  }

  getPauseDuration(): number | undefined {
    return this.pause_duration;
  }

  getPauseCount(): number | undefined {
    return this.pause_count;
  }

  isRotationAllowed(): boolean | undefined {
    return this.rotation_allowed;
  }

  isExtraAllowed(): boolean | undefined {
    return this.extra_allowed;
  }

  getExtraMax(): number | undefined {
    return this.extra_max;
  }

  isEarlyLeaveAllowed(): boolean | undefined {
    return this.early_leave_allowed;
  }

  getLeaveEligibilityAfterSession(): number | undefined {
    return this.leave_eligibility_after_session;
  }

  isLeaveOptional(): boolean | undefined {
    return this.leave_is_optional;
  }

  getCreatedBy(): number | undefined {
    return this.created_by;
  }

  async getCreatedByObj(): Promise<User | null> {
    if (!this.created_by) return null;
    if (!this.createdByObj) {
      this.createdByObj = (await User._load(this.created_by)) || undefined;
    }
    return this.createdByObj || null;
  }

  isActive(): boolean {
    return this.active;
  }

  getCreatedAt(): Date | undefined {
    return this.created_at;
  }

  getUpdatedAt(): Date | undefined {
    return this.updated_at;
  }

  getDeletedAt(): Date | undefined {
    return this.deleted_at;
  }

  // ============================================
  // SETTERS FLUENT
  // ============================================

  setName(name: string): SessionModel {
    this.name = name;
    return this;
  }

  setWorkday(workday: string[]): SessionModel {
    this.workday = workday;
    return this;
  }

  setMaxWorkingTime(maxWorkingTime: number): SessionModel {
    this.max_working_time = maxWorkingTime;
    return this;
  }

  setMinWorkingTime(minWorkingTime: number): SessionModel {
    this.min_working_time = minWorkingTime;
    return this;
  }

  setNormalSessionTime(normalSessionTime: number): SessionModel {
    this.normal_session_time = normalSessionTime;
    return this;
  }

  setAllowedTolerance(allowedTolerance: number): SessionModel {
    this.allowed_tolerance = allowedTolerance;
    return this;
  }

  setPauseAllowed(pauseAllowed: boolean): SessionModel {
    this.pause_allowed = pauseAllowed;
    return this;
  }

  setPauseDuration(pauseDuration: number): SessionModel {
    this.pause_duration = pauseDuration;
    return this;
  }

  setPauseCount(pauseCount: number): SessionModel {
    this.pause_count = pauseCount;
    return this;
  }

  setRotationAllowed(rotationAllowed: boolean): SessionModel {
    this.rotation_allowed = rotationAllowed;
    return this;
  }

  setExtraAllowed(extraAllowed: boolean): SessionModel {
    this.extra_allowed = extraAllowed;
    return this;
  }

  setExtraMax(extraMax: number): SessionModel {
    this.extra_max = extraMax;
    return this;
  }

  setEarlyLeaveAllowed(earlyLeaveAllowed: boolean): SessionModel {
    this.early_leave_allowed = earlyLeaveAllowed;
    return this;
  }

  setLeaveEligibilityAfterSession(leaveEligibility: number): SessionModel {
    this.leave_eligibility_after_session = leaveEligibility;
    return this;
  }

  setLeaveOptional(leaveOptional: boolean): SessionModel {
    this.leave_is_optional = leaveOptional;
    return this;
  }

  setCreatedBy(createdBy: number): SessionModel {
    this.created_by = createdBy;
    return this;
  }

  setActive(active: boolean): SessionModel {
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
   * Vérifie si un jour donné fait partie des jours ouvrés de ce modèle.
   * Utilisé pour valider la définition d'un SessionTemplate.
   */
  isWorkingDay(day: string): boolean {
    return (this.workday ?? []).includes(day);
  }

  /**
   * Retourne les jours non ouvrés (pour information ou validation externe).
   */
  getNonWorkingDays(): string[] {
    const all = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return all.filter((d) => !(this.workday ?? []).includes(d));
  }

  /**
   * Vérifie si le modèle a des pauses configurées
   */
  hasPauseConfiguration(): boolean {
    return !!(this.pause_allowed && this.pause_duration && this.pause_count);
  }

  /**
   * Calcule le temps de pause total autorisé
   */
  getTotalPauseTime(): number {
    if (!this.hasPauseConfiguration()) return 0;
    return (this.pause_duration || 0) * (this.pause_count || 0);
  }

  /**
   * Vérifie si le modèle a des heures supplémentaires configurées
   */
  hasExtraConfiguration(): boolean {
    return !!(this.extra_allowed && this.extra_max);
  }

  /**
   * Calcule le temps de travail net minimum (sans pause)
   */
  getNetMinWorkingTime(): number {
    const minTime = this.min_working_time || 0;
    const pauseTime = this.getTotalPauseTime();
    return Math.max(0, minTime - pauseTime);
  }

  /**
   * Calcule le temps de travail net maximum (sans pause)
   */
  getNetMaxWorkingTime(): number {
    const maxTime = this.max_working_time || 0;
    const pauseTime = this.getTotalPauseTime();
    return Math.max(0, maxTime - pauseTime);
  }

  /**
   * Calcule le temps de travail maximum possible (avec heures sup)
   */
  getAbsoluteMaxWorkingTime(): number {
    const maxTime = this.max_working_time || 0;
    const extraTime = this.hasExtraConfiguration() ? this.extra_max || 0 : 0;
    return maxTime + extraTime;
  }

  /**
   * Vérifie si un temps de travail est dans les limites autorisées
   */
  isWorkingTimeValid(minutes: number): boolean {
    const minTime = this.min_working_time || 0;
    const maxTime = this.getAbsoluteMaxWorkingTime();
    return minutes >= minTime && minutes <= maxTime;
  }

  /**
   * Vérifie si la tolérance permet un temps donné
   */
  isWithinTolerance(actualMinutes: number, expectedMinutes: number): boolean {
    const tolerance = this.allowed_tolerance || 0;
    const difference = Math.abs(actualMinutes - expectedMinutes);
    return difference <= tolerance;
  }

  /**
   * Obtient les statistiques du modèle
   */
  getStatistics(): {
    name: string;
    workday: string[];
    time_range: { min: number; max: number; normal: number };
    net_time_range: { min: number; max: number };
    pause_config: { allowed: boolean; duration?: number; count?: number; total?: number };
    extra_config: { allowed: boolean; max?: number };
    flexibility: { tolerance: number; early_leave: boolean; rotation: boolean };
    leave_config: { eligibility_after?: number; is_optional: boolean };
  } {
    return {
      name: this.name || 'Unknown',
      workday: this.workday || [],
      time_range: {
        min: this.min_working_time || 0,
        max: this.max_working_time || 0,
        normal: this.normal_session_time || 0,
      },
      net_time_range: {
        min: this.getNetMinWorkingTime(),
        max: this.getNetMaxWorkingTime(),
      },
      pause_config: {
        allowed: this.pause_allowed || false,
        duration: this.pause_duration,
        count: this.pause_count,
        total: this.getTotalPauseTime(),
      },
      extra_config: {
        allowed: this.extra_allowed || false,
        max: this.extra_max,
      },
      flexibility: {
        tolerance: this.allowed_tolerance || 0,
        early_leave: this.early_leave_allowed || false,
        rotation: this.rotation_allowed || false,
      },
      leave_config: {
        eligibility_after: this.leave_eligibility_after_session,
        is_optional: this.leave_is_optional || false,
      },
    };
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

  async load(identifier: any, byGuid: boolean = false): Promise<SessionModel | null> {
    const data = byGuid ? await this.findByGuid(identifier) : await this.find(Number(identifier));
    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<SessionModel[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new SessionModel().hydrate(data));
  }

  async listByCreator(
    creatorId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<SessionModel[] | null> {
    const dataset = await this.listAllByCreated(creatorId, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new SessionModel().hydrate(data));
  }

  async listPauseAllowed(
    pauseAllowed: boolean = true,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<SessionModel[] | null> {
    const dataset = await this.listAllPauseAllowed(pauseAllowed, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new SessionModel().hydrate(data));
  }

  async listRotationAllowed(
    rotationAllowed: boolean = true,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<SessionModel[] | null> {
    const dataset = await this.listAllRotationAllowed(rotationAllowed, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new SessionModel().hydrate(data));
  }

  async listEarlyLeaveAllowed(
    earlyLeaveAllowed: boolean = true,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<SessionModel[] | null> {
    const dataset = await this.listAllEarlyLeaveAllowed(earlyLeaveAllowed, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new SessionModel().hydrate(data));
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: SessionModel Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  async restoreEntry(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: SessionModel Restore`);
      return await this.restore(this.id);
    }
    return false;
  }

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const user = await this.getCreatedByObj();
    const baseData = {
      [RS.GUID]: this.guid,
      [RS.NAME]: this.name,
      [RS.WORKDAY]: this.workday,
      [RS.MAX_WORKING_TIME]: this.max_working_time,
      [RS.MIN_WORKING_TIME]: this.min_working_time,
      [RS.NORMAL_SESSION_TIME]: this.normal_session_time,
      [RS.ALLOWED_TOLERANCE]: this.allowed_tolerance,
      [RS.PAUSE_ALLOWED]: this.pause_allowed,
      [RS.PAUSE_DURATION]: this.pause_duration,
      [RS.PAUSE_COUNT]: this.pause_count,
      [RS.ROTATION_ALLOWED]: this.rotation_allowed,
      [RS.EXTRA_ALLOWED]: this.extra_allowed,
      [RS.EXTRA_MAX]: this.extra_max,
      [RS.LEAVE_ALLOWED]: this.early_leave_allowed,
      [RS.LEAVE_ELIGIBILITY_AFTER_SESSION]: this.leave_eligibility_after_session,
      [RS.LEAVE_IS_OPTIONAL]: this.leave_is_optional,
      [RS.ACTIVE]: this.active,
    };

    if (view === responseValue.MINIMAL) {
      return {
        [RS.GUID]: this.guid,
        [RS.NAME]: this.name,
        [RS.WORKDAY]: this.workday,
        [RS.ACTIVE]: this.active,
        [RS.CREATED_BY]: user?.getGuid(),
      };
    }

    if (view === responseValue.FULL) {
      return {
        ...baseData,
        [RS.CREATED_BY]: {
          [RS.GUID]: user?.getGuid(),
          [RS.NAME]: user?.getFullName(),
        },
        [RS.CREATED_AT]: this.created_at,
        [RS.UPDATED_AT]: this.updated_at,
      };
    }

    return baseData;
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  private hydrate(data: any): SessionModel {
    this.id = data.id;
    this.guid = data.guid;
    this.name = data.name;
    this.workday = data.workday;
    this.max_working_time = data.max_working_time;
    this.min_working_time = data.min_working_time;
    this.normal_session_time = data.normal_session_time;
    this.allowed_tolerance = data.allowed_tolerance;
    this.pause_allowed = data.pause_allowed;
    this.pause_duration = data.pause_duration;
    this.pause_count = data.pause_count;
    this.rotation_allowed = data.rotation_allowed;
    this.extra_allowed = data.extra_allowed;
    this.extra_max = data.extra_max;
    this.early_leave_allowed = data.early_leave_allowed;
    this.leave_eligibility_after_session = data.leave_eligibility_after_session;
    this.leave_is_optional = data.leave_is_optional;
    this.created_by = data.created_by;
    this.active = data.active;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.deleted_at = data.deleted_at;
    return this;
  }
}
