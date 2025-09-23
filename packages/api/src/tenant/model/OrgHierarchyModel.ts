import { ORG_HIERARCHY_ERRORS, OrgHierarchyValidationUtils, RelationshipType } from '@toke/shared';
import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class OrgHierarchyModel extends BaseModel {
  public readonly db = {
    tableName: tableName.ORG_HIERARCHY,
    id: 'id',
    guid: 'guid',
    subordinate: 'subordinate',
    supervisor: 'supervisor',
    relationship_type: 'relationship_type',
    effective_from: 'effective_from',
    effective_to: 'effective_to',
    department: 'department',
    cost_center: 'cost_center',
    delegation_level: 'delegation_level',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  protected id?: number;
  protected guid?: string;
  protected subordinate?: number;
  protected supervisor?: number;
  protected relationship_type?: string;
  protected effective_from?: string;
  protected effective_to?: string | null;
  protected department?: string;
  protected cost_center?: string;
  protected delegation_level?: number;
  protected created_at?: Date;
  protected updated_at?: Date;

  protected constructor() {
    super();
  }

  // === RECHERCHES DE BASE ===

  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }

  protected async findByGuid(guid: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }

  protected async listAllBySubordinate(subordinate: number): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.subordinate]: subordinate });
  }

  protected async listAllBySupervisor(supervisor: number): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.supervisor]: supervisor });
  }

  // === RÉSOLUTION SUPERVISEUR ACTIF ===

  protected async ListAllCurrentSupervisor(subordinate: number, date?: Date): Promise<any> {
    const currentDate = date || new Date();
    const dateStr = currentDate.toISOString().slice(0, 10);

    const conditions = {
      [this.db.subordinate]: subordinate,
      [this.db.effective_from]: { [Op.lte]: dateStr },
      [Op.or]: [
        { [this.db.effective_to]: null },
        { [this.db.effective_to]: { [Op.gte]: dateStr } },
      ],
    };

    const results = await this.findAll(this.db.tableName, conditions);
    if (!results || results.length === 0) return null;

    // Retourner le plus récent
    return results.sort((a: any, b: any) => {
      return new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime();
    })[0];
  }

  protected async listAllActiveSubordinates(supervisor_id: number, date?: Date): Promise<any[]> {
    const currentDate = date || new Date();
    const dateStr = currentDate.toISOString().slice(0, 10);

    const conditions = {
      [this.db.supervisor]: supervisor_id,
      [this.db.effective_from]: { [Op.lte]: dateStr },
      [Op.or]: [
        { [this.db.effective_to]: null },
        { [this.db.effective_to]: { [Op.gte]: dateStr } },
      ],
    };

    return await this.findAll(this.db.tableName, conditions);
  }

  // === RECHERCHES PAR CRITÈRES ===

  protected async listAllByDepartment(department: string): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.department]: department });
  }

  protected async listAllByCostCenter(cost_center: string): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.cost_center]: cost_center });
  }

  protected async listAllByRelationshipType(relationship_type: string): Promise<any[]> {
    return await this.findAll(this.db.tableName, {
      [this.db.relationship_type]: relationship_type,
    });
  }

  protected async listAllActiveBetweenDates(startDate: Date, endDate: Date): Promise<any[]> {
    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);

    const conditions = {
      [this.db.effective_from]: { [Op.lte]: endStr },
      [Op.or]: [
        { [this.db.effective_to]: null },
        { [this.db.effective_to]: { [Op.gte]: startStr } },
      ],
    };

    return await this.findAll(this.db.tableName, conditions);
  }

  // === LISTE ET PAGINATION ===

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  protected async listAllActiveRelations(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const currentDate = new Date().toISOString().slice(0, 10);
    const conditions = {
      [this.db.effective_from]: { [Op.lte]: currentDate },
      [Op.or]: [
        { [this.db.effective_to]: null },
        { [this.db.effective_to]: { [Op.gte]: currentDate } },
      ],
    };
    return await this.listAll(conditions, paginationOptions);
  }

  // === STATISTIQUES ===

  protected async getHierarchyCountStatistics(): Promise<any> {
    const currentDate = new Date().toISOString().slice(0, 10);

    const [totalRelations, activeRelations, departmentStats] = await Promise.all([
      this.count(this.db.tableName, {}),
      this.count(this.db.tableName, {
        [this.db.effective_from]: { [Op.lte]: currentDate },
        [Op.or]: [
          { [this.db.effective_to]: null },
          { [this.db.effective_to]: { [Op.gte]: currentDate } },
        ],
      }),
      this.countByGroup(this.db.tableName, this.db.department, {
        [this.db.effective_from]: { [Op.lte]: currentDate },
        [Op.or]: [
          { [this.db.effective_to]: null },
          { [this.db.effective_to]: { [Op.gte]: currentDate } },
        ],
      }),
    ]);

    return {
      total_relations: totalRelations,
      active_relations: activeRelations,
      departments: departmentStats,
    };
  }

  // === CRUD OPERATIONS ===

  protected async create(): Promise<void> {
    await this.validate();
    const guid = await this.timeBasedTokenGenerator(this.db.tableName, 3, '_', 'TKH');
    if (!guid) {
      throw new Error(ORG_HIERARCHY_ERRORS.GUID_GENERATION_FAILED);
    }

    // Validation unicité relation active
    const existingActive = await this.ListAllCurrentSupervisor(this.subordinate!);
    if (existingActive && this.relationship_type === RelationshipType.DIRECT_REPORT) {
      throw new Error(ORG_HIERARCHY_ERRORS.DUPLICATE_HIERARCHY);
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.subordinate]: this.subordinate,
      [this.db.supervisor]: this.supervisor,
      [this.db.relationship_type]: this.relationship_type,
      [this.db.effective_from]: this.effective_from,
      [this.db.effective_to]: this.effective_to,
      [this.db.department]: this.department,
      [this.db.cost_center]: this.cost_center,
      [this.db.delegation_level]: this.delegation_level,
    });

    if (!lastID) {
      throw new Error(ORG_HIERARCHY_ERRORS.CREATION_FAILED);
    }
    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    await this.validate();
    if (!this.id) {
      throw new Error(ORG_HIERARCHY_ERRORS.ID_REQUIRED);
    }

    const updateData: Record<string, any> = {};
    if (this.subordinate !== undefined) updateData[this.db.subordinate] = this.subordinate;
    if (this.supervisor !== undefined) updateData[this.db.supervisor] = this.supervisor;
    if (this.relationship_type !== undefined)
      updateData[this.db.relationship_type] = this.relationship_type;
    if (this.effective_from !== undefined) updateData[this.db.effective_from] = this.effective_from;
    if (this.effective_to !== undefined) updateData[this.db.effective_to] = this.effective_to;
    if (this.department !== undefined) updateData[this.db.department] = this.department;
    if (this.cost_center !== undefined) updateData[this.db.cost_center] = this.cost_center;
    if (this.delegation_level !== undefined)
      updateData[this.db.delegation_level] = this.delegation_level;

    const updated = await this.updateOne(this.db.tableName, { [this.db.id]: this.id }, updateData);

    if (!updated) {
      throw new Error(ORG_HIERARCHY_ERRORS.UPDATE_FAILED);
    }
  }

  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  private async validate(): Promise<void> {
    if (!this.subordinate) {
      throw new Error(ORG_HIERARCHY_ERRORS.SUBORDINATE_REQUIRED);
    }
    if (!this.supervisor) {
      throw new Error(ORG_HIERARCHY_ERRORS.SUPERVISOR_REQUIRED);
    }
    if (this.subordinate === this.supervisor) {
      throw new Error(ORG_HIERARCHY_ERRORS.SELF_SUPERVISION_INVALID);
    }
    if (!this.relationship_type) {
      throw new Error(ORG_HIERARCHY_ERRORS.RELATIONSHIP_TYPE_REQUIRED);
    }
    if (!this.effective_from) {
      throw new Error(ORG_HIERARCHY_ERRORS.EFFECTIVE_FROM_REQUIRED);
    }
    if (!OrgHierarchyValidationUtils.validateRelationshipType(this.relationship_type)) {
      throw new Error(ORG_HIERARCHY_ERRORS.RELATIONSHIP_TYPE_INVALID);
    }
    if (
      !OrgHierarchyValidationUtils.validateEffectiveDateLogic(
        this.effective_from,
        this.effective_to!,
      )
    ) {
      throw new Error(ORG_HIERARCHY_ERRORS.EFFECTIVE_DATES_LOGIC_INVALID);
    }

    const cleaned = OrgHierarchyValidationUtils.cleanHierarchyData(this);
    Object.assign(this, cleaned);
  }
}
