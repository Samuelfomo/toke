// utils/teams.validation.ts
import { TEAMS_DEFAULTS, TEAMS_VALIDATION } from '../../constants/tenant/teams.js';
import { TimezoneConfigUtils } from '../timezone.config.validation.js';

export class TeamsValidationUtils {
  /**
   * Validates GUID
   */
  static validateGuid(guid: any): boolean {
    if (!guid || typeof guid !== 'string') return false;
    const trimmed = guid.trim();

    if (
      trimmed.length < TEAMS_VALIDATION.GUID.MIN_LENGTH ||
      trimmed.length > TEAMS_VALIDATION.GUID.MAX_LENGTH
    ) {
      return false;
    }

    // const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    // return uuidRegex.test(trimmed);
    const uuidRegex = /^[0-9]+$/;
    return uuidRegex.test(trimmed) || trimmed.length > 0; // Allow other GUID formats
  }

  /**
   * Validates team name
   */
  static validateName(name: any): boolean {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return (
      trimmed.length >= TEAMS_VALIDATION.NAME.MIN_LENGTH &&
      trimmed.length <= TEAMS_VALIDATION.NAME.MAX_LENGTH
    );
  }

  /**
   * Validates manager
   */
  static validateManager(manager: any): boolean {
    if (!manager || typeof manager !== 'string') return false;
    const trimmed = manager.trim();

    if (
      trimmed.length < TEAMS_VALIDATION.MANAGER.MIN_LENGTH ||
      trimmed.length > TEAMS_VALIDATION.MANAGER.MAX_LENGTH
    ) {
      return false;
    }

    // const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    // return uuidRegex.test(trimmed);
    const uuidRegex = /^[0-9]+$/;
    return uuidRegex.test(trimmed) || trimmed.length > 0; // Allow other GUID formats
  }

  /**
   * Validates user
   */
  static validateUser(user: any): boolean {
    if (!user || typeof user !== 'string') return false;
    const trimmed = user.trim();

    if (
      trimmed.length < TEAMS_VALIDATION.MEMBER.USER.MIN_LENGTH ||
      trimmed.length > TEAMS_VALIDATION.MEMBER.USER.MAX_LENGTH
    ) {
      return false;
    }

    // const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    // return uuidRegex.test(trimmed);
    const uuidRegex = /^[0-9]+$/;
    return uuidRegex.test(trimmed) || trimmed.length > 0; // Allow other GUID formats
  }

  /**
   * Validates session template
   */
  static validateSessionTemplate(sessionTemplate: any): boolean {
    if (!sessionTemplate || typeof sessionTemplate !== 'string') return false;
    const trimmed = sessionTemplate.trim();

    if (
      trimmed.length < TEAMS_VALIDATION.SESSION_TEMPLATE.MIN_LENGTH ||
      trimmed.length > TEAMS_VALIDATION.SESSION_TEMPLATE.MAX_LENGTH
    ) {
      return false;
    }

    // const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    // return uuidRegex.test(trimmed);
    const uuidRegex = /^[0-9]+$/;
    return uuidRegex.test(trimmed) || trimmed.length > 0; // Allow other GUID formats
  }
  /**
   * Validates date
   */
  static validateDate(date: Date | string | null): boolean {
    if (date === null || date === undefined) return true;
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }

  /**
   * Validates members array structure
   */
  static validateMembers(members: any): boolean {
    if (!Array.isArray(members)) return false;

    const userIds = new Set<number>();

    for (const member of members) {
      // Vérifier que c'est un objet
      if (typeof member !== 'object' || member === null || Array.isArray(member)) return false;

      // Vérifier user
      if (!this.validateUser(member.user)) return false;

      // Vérifier l'unicité
      if (userIds.has(member.user)) return false;
      userIds.add(member.user);

      // Vérifier joined_at
      if (!this.validateDate(member.joined_at)) return false;

      // Vérifier active (optionnel, true par défaut)
      if (member.active !== undefined && typeof member.active !== 'boolean') return false;
    }

    return true;
  }

  /**
   * Validates assigned sessions array structure
   */
  static validateAssignedSessions(sessions: any): boolean {
    if (!Array.isArray(sessions)) return false;

    let activeCount = 0;

    for (const session of sessions) {
      // Vérifier que c'est un objet
      if (typeof session !== 'object' || session === null || Array.isArray(session)) return false;

      // Vérifier session_template
      if (!this.validateSessionTemplate(session.session_template)) return false;

      // Vérifier assign_at
      if (!this.validateDate(session.assign_at)) return false;

      // Vérifier active
      if (typeof session.active !== 'boolean') return false;

      if (session.active) activeCount++;
    }

    // Vérifier qu'il n'y a qu'une seule session active
    return activeCount <= 1;
  }

  /**
   * Validates pagination parameters
   */
  static validatePaginationParams(offset: number, limit: number): boolean {
    return (
      Number.isInteger(offset) &&
      Number.isInteger(limit) &&
      offset >= 0 &&
      limit > 0 &&
      limit <= TEAMS_DEFAULTS.PAGINATION.MAX_LIMIT
    );
  }

  /**
   * Checks if a member exists in the team
   */
  static hasMember(members: any[], userId: number): boolean {
    return members.some((member) => member.user === userId);
  }

  /**
   * Checks if a member is active
   */
  static isMemberActive(members: any[], userId: number): boolean {
    const member = members.find((m) => m.user === userId);
    return member ? member.active !== false : false;
  }

  /**
   * Gets active session template
   */
  static getActiveSession(sessions: any[]): any | null {
    return sessions.find((session) => session.active === true) || null;
  }

  /**
   * Counts active members
   */
  static countActiveMembers(members: any[]): number {
    return members.filter((member) => member.active !== false).length;
  }

  /**
   * Cleans and normalizes team data
   */
  static cleanTeamData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Nettoyer le nom
    if (cleaned.name !== undefined && cleaned.name !== null) {
      cleaned.name = cleaned.name.toString().trim();
    }

    // Convertir manager en nombre
    if (cleaned.manager !== undefined && cleaned.manager !== null) {
      cleaned.manager = Number(cleaned.manager);
    }

    // Nettoyer GUID
    if (cleaned.guid !== undefined && cleaned.guid !== null) {
      cleaned.guid = cleaned.guid.toString().trim();
    }

    // Nettoyer members
    if (cleaned.members !== undefined && Array.isArray(cleaned.members)) {
      cleaned.members = cleaned.members.map((member: any) => ({
        user: Number(member.user),
        joined_at: member.joined_at
          ? new Date(member.joined_at)
          : TimezoneConfigUtils.getCurrentTime(),
        active: member.active !== undefined ? Boolean(member.active) : true,
      }));
    }

    // Nettoyer assigned_sessions
    if (cleaned.assigned_sessions !== undefined && Array.isArray(cleaned.assigned_sessions)) {
      cleaned.assigned_sessions = cleaned.assigned_sessions.map((session: any) => ({
        session_template: Number(session.session_template),
        assign_at: session.assign_at
          ? new Date(session.assign_at)
          : TimezoneConfigUtils.getCurrentTime(),
        active: Boolean(session.active),
      }));
    }

    // Convertir dates
    ['created_at', 'updated_at', 'deleted_at'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        const date = new Date(cleaned[field]);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid ${field}: must be a valid date`);
        }
        cleaned[field] = date;
      }
    });

    return cleaned;
  }

  /**
   * Validates that a team is complete for creation
   */
  static isValidForCreation(data: any): boolean {
    const requiredFields = ['name', 'manager'];

    // Vérifier les champs requis
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return false;
      }
    }

    return (
      this.validateName(data.name) &&
      this.validateManager(data.manager) &&
      (data.members === undefined || this.validateMembers(data.members)) &&
      (data.assigned_sessions === undefined ||
        this.validateAssignedSessions(data.assigned_sessions)) &&
      (data.guid === undefined || this.validateGuid(data.guid))
    );
  }

  /**
   * Validates that a team is valid for update
   */
  static isValidForUpdate(data: any): boolean {
    const validations = [
      data.name === undefined || this.validateName(data.name),
      data.manager === undefined || this.validateManager(data.manager),
      data.members === undefined || this.validateMembers(data.members),
      data.assigned_sessions === undefined || this.validateAssignedSessions(data.assigned_sessions),
      data.guid === undefined || this.validateGuid(data.guid),
    ];

    return validations.every((validation) => validation === true);
  }

  /**
   * Extracts validation errors for a team
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (data.name === undefined || data.name === null || !this.validateName(data.name)) {
      errors.push(
        `Invalid name: must be between ${TEAMS_VALIDATION.NAME.MIN_LENGTH} and ${TEAMS_VALIDATION.NAME.MAX_LENGTH} characters`,
      );
    }

    if (
      data.manager === undefined ||
      data.manager === null ||
      !this.validateManager(data.manager)
    ) {
      errors.push(
        `Invalid manager: must be between ${TEAMS_VALIDATION.MANAGER.MIN_LENGTH} and ${TEAMS_VALIDATION.MANAGER.MAX_LENGTH}`,
      );
    }

    if (data.members !== undefined && !this.validateMembers(data.members)) {
      errors.push('Invalid members: must be a valid array with unique user IDs');
    }

    if (
      data.assigned_sessions !== undefined &&
      !this.validateAssignedSessions(data.assigned_sessions)
    ) {
      errors.push(
        'Invalid assigned_sessions: must be a valid array with at most one active session',
      );
    }

    if (data.guid !== undefined && !this.validateGuid(data.guid)) {
      errors.push(
        `Invalid GUID: must be 1-${TEAMS_VALIDATION.GUID.MAX_LENGTH} characters and valid UUID v4 format`,
      );
    }

    return errors;
  }

  /**
   * Validates filter data for searches
   */
  static validateFilterData(data: any): boolean {
    return (
      (data.name && typeof data.name === 'string') ||
      (data.manager && this.validateManager(data.manager)) ||
      (data.has_members !== undefined && typeof data.has_members === 'boolean') ||
      (data.has_active_session !== undefined && typeof data.has_active_session === 'boolean') ||
      (data.member_user_id && this.validateUser(data.member_user)) ||
      (data.created_at_from && !isNaN(new Date(data.created_at_from).getTime())) ||
      (data.created_at_to && !isNaN(new Date(data.created_at_to).getTime())) ||
      (data.guid && this.validateGuid(data.guid))
    );
  }

  /**
   * Gets team summary
   */
  static getTeamSummary(team: any): {
    totalMembers: number;
    activeMembers: number;
    inactiveMembers: number;
    hasActiveSession: boolean;
    activeSessionId: number | null;
    totalSessions: number;
  } {
    const members = team.members || [];
    const sessions = team.assigned_sessions || [];

    const activeMembers = members.filter((m: any) => m.active !== false);
    const activeSession = sessions.find((s: any) => s.active === true);

    return {
      totalMembers: members.length,
      activeMembers: activeMembers.length,
      inactiveMembers: members.length - activeMembers.length,
      hasActiveSession: !!activeSession,
      activeSessionId: activeSession ? activeSession.session_template : null,
      totalSessions: sessions.length,
    };
  }

  /**
   * Generates team report
   */
  static generateTeamReport(team: any, memberDetails?: any[]) {
    const summary = this.getTeamSummary(team);

    const report = {
      team: {
        id: team.id,
        guid: team.guid,
        name: team.name,
        manager: team.manager,
        created_at: team.created_at,
      },
      summary,
      members: (team.members || []).map((member: any) => {
        const detail = memberDetails?.find((d) => d.id === member.user);
        return {
          user_id: member.user,
          name: detail?.name || 'Unknown',
          joined_at: member.joined_at,
          active: member.active !== false,
        };
      }),
      sessions: team.assigned_sessions || [],
      issues: [] as string[],
    };

    // Identifier les problèmes
    if (summary.totalMembers === 0) {
      report.issues.push('Team has no members');
    }

    if (!summary.hasActiveSession && summary.totalSessions > 0) {
      report.issues.push('No active session template assigned');
    }

    if (summary.activeMembers === 0 && summary.totalMembers > 0) {
      report.issues.push('All members are inactive');
    }

    return report;
  }

  /**
   * Adds a member to the team
   */
  static addMember(
    currentMembers: any[],
    newMember: { user: number; joined_at?: Date; active?: boolean },
  ): any[] {
    // Vérifier si le membre existe déjà
    if (this.hasMember(currentMembers, newMember.user)) {
      throw new Error('Member already exists in the team');
    }

    const member = {
      user: newMember.user,
      joined_at: newMember.joined_at || TimezoneConfigUtils.getCurrentTime(),
      active: newMember.active !== undefined ? newMember.active : true,
    };

    return [...currentMembers, member];
  }

  /**
   * Removes a member from the team
   */
  static removeMember(currentMembers: any[], userId: number): any[] {
    return currentMembers.filter((member) => member.user !== userId);
  }

  /**
   * Updates a member's status
   */
  static updateMemberStatus(currentMembers: any[], userId: number, active: boolean): any[] {
    return currentMembers.map((member) =>
      member.user === userId ? { ...member, active } : member,
    );
  }

  /**
   * Assigns a new session template
   */
  static assignSession(
    currentSessions: any[],
    newSession: { session_template: number; assign_at?: Date; active?: boolean },
  ): any[] {
    const session = {
      session_template: newSession.session_template,
      assign_at: newSession.assign_at || TimezoneConfigUtils.getCurrentTime(),
      active: newSession.active !== undefined ? newSession.active : true,
    };

    // Si la nouvelle session est active, désactiver les autres
    let sessions = currentSessions;
    if (session.active) {
      sessions = currentSessions.map((s) => ({ ...s, active: false }));
    }

    return [...sessions, session];
  }

  /**
   * Activates a session template
   */
  static activateSession(currentSessions: any[], sessionTemplateId: number): any[] {
    return currentSessions.map((session) => ({
      ...session,
      active: session.session_template === sessionTemplateId,
    }));
  }

  /**
   * Deactivates all sessions
   */
  static deactivateAllSessions(currentSessions: any[]): any[] {
    return currentSessions.map((session) => ({ ...session, active: false }));
  }
}
