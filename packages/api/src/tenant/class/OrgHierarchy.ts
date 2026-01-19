import { RelationshipType, TimezoneConfigUtils } from '@toke/shared';

import OrgHierarchyModel from '../model/OrgHierarchyModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import {
  responseStructure as RS,
  responseValue,
  RoleValues,
  tableName,
  ViewMode,
} from '../../utils/response.model.js';
import { TenantRevision } from '../../tools/revision.js';

import User from './User.js';
import UserRole from './UserRole.js';
import Groups from './Groups.js';
import Role from './Role.js';

export default class OrgHierarchy extends OrgHierarchyModel {
  private subordinateObj?: User;
  private supervisorObj?: User;

  constructor() {
    super();
  }

  // === MÉTHODES STATIQUES DE CHARGEMENT ===

  static _load(identifier: any, byGuid: boolean = false): Promise<OrgHierarchy | null> {
    return new OrgHierarchy().load(identifier, byGuid);
  }

  static _loadBySubordinate(subordinate: number): Promise<OrgHierarchy | null> {
    return new OrgHierarchy().loadBySubordinate(subordinate);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<OrgHierarchy[] | null> {
    return new OrgHierarchy().list(conditions, paginationOptions);
  }

  static _listBySubordinate(
    subordinate_id: number,
    paginationOptions?: { offset?: number; limit?: number },
  ): Promise<OrgHierarchy[] | null> {
    return new OrgHierarchy().listBySubordinate(subordinate_id, paginationOptions);
  }

  static _listBySupervisor(
    supervisor_id: number,
    paginationOptions?: { offset?: number; limit?: number },
  ): Promise<OrgHierarchy[] | null> {
    return new OrgHierarchy().listBySupervisor(supervisor_id, paginationOptions);
  }

  static _listByDepartment(
    department: string,
    paginationOptions?: { offset?: number; limit?: number },
  ): Promise<OrgHierarchy[] | null> {
    return new OrgHierarchy().listByDepartment(department, paginationOptions);
  }

  static _listActiveRelations(paginationOptions?: {
    offset?: number;
    limit?: number;
  }): Promise<OrgHierarchy[] | null> {
    return new OrgHierarchy().listActiveRelations(paginationOptions);
  }

  static async getCurrentSupervisor(
    subordinate_id: number,
    date?: Date,
    paginationOptions?: { offset?: number; limit?: number },
  ): Promise<OrgHierarchy | null> {
    return new OrgHierarchy().getCurrentSupervisor(subordinate_id, date, paginationOptions);
  }

  static async getActiveSubordinates(
    supervisor_id: number,
    date?: Date,
    paginationOptions?: { offset?: number; limit?: number },
  ): Promise<OrgHierarchy[] | null> {
    return new OrgHierarchy().getActiveSubordinates(supervisor_id, date, paginationOptions);
  }

  static async _getAllSubordinates(supervisor_id: number): Promise<User[]> {
    const org = new OrgHierarchy();
    const visited = new Set<number>(); // éviter les boucles
    return await org._recursiveFetchSubordinates(supervisor_id, visited);
  }

  static async _buildHierarchyTree(supervisorId: number): Promise<any[]> {
    const org = new OrgHierarchy();
    const visited = new Set<number>(); // éviter les boucles
    return await org._recursiveHierarchy(supervisorId, visited);
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
    const hierarchies = await this._list(conditions, paginationOptions);
    if (hierarchies) {
      items = await Promise.all(
        hierarchies.map(async (hierarchy) => await hierarchy.toJSON(responseValue.MINIMAL)),
      );
    }
    return {
      revision: await TenantRevision.getRevision(tableName.ORG_HIERARCHY),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || items.length,
        count: items.length,
      },
      items,
    };
  }

  /**
   * Récupère tous les utilisateurs descendants dans la hiérarchie (subordinés directs et indirects)
   * @param supervisor_id ID du superviseur
   * @param includeIndirect Si true, inclut tous les niveaux (défaut: true)
   * @returns Liste de tous les user IDs descendants
   */
  static async getAllDescendantUserIds(
    supervisor_id: number,
    includeIndirect: boolean = true,
  ): Promise<number[]> {
    const org = new OrgHierarchy();
    const visited = new Set<number>();

    if (includeIndirect) {
      // Récursif : tous les niveaux
      return await org._recursiveFetchSubordinateIds(supervisor_id, visited);
    } else {
      // Direct seulement
      const directRelations = await org.listAllActiveSubordinates(supervisor_id);
      if (!directRelations || directRelations.length === 0) return [];
      return directRelations.map((relation) => relation[org.db.subordinate]);
    }
  }

  /**
   * Vérifie si un utilisateur est dans la hiérarchie d'un superviseur (direct ou indirect)
   * @param userId ID de l'utilisateur à vérifier
   * @param supervisorId ID du superviseur
   * @returns true si l'utilisateur est un descendant du superviseur
   */
  static async isUserInHierarchy(userId: number, supervisorId: number): Promise<boolean> {
    const descendants = await this.getAllDescendantUserIds(supervisorId);
    return descendants.includes(userId);
  }

  /**
   * 🎯 MÉTHODE PRINCIPALE RÉVISÉE
   * Récupère TOUTE l'équipe d'un manager en respectant les 3 sources
   */
  // static async getAllTeamMembers(managerId: number): Promise<{
  //   direct_employees: Array<{
  //     user: User;
  //     source: 'user_role' | 'group';
  //     in_group: boolean;
  //     group_name?: string;
  //   }>;
  //   sub_managers: Array<{
  //     manager: User;
  //     team: any; // Résultat récursif
  //   }>;
  //   all_employees_flat: User[];
  //   anomalies: Array<{
  //     user_guid: string;
  //     issue: string;
  //     details: string;
  //   }>;
  // }> {
  //   const result: any = {
  //     direct_employees: [],
  //     sub_managers: [],
  //     all_employees_flat: [],
  //     anomalies: [],
  //   };
  //
  //   const employeeRole = await Role._load(RoleValues.EMPLOYEE, false, true);
  //   if (!employeeRole) {
  //     throw new Error('EMPLOYEE role not found');
  //   }
  //
  //   // 🔹 ÉTAPE 1 : Récupérer les employés assignés par ce manager
  //   const assignedEmployees = await UserRole._listByMyManagerAndRole(
  //     managerId,
  //     employeeRole.getId()!,
  //   );
  //
  //   const assignedEmployeeIds = new Set(
  //     assignedEmployees?.map((ur) => ur.getUser()).filter(Boolean) || [],
  //   );
  //
  //   // 🔹 ÉTAPE 2 : Récupérer les membres du groupe du manager
  //   const managerGroups = await Groups._listByManager(managerId);
  //   const groupMembers = new Map<number, string>(); // userId -> groupName
  //
  //   if (managerGroups && managerGroups.length > 0) {
  //     for (const group of managerGroups) {
  //       const members = await group.getDirectMembers();
  //       for (const member of members) {
  //         groupMembers.set(member.getId()!, group.getName()!);
  //       }
  //     }
  //   }
  //
  //   // 🔹 ÉTAPE 3 : Fusionner et vérifier les conflits
  //   const processedUserIds = new Set<number>();
  //
  //   // Traiter les employés assignés
  //   for (const userId of assignedEmployeeIds) {
  //     if (processedUserIds.has(userId!)) continue;
  //     processedUserIds.add(userId!);
  //
  //     const userObj = await User._load(userId);
  //     if (!userObj) continue;
  //
  //     // Vérifier s'il est dans un autre groupe
  //     const otherGroupConflict = await this._checkGroupConflict(userId!, managerId);
  //     if (otherGroupConflict) {
  //       result.anomalies.push({
  //         user_guid: userObj.getGuid()!,
  //         issue: 'group_conflict',
  //         details: `Employee assigned by manager ${managerId} but active in group managed by ${otherGroupConflict.conflictManagerId}`,
  //       });
  //       continue; // ❌ Exclure cet employé
  //     }
  //
  //     // Vérifier s'il est manager
  //     const isManager = await this.isUserManager(userId!);
  //     if (isManager) {
  //       // 🔁 Récursion pour sous-équipe
  //       const subTeam = await this.getAllTeamMembers(userId!);
  //       result.sub_managers.push({
  //         manager: userObj,
  //         team: subTeam,
  //       });
  //       result.all_employees_flat.push(...subTeam.all_employees_flat);
  //     } else {
  //       // ✅ Employé valide
  //       result.direct_employees.push({
  //         user: userObj,
  //         source: 'user_role',
  //         in_group: groupMembers.has(userId!),
  //         group_name: groupMembers.get(userId!),
  //       });
  //       result.all_employees_flat.push(userObj);
  //     }
  //   }
  //
  //   // Traiter les membres du groupe non encore traités
  //   for (const [userId, groupName] of groupMembers.entries()) {
  //     if (processedUserIds.has(userId)) continue;
  //     processedUserIds.add(userId);
  //
  //     const userObj = await User._load(userId);
  //     if (!userObj) continue;
  //
  //     // Vérifier s'il est assigné par un autre manager
  //     const assignedByAnother = await this._checkAssignedByConflict(userId, managerId);
  //     if (assignedByAnother) {
  //       result.anomalies.push({
  //         user_guid: userObj.getGuid()!,
  //         issue: 'assigned_by_conflict',
  //         details: `In group of manager ${managerId} but assigned by manager ${assignedByAnother.assignedByManagerId}`,
  //       });
  //       continue; // ❌ Exclure
  //     }
  //
  //     const isManager = await this.isUserManager(userId);
  //     if (isManager) {
  //       const subTeam = await this.getAllTeamMembers(userId);
  //       result.sub_managers.push({
  //         manager: userObj,
  //         team: subTeam,
  //       });
  //       result.all_employees_flat.push(...subTeam.all_employees_flat);
  //     } else {
  //       result.direct_employees.push({
  //         user: userObj,
  //         source: 'group',
  //         in_group: true,
  //         group_name: groupName,
  //       });
  //       result.all_employees_flat.push(userObj);
  //     }
  //   }
  //
  //   return result;
  // }

  /**
   * 🎯 MÉTHODE PRINCIPALE RÉVISÉE
   * Récupère TOUTE l'équipe d'un manager en respectant les 3 sources
   * ✅ Un manager est AUSSI un employé de son supervisor
   */
  static async getAllTeamMembers(managerId: number): Promise<{
    direct_employees: Array<{
      user: User;
      source: 'user_role' | 'group';
      in_group: boolean;
      group_name?: string;
    }>;
    sub_managers: Array<{
      manager: User;
      team: any;
    }>;
    all_employees_flat: User[];
    anomalies: Array<{
      user_guid: string;
      issue: string;
      details: string;
    }>;
  }> {
    const result: any = {
      direct_employees: [],
      sub_managers: [],
      all_employees_flat: [],
      anomalies: [],
    };

    const employeeRole = await Role._load(RoleValues.EMPLOYEE, false, true);
    if (!employeeRole) {
      throw new Error('EMPLOYEE role not found');
    }

    // 🔹 ÉTAPE 1 : Employés assignés par ce manager
    const assignedEmployees = await UserRole._listByMyManagerAndRole(
      managerId,
      employeeRole.getId()!,
    );

    const assignedEmployeeIds = new Set(
      assignedEmployees?.map((ur) => ur.getUser()).filter(Boolean) || [],
    );

    // 🔹 ÉTAPE 2 : Membres des groupes du manager
    const managerGroups = await Groups._listByManager(managerId);
    const groupMembers = new Map<number, string>(); // userId -> groupName

    if (managerGroups && managerGroups.length > 0) {
      for (const group of managerGroups) {
        const members = await group.getDirectMembers();
        for (const member of members) {
          groupMembers.set(member.getId()!, group.getName()!);
        }
      }
    }

    // 🔹 ÉTAPE 3 : Fusion
    const processedUserIds = new Set<number>();

    // -------- ASSIGNED EMPLOYEES --------
    for (const userId of assignedEmployeeIds) {
      if (processedUserIds.has(userId!)) continue;
      processedUserIds.add(userId!);

      const userObj = await User._load(userId);
      if (!userObj) continue;

      // Conflit de groupe
      const otherGroupConflict = await this._checkGroupConflict(userId!, managerId);
      if (otherGroupConflict) {
        result.anomalies.push({
          user_guid: userObj.getGuid()!,
          issue: 'group_conflict',
          details: `Employee assigned by manager ${managerId} but active in group managed by ${otherGroupConflict.conflictManagerId}`,
        });
        continue;
      }

      // ✅ Toujours employé direct
      result.direct_employees.push({
        user: userObj,
        source: 'user_role',
        in_group: groupMembers.has(userId!),
        group_name: groupMembers.get(userId!),
      });

      result.all_employees_flat.push(userObj);

      // 🔁 Si manager, ajouter sous-équipe
      const isManager = await this.isUserManager(userId!);
      if (isManager) {
        const subTeam = await this.getAllTeamMembers(userId!);
        result.sub_managers.push({
          manager: userObj,
          team: subTeam,
        });
        result.all_employees_flat.push(...subTeam.all_employees_flat);
      }
    }

    // -------- GROUP MEMBERS --------
    for (const [userId, groupName] of groupMembers.entries()) {
      if (processedUserIds.has(userId)) continue;
      processedUserIds.add(userId);

      const userObj = await User._load(userId);
      if (!userObj) continue;

      // Conflit d'assignation
      const assignedByAnother = await this._checkAssignedByConflict(userId, managerId);
      if (assignedByAnother) {
        result.anomalies.push({
          user_guid: userObj.getGuid()!,
          issue: 'assigned_by_conflict',
          details: `In group of manager ${managerId} but assigned by manager ${assignedByAnother.assignedByManagerId}`,
        });
        continue;
      }

      // ✅ Toujours employé direct
      result.direct_employees.push({
        user: userObj,
        source: 'group',
        in_group: true,
        group_name: groupName,
      });

      result.all_employees_flat.push(userObj);

      // 🔁 Si manager, ajouter sous-équipe
      const isManager = await this.isUserManager(userId);
      if (isManager) {
        const subTeam = await this.getAllTeamMembers(userId);
        result.sub_managers.push({
          manager: userObj,
          team: subTeam,
        });
        result.all_employees_flat.push(...subTeam.all_employees_flat);
      }
    }

    return result;
  }

  // Méthode utilitaire
  static async isUserManager(userId: number): Promise<boolean> {
    // Vérifier si user a une équipe OU est dans OrgHierarchy comme supervisor
    // const hasGroup = await Groups._listByManager(userId);
    // if (!hasGroup || hasGroup.length === 0) return false;
    // return hasGroup && hasGroup.length > 0;
    const hasHierarchy = await OrgHierarchy._loadBySubordinate(userId);
    return !!hasHierarchy;
  }

  static async serializeTeam(team: any) {
    return {
      direct_employees: await Promise.all(
        team.direct_employees.map(async (e: any) => ({
          user: await e.user.toJSON(responseValue.FULL),
          in_group: e.in_group,
          group_name: e.group_name ?? null,
        })),
      ),

      sub_managers: await Promise.all(
        team.sub_managers.map(async (sub: any) => ({
          manager: await sub.manager.toJSON(responseValue.FULL),
          team: await this.serializeTeam(sub.team),
        })),
      ),

      all_employees_flat: await Promise.all(
        team.all_employees_flat.map(async (u: any) => await u.toJSON(responseValue.MINIMAL)),
      ),
    };
  }

  /**
   * Liste TOUS les membres directs d'un manager :
   * - Managers (via OrgHierarchy)
   * - Employés (via Groups)
   */
  static async getDirectTeam(managerId: number): Promise<{
    managers: OrgHierarchy[];
    employees: User[];
    all: User[];
  }> {
    const result: any = {
      managers: [],
      employees: [],
      all: [],
    };

    // 1️⃣ Managers (OrgHierarchy)
    const managerRelations = await this._listBySupervisor(managerId);
    if (managerRelations) {
      result.managers = managerRelations;
      for (const rel of managerRelations) {
        const manager = await rel.getSubordinateObj();
        if (manager) result.all.push(manager);
      }
    }

    // 2️⃣ Employés (Groups)
    const groups = await Groups._listByManager(managerId);
    if (groups && groups.length > 0) {
      const members = await groups[0].getDirectMembers();

      // Filtrer pour exclure ceux déjà comptés comme managers
      const managerIds = new Set(result.managers.map((m: OrgHierarchy) => m.getSubordinate()));
      const pureEmployees = members.filter((m) => !managerIds.has(m.getId()!));

      result.employees = pureEmployees;
      result.all.push(...pureEmployees);
    }

    return result;
  }

  /**
   * Trouve le superviseur d'un employé en cherchant dans UserRole et Groups
   */
  static async findEmployeeSupervisor(
    userId: number,
    date?: Date,
  ): Promise<{
    supervisor: User | null;
    source: 'org_hierarchy' | 'user_role' | 'group';
    details?: string;
  } | null> {
    // 1️⃣ Essayer via OrgHierarchy (pour managers)
    const hierarchySupervisor = await this.getCurrentSupervisor(userId, date);
    if (hierarchySupervisor) {
      const supervisorObj = await hierarchySupervisor.getSupervisorObj();
      return {
        supervisor: supervisorObj,
        source: 'org_hierarchy',
      };
    }

    // 2️⃣ Chercher via UserRole.assigned_by (EMPLOYEE role)
    const employeeRole = await Role._load(RoleValues.EMPLOYEE, false, true);
    if (employeeRole) {
      const userRoles = await UserRole._listByUser(userId);
      if (userRoles) {
        for (const ur of userRoles) {
          if (ur.getRole() === employeeRole.getId() && ur.getAssignedBy()) {
            const supervisor = await User._load(ur.getAssignedBy()!);
            return {
              supervisor,
              source: 'user_role',
              details: `Assigned by manager via EMPLOYEE role`,
            };
          }
        }
      }
    }

    // 3️⃣ Chercher via Groups
    const userGroups = await Groups._listByMember(userId);
    if (userGroups && userGroups.length > 0) {
      for (const group of userGroups) {
        const members = group.getMembers();
        const activeMember = members.find((m) => m.user === userId && m.active !== false);

        if (activeMember) {
          const manager = await group.getManagerObj();
          return {
            supervisor: manager,
            source: 'group',
            details: `Active member of group "${group.getName()}"`,
          };
        }
      }
    }

    return null;
  }

  // === GETTERS FLUENT ===

  /**
   * 🔍 Vérifie si un employé est actif dans un groupe d'un autre manager
   */
  private static async _checkGroupConflict(
    userId: number,
    currentManagerId: number,
  ): Promise<{ conflictManagerId: number } | null> {
    const userGroups = await Groups._listByMember(userId);
    if (!userGroups) return null;

    for (const group of userGroups) {
      const managerId = group.getManager();
      if (managerId === currentManagerId) continue;

      // Vérifier si actif dans ce groupe
      const members = group.getMembers();
      const activeMember = members.find((m) => m.user === userId && m.active !== false);

      if (activeMember) {
        return { conflictManagerId: managerId! };
      }
    }

    return null;
  }

  /**
   * 🔍 Vérifie si un employé est assigné par un autre manager
   */
  private static async _checkAssignedByConflict(
    userId: number,
    currentManagerId: number,
  ): Promise<{ assignedByManagerId: number } | null> {
    const employeeRole = await Role._load(RoleValues.EMPLOYEE, false, true);
    if (!employeeRole) return null;

    const userRoles = await UserRole._listByUser(userId);
    if (!userRoles) return null;

    for (const ur of userRoles) {
      if (ur.getRole() === employeeRole.getId()) {
        const assignedBy = ur.getAssignedBy();
        if (assignedBy && assignedBy !== currentManagerId) {
          return { assignedByManagerId: assignedBy };
        }
      }
    }

    return null;
  }

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getSubordinate(): number | undefined {
    return this.subordinate;
  }

  getSupervisor(): number | undefined {
    return this.supervisor;
  }

  async getSubordinateObj(): Promise<User | null> {
    if (!this.subordinate) return null;
    if (!this.subordinateObj) {
      this.subordinateObj = (await User._load(this.subordinate)) || undefined;
    }
    return this.subordinateObj || null;
  }

  async getSupervisorObj(): Promise<User | null> {
    if (!this.supervisor) return null;
    if (!this.supervisorObj) {
      this.supervisorObj = (await User._load(this.supervisor)) || undefined;
    }
    return this.supervisorObj || null;
  }

  getRelationshipType(): string | undefined {
    return this.relationship_type;
  }

  getEffectiveFrom(): string | undefined | Date {
    return this.effective_from;
  }

  getEffectiveTo(): string | null | undefined | Date {
    return this.effective_to;
  }

  getDepartment(): string | undefined {
    return this.department;
  }

  getCostCenter(): string | undefined {
    return this.cost_center;
  }

  getDelegationLevel(): number | undefined {
    return this.delegation_level;
  }

  getCreatedAt(): Date | undefined {
    return this.created_at;
  }

  // === SETTERS FLUENT ===

  getUpdatedAt(): Date | undefined {
    return this.updated_at;
  }

  setSubordinate(subordinate: number): OrgHierarchy {
    this.subordinate = subordinate;
    return this;
  }

  setSupervisor(supervisor: number): OrgHierarchy {
    this.supervisor = supervisor;
    return this;
  }

  setRelationshipType(relationship_type: string): OrgHierarchy {
    this.relationship_type = relationship_type;
    return this;
  }

  setEffectiveFrom(effective_from: string | Date): OrgHierarchy {
    this.effective_from = effective_from;
    return this;
  }

  setEffectiveTo(effective_to: string | null | Date): OrgHierarchy {
    this.effective_to = effective_to;
    return this;
  }

  setDepartment(department: string): OrgHierarchy {
    this.department = department;
    return this;
  }

  setCostCenter(cost_center: string): OrgHierarchy {
    this.cost_center = cost_center;
    return this;
  }

  // === MÉTHODES MÉTIER HIÉRARCHIQUES ===

  setDelegationLevel(delegation_level: number): OrgHierarchy {
    this.delegation_level = delegation_level;
    return this;
  }

  isActive(date?: Date): boolean {
    const checkDate = date || TimezoneConfigUtils.getCurrentTime();
    const checkDateStr = checkDate.toISOString().slice(0, 10);

    if (!this.effective_from || this.effective_from > checkDateStr) {
      return false;
    }

    return !(this.effective_to && this.effective_to < checkDateStr);
  }

  isDirectReport(): boolean {
    return this.relationship_type === RelationshipType.DIRECT_REPORT;
  }

  getDurationInDays(): number | null {
    if (!this.effective_from) return null;

    const startDate = new Date(this.effective_from);
    const endDate = this.effective_to
      ? new Date(this.effective_to)
      : TimezoneConfigUtils.getCurrentTime();

    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysUntilExpiration(): number | null {
    if (!this.effective_to) return null;

    const today = TimezoneConfigUtils.getCurrentTime();
    const expirationDate = new Date(this.effective_to);

    const diffTime = expirationDate.getTime() - today.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // === MÉTHODES DE RÉSOLUTION HIÉRARCHIQUE ===

  isExpiringSoon(days: number = 7): boolean {
    if (!this.effective_to) return false;
    const daysUntilExpiration = this.getDaysUntilExpiration();
    return daysUntilExpiration !== null && daysUntilExpiration <= days && daysUntilExpiration >= 0;
  }

  async getCurrentSupervisor(
    subordinate_id: number,
    date?: Date,
    paginationOptions?: { offset?: number; limit?: number },
  ): Promise<OrgHierarchy | null> {
    const data = await this.ListAllCurrentSupervisor(subordinate_id, date, paginationOptions);
    if (!data) return null;
    return new OrgHierarchy().hydrate(data);
  }

  async getActiveSubordinates(
    supervisor_id: number,
    date?: Date,
    paginationOptions?: { offset?: number; limit?: number },
  ): Promise<OrgHierarchy[] | null> {
    const dataset = await this.listAllActiveSubordinates(supervisor_id, date, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new OrgHierarchy().hydrate(data));
  }

  // === MÉTHODES DE TRANSFERT ===

  async transferEmployee(
    subordinate_id: number,
    new_supervisor_id: number,
    effective_date: string,
  ): Promise<void> {
    // Fermer relation actuelle
    const currentRelation = await this.getCurrentSupervisor(subordinate_id);
    if (currentRelation && currentRelation.isDirectReport()) {
      currentRelation.setEffectiveTo(effective_date);
      await currentRelation.save();
    }

    // Créer nouvelle relation
    const newHierarchy = new OrgHierarchy()
      .setSubordinate(subordinate_id)
      .setSupervisor(new_supervisor_id)
      .setRelationshipType(RelationshipType.DIRECT_REPORT)
      .setEffectiveFrom(effective_date)
      .setDelegationLevel(1);

    await newHierarchy.save();
  }

  // === MÉTHODES D'ANALYSE ===

  async getHierarchyStatistics(): Promise<any> {
    return await this.getHierarchyCountStatistics();
  }

  // === MÉTHODES DE BASE ===

  isNew(): boolean {
    return this.id === undefined;
  }

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

  async load(identifier: any, byGuid: boolean = false): Promise<OrgHierarchy | null> {
    let data = null;

    if (byGuid) {
      data = await this.findByGuid(identifier);
    } else {
      data = await this.find(Number(identifier));
    }

    if (!data) return null;
    return this.hydrate(data);
  }

  async loadBySubordinate(subordinate: number): Promise<OrgHierarchy | null> {
    const data = await this.findExistSubordinate(subordinate);
    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<OrgHierarchy[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new OrgHierarchy().hydrate(data));
  }

  async listBySubordinate(
    subordinate_id: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<OrgHierarchy[] | null> {
    const dataset = await this.listAllBySubordinate(subordinate_id, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new OrgHierarchy().hydrate(data));
  }

  async listBySupervisor(
    supervisor_id: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<OrgHierarchy[] | null> {
    const dataset = await this.listAllBySupervisor(supervisor_id, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new OrgHierarchy().hydrate(data));
  }

  async listByDepartment(
    department: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<OrgHierarchy[] | null> {
    const dataset = await this.listAllByDepartment(department, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new OrgHierarchy().hydrate(data));
  }

  async listActiveRelations(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<OrgHierarchy[] | null> {
    const dataset = await this.listAllActiveRelations(paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new OrgHierarchy().hydrate(data));
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: OrgHierarchy Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const subordinate = await this.getSubordinateObj();
    const supervisor = await this.getSupervisorObj();
    const baseData = {
      [RS.GUID]: this.guid,
      // [RS.SUBORDINATE]: this.subordinate,
      // [RS.SUPERVISOR]: this.supervisor,
      [RS.RELATIONSHIP_TYPE]: this.relationship_type,
      [RS.EFFECTIVE_FROM]: this.effective_from,
      [RS.EFFECTIVE_TO]: this.effective_to,
      [RS.DEPARTMENT]: this.department,
      [RS.COST_CENTER]: this.cost_center,
      [RS.DELEGATION_LEVEL]: this.delegation_level,
      [RS.CREATED_AT]: this.created_at,
      [RS.UPDATED_AT]: this.updated_at,
    };
    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.SUBORDINATE]: subordinate?.getGuid(),
        [RS.SUPERVISOR]: supervisor?.getGuid(),
      };
    }
    return {
      ...baseData,
      [RS.SUBORDINATE]: await subordinate?.toJSON(),
      [RS.SUPERVISOR]: await supervisor?.toJSON(),
    };
  }

  /**
   * Méthode privée récursive pour récupérer tous les IDs de subordinés
   */
  private async _recursiveFetchSubordinateIds(
    supervisor_id: number,
    visited: Set<number>,
  ): Promise<number[]> {
    if (visited.has(supervisor_id)) return [];
    visited.add(supervisor_id);

    const directRelations = await this.listAllActiveSubordinates(supervisor_id);
    if (!directRelations || directRelations.length === 0) return [];

    const allSubordinateIds: number[] = [];

    for (const relation of directRelations) {
      const subordinateId = relation[this.db.subordinate];
      allSubordinateIds.push(subordinateId);

      // Récursivité : chercher les subordonnés du subordonné
      const subIds = await this._recursiveFetchSubordinateIds(subordinateId, visited);
      allSubordinateIds.push(...subIds);
    }

    return allSubordinateIds;
  }

  // === MÉTHODES PRIVÉES ===

  private async _recursiveFetchSubordinates(
    supervisor_id: number,
    visited: Set<number>,
  ): Promise<User[]> {
    if (visited.has(supervisor_id)) return [];
    visited.add(supervisor_id);

    // Récupérer les relations directes
    const directRelations = await this.listAllBySupervisor(supervisor_id);
    if (!directRelations || directRelations.length === 0) return [];

    const allSubordinates: User[] = [];

    for (const relation of directRelations) {
      const subordinateId = relation[this.db.subordinate];
      const subordinate = await User._load(subordinateId);
      if (subordinate) {
        allSubordinates.push(subordinate);

        // Récursivité → chercher les subordonnés du subordonné
        const subSubs = await this._recursiveFetchSubordinates(subordinate.getId()!, visited);
        allSubordinates.push(...subSubs);
      }
    }

    return allSubordinates;
  }

  private async _recursiveHierarchy(supervisorId: number, visited: Set<number>): Promise<any[]> {
    if (visited.has(supervisorId)) return [];
    visited.add(supervisorId);

    // Récupérer les relations directes
    const relations = await this.listAllBySupervisor(supervisorId);
    if (!relations || relations.length === 0) return [];

    const hierarchy = [];

    for (const relation of relations) {
      const subordinateId = relation[this.db.subordinate];
      const subordinate = await User._load(subordinateId);
      if (!subordinate) continue;

      // Rôles du subordonné
      const roles = await UserRole._listByUser(subordinateId);

      // Récursivité : chercher les subordonnés du subordonné
      const subTree = await this._recursiveHierarchy(subordinateId, visited);

      hierarchy.push({
        user: await subordinate.toJSON(),
        roles: roles
          ? await Promise.all(roles.map(async (r) => await r.toJSON(responseValue.MINIMAL)))
          : [],
        subordinates: subTree,
      });
      // hierarchy.push({
      //   user: subordinate, // ⚠️ garder l’objet brut
      //   roles: roles || [],
      //   subordinates: subTree,
      // });
    }

    return hierarchy;
  }

  private hydrate(data: any): OrgHierarchy {
    this.id = data.id;
    this.guid = data.guid;
    this.subordinate = data.subordinate;
    this.supervisor = data.supervisor;
    this.relationship_type = data.relationship_type;
    this.effective_from = data.effective_from;
    this.effective_to = data.effective_to;
    this.department = data.department;
    this.cost_center = data.cost_center;
    this.delegation_level = data.delegation_level;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    return this;
  }
}
