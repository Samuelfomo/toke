import RotationAssignmentLogModel from '../model/RotationAssignmentLogModel.js';
import { responseStructure as RS, responseValue, ViewMode } from '../../utils/response.model.js';

export default class RotationAssignmentLog extends RotationAssignmentLogModel {
  constructor() {
    super();
  }

  // ============================================
  // MÉTHODES STATIQUES DE CHARGEMENT
  // ============================================

  static _load(identifier: any, byGuid: boolean = false): Promise<RotationAssignmentLog | null> {
    return new RotationAssignmentLog().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignmentLog[] | null> {
    return new RotationAssignmentLog().list(conditions, paginationOptions);
  }

  static _listByAssignment(
    rotationAssignmentId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignmentLog[] | null> {
    return new RotationAssignmentLog().listByAssignment(rotationAssignmentId, paginationOptions);
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
      items = logs.map((log) => log.toJSON());
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

  getRotationAssignment(): number | undefined {
    return this.rotation_assignment;
  }

  getPreviousOffset(): number | undefined {
    return this.previous_offset;
  }

  getNewOffset(): number | undefined {
    return this.new_offset;
  }

  getCycleLength(): number | undefined {
    return this.cycle_length;
  }

  getExecutedAt(): Date | undefined {
    return this.executed_at;
  }

  // ============================================
  // SETTERS FLUENT
  // ============================================

  setRotationAssignment(rotationAssignmentId: number): RotationAssignmentLog {
    this.rotation_assignment = rotationAssignmentId;
    return this;
  }

  setPreviousOffset(offset: number): RotationAssignmentLog {
    this.previous_offset = offset;
    return this;
  }

  setNewOffset(offset: number): RotationAssignmentLog {
    this.new_offset = offset;
    return this;
  }

  setCycleLength(cycleLength: number): RotationAssignmentLog {
    this.cycle_length = cycleLength;
    return this;
  }

  setExecutedAt(date: Date): RotationAssignmentLog {
    this.executed_at = date;
    return this;
  }

  // ============================================
  // MÉTHODES MÉTIER
  // ============================================

  isNew(): boolean {
    return this.id === undefined;
  }

  /**
   * Enregistre ce log. Les logs sont immuables : une fois créés, ils ne peuvent plus être modifiés.
   */
  async save(): Promise<void> {
    if (!this.isNew()) {
      throw new Error('RotationAssignmentLog is immutable: cannot update an existing log entry.');
    }
    await this.create();
  }

  // ============================================
  // CHARGEMENT ET LISTING
  // ============================================

  async load(identifier: any, byGuid: boolean = false): Promise<RotationAssignmentLog | null> {
    const data = byGuid ? await this.findByGuid(identifier) : await this.find(Number(identifier));

    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignmentLog[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new RotationAssignmentLog().hydrate(data));
  }

  async listByAssignment(
    rotationAssignmentId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignmentLog[] | null> {
    const dataset = await this.listAllByAssignment(rotationAssignmentId, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new RotationAssignmentLog().hydrate(data));
  }

  toJSON(view: ViewMode = responseValue.FULL): object {
    if (view === responseValue.MINIMAL) {
      return {
        [RS.GUID]: this.guid,
        [RS.NEW_OFFSET]: this.new_offset,
        [RS.EXECUTED_AT]: this.executed_at,
      };
    }

    return {
      [RS.GUID]: this.guid,
      [RS.ROTATION_ASSIGNMENT]: this.rotation_assignment,
      [RS.PREVIOUS_OFFSET]: this.previous_offset,
      [RS.NEW_OFFSET]: this.new_offset,
      [RS.CYCLE_LENGTH]: this.cycle_length,
      [RS.EXECUTED_AT]: this.executed_at,
    };
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  private hydrate(data: any): RotationAssignmentLog {
    this.id = data.id;
    this.guid = data.guid;
    this.rotation_assignment = data.rotation_assignment;
    this.previous_offset = data.previous_offset;
    this.new_offset = data.new_offset;
    this.cycle_length = data.cycle_length;
    this.executed_at = data.executed_at;
    return this;
  }
}
