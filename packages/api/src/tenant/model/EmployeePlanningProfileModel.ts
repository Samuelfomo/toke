import { TimezoneConfigUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export type EmployeePlanningMode = 'FIXED' | 'ROTATING' | 'EXCLUDED';
export type FixedRestDayMode = 'TEMPLATE' | 'ROTATING';

export default class EmployeePlanningProfileModel extends BaseModel {
  public readonly db = {
    tableName: tableName.EMPLOYEE_PLANNING_PROFILE,
    id: 'id',
    guid: 'guid',
    user: 'user',
    planning_mode: 'planning_mode',
    fixed_session_template: 'fixed_session_template',
    fixed_rest_day_mode: 'fixed_rest_day_mode',
    rotation_order: 'rotation_order',
    max_weekly_minutes: 'max_weekly_minutes',
    active: 'active',
    deleted_at: 'deleted_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  protected id?: number;
  protected guid?: string;
  protected user?: number;
  protected planning_mode: EmployeePlanningMode = 'ROTATING';
  protected fixed_session_template?: number | null;
  protected fixed_rest_day_mode: FixedRestDayMode = 'TEMPLATE';
  protected rotation_order?: number | null;
  protected max_weekly_minutes?: number | null;
  protected active: boolean = true;
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

  protected async findByUser(userId: number, activeOnly: boolean = true): Promise<any> {
    const conditions: Record<string, any> = {
      [this.db.user]: userId,
      [this.db.deleted_at]: null,
    };
    if (activeOnly) conditions[this.db.active] = true;
    return await this.findOne(this.db.tableName, conditions);
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

  protected async listAllActive(): Promise<any[]> {
    return await this.listAll({ [this.db.active]: true });
  }

  protected async listAllByMode(mode: EmployeePlanningMode): Promise<any[]> {
    return await this.listAll({
      [this.db.planning_mode]: mode,
      [this.db.active]: true,
    });
  }

  protected async create(): Promise<void> {
    this.validate();

    const existing = await this.findByUser(this.user!, true);
    if (existing) {
      throw new Error('An active planning profile already exists for this employee');
    }

    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error('GUID generation failed for EmployeePlanningProfile');
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.user]: this.user,
      [this.db.planning_mode]: this.planning_mode,
      [this.db.fixed_session_template]: this.fixed_session_template ?? null,
      [this.db.fixed_rest_day_mode]: this.fixed_rest_day_mode,
      [this.db.rotation_order]: this.rotation_order ?? null,
      [this.db.max_weekly_minutes]: this.max_weekly_minutes ?? null,
      [this.db.active]: this.active,
    });

    if (!lastID) throw new Error('EmployeePlanningProfile creation failed');

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    if (!this.id) throw new Error('ID required to update EmployeePlanningProfile');
    this.validate();

    const existing = await this.findByUser(this.user!, true);
    if (existing && existing.id !== this.id) {
      throw new Error('An active planning profile already exists for this employee');
    }

    const updated = await this.updateOne(
      this.db.tableName,
      {
        [this.db.user]: this.user,
        [this.db.planning_mode]: this.planning_mode,
        [this.db.fixed_session_template]: this.fixed_session_template ?? null,
        [this.db.fixed_rest_day_mode]: this.fixed_rest_day_mode,
        [this.db.rotation_order]: this.rotation_order ?? null,
        [this.db.max_weekly_minutes]: this.max_weekly_minutes ?? null,
        [this.db.active]: this.active,
      },
      { [this.db.id]: this.id },
    );

    if (!updated) throw new Error('EmployeePlanningProfile update failed');
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
    if (!this.user) throw new Error('user is required');

    if (this.planning_mode === 'FIXED' && !this.fixed_session_template) {
      throw new Error('fixed_session_template is required for a FIXED employee');
    }

    if (this.planning_mode !== 'FIXED' && this.fixed_session_template) {
      throw new Error('fixed_session_template is only allowed for a FIXED employee');
    }

    if (this.planning_mode !== 'FIXED' && this.fixed_rest_day_mode !== 'TEMPLATE') {
      throw new Error('fixed_rest_day_mode ROTATING is only allowed for a FIXED employee');
    }

    if (
      this.max_weekly_minutes !== null &&
      this.max_weekly_minutes !== undefined &&
      (this.max_weekly_minutes < 1 || this.max_weekly_minutes > 10080)
    ) {
      throw new Error('max_weekly_minutes must be between 1 and 10080');
    }

    if (
      this.rotation_order !== null &&
      this.rotation_order !== undefined &&
      this.rotation_order < 1
    ) {
      throw new Error('rotation_order must be a positive integer');
    }
  }
}
