import { TimezoneConfigUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

// ─────────────────────────────────────────────────────────────────────────────
// ScheduleSuggestionItemModel
// ─────────────────────────────────────────────────────────────────────────────

export default class ScheduleSuggestionItemModel extends BaseModel {
  public readonly db = {
    tableName: tableName.SCHEDULE_SUGGESTION_ITEM,
    id: 'id',
    guid: 'guid',
    suggestion: 'suggestion',
    user: 'user',
    schedule: 'schedule',
    reasons: 'reasons',
    deleted_at: 'deleted_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  // ── Propriétés ─────────────────────────────────────────────────────────────

  protected id?: number;
  protected guid?: string;
  protected suggestion?: number; // FK interne → schedule_suggestions.id
  protected user?: number; // FK interne → users.id
  // { Mon: templateGuid|null, Tue: templateGuid|null, ... }
  protected schedule?: Record<string, string | null>;
  // { Mon: { templateName, confidence, factors[] }, ... }
  protected reasons?: Record<string, any> | null;
  protected deleted_at?: Date | null;
  protected created_at?: Date;
  protected updated_at?: Date;

  protected constructor() {
    super();
  }

  // ── Recherche ──────────────────────────────────────────────────────────────

  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, {
      [this.db.id]: id,
      [this.db.deleted_at]: null,
    });
  }

  protected async findByGuid(guid: string): Promise<any> {
    return await this.findOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.deleted_at]: null,
    });
  }

  protected async findBySuggestionAndUser(suggestionId: number, userId: number): Promise<any> {
    return await this.findOne(this.db.tableName, {
      [this.db.suggestion]: suggestionId,
      [this.db.user]: userId,
      [this.db.deleted_at]: null,
    });
  }

  // ── Listage ────────────────────────────────────────────────────────────────

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    if (conditions[this.db.deleted_at] === undefined) {
      conditions[this.db.deleted_at] = null;
    }
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  protected async listAllBySuggestion(suggestionId: number): Promise<any[]> {
    return await this.listAll({ [this.db.suggestion]: suggestionId });
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  protected async create(): Promise<void> {
    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) throw new Error('GUID generation failed for ScheduleSuggestionItem');

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.suggestion]: this.suggestion,
      [this.db.user]: this.user,
      [this.db.schedule]: this.schedule,
      [this.db.reasons]: this.reasons ?? null,
    });

    if (!lastID) throw new Error('ScheduleSuggestionItem creation failed');

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async updateSchedule(
    schedule: Record<string, string | null>,
    reasons?: Record<string, any> | null,
  ): Promise<void> {
    if (!this.id) throw new Error('ID required to update ScheduleSuggestionItem');

    const updateData: Record<string, any> = {
      [this.db.schedule]: schedule,
    };
    if (reasons !== undefined) {
      updateData[this.db.reasons] = reasons ?? null;
    }

    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!updated) throw new Error('ScheduleSuggestionItem update failed');

    this.schedule = schedule;
    if (reasons !== undefined) this.reasons = reasons ?? null;
  }

  protected async trash(id: number): Promise<boolean> {
    const affected = await this.updateOne(
      this.db.tableName,
      { [this.db.deleted_at]: TimezoneConfigUtils.getCurrentTime() },
      { [this.db.id]: id },
    );
    return affected > 0;
  }
}
