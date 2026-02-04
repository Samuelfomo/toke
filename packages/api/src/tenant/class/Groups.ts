import { GroupsValidationUtils, TI, TimezoneConfigUtils } from '@toke/shared';

import GroupsModel from '../model/GroupsModel.js';
import {
  responseStructure as RS,
  responseValue,
  tableName,
  ViewMode,
} from '../../utils/response.model.js';
import { TenantRevision } from '../../tools/revision.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';

import User from './User.js';
import SessionTemplate from './SessionTemplates.js';
import OrgHierarchy from './OrgHierarchy.js';
import ScheduleAssignments from './ScheduleAssignments.js';
import RotationAssignment from './RotationAssignments.js';

export default class Groups extends GroupsModel {
  private managerObj?: User;
  private memberObjs: Map<number, User> = new Map();
  private sessionTemplateObjs: Map<number, SessionTemplate> = new Map();

  constructor() {
    super();
  }

  // ============================================
  // MÉTHODES STATIQUES DE CHARGEMENT
  // ============================================

  static _load(
    identifier: any,
    byGuid: boolean = false,
    byUser: boolean = false,
    excludeInactive: boolean = true,
  ): Promise<Groups | null> {
    return new Groups().load(identifier, byGuid, byUser, excludeInactive);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
    excludeInactive: boolean = true,
  ): Promise<Groups[] | null> {
    return new Groups().list(conditions, paginationOptions, excludeInactive);
  }

  static _listByManager(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
    excludeInactive: boolean = true,
  ): Promise<Groups[] | null> {
    return new Groups().listByManager(manager, paginationOptions, excludeInactive);
  }

  static _listByMember(
    user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
    excludeInactive: boolean = true,
  ): Promise<Groups[] | null> {
    return new Groups().listByMember(user, paginationOptions, excludeInactive);
  }

  static _listWithMembers(
    paginationOptions: { offset?: number; limit?: number } = {},
    excludeInactive: boolean = true,
  ): Promise<Groups[] | null> {
    return new Groups().listWithMembers(paginationOptions, excludeInactive);
  }

  /**
   * 🎯 POINT D'ENTRÉE PRINCIPAL
   * Récupère l'équipe complète d'un manager (incluant sous-équipes si hiérarchiquement valides)
   * @param managerId ID du manager
   * @param excludeInactive
   * @returns Structure hiérarchique complète de l'équipe
   */
  static async getManagerGroupsHierarchy(
    managerId: number,
    excludeInactive: boolean = true,
  ): Promise<any> {
    const managerObj = await User._load(managerId);
    if (!managerObj) {
      throw new Error('Manager not found');
    }

    // Récupérer le group principale du manager
    const groups = await Groups._listByManager(managerId, {}, excludeInactive);
    if (!groups || groups.length === 0) {
      return {
        manager: await managerObj.toJSON(responseValue.MINIMAL),
        has_groups: false,
        group: null,
        total_members: 0,
        members: [],
      };
    }

    // Prendre la première équipe (un manager devrait avoir une seule équipe principale)
    const mainGroups = groups[0];
    const visited = new Set<number>();

    return await mainGroups._buildManagerGroupsHierarchy(managerId, visited, excludeInactive);
  }

  static async exportable(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
    excludeInactive: boolean = true,
  ): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    let items: any[] = [];
    const groups = await this._list(conditions, paginationOptions, excludeInactive);
    if (groups) {
      items = await Promise.all(groups.map(async (group) => await group.toJSON()));
    }
    return {
      revision: await TenantRevision.getRevision(tableName.GROUPS),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || items.length,
        count: items.length,
      },
      items,
    };
  }

  /**
   * Récupère les IDs de tous les utilisateurs actifs dans au moins un groupe
   */
  static async getAllActiveGroupMembers(): Promise<number[]> {
    const allGroups = await Groups._list({}, {}, false);
    if (!allGroups) return [];

    const activeMemberIds = new Set<number>();

    for (const group of allGroups) {
      const activeMembers = group.getActiveMembers(); // Filtre active !== false
      activeMembers.forEach((member) => activeMemberIds.add(member.user));
    }

    return Array.from(activeMemberIds);
  }

  // ============================================
  // GETTERS
  // ============================================

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getName(): string | undefined {
    return this.name;
  }

  getManager(): number | undefined {
    return this.manager;
  }

  async getManagerObj(): Promise<User | null> {
    if (!this.manager) return null;
    if (!this.managerObj) {
      this.managerObj = (await User._load(this.manager)) || undefined;
    }
    return this.managerObj || null;
  }

  getMembers(): TI.GroupsMember[] {
    return this.members || [];
  }
  /**
   * Récupère uniquement les membres actifs
   */
  getActiveMembers(): TI.GroupsMember[] {
    return this.getMembers().filter((m) => m.active !== false);
  }

  async getMemberObj(user: number): Promise<User | null> {
    if (!user) return null;

    if (!this.memberObjs.has(user)) {
      const userObj = await User._load(user);
      if (userObj) {
        this.memberObjs.set(user, userObj);
      }
    }
    return this.memberObjs.get(user) || null;
  }

  async getAllMemberObjs(): Promise<User[]> {
    const members = this.getMembers();
    const memberObjs: User[] = [];

    for (const member of members) {
      const userObj = await this.getMemberObj(member.user);
      if (userObj) {
        memberObjs.push(userObj);
      }
    }

    return memberObjs;
  }

  // getAssignedSessions(): TI.AssignedSession[] {
  //   return this.assigned_sessions || [];
  // }

  // async getSessionTemplateObj(template: number): Promise<SessionTemplate | null> {
  //   if (!this.sessionTemplateObjs.has(template)) {
  //     const templateObj = await SessionTemplate._load(template);
  //     if (templateObj) {
  //       this.sessionTemplateObjs.set(template, templateObj);
  //     }
  //   }
  //   return this.sessionTemplateObjs.get(template) || null;
  // }

  getDeletedAt(): Date | undefined {
    return this.deleted_at;
  }

  // ============================================
  // MÉTHODES DE RÉSOLUTION DES ASSIGNATIONS
  // ============================================

  async getActiveScheduleAssignment(): Promise<ScheduleAssignments | null> {
    const today = TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0];

    const activeAssignments = await ScheduleAssignments._listForGroupsOnDate(this.id!, today);

    if (activeAssignments && activeAssignments.length > 0) {
      return activeAssignments.sort((a, b) => {
        const dateA = new Date(a.getStartDate()!).getTime();
        const dateB = new Date(b.getStartDate()!).getTime();
        return dateB - dateA;
      })[0];
    }

    return null;
  }

  async getActiveRotationAssignment(): Promise<RotationAssignment | null> {
    const assignments = await RotationAssignment._listByGroups(this.id!);
    return assignments && assignments.length > 0 ? assignments[0] : null;
  }

  async getAllScheduleAssignments(): Promise<ScheduleAssignments[]> {
    return (await ScheduleAssignments._listByGroups(this.id!)) || [];
  }

  async getAllRotationAssignments(): Promise<RotationAssignment[]> {
    return (await RotationAssignment._listByGroups(this.id!)) || [];
  }

  async getCurrentAssignmentType(): Promise<'schedule' | 'rotation' | 'none'> {
    const scheduleAssignment = await this.getActiveScheduleAssignment();
    if (scheduleAssignment) return 'schedule';

    const rotationAssignment = await this.getActiveRotationAssignment();
    if (rotationAssignment) return 'rotation';

    return 'none';
  }

  // ============================================
  // SETTERS
  // ============================================

  setName(name: string): Groups {
    this.name = name;
    return this;
  }

  setManager(manager: number): Groups {
    this.manager = manager;
    return this;
  }

  setMembers(members: TI.GroupsMember[]): Groups {
    this.members = members;
    return this;
  }

  // setAssignedSessions(sessions: TI.AssignedSession[]): Groups {
  //   this.assigned_sessions = sessions;
  //   return this;
  // }

  // ============================================
  // MÉTHODES MÉTIER - GESTION DES MEMBRES
  // ============================================

  /**
   * Ajouter un membre à l'équipe
   */
  addMember(user: number, joinedAt?: Date, active: boolean = true): Groups {
    const newMember: TI.GroupsMember = {
      user: user,
      joined_at: joinedAt || TimezoneConfigUtils.getCurrentTime(),
      active,
    };

    this.members = GroupsValidationUtils.addMember(this.members, newMember);
    return this;
  }

  // /**
  //  * Ajoute un membre au groupe
  //  * @param userId ID de l'utilisateur à ajouter
  //  * @param markAsActive Si true, réactive le membre s'il était inactif
  //  */
  // async addMember(userId: number, markAsActive: boolean = true): Promise<void> {
  //   if (!this.members) {
  //     this.members = [];
  //   }
  //
  //   // Vérifier si le membre existe déjà
  //   const existingMemberIndex = this.members.findIndex((m) => m.user === userId);
  //
  //   if (existingMemberIndex !== -1) {
  //     // Le membre existe déjà
  //     if (markAsActive) {
  //       // Réactiver le membre
  //       this.members[existingMemberIndex].active = true;
  //     }
  //   } else {
  //     // Nouveau membre
  //     this.members.push({
  //       user: userId,
  //       joined_at: TimezoneConfigUtils.getCurrentTime(),
  //       active: true,
  //     });
  //   }
  //
  //   await this.update();
  // }

  /**
   * Désactive un membre du groupe (soft delete)
   * @param userId ID de l'utilisateur à désactiver
   */
  async deactivateMember(userId: number): Promise<void> {
    if (!this.members) {
      throw new Error('No members in this group');
    }

    const memberIndex = this.members.findIndex((m) => m.user === userId);

    if (memberIndex === -1) {
      throw new Error('Member not found in this group');
    }

    // Marquer comme inactif
    this.members[memberIndex].active = false;

    await this.update();
  }

  /**
   * Retirer un membre de l'équipe
   */
  removeMember(user: number): Groups {
    this.members = GroupsValidationUtils.removeMember(this.members, user);
    return this;
  }

  /**
   * Mettre à jour le statut d'un membre
   */
  updateMemberStatus(user: number, active: boolean): Groups {
    this.members = GroupsValidationUtils.updateMemberStatus(this.members, user, active);
    return this;
  }

  /**
   * Vérifier si un utilisateur est membre
   */
  hasMember(user: number): boolean {
    return GroupsValidationUtils.hasMember(this.members, user);
  }

  /**
   * Vérifier si un membre est actif
   */
  isMemberActive(user: number): boolean {
    return GroupsValidationUtils.isMemberActive(this.members, user);
  }

  /**
   * Récupère tous les membres directs (1er niveau uniquement)
   * @returns Liste des utilisateurs membres directs de cette équipe
   */
  /**
   * Récupère les membres directs (uniquement ceux de ce groupe)
   * @param activeOnly Si true, ne retourne que les membres actifs
   */
  async getDirectMembers(activeOnly: boolean = false): Promise<User[]> {
    const members = activeOnly ? this.getActiveMembers() : this.getMembers();
    const directMembers: User[] = [];

    for (const member of members) {
      const userObj = await this.getMemberObj(member.user);
      if (userObj) {
        directMembers.push(userObj);
      }
    }

    return directMembers;
  }

  /**
   * 📊 Récupère TOUS les membres (avec aplatissement)
   * Utile pour avoir une liste simple de tous les users sous un manager
   * @param rootManagerId ID du manager racine
   * @returns Liste aplatie de tous les users
   */
  async getAllMembersFlat(rootManagerId: number): Promise<User[]> {
    const visited = new Set<number>();
    const allUsers: User[] = [];

    await this._recursiveFetchAllMembersFlat(rootManagerId, visited, allUsers);

    // Dédupliquer (un user peut apparaître dans plusieurs équipes)

    return Array.from(new Map(allUsers.map((user) => [user.getId(), user])).values());
  }

  /**
   * Récupère tous les membres (incluant les sous-équipes)
   * @param activeOnly Si true, ne retourne que les membres actifs
   */
  async getAllMembers(activeOnly: boolean = false): Promise<User[]> {
    if (!this.manager) return [];

    const visited = new Set<number>();
    const accumulator: User[] = [];

    await this._recursiveFetchAllMembersFlat(this.manager, visited, accumulator, activeOnly);

    return accumulator;
  }

  /**
   * Récupère TOUS les membres (directs + sous-équipes) de manière récursive
   * @returns Liste complète de tous les utilisateurs (incluant sous-équipes)
   */
  async getAllMembersRecursive(): Promise<User[]> {
    const visited = new Set<number>(); // Éviter les boucles infinies
    return await this._recursiveFetchAllMembers(visited);
  }

  /**
   * Construit l'arbre hiérarchique complet de l'équipe
   * Structure: { troups, members: [{ user, roles, managedGroups }] }
   */
  async buildGroupsHierarchyTree(): Promise<any> {
    const visited = new Set<number>();
    return await this._recursiveBuildGroupsTree(visited);
  }

  /**
   * Compter les membres actifs
   */
  countActiveMembers(): number {
    return GroupsValidationUtils.countActiveMembers(this.members);
  }

  // /**
  //  * Assigner une nouvelle session template
  //  */
  // assignSession(sessionTemplate: number, assignAt?: Date, active: boolean = true): Groups {
  //   const newSession: TI.AssignedSession = {
  //     session_template: sessionTemplate,
  //     assign_at: assignAt || TimezoneConfigUtils.getCurrentTime(),
  //     active,
  //   };
  //
  //   this.assigned_sessions = GroupsValidationUtils.assignSession(
  //     this.assigned_sessions,
  //     newSession,
  //   );
  //   return this;
  // }
  //
  // /**
  //  * Activer une session template spécifique
  //  */
  // activateSession(sessionTemplate: number): Groups {
  //   this.assigned_sessions = GroupsValidationUtils.activateSession(
  //     this.assigned_sessions,
  //     sessionTemplate,
  //   );
  //   return this;
  // }
  //
  // /**
  //  * Désactiver toutes les sessions
  //  */
  // deactivateAllSessions(): Groups {
  //   this.assigned_sessions = GroupsValidationUtils.deactivateAllSessions(this.assigned_sessions);
  //   return this;
  // }
  //
  // /**
  //  * Récupérer la session active
  //  */
  // getActiveSession(): TI.AssignedSession | null {
  //   return GroupsValidationUtils.getActiveSession(this.assigned_sessions);
  // }

  // ============================================
  // MÉTHODES MÉTIER - GESTION DES SESSIONS
  // ============================================

  // /**
  //  * Vérifier si une session est active
  //  */
  // hasActiveSession(): boolean {
  //   return this.getActiveSession() !== null;
  // }

  /**
   * Obtenir un résumé de l'équipe
   */
  // getSummary(): {
  //   totalMembers: number;
  //   activeMembers: number;
  //   inactiveMembers: number;
  //   hasActiveSession: boolean;
  //   activeSessionId: number | null;
  //   totalSessions: number;
  // } {
  //   return GroupsValidationUtils.getGroupSummary(this);
  // }

  getSummary(): { total_members: number; active_members: number; inactive_members: number } {
    const allMembers = this.getMembers();
    const activeMembers = this.getActiveMembers();

    return {
      total_members: allMembers.length,
      active_members: activeMembers.length,
      inactive_members: allMembers.length - activeMembers.length,
    };
  }

  /**
   * Générer un rapport complet de l'équipe
   */
  async generateReport(): Promise<any> {
    const memberObjs = await this.getAllMemberObjs();
    const memberDetails = await Promise.all(
      memberObjs.map(async (member) => ({
        id: member.getGuid(),
        name: member.getFullName(),
      })),
    );

    return GroupsValidationUtils.generateGroupsReport(this, memberDetails);
  }

  isNew(): boolean {
    return this.id === undefined;
  }

  isDeleted(): boolean {
    return this.deleted_at !== undefined && this.deleted_at !== null;
  }

  // ============================================
  // MÉTHODES MÉTIER - STATISTIQUES
  // ============================================

  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        await this.create();
      } else {
        await this.update();
      }
    } catch (error: any) {
      throw new Error(error.message || error);
    }
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: Groups Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  // ============================================
  // MÉTHODES STANDARD
  // ============================================

  async restoreGroups(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: Groups Restore`);
      return await this.restore(this.id);
    }
    return false;
  }

  async load(
    identifier: any,
    byGuid: boolean = false,
    byUser: boolean = false,
    excludeInactive: boolean = true,
  ): Promise<Groups | null> {
    let data = null;

    if (byGuid) {
      data = await this.findByGuid(identifier, false, excludeInactive);
    } else if (byUser) {
      data = await this.findActiveGroupsByUser(Number(identifier));
    } else {
      data = await this.find(Number(identifier), false, excludeInactive);
    }

    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
    excludeInactive: boolean = true,
  ): Promise<Groups[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions, excludeInactive);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Groups().hydrate(data));
  }

  async listByManager(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
    excludeInactive: boolean = true,
  ): Promise<Groups[] | null> {
    const dataset = await this.listAllByManager(manager, paginationOptions, excludeInactive);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Groups().hydrate(data));
  }

  async listByMember(
    user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
    excludeInactive: boolean = true,
  ): Promise<Groups[] | null> {
    const dataset = await this.listAllByMember(user, paginationOptions, excludeInactive);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Groups().hydrate(data));
  }

  // async listBySessionTemplate(
  //   session_template: number,
  //   paginationOptions: { offset?: number; limit?: number } = {},
  // ): Promise<Groups[] | null> {
  //   const dataset = await this.listAllBySessionTemplate(session_template, paginationOptions);
  //   if (!dataset || dataset.length === 0) return null;
  //   return dataset.map((data) => new Groups().hydrate(data));
  // }

  // ============================================
  // CHARGEMENT ET LISTING
  // ============================================

  async listWithMembers(
    paginationOptions: { offset?: number; limit?: number } = {},
    excludeInactive: boolean = true,
  ): Promise<Groups[] | null> {
    const dataset = await this.listAllWithMembers(paginationOptions, excludeInactive);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Groups().hydrate(data));
  }

  // async listWithActiveSession(
  //   paginationOptions: { offset?: number; limit?: number } = {},
  // ): Promise<Groups[] | null> {
  //   const dataset = await this.listAllWithActiveSession(paginationOptions);
  //   if (!dataset || dataset.length === 0) return null;
  //   return dataset.map((data) => new Groups().hydrate(data));
  // }

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const managerObj = await this.getManagerObj();
    // const activeSession = this.getActiveSession();
    // const summary = this.getSummary();

    const baseModel = {
      [RS.GUID]: this.guid,
      [RS.NAME]: this.name,
      [RS.MANAGER]: managerObj ? managerObj.toPublicJSON() : null,
      [RS.CREATED_AT]: this.created_at,
      [RS.UPDATED_AT]: this.updated_at,
    };

    const assignmentType = await this.getCurrentAssignmentType();
    const activeSchedule = await this.getActiveScheduleAssignment();
    const activeRotation = await this.getActiveRotationAssignment();

    if (view === responseValue.MINIMAL) {
      return {
        ...baseModel,
        // total_members: summary.total_members,
        // active_members: summary.active_members,
        assignment_info: {
          current_type: assignmentType,
          active_schedule_assignment: activeSchedule ? activeSchedule.getGuid() : null,
          active_rotation_assignment: activeRotation ? activeRotation.getGuid() : null,
        },
      };
    }

    // Mode FULL
    const memberObjs = await this.getAllMemberObjs();
    const enrichedMembers = await Promise.all(
      this.members.map(async (member) => {
        const userObj = await this.getMemberObj(member.user);
        return {
          user: userObj ? userObj.toPublicJSON() : null,
          joined_at: member.joined_at,
          active: member.active !== false,
        };
      }),
    );

    // const enrichedSessions = await Promise.all(
    //   this.assigned_sessions.map(async (session) => {
    //     const templateObj = await this.getSessionTemplateObj(session.session_template);
    //     return {
    //       session_template: templateObj ? templateObj.toJSON() : null,
    //       assign_at: session.assign_at,
    //       active: session.active,
    //     };
    //   }),
    // );

    return {
      ...baseModel,
      // summary,
      members: {
        count: enrichedMembers.length,
        items: enrichedMembers,
      },
      assignment_info: {
        current_type: assignmentType,
        active_schedule_assignment: activeSchedule ? await activeSchedule.toPUBLIC() : null,
        active_rotation_assignment: activeRotation ? await activeRotation.toPUBLIC() : null,
      },
      // assigned_sessions: {
      //   count: enrichedSessions.length,
      //   active_session: activeSession
      //     ? {
      //         session_template: activeSession.session_template,
      //         assign_at: activeSession.assign_at,
      //       }
      //     : null,
      //   items: enrichedSessions,
      // },
    };
  }

  toMinimalJSON(): object {
    return {
      [RS.GUID]: this.guid,
      [RS.NAME]: this.name,
      [RS.MANAGER]: this.manager,
      total_members: this.members.length,
    };
  }

  async toPublicJSON(): Promise<object> {
    const enrichedMembers = await Promise.all(
      this.members.map(async (member) => {
        const userObj = await this.getMemberObj(member.user);
        return {
          user: userObj ? userObj.toPublicJSON() : null,
          joined_at: member.joined_at,
          active: member.active !== false,
        };
      }),
    );
    const managerObj = await this.getManagerObj();
    // const summary = this.getSummary();
    return {
      [RS.GUID]: this.guid,
      [RS.NAME]: this.name,
      [RS.MANAGER]: managerObj ? managerObj.toPublicJSON() : null,
      // summary: summary,
      members: {
        count: enrichedMembers.length,
        items: enrichedMembers,
      },
    };
  }

  /**
   * Méthode récursive privée pour aplatir tous les membres
   */
  private async _recursiveFetchAllMembersFlat(
    rootManagerId: number,
    visited: Set<number>,
    accumulator: User[],
    activeOnly: boolean = true,
  ): Promise<void> {
    if (!this.id || visited.has(this.id)) return;
    visited.add(this.id);

    // Ajouter les membres directs
    const directMembers = await this.getDirectMembers(activeOnly);
    accumulator.push(...directMembers);

    // Pour chaque membre, vérifier s'il manage une équipe
    for (const member of directMembers) {
      const memberId = member.getId();
      if (!memberId) continue;

      const memberGroups = await Groups._listByManager(memberId, {}, activeOnly);

      if (memberGroups && memberGroups.length > 0) {
        const isInHierarchy = await OrgHierarchy.isUserInHierarchy(memberId, rootManagerId);

        if (isInHierarchy) {
          const memberGroup = memberGroups[0];
          await memberGroup._recursiveFetchAllMembersFlat(
            rootManagerId,
            visited,
            accumulator,
            activeOnly,
          );
        }
      }
    }
  }

  /**
   * 🔥 MÉTHODE PRINCIPALE RÉCURSIVE
   * Construit la hiérarchie complète d'équipe basée sur :
   * 1. L'équipe du manager
   * 2. Les équipes de ses membres (SI ils sont managers ET hiérarchiquement en dessous)
   *
   * @param rootManagerId ID du manager racine (pour validation hiérarchique)
   * @param visited Set pour éviter les boucles infinies
   * @returns Structure hiérarchique complète
   */
  private async _buildManagerGroupsHierarchy(
    rootManagerId: number,
    visited: Set<number>,
    excludeInactive: boolean = true,
  ): Promise<any> {
    // Protection contre les boucles infinies
    if (!this.id || visited.has(this.id)) {
      return null;
    }
    visited.add(this.id);

    const managerObj = await this.getManagerObj();
    if (!managerObj) return null;

    // Récupérer les membres directs de cette équipe
    const directMembers = await this.getDirectMembers(excludeInactive);
    // const activeSession = this.getActiveSession();

    const membersWithSubGroups = [];

    for (const member of directMembers) {
      const memberId = member.getId();
      if (!memberId) continue;

      const memberData: any = {
        user: await member.toJSON(responseValue.MINIMAL),
        is_groups_manager: false,
        managed_groups: null,
      };

      // Vérifier si ce membre est manager d'une équipe
      const memberGroups = await Groups._listByManager(memberId, {}, excludeInactive);

      if (memberGroups && memberGroups.length > 0) {
        // ✅ VALIDATION HIÉRARCHIQUE : Ce membre doit être sous le rootManager dans l'organigramme
        const isInHierarchy = await OrgHierarchy.isUserInHierarchy(memberId, rootManagerId);

        if (isInHierarchy) {
          // Ce membre est manager ET hiérarchiquement en dessous
          const memberGroup = memberGroups[0]; // Prendre la première équipe
          memberData.is_groups_manager = true;

          // Récursion : construire la sous-équipe
          const subGroupsHierarchy = await memberGroup._buildManagerGroupsHierarchy(
            rootManagerId,
            visited,
            excludeInactive,
          );

          if (subGroupsHierarchy) {
            memberData.managed_groups = subGroupsHierarchy;
          }
        }
      }

      membersWithSubGroups.push(memberData);
    }

    // // Récupérer les détails de la session active
    // let activeSessionDetails = null;
    // if (activeSession) {
    //   const sessionTemplateObj = await this.getSessionTemplateObj(activeSession.session_template);
    //   activeSessionDetails = {
    //     template: sessionTemplateObj ? await sessionTemplateObj.toJSON() : null,
    //     assigned_at: activeSession.assign_at,
    //   };
    // }

    return {
      groups: {
        guid: this.guid,
        name: this.name,
        manager: await managerObj.toJSON(responseValue.MINIMAL),
        // has_active_session: activeSession !== null,
        // active_session: activeSessionDetails,
      },
      total_direct_members: directMembers.length,
      members: membersWithSubGroups,
    };
  }

  // ============================================
  // SÉRIALISATION
  // ============================================

  /**
   * Méthode privée récursive pour récupérer tous les membres
   */
  private async _recursiveFetchAllMembers(
    visited: Set<number>,
    activeOnly: boolean = true,
  ): Promise<User[]> {
    // Protection contre les boucles infinies
    if (!this.id || visited.has(this.id)) {
      return [];
    }
    visited.add(this.id);

    const allUsers: User[] = [];

    // 1. Récupérer les membres directs
    const directMembers = await this.getDirectMembers(activeOnly);
    allUsers.push(...directMembers);

    // 2. Pour chaque membre, vérifier s'il manage une équipe
    for (const member of directMembers) {
      const memberId = member.getId();
      if (!memberId) continue;

      // Chercher les équipes où ce membre est manager
      const subGroups = await Groups._listByManager(memberId, {}, activeOnly);

      if (subGroups && subGroups.length > 0) {
        for (const subGroup of subGroups) {
          // Récursion : récupérer les membres de la sous-équipe
          const subMembers = await subGroup._recursiveFetchAllMembers(visited, activeOnly);
          allUsers.push(...subMembers);
        }
      }
    }

    return allUsers;
  }

  /**
   * Méthode privée récursive pour construire l'arbre
   */
  private async _recursiveBuildGroupsTree(
    visited: Set<number>,
    activeOnly: boolean = true,
  ): Promise<any> {
    // Protection contre les boucles infinies
    if (!this.id || visited.has(this.id)) {
      return null;
    }
    visited.add(this.id);

    const directMembers = await this.getDirectMembers(activeOnly);
    const membersWithSubGroups = [];

    for (const member of directMembers) {
      const memberId = member.getId();
      if (!memberId) continue;

      // Charger les équipes managées par ce membre
      const managedGroups = await Groups._listByManager(memberId, {}, activeOnly);

      const memberData: any = {
        user: await member.toJSON(responseValue.MINIMAL),
        managed_groups: [],
      };

      if (managedGroups && managedGroups.length > 0) {
        for (const subGroup of managedGroups) {
          const subTreeData = await subGroup._recursiveBuildGroupsTree(visited, activeOnly);
          if (subTreeData) {
            memberData.managed_groups.push(subTreeData);
          }
        }
      }

      membersWithSubGroups.push(memberData);
    }

    return {
      group: await this.toJSON(responseValue.MINIMAL),
      members: membersWithSubGroups,
    };
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  private hydrate(data: any): Groups {
    this.id = data.id;
    this.guid = data.guid;
    this.name = data.name;
    this.manager = data.manager;
    this.members = data.members || [];
    // this.assigned_sessions = data.assigned_sessions || [];
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.deleted_at = data.deleted_at;
    return this;
  }
}
