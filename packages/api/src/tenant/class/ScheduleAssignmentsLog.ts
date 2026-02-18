import ScheduleAssignmentsLogModel from '../model/ScheduleAssignmentsLogModel.js';
import { responseStructure as RS, responseValue, ViewMode } from '../../utils/response.model.js';

export default class ScheduleAssignmentsLog extends ScheduleAssignmentsLogModel {
  constructor() {
    super();
  }

  // ============================================
  // MÉTHODES STATIQUES DE CHARGEMENT
  // ============================================

  static _load(identifier: any, byGuid: boolean = false): Promise<ScheduleAssignmentsLog | null> {
    return new ScheduleAssignmentsLog().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignmentsLog[] | null> {
    return new ScheduleAssignmentsLog().list(conditions, paginationOptions);
  }

  static _listByAssignment(
    assignmentId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignmentsLog[] | null> {
    return new ScheduleAssignmentsLog().listByAssignment(assignmentId, paginationOptions);
  }

  static _listByModifiedBy(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignmentsLog[] | null> {
    return new ScheduleAssignmentsLog().listByModifiedBy(userId, paginationOptions);
  }

  static _listByOldCreator(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignmentsLog[] | null> {
    return new ScheduleAssignmentsLog().listByOldCreator(userId, paginationOptions);
  }

  static async exportable(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<{
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    let items: any[] = [];
    const logs = await this._list(conditions, paginationOptions);
    if (logs) {
      items = await Promise.all(logs.map(async (log) => log.toJSON()));
    }
    return {
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

  getAssignmentId(): number | undefined {
    return this.assignment;
  }

  getPreviousTemplate(): any | null | undefined {
    return this.previous_template;
  }

  getNewTemplate(): any | undefined {
    return this.new_template;
  }

  getPreviousVersion(): number | null | undefined {
    return this.previous_version;
  }

  getNewVersion(): number | undefined {
    return this.new_version;
  }

  getModifiedBy(): number | undefined {
    return this.modified_by;
  }

  getOldCreator(): number | undefined {
    return this.old_creator;
  }

  getModificationReason(): string | null | undefined {
    return this.modification_reason;
  }

  getChangedFields(): any | null | undefined {
    return this.changed_fields;
  }

  getCreatedAt(): Date | undefined {
    return this.created_at;
  }

  // ============================================
  // SETTERS FLUENT
  // ============================================

  setAssignmentId(assignmentId: number): ScheduleAssignmentsLog {
    this.assignment = assignmentId;
    return this;
  }

  setPreviousTemplate(template: any | null): ScheduleAssignmentsLog {
    this.previous_template = template;
    return this;
  }

  setNewTemplate(template: any): ScheduleAssignmentsLog {
    this.new_template = template;
    return this;
  }

  setPreviousVersion(version: number | null): ScheduleAssignmentsLog {
    this.previous_version = version;
    return this;
  }

  setNewVersion(version: number): ScheduleAssignmentsLog {
    this.new_version = version;
    return this;
  }

  setModifiedBy(userId: number): ScheduleAssignmentsLog {
    this.modified_by = userId;
    return this;
  }

  setOldCreator(userId: number): ScheduleAssignmentsLog {
    this.old_creator = userId;
    return this;
  }

  setModificationReason(reason: string | null): ScheduleAssignmentsLog {
    this.modification_reason = reason;
    return this;
  }

  setChangedFields(fields: any | null): ScheduleAssignmentsLog {
    this.changed_fields = fields;
    return this;
  }

  // ============================================
  // MÉTHODES MÉTIER
  // ============================================

  isNew(): boolean {
    return this.id === undefined;
  }

  async save(): Promise<void> {
    try {
      if (!this.isNew()) {
        throw new Error('Logs cannot be updated, only created');
      }
      await this.create();
    } catch (error: any) {
      throw new Error(error.message || error);
    }
  }

  // ============================================
  // CHARGEMENT ET LISTING
  // ============================================

  async load(identifier: any, byGuid: boolean = false): Promise<ScheduleAssignmentsLog | null> {
    const data = byGuid ? await this.findByGuid(identifier) : await this.find(Number(identifier));

    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignmentsLog[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new ScheduleAssignmentsLog().hydrate(data));
  }

  async listByAssignment(
    assignmentId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignmentsLog[] | null> {
    const dataset = await this.listAllByAssignment(assignmentId, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new ScheduleAssignmentsLog().hydrate(data));
  }

  async listByModifiedBy(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignmentsLog[] | null> {
    const dataset = await this.listAllByModifiedBy(userId, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new ScheduleAssignmentsLog().hydrate(data));
  }

  async listByOldCreator(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ScheduleAssignmentsLog[] | null> {
    const dataset = await this.listAllByOldCreator(userId, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new ScheduleAssignmentsLog().hydrate(data));
  }

  toJSON(view: ViewMode = responseValue.FULL): object {
    const baseData = {
      [RS.GUID]: this.guid,
      [RS.ASSIGNMENT]: this.assignment,
      [RS.PREVIOUS_TEMPLATE]: this.previous_template,
      [RS.NEW_TEMPLATE]: this.new_template,
      [RS.PREVIOUS_VERSION]: this.previous_version,
      [RS.NEW_VERSION]: this.new_version,
      [RS.MODIFIED_BY]: this.modified_by,
      [RS.OLD_CREATOR]: this.old_creator,
      [RS.MODIFICATION_REASON]: this.modification_reason,
      [RS.CHANGED_FIELDS]: this.changed_fields,
      [RS.CREATED_AT]: this.created_at,
    };

    if (view === responseValue.MINIMAL) {
      return {
        [RS.GUID]: this.guid,
        [RS.NEW_VERSION]: this.new_version,
        [RS.CREATED_AT]: this.created_at,
      };
    }

    return baseData;
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  private hydrate(data: any): ScheduleAssignmentsLog {
    this.id = data.id;
    this.guid = data.guid;
    this.assignment = data.assignment;
    this.previous_template = data.previous_template;
    this.new_template = data.new_template;
    this.previous_version = data.previous_version;
    this.new_version = data.new_version;
    this.modified_by = data.modified_by;
    this.old_creator = data.old_creator;
    this.modification_reason = data.modification_reason;
    this.changed_fields = data.changed_fields;
    this.created_at = data.created_at;
    return this;
  }
}
