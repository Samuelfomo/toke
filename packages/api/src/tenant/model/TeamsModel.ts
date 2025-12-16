import { Op } from 'sequelize';
import { TEAMS_ERRORS, TeamsValidationUtils, TI, TimezoneConfigUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class TeamsModel extends BaseModel {
  public readonly db = {
    tableName: tableName.TEAMS,
    id: 'id',
    guid: 'guid',
    name: 'name',
    manager: 'manager',
    members: 'members',
    assigned_sessions: 'assigned_sessions',
    created_at: 'created_at',
    updated_at: 'updated_at',
    deleted_at: 'deleted_at',
  } as const;

  // ============================================
  // PROPRIÉTÉS PROTÉGÉES
  // ============================================

  protected id?: number;
  protected guid?: string;
  protected name?: string;
  protected manager?: number;
  protected members: TI.TeamMember[] = [];
  protected assigned_sessions: TI.AssignedSession[] = [];
  protected created_at?: Date;
  protected updated_at?: Date;
  protected deleted_at?: Date;

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

  protected async findByName(name: string, includeDeleted: boolean = false): Promise<any> {
    const conditions: any = { [this.db.name]: name };

    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }

    return await this.findOne(this.db.tableName, conditions);
  }

  // ============================================
  // MÉTHODES DE LISTAGE
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

  protected async listAllByManager(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.manager]: manager }, paginationOptions);
  }

  protected async listAllByName(
    name: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.name]: { [Op.like]: `%${name}%` } }, paginationOptions);
  }

  /**
   * Recherche les équipes contenant un membre spécifique
   */
  protected async listAllByMember(
    user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    // Utiliser une requête SQL brute ou Sequelize pour rechercher dans le JSON
    const conditions = {
      [this.db.deleted_at]: null,
    };

    const allTeams = await this.listAll(conditions, paginationOptions);

    // Filtrer les équipes contenant ce membre
    return allTeams.filter((team) => {
      const members = team.members || [];
      return members.some((member: TI.TeamMember) => member.user === user);
    });
  }

  /**
   * Recherche les équipes avec une session template spécifique
   */
  protected async listAllBySessionTemplate(
    sessionTemplate: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const conditions = {
      [this.db.deleted_at]: null,
    };

    const allTeams = await this.listAll(conditions, paginationOptions);

    return allTeams.filter((team) => {
      const sessions = team.assigned_sessions || [];
      return sessions.some(
        (session: TI.AssignedSession) => session.session_template === sessionTemplate,
      );
    });
  }

  /**
   * Recherche les équipes ayant au moins un membre
   */
  protected async listAllWithMembers(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const allTeams = await this.listAll({}, paginationOptions);

    return allTeams.filter((team) => {
      const members = team.members || [];
      return members.length > 0;
    });
  }

  /**
   * Recherche les équipes ayant une session active
   */
  protected async listAllWithActiveSession(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const allTeams = await this.listAll({}, paginationOptions);

    return allTeams.filter((team) => {
      const sessions = team.assigned_sessions || [];
      return sessions.some((session: TI.AssignedSession) => session.active === true);
    });
  }

  // ============================================
  // STATISTIQUES
  // ============================================

  protected async countByManager(): Promise<Record<string, number>> {
    const where = {
      [this.db.manager]: { [Op.not]: null },
      [this.db.deleted_at]: null,
    };

    return await this.countByGroup(this.db.tableName, this.db.manager, where);
  }

  protected async getTeamsWithMembersCount(): Promise<{
    with_members: number;
    without_members: number;
  }> {
    const allTeams = await this.listAll();

    const withMembers = allTeams.filter((team) => {
      const members = team.members || [];
      return members.length > 0;
    }).length;

    const withoutMembers = allTeams.length - withMembers;

    return { with_members: withMembers, without_members: withoutMembers };
  }

  // ============================================
  // CRUD
  // ============================================

  protected async create(): Promise<void> {
    await this.validate();

    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error(TEAMS_ERRORS.GUID_GENERATION_FAILED);
    }

    // // Vérification unicité du nom
    // if (this.name) {
    //   const existingTeam = await this.findByName(this.name);
    //   if (existingTeam) {
    //     throw new Error(TEAMS_ERRORS.DUPLICATE_ENTRY);
    //   }
    // }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.name]: this.name,
      [this.db.manager]: this.manager,
      [this.db.members]: this.members || [],
      [this.db.assigned_sessions]: this.assigned_sessions || [],
    });

    if (!lastID) {
      throw new Error(TEAMS_ERRORS.CREATION_FAILED);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error(TEAMS_ERRORS.ID_REQUIRED);
    }

    const updateData: Record<string, any> = {};

    if (this.name !== undefined) {
      updateData[this.db.name] = this.name;
    }

    if (this.manager !== undefined) {
      updateData[this.db.manager] = this.manager;
    }

    if (this.members !== undefined) {
      updateData[this.db.members] = this.members;
    }

    if (this.assigned_sessions !== undefined) {
      updateData[this.db.assigned_sessions] = this.assigned_sessions;
    }

    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });

    if (!updated) {
      throw new Error(TEAMS_ERRORS.UPDATE_FAILED);
    }
  }

  protected async trash(id: number): Promise<boolean> {
    const affected = await this.updateOne(
      this.db.tableName,
      {
        [this.db.deleted_at]: TimezoneConfigUtils.getCurrentTime(),
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

  // ============================================
  // VALIDATION
  // ============================================

  private async validate(): Promise<void> {
    if (!this.name) {
      throw new Error(TEAMS_ERRORS.NAME_REQUIRED);
    }

    if (!TeamsValidationUtils.validateName(this.name)) {
      throw new Error(TEAMS_ERRORS.NAME_INVALID);
    }

    if (!this.manager) {
      throw new Error(TEAMS_ERRORS.MANAGER_REQUIRED);
    }

    // if (!TeamsValidationUtils.validateManager(this.manager)) {
    //   throw new Error(TEAMS_ERRORS.MANAGER_INVALID);
    // }

    // if (this.members && !TeamsValidationUtils.validateMembers(this.members)) {
    //   throw new Error(TEAMS_ERRORS.MEMBERS_INVALID);
    // }

    // if (
    //   this.assigned_sessions &&
    //   !TeamsValidationUtils.validateAssignedSessions(this.assigned_sessions)
    // ) {
    //   throw new Error(TEAMS_ERRORS.ASSIGNED_SESSIONS_INVALID);
    // }

    const cleaned = TeamsValidationUtils.cleanTeamData(this);
    Object.assign(this, cleaned);
  }
}
