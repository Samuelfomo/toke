import { Op } from 'sequelize';
import { GROUPS_ERRORS, GroupsValidationUtils, TI, TimezoneConfigUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';
import User from '../class/User.js';

export default class GroupsModel extends BaseModel {
  public readonly db = {
    tableName: tableName.GROUPS,
    id: 'id',
    guid: 'guid',
    name: 'name',
    manager: 'manager',
    members: 'members',
    // assigned_sessions: 'assigned_sessions',
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
  protected members: TI.GroupsMember[] = [];
  // protected assigned_sessions: TI.AssignedSession[] = [];
  protected created_at?: Date;
  protected updated_at?: Date;
  protected deleted_at?: Date;

  protected constructor() {
    super();
  }

  // ============================================
  // MÉTHODES DE RECHERCHE
  // ============================================

  protected async find(
    id: number,
    includeDeleted: boolean = false,
    excludeInactive: boolean = true,
  ): Promise<any> {
    const conditions: any = { [this.db.id]: id };

    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }

    const group = await this.findOne(this.db.tableName, conditions);
    return this.applyMembersFilter(group, excludeInactive);
  }

  protected async findByGuid(
    guid: string,
    includeDeleted: boolean = false,
    excludeInactive: boolean = true,
  ): Promise<any> {
    const conditions: any = { [this.db.guid]: guid };

    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }

    const group = await this.findOne(this.db.tableName, conditions);
    return this.applyMembersFilter(group, excludeInactive);
  }

  protected async findByName(
    name: string,
    includeDeleted: boolean = false,
    excludeInactive: boolean = true,
  ): Promise<any> {
    const conditions: any = { [this.db.name]: name };

    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }

    const group = await this.findOne(this.db.tableName, conditions);
    return this.applyMembersFilter(group, excludeInactive);
  }

  protected async findByManagerName(
    manager: number,
    name: string,
    includeDeleted: boolean = false,
    excludeInactive: boolean = true,
  ): Promise<any> {
    const conditions: any = { [this.db.manager]: manager, [this.db.name]: name };
    if (!includeDeleted) {
      conditions[this.db.deleted_at] = null;
    }
    const group = await this.findOne(this.db.tableName, conditions);
    return this.applyMembersFilter(group, excludeInactive);
  }

  /**
   * Retourne l'équipe dans laquelle l'utilisateur est actuellement actif
   */
  protected async findActiveGroupsByUser(userId: number): Promise<any | null> {
    const allGroups = await this.listAll(); // deleted_at = null par défaut

    for (const group of allGroups) {
      const members = group.members || [];

      const activeMember = members.find(
        (m: TI.GroupsMember) => m.user === userId && m.active !== false,
      );

      if (activeMember) {
        return group; // ✅ group active trouvée
      }
    }

    return null; // ❌ aucune group active
  }

  // ============================================
  // MÉTHODES DE LISTAGE
  // ============================================

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
    excludeInactive: boolean = true,
  ): Promise<any[]> {
    if (conditions[this.db.deleted_at] === undefined) {
      conditions[this.db.deleted_at] = null;
    }

    const groups = await this.findAll(this.db.tableName, conditions, paginationOptions);
    return this.applyMembersFilterToList(groups, excludeInactive);
  }

  protected async listAllByManager(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
    excludeInactive: boolean = true,
  ): Promise<any[]> {
    return await this.listAll({ [this.db.manager]: manager }, paginationOptions, excludeInactive);
  }

  protected async listAllByName(
    name: string,
    paginationOptions: { offset?: number; limit?: number } = {},
    excludeInactive: boolean = true,
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.name]: { [Op.like]: `%${name}%` } },
      paginationOptions,
      excludeInactive,
    );
  }

  /**
   * Recherche les équipes contenant un membre spécifique
   */
  protected async listAllByMember(
    user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
    excludeInactive: boolean = true,
  ): Promise<any[]> {
    // Utiliser une requête SQL brute ou Sequelize pour rechercher dans le JSON
    const conditions = {
      [this.db.deleted_at]: null,
    };

    const allGroups = await this.listAll(conditions, paginationOptions, excludeInactive);

    // Filtrer les équipes contenant ce membre
    return allGroups.filter((group) => {
      const members = group.members || [];
      return members.some((member: TI.GroupsMember) => member.user === user);
    });
  }

  // /**
  //  * Recherche les équipes avec une session template spécifique
  //  */
  // protected async listAllBySessionTemplate(
  //   sessionTemplate: number,
  //   paginationOptions: { offset?: number; limit?: number } = {},
  // ): Promise<any[]> {
  //   const conditions = {
  //     [this.db.deleted_at]: null,
  //   };
  //
  //   const allGroups = await this.listAll(conditions, paginationOptions);
  //
  //   return allGroups.filter((group) => {
  //     const sessions = group.assigned_sessions || [];
  //     return sessions.some(
  //       (session: TI.AssignedSession) => session.session_template === sessionTemplate,
  //     );
  //   });
  // }

  /**
   * Recherche les équipes ayant au moins un membre
   */
  protected async listAllWithMembers(
    paginationOptions: { offset?: number; limit?: number } = {},
    excludeInactive: boolean = true,
  ): Promise<any[]> {
    const allGroups = await this.listAll({}, paginationOptions, excludeInactive);

    return allGroups.filter((group) => {
      const members = group.members || [];
      return members.length > 0;
    });
  }

  // ============================================
  // MÉTHODES UTILITAIRES POUR FILTRER LES MEMBRES
  // ============================================

  /**
   * Filtre les membres selon le paramètre excludeInactive
   * @param members Liste des membres à filtrer
   * @param excludeInactive Si true, exclut les membres avec active === false
   * @returns Liste filtrée des membres
   */
  protected filterMembersByActiveStatus(
    members: TI.GroupsMember[],
    excludeInactive: boolean,
  ): TI.GroupsMember[] {
    if (!excludeInactive) {
      return members;
    }
    return members.filter((m) => m.active !== false);
  }

  /**
   * Applique le filtre excludeInactive sur un groupe récupéré de la DB
   * @param group Groupe à filtrer
   * @param excludeInactive Si true, exclut les membres inactifs
   * @returns Groupe avec membres filtrés
   */
  protected applyMembersFilter(group: any, excludeInactive: boolean): any {
    if (!group || !excludeInactive) {
      return group;
    }

    return {
      ...group,
      members: this.filterMembersByActiveStatus(group.members || [], excludeInactive),
    };
  }

  /**
   * Applique le filtre excludeInactive sur une liste de groupes
   * @param groups Liste de groupes à filtrer
   * @param excludeInactive Si true, exclut les membres inactifs
   * @returns Liste de groupes avec membres filtrés
   */
  protected applyMembersFilterToList(groups: any[], excludeInactive: boolean): any[] {
    if (!excludeInactive) {
      return groups;
    }

    return groups.map((group) => this.applyMembersFilter(group, excludeInactive));
  }

  // /**
  //  * Recherche les équipes ayant une session active
  //  */
  // protected async listAllWithActiveSession(
  //   paginationOptions: { offset?: number; limit?: number } = {},
  // ): Promise<any[]> {
  //   const allGroups = await this.listAll({}, paginationOptions);
  //
  //   return allGroups.filter((group) => {
  //     const sessions = group.assigned_sessions || [];
  //     return sessions.some((session: TI.AssignedSession) => session.active === true);
  //   });
  // }

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

  /**
   * Compte les groupes avec et sans membres
   * @param excludeInactive Si true, compte uniquement les membres actifs
   */
  protected async getGroupsWithMembersCount(excludeInactive: boolean = true): Promise<{
    with_members: number;
    without_members: number;
  }> {
    const allGroups = await this.listAll({}, {}, false);

    const withMembers = allGroups.filter((group) => {
      const members = group.members || [];

      const relevantMembers = excludeInactive
        ? this.filterMembersByActiveStatus(members, true)
        : members;

      return relevantMembers.length > 0;
    }).length;

    const withoutMembers = allGroups.length - withMembers;

    return { with_members: withMembers, without_members: withoutMembers };
  }

  // ============================================
  // CRUD
  // ============================================

  protected async create(): Promise<void> {
    await this.validate();

    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error(GROUPS_ERRORS.GUID_GENERATION_FAILED);
    }

    // Vérification unicité du nom pour ce manager
    if (this.name) {
      const existingGroups = await this.findByManagerName(this.manager!, this.name, true);
      if (existingGroups) {
        throw new Error(GROUPS_ERRORS.DUPLICATE_ENTRY);
      }
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.name]: this.name,
      [this.db.manager]: this.manager,
      [this.db.members]: this.members || [],
      // [this.db.assigned_sessions]: this.assigned_sessions || [],
    });

    if (!lastID) {
      throw new Error(GROUPS_ERRORS.CREATION_FAILED);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error(GROUPS_ERRORS.ID_REQUIRED);
    }

    const updateData: Record<string, any> = {};

    if (this.name !== undefined) {
      const existingGroups = await this.findByManagerName(this.manager!, this.name, true);
      if (existingGroups && existingGroups.id !== this.id) {
        throw new Error(GROUPS_ERRORS.DUPLICATE_ENTRY);
      }
      updateData[this.db.name] = this.name;
    }

    // if (this.manager !== undefined) {
    //   updateData[this.db.manager] = this.manager;
    // }

    if (this.members !== undefined) {
      updateData[this.db.members] = this.members;
    }
    //
    // if (this.assigned_sessions !== undefined) {
    //   updateData[this.db.assigned_sessions] = this.assigned_sessions;
    // }

    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });

    if (!updated) {
      throw new Error(GROUPS_ERRORS.UPDATE_FAILED);
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

  /**
   * Vérifie si un utilisateur est déjà membre actif d'une autre équipe
   */
  protected async isUserActiveInAnotherGroups(
    userId: number,
    currentGroupsId?: number,
  ): Promise<boolean> {
    const allGroups = await this.listAll();

    for (const group of allGroups) {
      // Ignorer l'équipe actuelle lors de l'update
      if (currentGroupsId && group.id === currentGroupsId) {
        continue;
      }

      const members = group.members || [];
      const activeMember = members.find(
        (m: TI.GroupsMember) => m.user === userId && m.active !== false,
      );

      if (activeMember) {
        return true;
      }
    }

    return false;
  }

  // ============================================
  // VALIDATION
  // ============================================

  private async validate(): Promise<void> {
    if (!this.name) {
      throw new Error(GROUPS_ERRORS.NAME_REQUIRED);
    }

    if (!GroupsValidationUtils.validateName(this.name)) {
      throw new Error(GROUPS_ERRORS.NAME_INVALID);
    }

    if (!this.manager) {
      throw new Error(GROUPS_ERRORS.MANAGER_REQUIRED);
    }

    // if (!GroupsValidationUtils.validateManager(this.manager)) {
    //   throw new Error(GROUPS_ERRORS.MANAGER_INVALID);
    // }

    // if (this.members && !GroupsValidationUtils.validateMembers(this.members)) {
    //   throw new Error(GROUPS_ERRORS.MEMBERS_INVALID);
    // }

    // if (
    //   this.assigned_sessions &&
    //   !GroupsValidationUtils.validateAssignedSessions(this.assigned_sessions)
    // ) {
    //   throw new Error(GROUPS_ERRORS.ASSIGNED_SESSIONS_INVALID);
    // }

    // ✅ NOUVELLE VALIDATION : Vérifier qu'aucun membre actif n'est dans une autre équipe
    if (this.members && this.members.length > 0) {
      const activeMembers = this.members.filter((m: TI.GroupsMember) => m.active !== false);

      for (const member of activeMembers) {
        const isInAnotherGroups = await this.isUserActiveInAnotherGroups(member.user, this.id);

        if (isInAnotherGroups) {
          const userObj = await User._load(member.user);
          throw new Error(
            `User ${userObj?.getGuid()} is already an active member of another groups. ` +
              `A user can only be active in one groups at a time.`,
          );
        }
      }
    }

    const cleaned = GroupsValidationUtils.cleanGroupsData(this);
    Object.assign(this, cleaned);
  }
}
