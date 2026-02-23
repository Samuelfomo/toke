import {
  SCHEDULE_ASSIGNMENTS_DEFAULTS,
  SCHEDULE_ASSIGNMENTS_ERRORS,
  ScheduleAssignmentsValidationUtils,
  TimezoneConfigUtils,
} from '@toke/shared';
import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class ScheduleAssignmentsModel extends BaseModel {
  public readonly db = {
    tableName: tableName.SCHEDULE_ASSIGNMENTS,
    id: 'id',
    guid: 'guid',
    tenant: 'tenant',
    user: 'user',
    groups: 'groups',
    session_template: 'session_template',
    version: 'version',
    start_date: 'start_date',
    end_date: 'end_date',
    created_by: 'created_by',
    reason: 'reason',
    active: 'active',
    deleted_at: 'deleted_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  // ============================================
  // PROPRIÉTÉS PROTÉGÉES
  // ============================================

  protected id?: number;
  protected guid?: string;
  protected tenant?: string;
  protected user?: number | null;
  protected groups?: number | null;
  // protected session_template?: number;
  protected session_template?: any; // ✅ JSONB (copie complète du template)
  protected version?: number;
  protected start_date?: string;
  protected end_date?: string;
  protected created_by?: number | null;
  protected reason?: string | null;
  protected active?: boolean;
  protected deleted_at?: Date | null;

  protected initialVersion = 1;

  protected constructor() {
    super();
  }

  // ============================================
  // MÉTHODES DE RECHERCHE
  // ============================================

  protected async find(id: number, includeDeleted: boolean = false): Promise<any> {
    const conditions: any = { [this.db.id]: id };

    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }

    return await this.findOne(this.db.tableName, conditions);
  }

  protected async findByGuid(guid: string, includeDeleted: boolean = false): Promise<any> {
    const conditions: any = { [this.db.guid]: guid };

    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }

    return await this.findOne(this.db.tableName, conditions);
  }

  // protected async findByUserAndTemplate(
  //   userId: number,
  //   templateId: number,
  //   includeDeleted: boolean = false,
  // ): Promise<any> {
  //   const conditions: any = {
  //     [this.db.user]: userId,
  //     [this.db.session_template]: templateId,
  //   };
  //
  //   if (!includeDeleted) {
  //     conditions[this.db.deleted_at] = null;
  //   }
  //
  //   return await this.findOne(this.db.tableName, conditions);
  // }
  //
  // protected async findByGroupsAndTemplate(
  //   groupsId: number,
  //   templateId: number,
  //   includeDeleted: boolean = false,
  // ): Promise<any> {
  //   const conditions: any = {
  //     [this.db.groups]: groupsId,
  //     [this.db.session_template]: templateId,
  //   };
  //
  //   if (!includeDeleted) {
  //     conditions[this.db.deleted_at] = null;
  //   }
  //
  //   return await this.findOne(this.db.tableName, conditions);
  // }

  // Dans ScheduleAssignmentsModel_v2.ts

  /**
   * ✅ Trouve un assignment par user, template ID et version
   */
  protected async findByUserTemplateIdAndVersion(
    userId: number,
    templateId: number,
    templateVersion: number,
    includeDeleted: boolean = false,
  ): Promise<any> {
    await this.init();

    const conditions: any = {
      [this.db.user]: userId,
      [Op.and]: [
        this.sequelize.where(
          this.sequelize.cast(this.sequelize.json(`${this.db.session_template}.id`), 'integer'),
          templateId,
        ),
        this.sequelize.where(
          this.sequelize.cast(
            this.sequelize.json(`${this.db.session_template}.version`),
            'integer',
          ),
          templateVersion,
        ),
      ],
    };

    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }

    return await this.findOne(this.db.tableName, conditions);
  }

  /**
   * ✅ Trouve un assignment par groupe, template ID et version
   */
  protected async findByGroupsTemplateIdAndVersion(
    groupsId: number,
    templateId: number,
    templateVersion: number,
    includeDeleted: boolean = false,
  ): Promise<any> {
    await this.init();

    const conditions: any = {
      [this.db.groups]: groupsId,
      [Op.and]: [
        this.sequelize.where(
          this.sequelize.cast(this.sequelize.json(`${this.db.session_template}.id`), 'integer'),
          templateId,
        ),
        this.sequelize.where(
          this.sequelize.cast(
            this.sequelize.json(`${this.db.session_template}.version`),
            'integer',
          ),
          templateVersion,
        ),
      ],
    };

    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }

    return await this.findOne(this.db.tableName, conditions);
  }

  // ============================================
  // MÉTHODES LISTAGE
  // ============================================

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    if (conditions[this.db.deleted_at] === undefined) {
      conditions[this.db.deleted_at] = null;
    }

    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  protected async listAllByUser(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.user]: userId }, paginationOptions);
  }

  protected async listAllByCreatedBy(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.created_by]: manager }, paginationOptions);
  }

  protected async listAllByGroups(
    groupsId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.groups]: groupsId }, paginationOptions);
  }

  // protected async listAllBySessionTemplate(
  //   sessionTemplateId: number,
  //   paginationOptions: { offset?: number; limit?: number } = {},
  // ): Promise<any[]> {
  //   return await this.listAll({ [this.db.session_template]: sessionTemplateId }, paginationOptions);
  // }

  protected async listAllByActiveStatus(
    isActive: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.active]: isActive }, paginationOptions);
  }

  protected async listAllByDateRange(
    startDate: string,
    endDate: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const conditions = {
      [Op.or]: [
        {
          [this.db.start_date]: { [Op.between]: [startDate, endDate] },
        },
        {
          [this.db.end_date]: { [Op.between]: [startDate, endDate] },
        },
        {
          [Op.and]: [
            { [this.db.start_date]: { [Op.lte]: startDate } },
            { [this.db.end_date]: { [Op.gte]: endDate } },
          ],
        },
      ],
    };

    return await this.listAll(conditions, paginationOptions);
  }

  protected async listAllForUserOnDate(
    userId: number,
    date: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const conditions = {
      [this.db.user]: userId,
      [this.db.start_date]: { [Op.lte]: date },
      [this.db.end_date]: { [Op.gte]: date },
      [this.db.active]: true,
    };

    return await this.listAll(conditions, paginationOptions);
  }

  protected async listAllForGroupsOnDate(
    groupsId: number,
    date: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const conditions = {
      [this.db.groups]: groupsId,
      [this.db.start_date]: { [Op.lte]: date },
      [this.db.end_date]: { [Op.gte]: date },
      [this.db.active]: true,
    };

    return await this.listAll(conditions, paginationOptions);
  }

  // ============================================
  // STATISTIQUES
  // ============================================

  protected async getActiveStatusCount(): Promise<{ active: number; inactive: number }> {
    const activeCount = await this.count(this.db.tableName, {
      [this.db.active]: true,
      [this.db.deleted_at]: null,
    });

    const inactiveCount = await this.count(this.db.tableName, {
      [this.db.active]: false,
      [this.db.deleted_at]: null,
    });

    return { active: activeCount, inactive: inactiveCount };
  }

  protected async countAll(): Promise<Record<string, number>> {
    const where = {
      [this.db.deleted_at]: null,
    };

    return await this.countByGroup(this.db.tableName, this.db.tenant, where);
  }

  // ============================================
  // CRUD
  // ============================================

  protected async create(): Promise<void> {
    await this.validate();

    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.GUID_GENERATION_FAILED);
    }

    // Vérification unicité user + session_template
    if (this.user && this.session_template?.id && this.session_template?.version) {
      const existing = await this.findByUserTemplateIdAndVersion(
        this.user,
        this.session_template.id,
        this.session_template.version,
      );
      if (existing) {
        throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.USER_TEMPLATE_VERSION_ALREADY_ASSIGNED);
      }
    }

    // Vérification unicité groups + session_template
    if (this.groups && this.session_template?.id && this.session_template?.version) {
      const existing = await this.findByGroupsTemplateIdAndVersion(
        this.groups,
        this.session_template.id,
        this.session_template.version,
      );
      if (existing) {
        throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.GROUPS_TEMPLATE_VERSION_ALREADY_ASSIGNED);
      }
    }

    // ✅ Version initiale = 1
    this.version = this.initialVersion;

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.tenant]: this.tenant,
      [this.db.user]: this.user ?? null,
      [this.db.groups]: this.groups ?? null,
      [this.db.session_template]: this.session_template,
      [this.db.version]: this.version,
      [this.db.start_date]: this.start_date,
      [this.db.end_date]: this.end_date,
      [this.db.created_by]: this.created_by ?? null,
      [this.db.reason]: this.reason ?? null,
      [this.db.active]: this.active ?? SCHEDULE_ASSIGNMENTS_DEFAULTS.ACTIVE,
    });

    if (!lastID) {
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.CREATION_FAILED);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    await this.validate();

    console.log('je suis ici 2');

    if (!this.id) {
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.ID_REQUIRED);
    }

    const updateData: Record<string, any> = {};

    // if (this.tenant !== undefined) {
    //   updateData[this.db.tenant] = this.tenant;
    // }
    // if (this.user !== undefined) {
    //   updateData[this.db.user] = this.user;
    // }
    //
    // if (this.groups !== undefined) {
    //   updateData[this.db.groups] = this.groups;
    // }
    // if (this.session_template !== undefined) {
    //   updateData[this.db.session_template] = this.session_template;
    // }
    if (this.start_date !== undefined) {
      updateData[this.db.start_date] = this.start_date;
    }
    if (this.end_date !== undefined) {
      updateData[this.db.end_date] = this.end_date;
    }
    if (this.created_by !== undefined) {
      updateData[this.db.created_by] = this.created_by;
    }
    if (this.reason !== undefined) {
      updateData[this.db.reason] = this.reason;
    }
    if (this.active !== undefined) {
      updateData[this.db.active] = this.active;
    }
    // ✅ Mise à jour du template (si modifié)
    if (this.session_template !== undefined) {
      updateData[this.db.session_template] = this.session_template;
    }
    // ✅ Incrémenter la version (si template modifié)
    if (this.version !== undefined) {
      updateData[this.db.version] = this.version;
    }
    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });

    if (!updated) {
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.UPDATE_FAILED);
    }
  }
  protected async updateDefinition(): Promise<void> {
    if (!this.id) {
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.ID_REQUIRED);
    }

    const updateData: Record<string, any> = {};

    if (this.created_by !== undefined) {
      updateData[this.db.created_by] = this.created_by;
    }

    if (this.user !== undefined && this.user !== null) {
      updateData[this.db.user] = this.user;
    }
    if (this.groups !== undefined && this.groups !== null) {
      updateData[this.db.groups] = this.groups;
    }

    // ✅ Mise à jour du template (si modifié)
    if (this.session_template !== undefined) {
      updateData[this.db.session_template] = this.session_template;
    }
    // ✅ Incrémenter la version (si template modifié)
    if (this.version !== undefined) {
      updateData[this.db.version] = this.version;
    }
    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });

    if (!updated) {
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.UPDATE_FAILED);
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
      },
      { [this.db.id]: id },
    );

    return affected > 0;
  }

  protected async hasActiveException(userId?: number, groupsId?: number): Promise<boolean> {
    const conditions: any = {
      [this.db.deleted_at]: null,
      [this.db.active]: true,
    };

    if (userId) conditions[this.db.user] = userId;
    if (groupsId) conditions[this.db.groups] = groupsId;

    const count = await this.count(this.db.tableName, conditions);
    return count > 0;
  }

  // ============================================
  // VALIDATION
  // ============================================

  private async validate(): Promise<void> {
    // if (!this.tenant) {
    //   throw new Error(SCHEDULE_EXCEPTION_ERRORS.TENANT_REQUIRED);
    // }

    // Vérifier qu'au moins user OU groups est défini
    if (!this.user && !this.groups) {
      console.log('je suis ici 1');
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.USER_OR_GROUPS_REQUIRED);
    }

    if (this.user && this.groups) {
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.BOTH_USER_AND_GROUPS);
    }

    if (!this.session_template) {
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.SESSION_TEMPLATE_REQUIRED);
    }

    // ✅ Valider que session_template est un objet valide
    if (typeof this.session_template !== 'object') {
      console.error('this.session_template', this.session_template);
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.SESSION_TEMPLATE_INVALID);
    }

    if (!this.start_date) {
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.START_DATE_REQUIRED);
    }
    if (!ScheduleAssignmentsValidationUtils.validateStartDate(this.start_date)) {
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.START_DATE_INVALID);
    }

    if (!this.end_date) {
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.END_DATE_REQUIRED);
    }
    if (!ScheduleAssignmentsValidationUtils.validateEndDate(this.end_date)) {
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.END_DATE_INVALID);
    }

    // Vérifier que start_date <= end_date
    if (this.start_date > this.end_date) {
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.END_DATE_BEFORE_START);
    }

    if (!this.created_by) {
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.CREATED_BY_REQUIRED);
    }

    if (this.reason && !ScheduleAssignmentsValidationUtils.validateReason(this.reason)) {
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.REASON_INVALID);
    }

    if (
      this.active !== undefined &&
      !ScheduleAssignmentsValidationUtils.validateActive(this.active)
    ) {
      throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.ACTIVE_INVALID);
    }

    // ✅ NOUVELLE VALIDATION : Vérifier unicité de l'exception active
    if (this.active) {
      if (this.user) {
        const hasActive = await this.hasActiveException(this.user);
        if (hasActive) {
          // Si on est en update, vérifier que ce n'est pas la même exception
          if (this.id) {
            const existing = await this.find(this.id);
            if (!existing || existing.user !== this.user) {
              throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.USER_ALREADY_HAS_ACTIVE_EXCEPTION);
            }
          } else {
            throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.USER_ALREADY_HAS_ACTIVE_EXCEPTION);
          }
        }
      }

      if (this.groups) {
        const hasActive = await this.hasActiveException(undefined, this.groups);
        if (hasActive) {
          if (this.id) {
            const existing = await this.find(this.id);
            if (!existing || existing.groups !== this.groups) {
              throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.GROUPS_ALREADY_HAS_ACTIVE_EXCEPTION);
            }
          } else {
            throw new Error(SCHEDULE_ASSIGNMENTS_ERRORS.GROUPS_ALREADY_HAS_ACTIVE_EXCEPTION);
          }
        }
      }
    }

    const cleaned = ScheduleAssignmentsValidationUtils.cleanScheduleAssignmentsData(this);
    Object.assign(this, cleaned);
  }
}
