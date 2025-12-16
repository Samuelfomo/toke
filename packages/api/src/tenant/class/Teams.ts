import { TeamsValidationUtils, TI, TimezoneConfigUtils } from '@toke/shared';

import TeamsModel from '../model/TeamsModel.js';
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

export default class Teams extends TeamsModel {
  private managerObj?: User;
  private memberObjs: Map<number, User> = new Map();
  private sessionTemplateObjs: Map<number, SessionTemplate> = new Map();

  constructor() {
    super();
  }

  // ============================================
  // MÉTHODES STATIQUES DE CHARGEMENT
  // ============================================

  static _load(identifier: any, byGuid: boolean = false): Promise<Teams | null> {
    return new Teams().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Teams[] | null> {
    return new Teams().list(conditions, paginationOptions);
  }

  static _listByManager(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Teams[] | null> {
    return new Teams().listByManager(manager, paginationOptions);
  }

  static _listByMember(
    user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Teams[] | null> {
    return new Teams().listByMember(user, paginationOptions);
  }

  static _listWithMembers(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Teams[] | null> {
    return new Teams().listWithMembers(paginationOptions);
  }

  static _listWithActiveSession(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Teams[] | null> {
    return new Teams().listWithActiveSession(paginationOptions);
  }

  /**
   * 🎯 POINT D'ENTRÉE PRINCIPAL
   * Récupère l'équipe complète d'un manager (incluant sous-équipes si hiérarchiquement valides)
   * @param managerId ID du manager
   * @returns Structure hiérarchique complète de l'équipe
   */
  static async getManagerTeamHierarchy(managerId: number): Promise<any> {
    const managerObj = await User._load(managerId);
    if (!managerObj) {
      throw new Error('Manager not found');
    }

    // Récupérer l'équipe principale du manager
    const teams = await Teams._listByManager(managerId);
    if (!teams || teams.length === 0) {
      return {
        manager: await managerObj.toJSON(responseValue.MINIMAL),
        has_team: false,
        team: null,
        total_members: 0,
        members: [],
      };
    }

    // Prendre la première équipe (un manager devrait avoir une seule équipe principale)
    const mainTeam = teams[0];
    const visited = new Set<number>();

    return await mainTeam._buildManagerTeamHierarchy(managerId, visited);
  }

  static async exportable(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    let items: any[] = [];
    const teams = await this._list(conditions, paginationOptions);
    if (teams) {
      items = await Promise.all(teams.map(async (team) => await team.toJSON()));
    }
    return {
      revision: await TenantRevision.getRevision(tableName.TEAMS),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || items.length,
        count: items.length,
      },
      items,
    };
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

  getMembers(): TI.TeamMember[] {
    return this.members || [];
  }
  /**
   * Récupère uniquement les membres actifs
   */
  getActiveMembers(): TI.TeamMember[] {
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

  getAssignedSessions(): TI.AssignedSession[] {
    return this.assigned_sessions || [];
  }

  async getSessionTemplateObj(template: number): Promise<SessionTemplate | null> {
    if (!this.sessionTemplateObjs.has(template)) {
      const templateObj = await SessionTemplate._load(template);
      if (templateObj) {
        this.sessionTemplateObjs.set(template, templateObj);
      }
    }
    return this.sessionTemplateObjs.get(template) || null;
  }

  getDeletedAt(): Date | undefined {
    return this.deleted_at;
  }

  // ============================================
  // SETTERS
  // ============================================

  setName(name: string): Teams {
    this.name = name;
    return this;
  }

  setManager(manager: number): Teams {
    this.manager = manager;
    return this;
  }

  setMembers(members: TI.TeamMember[]): Teams {
    this.members = members;
    return this;
  }

  setAssignedSessions(sessions: TI.AssignedSession[]): Teams {
    this.assigned_sessions = sessions;
    return this;
  }

  // ============================================
  // MÉTHODES MÉTIER - GESTION DES MEMBRES
  // ============================================

  /**
   * Ajouter un membre à l'équipe
   */
  addMember(user: number, joinedAt?: Date, active: boolean = true): Teams {
    const newMember: TI.TeamMember = {
      user: user,
      joined_at: joinedAt || TimezoneConfigUtils.getCurrentTime(),
      active,
    };

    this.members = TeamsValidationUtils.addMember(this.members, newMember);
    return this;
  }

  /**
   * Retirer un membre de l'équipe
   */
  removeMember(user: number): Teams {
    this.members = TeamsValidationUtils.removeMember(this.members, user);
    return this;
  }

  /**
   * Mettre à jour le statut d'un membre
   */
  updateMemberStatus(user: number, active: boolean): Teams {
    this.members = TeamsValidationUtils.updateMemberStatus(this.members, user, active);
    return this;
  }

  /**
   * Vérifier si un utilisateur est membre
   */
  hasMember(user: number): boolean {
    return TeamsValidationUtils.hasMember(this.members, user);
  }

  /**
   * Vérifier si un membre est actif
   */
  isMemberActive(user: number): boolean {
    return TeamsValidationUtils.isMemberActive(this.members, user);
  }

  /**
   * Récupère tous les membres directs (1er niveau uniquement)
   * @returns Liste des utilisateurs membres directs de cette équipe
   */
  async getDirectMembers(): Promise<User[]> {
    const members = this.getActiveMembers();
    const userObjs: User[] = [];

    for (const member of members) {
      const userObj = await this.getMemberObj(member.user);
      if (userObj) {
        userObjs.push(userObj);
      }
    }

    return userObjs;
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
   * Récupère TOUS les membres (directs + sous-équipes) de manière récursive
   * @returns Liste complète de tous les utilisateurs (incluant sous-équipes)
   */
  async getAllMembersRecursive(): Promise<User[]> {
    const visited = new Set<number>(); // Éviter les boucles infinies
    return await this._recursiveFetchAllMembers(visited);
  }

  /**
   * Construit l'arbre hiérarchique complet de l'équipe
   * Structure: { team, members: [{ user, roles, managedTeam }] }
   */
  async buildTeamHierarchyTree(): Promise<any> {
    const visited = new Set<number>();
    return await this._recursiveBuildTeamTree(visited);
  }

  /**
   * Compter les membres actifs
   */
  countActiveMembers(): number {
    return TeamsValidationUtils.countActiveMembers(this.members);
  }

  /**
   * Assigner une nouvelle session template
   */
  assignSession(sessionTemplate: number, assignAt?: Date, active: boolean = true): Teams {
    const newSession: TI.AssignedSession = {
      session_template: sessionTemplate,
      assign_at: assignAt || TimezoneConfigUtils.getCurrentTime(),
      active,
    };

    this.assigned_sessions = TeamsValidationUtils.assignSession(this.assigned_sessions, newSession);
    return this;
  }

  /**
   * Activer une session template spécifique
   */
  activateSession(sessionTemplate: number): Teams {
    this.assigned_sessions = TeamsValidationUtils.activateSession(
      this.assigned_sessions,
      sessionTemplate,
    );
    return this;
  }

  /**
   * Désactiver toutes les sessions
   */
  deactivateAllSessions(): Teams {
    this.assigned_sessions = TeamsValidationUtils.deactivateAllSessions(this.assigned_sessions);
    return this;
  }

  /**
   * Récupérer la session active
   */
  getActiveSession(): TI.AssignedSession | null {
    return TeamsValidationUtils.getActiveSession(this.assigned_sessions);
  }

  // ============================================
  // MÉTHODES MÉTIER - GESTION DES SESSIONS
  // ============================================

  /**
   * Vérifier si une session est active
   */
  hasActiveSession(): boolean {
    return this.getActiveSession() !== null;
  }

  /**
   * Obtenir un résumé de l'équipe
   */
  getSummary(): {
    totalMembers: number;
    activeMembers: number;
    inactiveMembers: number;
    hasActiveSession: boolean;
    activeSessionId: number | null;
    totalSessions: number;
  } {
    return TeamsValidationUtils.getTeamSummary(this);
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

    return TeamsValidationUtils.generateTeamReport(this, memberDetails);
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
      await W.isOccur(!this.id, `${G.identifierMissing.code}: Teams Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  // ============================================
  // MÉTHODES STANDARD
  // ============================================

  async restoreTeam(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: Teams Restore`);
      return await this.restore(this.id);
    }
    return false;
  }

  async load(identifier: any, byGuid: boolean = false): Promise<Teams | null> {
    let data = null;

    if (byGuid) {
      data = await this.findByGuid(identifier);
    } else {
      data = await this.find(Number(identifier));
    }

    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Teams[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Teams().hydrate(data));
  }

  async listByManager(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Teams[] | null> {
    const dataset = await this.listAllByManager(manager, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Teams().hydrate(data));
  }

  async listByMember(
    user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Teams[] | null> {
    const dataset = await this.listAllByMember(user, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Teams().hydrate(data));
  }

  // ============================================
  // CHARGEMENT ET LISTING
  // ============================================

  async listWithMembers(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Teams[] | null> {
    const dataset = await this.listAllWithMembers(paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Teams().hydrate(data));
  }

  async listWithActiveSession(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Teams[] | null> {
    const dataset = await this.listAllWithActiveSession(paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Teams().hydrate(data));
  }

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const managerObj = await this.getManagerObj();
    const activeSession = this.getActiveSession();
    const summary = this.getSummary();

    const baseModel = {
      [RS.GUID]: this.guid,
      [RS.NAME]: this.name,
      [RS.MANAGER]: managerObj ? await managerObj.toJSON(responseValue.MINIMAL) : null,
      [RS.CREATED_AT]: this.created_at,
      [RS.UPDATED_AT]: this.updated_at,
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseModel,
        total_members: summary.totalMembers,
        active_members: summary.activeMembers,
        has_active_session: summary.hasActiveSession,
      };
    }

    // Mode FULL
    const memberObjs = await this.getAllMemberObjs();
    const enrichedMembers = await Promise.all(
      this.members.map(async (member) => {
        const userObj = await this.getMemberObj(member.user);
        return {
          user: userObj ? await userObj.toJSON(responseValue.MINIMAL) : null,
          joined_at: member.joined_at,
          active: member.active !== false,
        };
      }),
    );

    const enrichedSessions = await Promise.all(
      this.assigned_sessions.map(async (session) => {
        const templateObj = await this.getSessionTemplateObj(session.session_template);
        return {
          session_template: templateObj ? templateObj.toJSON() : null,
          assign_at: session.assign_at,
          active: session.active,
        };
      }),
    );

    return {
      ...baseModel,
      summary,
      members: {
        count: enrichedMembers.length,
        items: enrichedMembers,
      },
      assigned_sessions: {
        count: enrichedSessions.length,
        active_session: activeSession
          ? {
              session_template: activeSession.session_template,
              assign_at: activeSession.assign_at,
            }
          : null,
        items: enrichedSessions,
      },
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

  /**
   * Méthode récursive privée pour aplatir tous les membres
   */
  private async _recursiveFetchAllMembersFlat(
    rootManagerId: number,
    visited: Set<number>,
    accumulator: User[],
  ): Promise<void> {
    if (!this.id || visited.has(this.id)) return;
    visited.add(this.id);

    // Ajouter les membres directs
    const directMembers = await this.getDirectMembers();
    accumulator.push(...directMembers);

    // Pour chaque membre, vérifier s'il manage une équipe
    for (const member of directMembers) {
      const memberId = member.getId();
      if (!memberId) continue;

      const memberTeams = await Teams._listByManager(memberId);

      if (memberTeams && memberTeams.length > 0) {
        const isInHierarchy = await OrgHierarchy.isUserInHierarchy(memberId, rootManagerId);

        if (isInHierarchy) {
          const memberTeam = memberTeams[0];
          await memberTeam._recursiveFetchAllMembersFlat(rootManagerId, visited, accumulator);
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
  private async _buildManagerTeamHierarchy(
    rootManagerId: number,
    visited: Set<number>,
  ): Promise<any> {
    // Protection contre les boucles infinies
    if (!this.id || visited.has(this.id)) {
      return null;
    }
    visited.add(this.id);

    const managerObj = await this.getManagerObj();
    if (!managerObj) return null;

    // Récupérer les membres directs de cette équipe
    const directMembers = await this.getDirectMembers();
    const activeSession = this.getActiveSession();

    const membersWithSubTeams = [];

    for (const member of directMembers) {
      const memberId = member.getId();
      if (!memberId) continue;

      const memberData: any = {
        user: await member.toJSON(responseValue.MINIMAL),
        is_team_manager: false,
        managed_team: null,
      };

      // Vérifier si ce membre est manager d'une équipe
      const memberTeams = await Teams._listByManager(memberId);

      if (memberTeams && memberTeams.length > 0) {
        // ✅ VALIDATION HIÉRARCHIQUE : Ce membre doit être sous le rootManager dans l'organigramme
        const isInHierarchy = await OrgHierarchy.isUserInHierarchy(memberId, rootManagerId);

        if (isInHierarchy) {
          // Ce membre est manager ET hiérarchiquement en dessous
          const memberTeam = memberTeams[0]; // Prendre la première équipe
          memberData.is_team_manager = true;

          // Récursion : construire la sous-équipe
          const subTeamHierarchy = await memberTeam._buildManagerTeamHierarchy(
            rootManagerId,
            visited,
          );

          if (subTeamHierarchy) {
            memberData.managed_team = subTeamHierarchy;
          }
        }
      }

      membersWithSubTeams.push(memberData);
    }

    // Récupérer les détails de la session active
    let activeSessionDetails = null;
    if (activeSession) {
      const sessionTemplateObj = await this.getSessionTemplateObj(activeSession.session_template);
      activeSessionDetails = {
        template: sessionTemplateObj ? await sessionTemplateObj.toJSON() : null,
        assigned_at: activeSession.assign_at,
      };
    }

    return {
      team: {
        guid: this.guid,
        name: this.name,
        manager: await managerObj.toJSON(responseValue.MINIMAL),
        has_active_session: activeSession !== null,
        active_session: activeSessionDetails,
      },
      total_direct_members: directMembers.length,
      members: membersWithSubTeams,
    };
  }

  // ============================================
  // SÉRIALISATION
  // ============================================

  /**
   * Méthode privée récursive pour récupérer tous les membres
   */
  private async _recursiveFetchAllMembers(visited: Set<number>): Promise<User[]> {
    // Protection contre les boucles infinies
    if (!this.id || visited.has(this.id)) {
      return [];
    }
    visited.add(this.id);

    const allUsers: User[] = [];

    // 1. Récupérer les membres directs
    const directMembers = await this.getDirectMembers();
    allUsers.push(...directMembers);

    // 2. Pour chaque membre, vérifier s'il manage une équipe
    for (const member of directMembers) {
      const memberId = member.getId();
      if (!memberId) continue;

      // Chercher les équipes où ce membre est manager
      const subTeams = await Teams._listByManager(memberId);

      if (subTeams && subTeams.length > 0) {
        for (const subTeam of subTeams) {
          // Récursion : récupérer les membres de la sous-équipe
          const subMembers = await subTeam._recursiveFetchAllMembers(visited);
          allUsers.push(...subMembers);
        }
      }
    }

    return allUsers;
  }

  /**
   * Méthode privée récursive pour construire l'arbre
   */
  private async _recursiveBuildTeamTree(visited: Set<number>): Promise<any> {
    // Protection contre les boucles infinies
    if (!this.id || visited.has(this.id)) {
      return null;
    }
    visited.add(this.id);

    const directMembers = await this.getDirectMembers();
    const membersWithSubTeams = [];

    for (const member of directMembers) {
      const memberId = member.getId();
      if (!memberId) continue;

      // Charger les équipes managées par ce membre
      const managedTeams = await Teams._listByManager(memberId);

      const memberData: any = {
        user: await member.toJSON(responseValue.MINIMAL),
        managed_teams: [],
      };

      if (managedTeams && managedTeams.length > 0) {
        for (const subTeam of managedTeams) {
          const subTreeData = await subTeam._recursiveBuildTeamTree(visited);
          if (subTreeData) {
            memberData.managed_teams.push(subTreeData);
          }
        }
      }

      membersWithSubTeams.push(memberData);
    }

    return {
      team: await this.toJSON(responseValue.MINIMAL),
      members: membersWithSubTeams,
    };
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  private hydrate(data: any): Teams {
    this.id = data.id;
    this.guid = data.guid;
    this.name = data.name;
    this.manager = data.manager;
    this.members = data.members || [];
    this.assigned_sessions = data.assigned_sessions || [];
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.deleted_at = data.deleted_at;
    return this;
  }
}
