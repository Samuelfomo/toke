// import { TimezoneConfigUtils } from '@toke/shared';
//
// import BaseModel from '../database/db.base.js';
// import { tableName } from '../../utils/response.model.js';
//
// export type PlanningDayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
//
// export type PlanningServiceType = 'STANDARD' | 'GUARD';
//
// export type PlanningRequirementPlanningMode = 'FIXED' | 'ROTATING';
// export type PlanningRequirementGuardPoolRelation = 'ANY' | 'MEMBER' | 'NON_MEMBER';
// export interface PlanningRequirementEligibilityPolicy {
//   planning_modes: PlanningRequirementPlanningMode[];
//   guard_pool_relation: PlanningRequirementGuardPoolRelation;
// }
//
// export type PlanningAllocationMode = 'EXACT' | 'RANGE' | 'FILL_REMAINING';
//
// export default class PlanningSuggestionRequirementModel extends BaseModel {
//   public readonly db = {
//     tableName: tableName.PLANNING_SUGGESTION_REQUIREMENT,
//     id: 'id',
//     guid: 'guid',
//     config: 'config',
//     session_template: 'session_template',
//     continuation_template: 'continuation_template',
//     continuation_day_offset: 'continuation_day_offset',
//     day_of_week: 'day_of_week',
//     service_type: 'service_type',
//     allocation_mode: 'allocation_mode',
//     min_employees: 'min_employees',
//     target_employees: 'target_employees',
//     max_employees: 'max_employees',
//     credited_minutes: 'credited_minutes',
//     priority: 'priority',
//     active: 'active',
//     eligibility_policy: 'eligibility_policy',
//     deleted_at: 'deleted_at',
//     created_at: 'created_at',
//     updated_at: 'updated_at',
//   } as const;
//
//   protected id?: number;
//   protected guid?: string;
//   protected config?: number;
//   protected session_template?: number;
//   protected continuation_template?: number | null;
//   protected continuation_day_offset: number = 0;
//   protected day_of_week?: PlanningDayKey;
//   protected service_type: PlanningServiceType = 'STANDARD';
//   protected allocation_mode: PlanningAllocationMode = 'RANGE';
//   protected min_employees: number = 0;
//   protected target_employees: number = 0;
//   protected max_employees?: number | null;
//   protected credited_minutes?: number | null;
//   protected priority: number = 100;
//   protected active: boolean = true;
//   protected eligibility_policy: PlanningRequirementEligibilityPolicy = {
//     planning_modes: ['FIXED', 'ROTATING'],
//     guard_pool_relation: 'ANY',
//   };
//   protected deleted_at?: Date | null;
//   protected created_at?: Date;
//   protected updated_at?: Date;
//
//   protected constructor() {
//     super();
//   }
//
//   protected async find(id: number, includeDeleted: boolean = false): Promise<any> {
//     const conditions: Record<string, any> = {
//       [this.db.id]: id,
//     };
//
//     if (!includeDeleted) {
//       conditions[this.db.deleted_at] = null;
//     }
//
//     return await this.findOne(this.db.tableName, conditions);
//   }
//
//   protected async findByGuid(guid: string, includeDeleted: boolean = false): Promise<any> {
//     const conditions: Record<string, any> = {
//       [this.db.guid]: guid,
//     };
//
//     if (!includeDeleted) {
//       conditions[this.db.deleted_at] = null;
//     }
//
//     return await this.findOne(this.db.tableName, conditions);
//   }
//
//   protected async findBySlot(
//     configId: number,
//     dayOfWeek: PlanningDayKey,
//     sessionTemplateId: number,
//     eligibilityPolicy: PlanningRequirementEligibilityPolicy,
//   ): Promise<any> {
//     const candidates =
//       (await this.findAll(this.db.tableName, {
//         [this.db.config]: configId,
//         [this.db.day_of_week]: dayOfWeek,
//         [this.db.session_template]: sessionTemplateId,
//         [this.db.active]: true,
//         [this.db.deleted_at]: null,
//       })) ?? [];
//
//     return (
//       candidates.find((candidate: any) =>
//         this.sameEligibilityPolicy(candidate?.[this.db.eligibility_policy], eligibilityPolicy),
//       ) ?? null
//     );
//   }
//
//   protected async findFillRemainingByDay(
//     configId: number,
//     dayOfWeek: PlanningDayKey,
//     eligibilityPolicy: PlanningRequirementEligibilityPolicy,
//   ): Promise<any> {
//     const candidates =
//       (await this.findAll(this.db.tableName, {
//         [this.db.config]: configId,
//         [this.db.day_of_week]: dayOfWeek,
//         [this.db.allocation_mode]: 'FILL_REMAINING',
//         [this.db.active]: true,
//         [this.db.deleted_at]: null,
//       })) ?? [];
//
//     return (
//       candidates.find((candidate: any) =>
//         this.sameEligibilityPolicy(candidate?.[this.db.eligibility_policy], eligibilityPolicy),
//       ) ?? null
//     );
//   }
//
//   protected async listAll(
//     conditions: Record<string, any> = {},
//     paginationOptions: {
//       offset?: number;
//       limit?: number;
//     } = {},
//   ): Promise<any[]> {
//     if (conditions[this.db.deleted_at] === undefined) {
//       conditions[this.db.deleted_at] = null;
//     }
//
//     return await this.findAll(this.db.tableName, conditions, paginationOptions);
//   }
//
//   protected async listAllByConfig(configId: number, activeOnly: boolean = false): Promise<any[]> {
//     const conditions: Record<string, any> = {
//       [this.db.config]: configId,
//     };
//
//     if (activeOnly) {
//       conditions[this.db.active] = true;
//     }
//
//     return await this.listAll(conditions);
//   }
//
//   protected async create(): Promise<void> {
//     this.eligibility_policy = this.normalizeEligibilityPolicy(this.eligibility_policy);
//     this.validate();
//
//     const duplicate = await this.findBySlot(
//       this.config!,
//       this.day_of_week!,
//       this.session_template!,
//       this.eligibility_policy,
//     );
//
//     if (duplicate) {
//       throw new Error(
//         'An active requirement already exists for this configuration slot and employee population',
//       );
//     }
//
//     if (this.allocation_mode === 'FILL_REMAINING') {
//       const existingFill = await this.findFillRemainingByDay(
//         this.config!,
//         this.day_of_week!,
//         this.eligibility_policy,
//       );
//
//       if (existingFill) {
//         throw new Error(
//           'An active FILL_REMAINING requirement already exists for this day and employee population',
//         );
//       }
//     }
//
//     const guid = await this.randomGuidGenerator(this.db.tableName);
//
//     if (!guid) {
//       throw new Error('GUID generation failed for PlanningSuggestionRequirement');
//     }
//
//     const lastID = await this.insertOne(this.db.tableName, {
//       [this.db.guid]: guid,
//       [this.db.config]: this.config,
//       [this.db.session_template]: this.session_template,
//       [this.db.continuation_template]: this.continuation_template ?? null,
//       [this.db.continuation_day_offset]: this.continuation_day_offset,
//       [this.db.day_of_week]: this.day_of_week,
//       [this.db.service_type]: this.service_type,
//       [this.db.allocation_mode]: this.allocation_mode,
//       [this.db.min_employees]: this.min_employees,
//       [this.db.target_employees]: this.target_employees,
//       [this.db.max_employees]: this.max_employees ?? null,
//       [this.db.credited_minutes]: this.credited_minutes ?? null,
//       [this.db.priority]: this.priority,
//       [this.db.active]: this.active,
//       [this.db.eligibility_policy]: this.eligibility_policy,
//     });
//
//     if (!lastID) {
//       throw new Error('PlanningSuggestionRequirement creation failed');
//     }
//
//     this.id = typeof lastID === 'object' ? lastID.id : lastID;
//     this.guid = guid;
//   }
//
//   protected async update(): Promise<void> {
//     if (!this.id) {
//       throw new Error('ID required to update PlanningSuggestionRequirement');
//     }
//
//     this.eligibility_policy = this.normalizeEligibilityPolicy(this.eligibility_policy);
//     this.validate();
//
//     const duplicate = await this.findBySlot(
//       this.config!,
//       this.day_of_week!,
//       this.session_template!,
//       this.eligibility_policy,
//     );
//
//     if (duplicate && duplicate.id !== this.id) {
//       throw new Error(
//         'An active requirement already exists for this configuration slot and employee population',
//       );
//     }
//
//     if (this.allocation_mode === 'FILL_REMAINING') {
//       const existingFill = await this.findFillRemainingByDay(
//         this.config!,
//         this.day_of_week!,
//         this.eligibility_policy,
//       );
//
//       if (existingFill && existingFill.id !== this.id) {
//         throw new Error(
//           'An active FILL_REMAINING requirement already exists for this day and employee population',
//         );
//       }
//     }
//
//     const updated = await this.updateOne(
//       this.db.tableName,
//       {
//         [this.db.config]: this.config,
//         [this.db.session_template]: this.session_template,
//         [this.db.continuation_template]: this.continuation_template ?? null,
//         [this.db.continuation_day_offset]: this.continuation_day_offset,
//         [this.db.day_of_week]: this.day_of_week,
//         [this.db.service_type]: this.service_type,
//         [this.db.allocation_mode]: this.allocation_mode,
//         [this.db.min_employees]: this.min_employees,
//         [this.db.target_employees]: this.target_employees,
//         [this.db.max_employees]: this.max_employees ?? null,
//         [this.db.credited_minutes]: this.credited_minutes ?? null,
//         [this.db.priority]: this.priority,
//         [this.db.active]: this.active,
//         [this.db.eligibility_policy]: this.eligibility_policy,
//       },
//       {
//         [this.db.id]: this.id,
//       },
//     );
//
//     if (!updated) {
//       throw new Error('PlanningSuggestionRequirement update failed');
//     }
//   }
//
//   protected async trash(id: number): Promise<boolean> {
//     const affected = await this.updateOne(
//       this.db.tableName,
//       {
//         [this.db.active]: false,
//         [this.db.deleted_at]: TimezoneConfigUtils.getCurrentTime(),
//       },
//       {
//         [this.db.id]: id,
//       },
//     );
//
//     return affected > 0;
//   }
//
//   private normalizeEligibilityPolicy(
//     value: PlanningRequirementEligibilityPolicy | string | null | undefined,
//   ): PlanningRequirementEligibilityPolicy {
//     let parsed: any = value;
//
//     if (typeof value === 'string') {
//       try {
//         parsed = JSON.parse(value);
//       } catch {
//         parsed = null;
//       }
//     }
//
//     const requestedModes = Array.isArray(parsed?.planning_modes)
//       ? parsed.planning_modes
//       : ['FIXED', 'ROTATING'];
//
//     const planningModes = (['FIXED', 'ROTATING'] as const).filter((mode) =>
//       requestedModes.includes(mode),
//     );
//
//     return {
//       planning_modes: planningModes.length > 0 ? [...planningModes] : ['FIXED', 'ROTATING'],
//       guard_pool_relation: ['ANY', 'MEMBER', 'NON_MEMBER'].includes(parsed?.guard_pool_relation)
//         ? parsed.guard_pool_relation
//         : 'ANY',
//     };
//   }
//
//   private sameEligibilityPolicy(
//     left: PlanningRequirementEligibilityPolicy | string | null | undefined,
//     right: PlanningRequirementEligibilityPolicy | string | null | undefined,
//   ): boolean {
//     const normalizedLeft = this.normalizeEligibilityPolicy(left);
//     const normalizedRight = this.normalizeEligibilityPolicy(right);
//
//     return (
//       normalizedLeft.guard_pool_relation === normalizedRight.guard_pool_relation &&
//       normalizedLeft.planning_modes.length === normalizedRight.planning_modes.length &&
//       normalizedLeft.planning_modes.every(
//         (mode, index) => mode === normalizedRight.planning_modes[index],
//       )
//     );
//   }
//
//   private validate(): void {
//     if (!this.config) {
//       throw new Error('config is required');
//     }
//
//     if (!this.session_template) {
//       throw new Error('session_template is required');
//     }
//
//     if (!this.day_of_week) {
//       throw new Error('day_of_week is required');
//     }
//
//     if (this.min_employees < 0) {
//       throw new Error('min_employees cannot be negative');
//     }
//
//     if (this.target_employees < this.min_employees) {
//       throw new Error('target_employees must be greater than or equal to min_employees');
//     }
//
//     if (
//       this.max_employees !== null &&
//       this.max_employees !== undefined &&
//       this.max_employees < this.target_employees
//     ) {
//       throw new Error('max_employees must be greater than or equal to target_employees');
//     }
//
//     if (
//       this.credited_minutes !== null &&
//       this.credited_minutes !== undefined &&
//       (this.credited_minutes < 1 || this.credited_minutes > 10080)
//     ) {
//       throw new Error('credited_minutes must be between 1 and 10080');
//     }
//
//     if (this.priority < 1) {
//       throw new Error('priority must be greater than 0');
//     }
//
//     if (this.allocation_mode === 'EXACT') {
//       if (this.max_employees === null || this.max_employees === undefined) {
//         throw new Error('max_employees is required for an EXACT requirement');
//       }
//
//       if (
//         !(
//           this.min_employees === this.target_employees &&
//           this.target_employees === this.max_employees
//         )
//       ) {
//         throw new Error(
//           'EXACT requires min_employees, target_employees and max_employees to be equal',
//         );
//       }
//     }
//
//     if (this.allocation_mode === 'FILL_REMAINING' && this.service_type !== 'STANDARD') {
//       throw new Error('FILL_REMAINING is only allowed for a STANDARD requirement');
//     }
//
//     if (!this.eligibility_policy.planning_modes.length) {
//       throw new Error('eligibility_policy.planning_modes cannot be empty');
//     }
//     if (!['ANY', 'MEMBER', 'NON_MEMBER'].includes(this.eligibility_policy.guard_pool_relation)) {
//       throw new Error('eligibility_policy.guard_pool_relation is invalid');
//     }
//
//     if (this.service_type === 'GUARD') {
//       if (!this.continuation_template) {
//         throw new Error('continuation_template is required for a GUARD requirement');
//       }
//
//       if (this.continuation_day_offset !== 1) {
//         throw new Error('continuation_day_offset must be 1 for a GUARD requirement');
//       }
//
//       return;
//     }
//
//     if (this.continuation_template !== null && this.continuation_template !== undefined) {
//       throw new Error('continuation_template is only allowed for a GUARD requirement');
//     }
//
//     if (this.continuation_day_offset !== 0) {
//       throw new Error('continuation_day_offset must be 0 for a STANDARD requirement');
//     }
//   }
// }

import { TimezoneConfigUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export type PlanningDayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type PlanningServiceType = 'STANDARD' | 'GUARD';

export type PlanningRequirementPlanningMode = 'FIXED' | 'ROTATING';
export type PlanningRequirementGuardPoolRelation = 'ANY' | 'MEMBER' | 'NON_MEMBER';
export interface PlanningRequirementEligibilityPolicy {
  planning_modes: PlanningRequirementPlanningMode[];
  guard_pool_relation: PlanningRequirementGuardPoolRelation;
}

export type PlanningAllocationMode = 'EXACT' | 'RANGE' | 'FILL_REMAINING';

export default class PlanningSuggestionRequirementModel extends BaseModel {
  public readonly db = {
    tableName: tableName.PLANNING_SUGGESTION_REQUIREMENT,
    id: 'id',
    guid: 'guid',
    config: 'config',
    session_template: 'session_template',
    continuation_template: 'continuation_template',
    continuation_day_offset: 'continuation_day_offset',
    day_of_week: 'day_of_week',
    service_type: 'service_type',
    allocation_mode: 'allocation_mode',
    min_employees: 'min_employees',
    target_employees: 'target_employees',
    max_employees: 'max_employees',
    credited_minutes: 'credited_minutes',
    priority: 'priority',
    active: 'active',
    eligibility_policy: 'eligibility_policy',
    deleted_at: 'deleted_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  protected id?: number;
  protected guid?: string;
  protected config?: number;
  protected session_template?: number;
  protected continuation_template?: number | null;
  protected continuation_day_offset: number = 0;
  protected day_of_week?: PlanningDayKey;
  protected service_type: PlanningServiceType = 'STANDARD';
  protected allocation_mode: PlanningAllocationMode = 'RANGE';
  protected min_employees: number = 0;
  protected target_employees: number = 0;
  protected max_employees?: number | null;
  protected credited_minutes?: number | null;
  protected priority: number = 100;
  protected active: boolean = true;
  protected eligibility_policy: PlanningRequirementEligibilityPolicy = {
    planning_modes: ['FIXED', 'ROTATING'],
    guard_pool_relation: 'ANY',
  };
  protected deleted_at?: Date | null;
  protected created_at?: Date;
  protected updated_at?: Date;

  protected constructor() {
    super();
  }

  protected async find(id: number, includeDeleted: boolean = false): Promise<any> {
    const conditions: Record<string, any> = {
      [this.db.id]: id,
    };

    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }

    return await this.findOne(this.db.tableName, conditions);
  }

  protected async findByGuid(guid: string, includeDeleted: boolean = false): Promise<any> {
    const conditions: Record<string, any> = {
      [this.db.guid]: guid,
    };

    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }

    return await this.findOne(this.db.tableName, conditions);
  }

  protected async findBySlot(
    configId: number,
    dayOfWeek: PlanningDayKey,
    sessionTemplateId: number,
    eligibilityPolicy: PlanningRequirementEligibilityPolicy,
  ): Promise<any> {
    const candidates =
      (await this.findAll(this.db.tableName, {
        [this.db.config]: configId,
        [this.db.day_of_week]: dayOfWeek,
        [this.db.session_template]: sessionTemplateId,
        [this.db.active]: true,
        [this.db.deleted_at]: null,
      })) ?? [];

    return (
      candidates.find((candidate: any) =>
        this.sameEligibilityPolicy(candidate?.[this.db.eligibility_policy], eligibilityPolicy),
      ) ?? null
    );
  }

  protected async findFillRemainingByDay(
    configId: number,
    dayOfWeek: PlanningDayKey,
    eligibilityPolicy: PlanningRequirementEligibilityPolicy,
  ): Promise<any> {
    const candidates =
      (await this.findAll(this.db.tableName, {
        [this.db.config]: configId,
        [this.db.day_of_week]: dayOfWeek,
        [this.db.allocation_mode]: 'FILL_REMAINING',
        [this.db.active]: true,
        [this.db.deleted_at]: null,
      })) ?? [];

    return (
      candidates.find((candidate: any) =>
        this.sameEligibilityPolicy(candidate?.[this.db.eligibility_policy], eligibilityPolicy),
      ) ?? null
    );
  }

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: {
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<any[]> {
    if (conditions[this.db.deleted_at] === undefined) {
      conditions[this.db.deleted_at] = null;
    }

    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  protected async listAllByConfig(configId: number, activeOnly: boolean = false): Promise<any[]> {
    const conditions: Record<string, any> = {
      [this.db.config]: configId,
    };

    if (activeOnly) {
      conditions[this.db.active] = true;
    }

    return await this.listAll(conditions);
  }

  protected async create(): Promise<void> {
    this.eligibility_policy = this.normalizeEligibilityPolicy(this.eligibility_policy);
    this.validate();

    const duplicate = await this.findBySlot(
      this.config!,
      this.day_of_week!,
      this.session_template!,
      this.eligibility_policy,
    );

    if (duplicate) {
      throw new Error(
        'An active requirement already exists for this configuration slot and employee population',
      );
    }

    if (this.allocation_mode === 'FILL_REMAINING') {
      const existingFill = await this.findFillRemainingByDay(
        this.config!,
        this.day_of_week!,
        this.eligibility_policy,
      );

      if (existingFill) {
        throw new Error(
          'An active FILL_REMAINING requirement already exists for this day and employee population',
        );
      }
    }

    const guid = await this.randomGuidGenerator(this.db.tableName);

    if (!guid) {
      throw new Error('GUID generation failed for PlanningSuggestionRequirement');
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.config]: this.config,
      [this.db.session_template]: this.session_template,
      [this.db.continuation_template]: this.continuation_template ?? null,
      [this.db.continuation_day_offset]: this.continuation_day_offset,
      [this.db.day_of_week]: this.day_of_week,
      [this.db.service_type]: this.service_type,
      [this.db.allocation_mode]: this.allocation_mode,
      [this.db.min_employees]: this.min_employees,
      [this.db.target_employees]: this.target_employees,
      [this.db.max_employees]: this.max_employees ?? null,
      [this.db.credited_minutes]: this.credited_minutes ?? null,
      [this.db.priority]: this.priority,
      [this.db.active]: this.active,
      [this.db.eligibility_policy]: this.eligibility_policy,
    });

    if (!lastID) {
      throw new Error('PlanningSuggestionRequirement creation failed');
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    if (!this.id) {
      throw new Error('ID required to update PlanningSuggestionRequirement');
    }

    this.eligibility_policy = this.normalizeEligibilityPolicy(this.eligibility_policy);
    this.validate();

    const duplicate = await this.findBySlot(
      this.config!,
      this.day_of_week!,
      this.session_template!,
      this.eligibility_policy,
    );

    if (duplicate && duplicate.id !== this.id) {
      throw new Error(
        'An active requirement already exists for this configuration slot and employee population',
      );
    }

    if (this.allocation_mode === 'FILL_REMAINING') {
      const existingFill = await this.findFillRemainingByDay(
        this.config!,
        this.day_of_week!,
        this.eligibility_policy,
      );

      if (existingFill && existingFill.id !== this.id) {
        throw new Error(
          'An active FILL_REMAINING requirement already exists for this day and employee population',
        );
      }
    }

    const updated = await this.updateOne(
      this.db.tableName,
      {
        [this.db.config]: this.config,
        [this.db.session_template]: this.session_template,
        [this.db.continuation_template]: this.continuation_template ?? null,
        [this.db.continuation_day_offset]: this.continuation_day_offset,
        [this.db.day_of_week]: this.day_of_week,
        [this.db.service_type]: this.service_type,
        [this.db.allocation_mode]: this.allocation_mode,
        [this.db.min_employees]: this.min_employees,
        [this.db.target_employees]: this.target_employees,
        [this.db.max_employees]: this.max_employees ?? null,
        [this.db.credited_minutes]: this.credited_minutes ?? null,
        [this.db.priority]: this.priority,
        [this.db.active]: this.active,
        [this.db.eligibility_policy]: this.eligibility_policy,
      },
      {
        [this.db.id]: this.id,
      },
    );

    if (!updated) {
      throw new Error('PlanningSuggestionRequirement update failed');
    }
  }

  protected async trash(id: number): Promise<boolean> {
    const affected = await this.updateOne(
      this.db.tableName,
      {
        [this.db.active]: false,
        [this.db.deleted_at]: TimezoneConfigUtils.getCurrentTime(),
      },
      {
        [this.db.id]: id,
      },
    );

    return affected > 0;
  }

  private normalizeEligibilityPolicy(
    value: PlanningRequirementEligibilityPolicy | string | null | undefined,
  ): PlanningRequirementEligibilityPolicy {
    let parsed: any = value;

    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        parsed = null;
      }
    }

    const requestedModes = Array.isArray(parsed?.planning_modes)
      ? parsed.planning_modes
      : ['FIXED', 'ROTATING'];

    const planningModes = (['FIXED', 'ROTATING'] as const).filter((mode) =>
      requestedModes.includes(mode),
    );

    return {
      planning_modes: planningModes.length > 0 ? [...planningModes] : ['FIXED', 'ROTATING'],
      guard_pool_relation: ['ANY', 'MEMBER', 'NON_MEMBER'].includes(parsed?.guard_pool_relation)
        ? parsed.guard_pool_relation
        : 'ANY',
    };
  }

  private sameEligibilityPolicy(
    left: PlanningRequirementEligibilityPolicy | string | null | undefined,
    right: PlanningRequirementEligibilityPolicy | string | null | undefined,
  ): boolean {
    const normalizedLeft = this.normalizeEligibilityPolicy(left);
    const normalizedRight = this.normalizeEligibilityPolicy(right);

    return (
      normalizedLeft.guard_pool_relation === normalizedRight.guard_pool_relation &&
      normalizedLeft.planning_modes.length === normalizedRight.planning_modes.length &&
      normalizedLeft.planning_modes.every(
        (mode, index) => mode === normalizedRight.planning_modes[index],
      )
    );
  }

  private validate(): void {
    if (!this.config) {
      throw new Error('config is required');
    }

    if (!this.session_template) {
      throw new Error('session_template is required');
    }

    if (!this.day_of_week) {
      throw new Error('day_of_week is required');
    }

    if (this.min_employees < 0) {
      throw new Error('min_employees cannot be negative');
    }

    if (this.target_employees < this.min_employees) {
      throw new Error('target_employees must be greater than or equal to min_employees');
    }

    if (
      this.max_employees !== null &&
      this.max_employees !== undefined &&
      this.max_employees < this.target_employees
    ) {
      throw new Error('max_employees must be greater than or equal to target_employees');
    }

    if (
      this.credited_minutes !== null &&
      this.credited_minutes !== undefined &&
      (this.credited_minutes < 1 || this.credited_minutes > 10080)
    ) {
      throw new Error('credited_minutes must be between 1 and 10080');
    }

    if (this.priority < 1) {
      throw new Error('priority must be greater than 0');
    }

    if (this.allocation_mode === 'EXACT') {
      if (this.max_employees === null || this.max_employees === undefined) {
        throw new Error('max_employees is required for an EXACT requirement');
      }

      if (
        !(
          this.min_employees === this.target_employees &&
          this.target_employees === this.max_employees
        )
      ) {
        throw new Error(
          'EXACT requires min_employees, target_employees and max_employees to be equal',
        );
      }
    }

    if (this.allocation_mode === 'FILL_REMAINING' && this.service_type !== 'STANDARD') {
      throw new Error('FILL_REMAINING is only allowed for a STANDARD requirement');
    }

    if (!this.eligibility_policy.planning_modes.length) {
      throw new Error('eligibility_policy.planning_modes cannot be empty');
    }
    if (!['ANY', 'MEMBER', 'NON_MEMBER'].includes(this.eligibility_policy.guard_pool_relation)) {
      throw new Error('eligibility_policy.guard_pool_relation is invalid');
    }

    if (this.service_type === 'GUARD') {
      if (!this.continuation_template) {
        throw new Error('continuation_template is required for a GUARD requirement');
      }

      if (this.continuation_day_offset !== 1) {
        throw new Error('continuation_day_offset must be 1 for a GUARD requirement');
      }

      return;
    }

    if (this.continuation_template !== null && this.continuation_template !== undefined) {
      throw new Error('continuation_template is only allowed for a GUARD requirement');
    }

    if (this.continuation_day_offset !== 0) {
      throw new Error('continuation_day_offset must be 0 for a STANDARD requirement');
    }
  }
}
