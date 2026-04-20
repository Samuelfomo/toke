import { SAFamily, SCHEDULE_ASSIGNMENTS_DEFAULTS, TimezoneConfigUtils } from '@toke/shared';

import ScheduleAssignmentsModel from '../model/ScheduleAssignmentsModel.js';
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
import Groups from './Groups.js';
import ScheduleAssignmentsLog from './ScheduleAssignmentsLog.js';

export default class ScheduleAssignments extends ScheduleAssignmentsModel {
  public initialVersion = 1;
  private relatedObj?: User | Groups;
  private createdByObj?: User;
  private new_template?: SessionTemplate;

  constructor() {
    super();
  }

  // ============================================
  // MÉTHODES STATIQUES DE CHARGEMENT
  // ============================================

  static _load(identifier: any, byGuid: boolean = false): Promise<ScheduleAssignments | null> {
    return new ScheduleAssignments().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignments[] | null> {
    return new ScheduleAssignments().list(conditions, paginationOptions);
  }

  static _listByRelated(
    family: SAFamily,
    related: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignments[] | null> {
    return new ScheduleAssignments().listByRelated(family, related, paginationOptions);
  }

  static _listByCreatedBy(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignments[] | null> {
    return new ScheduleAssignments().listByCreatedBy(manager, paginationOptions);
  }

  static _listByActiveStatus(
    isActive: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignments[] | null> {
    return new ScheduleAssignments().listByActiveStatus(isActive, paginationOptions);
  }

  static _listByDateRange(
    startDate: string,
    endDate: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignments[] | null> {
    return new ScheduleAssignments().listByDateRange(startDate, endDate, paginationOptions);
  }

  static _listForRelatedOnDate(
    family: SAFamily,
    related: string,
    date: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignments[] | null> {
    return new ScheduleAssignments().listForRelatedOnDate(family, related, date, paginationOptions);
  }

  static async exportable(
    conditions: Record<string, any> = {
      ['active']: SCHEDULE_ASSIGNMENTS_DEFAULTS.ACTIVE,
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
      revision: await TenantRevision.getRevision(tableName.SCHEDULE_ASSIGNMENTS),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || items.length,
        count: items.length,
      },
      items,
    };
  }

  // ============================================
  // GETTERS
  // ============================================

  /**
   * Créer un snapshot du template depuis un SessionTemplate
   */
  static async createTemplateSnapshot(sessionTemplate: SessionTemplate): Promise<any> {
    return {
      id: sessionTemplate.getId(),
      guid: sessionTemplate.getGuid(),
      name: sessionTemplate.getName(),
      definition: sessionTemplate.getDefinition(),
      version: sessionTemplate.getVersion(),
      is_default: sessionTemplate.isDefaultSessionTemplate(),
      snapshot_date: new Date().toISOString(),
    };
  }

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getTenant(): string | undefined {
    return this.tenant;
  }

  getFamily(): 'user' | 'group' | undefined {
    return this.family;
  }

  getRelated(): string | undefined {
    return this.related;
  }

  async getRelatedObj(): Promise<User | Groups | null> {
    if (!this.related || !this.family) return null;
    if (!this.relatedObj) {
      this.relatedObj =
        this.family === 'user'
          ? (await User._load(this.related, true)) || undefined
          : (await Groups._load(this.related, true)) || undefined;
    }
    return this.relatedObj || null;
  }

  getSessionTemplate(): any | undefined {
    return this.session_template;
  }

  getSessionTemplateId(): number | undefined {
    return this.session_template?.id;
  }

  getVersion(): number | undefined {
    return this.version;
  }

  getStartDate(): string | undefined {
    return this.start_date;
  }

  getAssignedAt(): Date | undefined {
    return new Date(this.getStartDate()!) || undefined;
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

  getCreatedAt(): Date | undefined {
    return this.created_at;
  }

  // ============================================
  // SETTERS FLUENT
  // ============================================

  getUpdatedAt(): Date | undefined {
    return this.updated_at;
  }

  setTenant(tenant: string): ScheduleAssignments {
    this.tenant = tenant;
    return this;
  }

  setFamily(family: SAFamily): ScheduleAssignments {
    this.family = family;
    return this;
  }

  setRelated(related: string): ScheduleAssignments {
    this.related = related;
    this.relatedObj = undefined; // Reset cache
    return this;
  }

  setSessionTemplate(template: any): ScheduleAssignments {
    this.session_template = template;
    return this;
  }

  setNewSessionTemplate(template: SessionTemplate): ScheduleAssignments {
    this.new_template = template;
    return this;
  }

  setStartDate(startDate: string): ScheduleAssignments {
    this.start_date = startDate;
    return this;
  }

  setEndDate(endDate: string): ScheduleAssignments {
    this.end_date = endDate;
    return this;
  }

  setCreatedBy(createdBy: number): ScheduleAssignments {
    this.created_by = createdBy;
    this.createdByObj = undefined; // Reset cache
    return this;
  }

  setReason(reason: string | null): ScheduleAssignments {
    this.reason = reason;
    return this;
  }

  setActive(active: boolean): ScheduleAssignments {
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
   * Vérifie si l'assignment est pour un utilisateur
   */
  isForUser(): boolean {
    return this.family === 'user';
  }

  /**
   * Vérifie si l'assignment est pour une group
   */
  isForGroup(): boolean {
    return this.family === 'group';
  }

  /**
   * Vérifie si une date est couverte par cette assignment
   */
  coversDate(date: string): boolean {
    if (!this.start_date || !this.end_date) return false;
    return date >= this.start_date && date <= this.end_date;
  }

  /**
   * Calcule la durée de l'assignment en jours
   */
  getDurationInDays(): number {
    if (!this.start_date || !this.end_date) return 0;

    const start = new Date(this.start_date);
    const end = new Date(this.end_date);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Vérifie si l'assignment est dans le passé
   */
  isInPast(): boolean {
    if (!this.end_date) return false;
    const today = TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0];
    return this.end_date < today!;
  }

  /**
   * Vérifie si l'assignment est dans le futur
   */
  isInFuture(): boolean {
    if (!this.start_date) return false;
    const today = TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0];
    return this.start_date > today!;
  }

  /**
   * Vérifie si l'assignment est en cours
   */
  isCurrentlyActive(): boolean {
    if (!this.active) return false;
    const today = TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0];
    return this.coversDate(today!);
  }

  /**
   * Vérifie si l'assignment est pour un seul jour
   */
  isSingleDay(): boolean {
    return this.start_date === this.end_date;
  }

  hasReason(): boolean {
    return Boolean(this.reason && this.reason.trim().length > 0);
  }

  /**
   * Assigner un template à partir d'un SessionTemplate
   */
  async assignFromSessionTemplate(
    sessionTemplate: SessionTemplate,
    createdBy: number,
    reason?: string,
  ): Promise<void> {
    this.setSessionTemplate(SessionTemplate);
    this.setCreatedBy(createdBy);
    if (reason) {
      this.setReason(reason);
    }
  }

  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        await this.create();
      } else {
        const previousTemplate = this.session_template;
        const newTemplate = this.new_template;
        const previousVersion = this.version || this.initialVersion;

        const newVersion = previousVersion + this.initialVersion;
        const modifiedBy = this.created_by!;
        const createdBy = this.created_by!;
        const reason = this.reason ? this.reason : undefined;

        if (newTemplate) this.setSessionTemplate(newTemplate);

        await this.update();

        if (newTemplate)
          await this.logModification({
            previousTemplate,
            newTemplate,
            previousVersion,
            newVersion,
            modifiedBy,
            createdBy,
            modificationReason: reason,
          });
      }
    } catch (error: any) {
      throw new Error(error.message || error);
    }
  }

  /**
   * Mettre à jour le template et logger automatiquement
   */
  async updateSessionTemplate(
    newTemplate: any,
    modifiedBy: number,
    reason?: string,
  ): Promise<void> {
    if (this.isNew()) {
      throw new Error('Cannot update template on unsaved assignment');
    }

    const previousTemplate = this.session_template;
    const createdBy = this.created_by!;
    const previousVersion = this.version || this.initialVersion;

    const newVersion = previousVersion + this.initialVersion;
    this.setSessionTemplate(newTemplate);
    this.setVersion(newVersion);
    this.setCreatedBy(modifiedBy);

    await this.updateDefinition();

    await this.logModification({
      previousTemplate,
      newTemplate,
      previousVersion,
      newVersion,
      modifiedBy,
      createdBy,
      modificationReason: reason,
    });
  }

  // ============================================
  // CHARGEMENT ET LISTING
  // ============================================

  async load(identifier: any, byGuid: boolean = false): Promise<ScheduleAssignments | null> {
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
  ): Promise<ScheduleAssignments[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new ScheduleAssignments().hydrate(data));
  }

  async listByRelated(
    family: SAFamily,
    related: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignments[] | null> {
    const dataset = await this.listAllByRelated(family, related, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new ScheduleAssignments().hydrate(data));
  }

  async listByCreatedBy(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignments[] | null> {
    const dataset = await this.listAllByCreatedBy(manager, paginationOptions);
    console.log('dataset', dataset);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new ScheduleAssignments().hydrate(data));
  }

  async listByActiveStatus(
    isActive: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignments[] | null> {
    const dataset = await this.listAllByActiveStatus(isActive, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new ScheduleAssignments().hydrate(data));
  }

  async listByDateRange(
    startDate: string,
    endDate: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignments[] | null> {
    const dataset = await this.listAllByDateRange(startDate, endDate, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new ScheduleAssignments().hydrate(data));
  }

  async listForRelatedOnDate(
    family: SAFamily,
    related: string,
    date: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignments[] | null> {
    const dataset = await this.listAllForRelatedOnDate(family, related, date, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new ScheduleAssignments().hydrate(data));
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: ScheduleException Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  /**
   * Récupérer l'historique des modifications
   */
  async getHistory(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignmentsLog[] | null> {
    if (!this.id) return null;
    return await ScheduleAssignmentsLog._listByAssignment(this.id, paginationOptions);
  }

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const relatedObj = await this.getRelatedObj();
    const sessionTemplateObj = SessionTemplate.toObject(this.session_template);
    const createdByObj = await this.getCreatedByObj();

    const baseData = {
      [RS.GUID]: this.guid,
      [RS.TENANT]: this.tenant,
      [RS.FAMILY]: this.family,
      [RS.START_DATE]: this.start_date,
      [RS.END_DATE]: this.end_date,
      [RS.REASON]: this.reason,
      [RS.ACTIVE]: this.active,
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.RELATED]: relatedObj
          ? this.isForUser()
            ? (relatedObj as User).getGuid()
            : (relatedObj as Groups).getGuid()
          : null,
        [RS.SESSION_TEMPLATE]: sessionTemplateObj ? sessionTemplateObj.getGuid() : null,
        [RS.CREATED_BY]: createdByObj ? createdByObj.getGuid() : null,
      };
    }

    return {
      ...baseData,
      [RS.RELATED]: relatedObj
        ? this.isForUser()
          ? (relatedObj as User).toPublicJSON()
          : await (relatedObj as Groups).toPublicJSON()
        : null,
      [RS.SESSION_TEMPLATE]: sessionTemplateObj
        ? await sessionTemplateObj.toJSON(responseValue.FULL)
        : null,
      [RS.CREATED_BY]: createdByObj ? createdByObj.toPublicJSON() : null,
    };
  }

  async toPUBLIC(): Promise<object> {
    const sessionTemplateObj = SessionTemplate.toObject(this.session_template);
    const createdByObj = await this.getCreatedByObj();

    return {
      [RS.GUID]: this.guid,
      [RS.TENANT]: this.tenant,
      [RS.FAMILY]: this.family,
      [RS.RELATED]: this.related,
      [RS.START_DATE]: this.start_date,
      [RS.END_DATE]: this.end_date,
      [RS.REASON]: this.reason,
      [RS.ACTIVE]: this.active,
      [RS.SESSION_TEMPLATE]: sessionTemplateObj
        ? await sessionTemplateObj.toJSON(responseValue.FULL)
        : null,
      [RS.CREATED_BY]: createdByObj ? await createdByObj.toJSON() : null,
    };
  }

  toObject(data: any): ScheduleAssignments {
    return new ScheduleAssignments().hydrate(data);
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  private setVersion(version: number): ScheduleAssignments {
    this.version = version;
    return this;
  }

  private hydrate(data: any): ScheduleAssignments {
    this.id = data.id;
    this.guid = data.guid;
    this.tenant = data.tenant;
    this.family = data.family;
    this.related = data.related;
    this.session_template = data.session_template;
    this.version = data.version;
    this.start_date = data.start_date;
    this.end_date = data.end_date;
    this.created_by = data.created_by;
    this.reason = data.reason;
    this.active = data.active;
    this.deleted_at = data.deleted_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    return this;
  }

  /**
   * Logger une modification
   */
  private async logModification(params: {
    previousTemplate: any | null;
    newTemplate: any;
    previousVersion: number | null;
    newVersion: number;
    modifiedBy: number;
    createdBy: number;
    modificationReason?: string;
  }): Promise<void> {
    const log = new ScheduleAssignmentsLog()
      .setAssignmentId(this.id!)
      .setPreviousTemplate(params.previousTemplate)
      .setNewTemplate(params.newTemplate)
      .setPreviousVersion(params.previousVersion)
      .setNewVersion(params.newVersion)
      .setModifiedBy(params.modifiedBy)
      .setOldCreator(params.createdBy)
      .setModificationReason(params.modificationReason || null);

    if (params.previousTemplate && params.newTemplate) {
      const changedFields = this.computeChangedFields(params.previousTemplate, params.newTemplate);
      log.setChangedFields(changedFields);
    }

    await log.save();
  }

  /**
   * Calculer les différences entre deux templates
   */
  private computeChangedFields(oldTemplate: any, newTemplate: any): any {
    const changes: any = {};

    if (oldTemplate.name !== newTemplate.name) {
      changes.name = { old: oldTemplate.name, new: newTemplate.name };
    }

    if (JSON.stringify(oldTemplate.definition) !== JSON.stringify(newTemplate.definition)) {
      changes.definition_changed = true;

      const oldDays = Object.keys(oldTemplate.definition || {});
      const modifiedDays = oldDays.filter(
        (day) =>
          JSON.stringify(oldTemplate.definition[day]) !==
          JSON.stringify(newTemplate.definition[day]),
      );
      if (modifiedDays.length > 0) {
        changes.modified_days = modifiedDays;
      }
    }

    return changes;
  }
}
