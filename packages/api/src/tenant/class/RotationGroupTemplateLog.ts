import RotationGroupTemplateLogModel from '../model/RotationGroupTemplateLogModel.js';
import { RotationTemplateSnapshot } from '../model/RotationGroupTemplateModel.js';
import { responseStructure as RS, responseValue, ViewMode } from '../../utils/response.model.js';

export default class RotationGroupTemplateLog extends RotationGroupTemplateLogModel {
  constructor() {
    super();
  }

  // ============================================
  // MÉTHODES STATIQUES DE CHARGEMENT
  // ============================================

  static _load(identifier: any, byGuid: boolean = false): Promise<RotationGroupTemplateLog | null> {
    return new RotationGroupTemplateLog().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroupTemplateLog[] | null> {
    return new RotationGroupTemplateLog().list(conditions, paginationOptions);
  }

  static _listByTemplate(
    rotationGroupTemplateId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroupTemplateLog[] | null> {
    return new RotationGroupTemplateLog().listByTemplate(
      rotationGroupTemplateId,
      paginationOptions,
    );
  }

  static _listByModifiedBy(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroupTemplateLog[] | null> {
    return new RotationGroupTemplateLog().listByModifiedBy(userId, paginationOptions);
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
    if (logs) items = logs.map((log) => log.toJSON());
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
  getRotationGroupTemplate(): number | undefined {
    return this.rotation_group_template;
  }
  getPosition(): number | undefined {
    return this.position;
  }
  getPreviousSnapshot(): RotationTemplateSnapshot | null | undefined {
    return this.previous_snapshot;
  }
  getNewSnapshot(): RotationTemplateSnapshot | undefined {
    return this.new_snapshot;
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
  getModificationReason(): string | null | undefined {
    return this.modification_reason;
  }
  getChangedFields(): any | null | undefined {
    return this.changed_fields;
  }
  getExecutedAt(): Date | undefined {
    return this.executed_at;
  }

  // ============================================
  // SETTERS FLUENT
  // ============================================

  setRotationGroupTemplate(id: number): RotationGroupTemplateLog {
    this.rotation_group_template = id;
    return this;
  }

  setPosition(position: number): RotationGroupTemplateLog {
    this.position = position;
    return this;
  }

  setPreviousSnapshot(snapshot: RotationTemplateSnapshot | null): RotationGroupTemplateLog {
    this.previous_snapshot = snapshot;
    return this;
  }

  setNewSnapshot(snapshot: RotationTemplateSnapshot): RotationGroupTemplateLog {
    this.new_snapshot = snapshot;
    return this;
  }

  setPreviousVersion(version: number | null): RotationGroupTemplateLog {
    this.previous_version = version;
    return this;
  }

  setNewVersion(version: number): RotationGroupTemplateLog {
    this.new_version = version;
    return this;
  }

  setModifiedBy(userId: number): RotationGroupTemplateLog {
    this.modified_by = userId;
    return this;
  }

  setModificationReason(reason: string | null): RotationGroupTemplateLog {
    this.modification_reason = reason;
    return this;
  }

  setChangedFields(fields: any | null): RotationGroupTemplateLog {
    this.changed_fields = fields;
    return this;
  }

  setExecutedAt(date: Date): RotationGroupTemplateLog {
    this.executed_at = date;
    return this;
  }

  // ============================================
  // MÉTHODES MÉTIER
  // ============================================

  isNew(): boolean {
    return this.id === undefined;
  }

  /** Les logs sont immuables — seule la création est autorisée. */
  async save(): Promise<void> {
    if (!this.isNew()) {
      throw new Error(
        'RotationGroupTemplateLog is immutable: cannot update an existing log entry.',
      );
    }
    await this.create();
  }

  // ============================================
  // CHARGEMENT ET LISTING
  // ============================================

  async load(identifier: any, byGuid: boolean = false): Promise<RotationGroupTemplateLog | null> {
    const data = byGuid ? await this.findByGuid(identifier) : await this.find(Number(identifier));

    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroupTemplateLog[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new RotationGroupTemplateLog().hydrate(data));
  }

  async listByTemplate(
    rotationGroupTemplateId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroupTemplateLog[] | null> {
    const dataset = await this.listAllByTemplate(rotationGroupTemplateId, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new RotationGroupTemplateLog().hydrate(data));
  }

  async listByModifiedBy(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroupTemplateLog[] | null> {
    const dataset = await this.listAllByModifiedBy(userId, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new RotationGroupTemplateLog().hydrate(data));
  }

  toJSON(view: ViewMode = responseValue.FULL): object {
    if (view === responseValue.MINIMAL) {
      return {
        [RS.GUID]: this.guid,
        [RS.POSITION]: this.position,
        [RS.NEW_VERSION]: this.new_version,
        [RS.EXECUTED_AT]: this.executed_at,
      };
    }

    return {
      [RS.GUID]: this.guid,
      [RS.ROTATION_GROUP_TEMPLATE]: this.rotation_group_template,
      [RS.POSITION]: this.position,
      [RS.PREVIOUS_SNAPSHOT]: this.previous_snapshot,
      [RS.NEW_SNAPSHOT]: this.new_snapshot,
      [RS.PREVIOUS_VERSION]: this.previous_version,
      [RS.NEW_VERSION]: this.new_version,
      [RS.MODIFIED_BY]: this.modified_by,
      [RS.MODIFICATION_REASON]: this.modification_reason,
      [RS.CHANGED_FIELDS]: this.changed_fields,
      [RS.EXECUTED_AT]: this.executed_at,
    };
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  private hydrate(data: any): RotationGroupTemplateLog {
    this.id = data.id;
    this.guid = data.guid;
    this.rotation_group_template = data.rotation_group_template;
    this.position = data.position;
    this.previous_snapshot = data.previous_snapshot;
    this.new_snapshot = data.new_snapshot;
    this.previous_version = data.previous_version;
    this.new_version = data.new_version;
    this.modified_by = data.modified_by;
    this.modification_reason = data.modification_reason;
    this.changed_fields = data.changed_fields;
    this.executed_at = data.executed_at;
    return this;
  }
}
