import { TimezoneConfigUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export class SessionModelModel extends BaseModel {
  public readonly db = {
    tableName: tableName.SESSION_MODEL,
    id: 'id',
    guid: 'guid',
    name: 'name',
    workday: 'workday',
    max_working_time: 'max_working_time',
    min_working_time: 'min_working_time',
    normal_session_time: 'normal_session_time',
    allowed_tolerance: 'allowed_tolerance',
    pause_allowed: 'pause_allowed',
    pause_duration: 'pause_duration',
    pause_count: 'pause_count',
    rotation_allowed: 'rotation_allowed',
    extra_allowed: 'extra_allowed',
    extra_max: 'extra_max',
    early_leave_allowed: 'early_leave_allowed',
    leave_eligibility_after_session: 'leave_eligibility_after_session',
    leave_is_optional: 'leave_is_optional',
    created_by: 'created_by',
    active: 'active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    deleted_at: 'deleted_at',
  } as const;

  protected id?: number;
  protected guid?: string;
  protected name?: string;
  protected workday?: string[];
  protected max_working_time?: number;
  protected min_working_time?: number;
  protected normal_session_time?: number;
  protected allowed_tolerance?: number;
  protected pause_allowed?: boolean;
  protected pause_duration?: number;
  protected pause_count?: number;
  protected rotation_allowed?: boolean;
  protected extra_allowed?: boolean;
  protected extra_max?: number;
  protected early_leave_allowed?: boolean;
  protected leave_eligibility_after_session?: number;
  protected leave_is_optional?: boolean;
  protected created_by?: number;
  protected active: boolean = true;
  protected created_at?: Date;
  protected updated_at?: Date;
  protected deleted_at?: Date;

  protected constructor() {
    super();
  }

  protected async findByAttribute(attribute: string, value: any): Promise<any> {
    return await this.findOne(this.db.tableName, { [attribute]: value });
  }

  protected async find(id: number): Promise<any> {
    return await this.findByAttribute(this.db.id, id);
  }
  protected async findByGuid(guid: string): Promise<any> {
    return await this.findByAttribute(this.db.guid, guid);
  }

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  protected async listAllByCreated(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.created_by]: manager }, paginationOptions);
  }

  protected async listAllPauseAllowed(
    pause_allowed: boolean = true,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.pause_allowed]: pause_allowed }, paginationOptions);
  }

  protected async listAllRotationAllowed(
    rotation_allowed: boolean = true,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.rotation_allowed]: rotation_allowed }, paginationOptions);
  }

  protected async listAllEarlyLeaveAllowed(
    early_leave_allowed: boolean = true,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.early_leave_allowed]: early_leave_allowed },
      paginationOptions,
    );
  }

  protected async create(): Promise<void> {
    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error('Failed to generate GUID for Session');
    }
    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.name]: this.name,
      [this.db.workday]: this.workday,
      [this.db.max_working_time]: this.max_working_time,
      [this.db.min_working_time]: this.min_working_time,
      [this.db.normal_session_time]: this.normal_session_time,
      [this.db.allowed_tolerance]: this.allowed_tolerance,
      [this.db.pause_allowed]: this.pause_allowed,
      [this.db.pause_duration]: this.pause_duration,
      [this.db.pause_count]: this.pause_count,
      [this.db.rotation_allowed]: this.rotation_allowed,
      [this.db.extra_allowed]: this.extra_allowed,
      [this.db.extra_max]: this.extra_max,
      [this.db.early_leave_allowed]: this.early_leave_allowed,
      [this.db.leave_eligibility_after_session]: this.leave_eligibility_after_session,
      [this.db.leave_is_optional]: this.leave_is_optional,
      [this.db.created_by]: this.created_by,
    });

    if (!lastID) {
      throw new Error('Failed to create Session');
    }
    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    const updateData: Record<string, any> = {};
    if (this.name !== undefined) {
      updateData[this.db.name] = this.name;
    }
    if (this.workday !== undefined) updateData[this.db.workday] = this.workday;
    if (this.max_working_time !== undefined) {
      updateData[this.db.max_working_time] = this.max_working_time;
    }
    if (this.min_working_time !== undefined) {
      updateData[this.db.min_working_time] = this.min_working_time;
    }
    if (this.normal_session_time !== undefined) {
      updateData[this.db.normal_session_time] = this.normal_session_time;
    }
    if (this.allowed_tolerance !== undefined) {
      updateData[this.db.allowed_tolerance] = this.allowed_tolerance;
    }
    if (this.pause_allowed !== undefined) {
      updateData[this.db.pause_allowed] = this.pause_allowed;
    }
    if (this.pause_duration !== undefined) {
      updateData[this.db.pause_duration] = this.pause_duration;
    }
    if (this.pause_count !== undefined) {
      updateData[this.db.pause_count] = this.pause_count;
    }
    if (this.rotation_allowed !== undefined) {
      updateData[this.db.rotation_allowed] = this.rotation_allowed;
    }
    if (this.extra_allowed !== undefined) {
      updateData[this.db.extra_allowed] = this.extra_allowed;
    }
    if (this.extra_max !== undefined) {
      updateData[this.db.extra_max] = this.extra_max;
    }
    if (this.early_leave_allowed !== undefined) {
      updateData[this.db.early_leave_allowed] = this.early_leave_allowed;
    }
    if (this.leave_eligibility_after_session !== undefined) {
      updateData[this.db.leave_eligibility_after_session] = this.leave_eligibility_after_session;
    }
    if (this.leave_is_optional !== undefined) {
      updateData[this.db.leave_is_optional] = this.leave_is_optional;
    }
    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update Session');
    }
  }

  protected async trash(id: number): Promise<boolean> {
    const affected = await this.updateOne(
      this.db.tableName,
      {
        [this.db.deleted_at]: TimezoneConfigUtils.getCurrentTime(),
        [this.db.active]: false,
      },
      { [this.db.id]: id },
    );

    return affected > 0;
  }

  protected async restore(id: number): Promise<boolean> {
    const affected = await this.updateOne(
      this.db.tableName,
      {
        [this.db.deleted_at]: null,
        [this.db.active]: true,
      },
      { [this.db.id]: id },
      { paranoid: false },
    );

    return affected > 0;
  }

  private async validate(): Promise<void> {
    if (!this.name) {
      throw new Error('Session name is required');
    }
    if (!this.created_by) {
      throw new Error('Session created by is required');
    }
  }
}
