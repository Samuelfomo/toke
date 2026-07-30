import { TimezoneConfigUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export type PlanningSolverType = 'GREEDY' | 'ORTOOLS';

export default class PlanningSuggestionConfigModel extends BaseModel {
  public readonly db = {
    tableName: tableName.PLANNING_SUGGESTION_CONFIG,
    id: 'id',
    guid: 'guid',
    name: 'name',
    version: 'version',
    active: 'active',
    min_rest_days_per_week: 'min_rest_days_per_week',
    max_consecutive_work_days: 'max_consecutive_work_days',
    max_weekly_minutes: 'max_weekly_minutes',
    min_rest_minutes_between_shifts: 'min_rest_minutes_between_shifts',
    max_consecutive_guards: 'max_consecutive_guards',
    rest_after_guard_required: 'rest_after_guard_required',
    post_guard_rest_days: 'post_guard_rest_days',
    max_resting_employees_per_day: 'max_resting_employees_per_day',
    fairness_window_weeks: 'fairness_window_weeks',
    strict_coverage: 'strict_coverage',
    solver_type: 'solver_type',
    solver_timeout_seconds: 'solver_timeout_seconds',
    fallback_to_greedy: 'fallback_to_greedy',
    created_by: 'created_by',
    deleted_at: 'deleted_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  protected id?: number;
  protected guid?: string;
  protected name?: string;
  protected version: number = 1;
  protected active: boolean = false;
  protected min_rest_days_per_week: number = 1;
  protected max_consecutive_work_days: number = 6;
  protected max_weekly_minutes?: number | null;
  protected min_rest_minutes_between_shifts: number = 660;
  protected max_consecutive_guards: number = 1;
  protected rest_after_guard_required: boolean = true;
  protected post_guard_rest_days: number = 0;
  protected max_resting_employees_per_day?: number | null;
  protected fairness_window_weeks: number = 8;
  protected strict_coverage: boolean = true;
  protected solver_type: PlanningSolverType = 'GREEDY';
  protected solver_timeout_seconds: number = 20;
  protected fallback_to_greedy: boolean = true;
  protected created_by?: number;
  protected deleted_at?: Date | null;
  protected created_at?: Date;
  protected updated_at?: Date;

  protected constructor() {
    super();
  }

  protected async find(id: number, includeDeleted: boolean = false): Promise<any> {
    const conditions: Record<string, any> = { [this.db.id]: id };
    if (!includeDeleted) conditions[this.db.deleted_at] = null;
    return await this.findOne(this.db.tableName, conditions);
  }

  protected async findByGuid(guid: string, includeDeleted: boolean = false): Promise<any> {
    const conditions: Record<string, any> = { [this.db.guid]: guid };
    if (!includeDeleted) conditions[this.db.deleted_at] = null;
    return await this.findOne(this.db.tableName, conditions);
  }

  protected async findActive(): Promise<any> {
    return await this.findOne(this.db.tableName, {
      [this.db.active]: true,
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

  protected async create(): Promise<void> {
    this.validate();

    if (this.active) {
      const currentActive = await this.findActive();
      if (currentActive) {
        throw new Error('An active planning suggestion configuration already exists');
      }
    }

    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error('GUID generation failed for PlanningSuggestionConfig');
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.name]: this.name,
      [this.db.version]: this.version,
      [this.db.active]: this.active,
      [this.db.min_rest_days_per_week]: this.min_rest_days_per_week,
      [this.db.max_consecutive_work_days]: this.max_consecutive_work_days,
      [this.db.max_weekly_minutes]: this.max_weekly_minutes ?? null,
      [this.db.min_rest_minutes_between_shifts]: this.min_rest_minutes_between_shifts,
      [this.db.max_consecutive_guards]: this.max_consecutive_guards,
      [this.db.rest_after_guard_required]: this.rest_after_guard_required,
      [this.db.post_guard_rest_days]: this.post_guard_rest_days,
      [this.db.max_resting_employees_per_day]: this.max_resting_employees_per_day ?? null,
      [this.db.fairness_window_weeks]: this.fairness_window_weeks,
      [this.db.strict_coverage]: this.strict_coverage,
      [this.db.solver_type]: this.solver_type,
      [this.db.solver_timeout_seconds]: this.solver_timeout_seconds,
      [this.db.fallback_to_greedy]: this.fallback_to_greedy,
      [this.db.created_by]: this.created_by,
    });

    if (!lastID) throw new Error('PlanningSuggestionConfig creation failed');

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    if (!this.id) throw new Error('ID required to update PlanningSuggestionConfig');
    this.validate();

    if (this.active) {
      const currentActive = await this.findActive();
      if (currentActive && currentActive.id !== this.id) {
        throw new Error('An active planning suggestion configuration already exists');
      }
    }

    const current = await this.find(this.id);
    if (!current) throw new Error('PlanningSuggestionConfig not found');

    this.version = (current.version ?? 1) + 1;

    const updated = await this.updateOne(
      this.db.tableName,
      {
        [this.db.name]: this.name,
        [this.db.version]: this.version,
        [this.db.active]: this.active,
        [this.db.min_rest_days_per_week]: this.min_rest_days_per_week,
        [this.db.max_consecutive_work_days]: this.max_consecutive_work_days,
        [this.db.max_weekly_minutes]: this.max_weekly_minutes ?? null,
        [this.db.min_rest_minutes_between_shifts]: this.min_rest_minutes_between_shifts,
        [this.db.max_consecutive_guards]: this.max_consecutive_guards,
        [this.db.rest_after_guard_required]: this.rest_after_guard_required,
        [this.db.post_guard_rest_days]: this.post_guard_rest_days,
        [this.db.max_resting_employees_per_day]: this.max_resting_employees_per_day ?? null,
        [this.db.fairness_window_weeks]: this.fairness_window_weeks,
        [this.db.strict_coverage]: this.strict_coverage,
        [this.db.solver_type]: this.solver_type,
        [this.db.solver_timeout_seconds]: this.solver_timeout_seconds,
        [this.db.fallback_to_greedy]: this.fallback_to_greedy,
      },
      { [this.db.id]: this.id },
    );

    if (!updated) throw new Error('PlanningSuggestionConfig update failed');
  }

  protected async updateActive(active: boolean): Promise<void> {
    if (!this.id) throw new Error('ID required to change configuration status');

    if (active) {
      const currentActive = await this.findActive();
      if (currentActive && currentActive.id !== this.id) {
        throw new Error('An active planning suggestion configuration already exists');
      }
    }

    const updated = await this.updateOne(
      this.db.tableName,
      { [this.db.active]: active },
      { [this.db.id]: this.id },
    );

    if (!updated) throw new Error('PlanningSuggestionConfig status update failed');
    this.active = active;
  }

  protected async trash(id: number): Promise<boolean> {
    const affected = await this.updateOne(
      this.db.tableName,
      {
        [this.db.active]: false,
        [this.db.deleted_at]: TimezoneConfigUtils.getCurrentTime(),
      },
      { [this.db.id]: id },
    );
    return affected > 0;
  }

  private validate(): void {
    if (!this.name?.trim()) throw new Error('Configuration name is required');
    if (!this.created_by) throw new Error('created_by is required');
    if (this.min_rest_days_per_week < 0 || this.min_rest_days_per_week > 7) {
      throw new Error('min_rest_days_per_week must be between 0 and 7');
    }
    if (this.max_consecutive_work_days < 1) {
      throw new Error('max_consecutive_work_days must be greater than 0');
    }
    if (this.max_weekly_minutes !== null && this.max_weekly_minutes !== undefined) {
      if (this.max_weekly_minutes < 1 || this.max_weekly_minutes > 10080) {
        throw new Error('max_weekly_minutes must be between 1 and 10080');
      }
    }
    if (this.min_rest_minutes_between_shifts < 0) {
      throw new Error('min_rest_minutes_between_shifts cannot be negative');
    }
    if (this.max_consecutive_guards < 0) {
      throw new Error('max_consecutive_guards cannot be negative');
    }
    if (this.post_guard_rest_days < 0 || this.post_guard_rest_days > 31) {
      throw new Error('post_guard_rest_days must be between 0 and 31');
    }
    if (
      this.max_resting_employees_per_day !== null &&
      this.max_resting_employees_per_day !== undefined &&
      this.max_resting_employees_per_day < 1
    ) {
      throw new Error('max_resting_employees_per_day must be greater than 0');
    }
    if (this.fairness_window_weeks < 1 || this.fairness_window_weeks > 52) {
      throw new Error('fairness_window_weeks must be between 1 and 52');
    }
    if (!['GREEDY', 'ORTOOLS'].includes(this.solver_type)) {
      throw new Error('solver_type must be GREEDY or ORTOOLS');
    }
    if (this.solver_timeout_seconds < 1 || this.solver_timeout_seconds > 300) {
      throw new Error('solver_timeout_seconds must be between 1 and 300');
    }
  }
}
