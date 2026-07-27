import { TimezoneConfigUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export type SuggestionStatus = 'draft' | 'approved' | 'rejected';

export default class ScheduleSuggestionModel extends BaseModel {
  public readonly db = {
    tableName: tableName.SCHEDULE_SUGGESTION,
    id: 'id',
    guid: 'guid',
    tenant: 'tenant',
    manager: 'manager',
    config: 'config',
    engine_version: 'engine_version',
    period_from: 'period_from',
    period_to: 'period_to',
    history_weeks: 'history_weeks',
    conformity_score: 'conformity_score',
    diagnostics: 'diagnostics',
    status: 'status',
    approved_at: 'approved_at',
    rejected_at: 'rejected_at',
    deleted_at: 'deleted_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  protected id?: number;
  protected guid?: string;
  protected tenant?: string;
  protected manager?: number;
  protected config?: number | null;
  protected engine_version: string = 'historical-v1.5';
  protected period_from?: string;
  protected period_to?: string;
  protected history_weeks: number = 8;
  protected conformity_score?: number | null;
  protected diagnostics?: Record<string, any> | null;
  protected status: SuggestionStatus = 'draft';
  protected approved_at?: Date | null;
  protected rejected_at?: Date | null;
  protected deleted_at?: Date | null;
  protected created_at?: Date;
  protected updated_at?: Date;

  protected constructor() {
    super();
  }

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

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    if (conditions[this.db.deleted_at] === undefined) {
      conditions[this.db.deleted_at] = null;
    }
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  protected async listAllByManager(
    managerId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.manager]: managerId }, paginationOptions);
  }

  protected async listAllByStatus(
    status: SuggestionStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.status]: status }, paginationOptions);
  }

  protected async create(): Promise<void> {
    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error('GUID generation failed for ScheduleSuggestion');
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.tenant]: this.tenant,
      [this.db.manager]: this.manager,
      [this.db.config]: this.config ?? null,
      [this.db.engine_version]: this.engine_version,
      [this.db.period_from]: this.period_from,
      [this.db.period_to]: this.period_to,
      [this.db.history_weeks]: this.history_weeks,
      [this.db.conformity_score]: this.conformity_score ?? null,
      [this.db.diagnostics]: this.diagnostics ?? null,
      [this.db.status]: this.status,
      [this.db.approved_at]: null,
      [this.db.rejected_at]: null,
    });

    if (!lastID) throw new Error('ScheduleSuggestion creation failed');

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async updateStatus(
    status: SuggestionStatus,
    timestampField?: 'approved_at' | 'rejected_at',
  ): Promise<void> {
    if (!this.id) {
      throw new Error('ID required to update ScheduleSuggestion status');
    }

    const updateData: Record<string, any> = {
      [this.db.status]: status,
    };

    if (timestampField) {
      updateData[timestampField] = TimezoneConfigUtils.getCurrentTime();
    }

    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });

    if (!updated) {
      throw new Error('ScheduleSuggestion status update failed');
    }

    this.status = status;

    if (timestampField === 'approved_at') {
      this.approved_at = updateData[timestampField];
    }
    if (timestampField === 'rejected_at') {
      this.rejected_at = updateData[timestampField];
    }
  }

  protected async updateConformityScore(score: number): Promise<void> {
    if (!this.id) throw new Error('ID required');

    await this.updateOne(
      this.db.tableName,
      { [this.db.conformity_score]: score },
      { [this.db.id]: this.id },
    );

    this.conformity_score = score;
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
