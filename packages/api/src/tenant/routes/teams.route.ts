import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  TEAMS_CODES,
  TEAMS_ERRORS,
  TeamsValidationUtils,
  TENANT_CODES,
  TimezoneConfigUtils,
  validateMemberAddition,
  validateSessionAssignment,
  validateTeamsCreation,
  validateTeamsFilters,
  validateTeamsUpdate,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import Teams from '../class/Teams.js';
import User from '../class/User.js';
import SessionTemplate from '../class/SessionTemplates.js';
import { TenantRevision } from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';
import { AssignedSession, TeamMember } from '../model/TeamsModel.js';

const router = Router();

// ============================================
// ROUTES DE LISTAGE
// ============================================

/**
 * GET / - Liste toutes les équipes avec pagination
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const teams = await Teams.exportable({}, paginationData);

    return R.handleSuccess(res, {
      teams,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.PAGINATION_INVALID,
        message: TEAMS_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TEAMS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /revision - Récupère la révision de la table teams
 */
router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await TenantRevision.getRevision(tableName.TEAMS);

    return R.handleSuccess(res, {
      revision,
      checked_at: TimezoneConfigUtils.getCurrentTime().toISOString(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TENANT_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /list - Liste avec filtres
 */
router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit, ...filterQuery } = req.query;
    const filters = validateTeamsFilters(filterQuery);
    const paginationOptions = paginationSchema.parse(req.query);

    const conditions: Record<string, any> = {};

    if (filters.name) {
      conditions.name = filters.name;
    }
    if (filters.manager) {
      conditions.manager = filters.manager;
    }

    let teamEntries;

    // Filtres spéciaux nécessitant une logique personnalisée
    if (filters.has_members !== undefined) {
      teamEntries = filters.has_members
        ? await Teams._listWithMembers(paginationOptions)
        : await Teams._list({}, paginationOptions);
    } else if (filters.has_active_session !== undefined) {
      teamEntries = filters.has_active_session
        ? await Teams._listWithActiveSession(paginationOptions)
        : await Teams._list(conditions, paginationOptions);
    } else if (filters.member_user) {
      const userObj = await User._load(filters.member_user, true);
      if (!userObj) {
        return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
          code: TEAMS_CODES.MEMBER_USER_NOT_FOUND,
          message: TEAMS_ERRORS.MEMBER_USER_NOT_FOUND,
        });
      }
      teamEntries = await Teams._listByMember(userObj.getId()!, paginationOptions);
    } else {
      teamEntries = await Teams._list(conditions, paginationOptions);
    }

    const teams = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || teamEntries?.length || 0,
        count: teamEntries?.length || 0,
      },
      items: teamEntries?.length ? await Promise.all(teamEntries.map((team) => team.toJSON())) : [],
    };

    return R.handleSuccess(res, { teams });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.FILTER_INVALID,
        message: error.message,
        details: error.issues,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TEAMS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /manager/:manager_guid/list - Liste les équipes d'un manager
 */
router.get('/manager/:manager/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager } = req.params;

    if (!TeamsValidationUtils.validateManager(manager)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.MANAGER_INVALID,
        message: TEAMS_ERRORS.MANAGER_INVALID,
      });
    }
    const managerObj = await User._load(manager, true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.MANAGER_NOT_FOUND,
        message: TEAMS_ERRORS.MANAGER_NOT_FOUND,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const teamEntries = await Teams._listByManager(managerObj.getId()!, paginationOptions);

    const teams = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || teamEntries?.length || 0,
        count: teamEntries?.length || 0,
      },
      items: teamEntries?.length ? await Promise.all(teamEntries.map((team) => team.toJSON())) : [],
    };

    return R.handleSuccess(res, { teams });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TEAMS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /member/:user_guid/list - Liste les équipes d'un membre
 */
router.get('/member/:user/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { user } = req.params;

    if (!TeamsValidationUtils.validateUser(user)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.MEMBER_USER_INVALID,
        message: TEAMS_ERRORS.MEMBER_USER_INVALID,
      });
    }

    const userObj = await User._load(user, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.MEMBER_USER_NOT_FOUND,
        message: TEAMS_ERRORS.MEMBER_USER_NOT_FOUND,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const teamEntries = await Teams._listByMember(userObj.getId()!, paginationOptions);

    const teams = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || teamEntries?.length || 0,
        count: teamEntries?.length || 0,
      },
      items: teamEntries?.length ? await Promise.all(teamEntries.map((team) => team.toJSON())) : [],
    };

    return R.handleSuccess(res, { teams });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TEAMS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// CRÉATION D'ÉQUIPE
// ============================================

/**
 * POST / - Créer une nouvelle équipe
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateTeamsCreation(req.body);

    // Vérifier que le manager existe
    const managerObj = await User._load(validatedData.manager, true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TEAMS_CODES.MANAGER_NOT_FOUND,
        message: TEAMS_ERRORS.MANAGER_NOT_FOUND,
      });
    }

    // Créer l'équipe
    const teamObj = new Teams().setName(validatedData.name).setManager(managerObj.getId()!);

    // Ajouter les membres si fournis
    if (validatedData.members && validatedData.members.length > 0) {
      for (const member of validatedData.members) {
        // Vérifier que chaque membre existe
        const userObj = await User._load(member.user, true);
        if (!userObj) {
          return R.handleError(res, HttpStatus.NOT_FOUND, {
            code: TEAMS_CODES.MEMBER_USER_NOT_FOUND,
            message: `${TEAMS_ERRORS.MEMBER_USER_NOT_FOUND}: ${member.user}`,
          });
        }

        teamObj.addMember(userObj.getId()!, member.joined_at, member.active);
      }
    }

    // Ajouter les sessions assignées si fournies
    if (validatedData.assigned_sessions && validatedData.assigned_sessions.length > 0) {
      for (const session of validatedData.assigned_sessions) {
        // Vérifier que chaque session template existe
        const templateObj = await SessionTemplate._load(session.session_template, true);
        if (!templateObj) {
          return R.handleError(res, HttpStatus.NOT_FOUND, {
            code: TEAMS_CODES.SESSION_TEMPLATE_NOT_FOUND,
            message: `${TEAMS_ERRORS.SESSION_TEMPLATE_NOT_FOUND}: ${session.session_template}`,
          });
        }

        teamObj.assignSession(templateObj.getId()!, session.assign_at, session.active);
      }
    }

    await teamObj.save();

    return R.handleCreated(res, {
      message: TEAMS_ERRORS.TEAM + ' created successfully',
      team: await teamObj.toJSON(),
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.VALIDATION_FAILED,
        message: TEAMS_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    }
    if (error.message.includes('already exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: TEAMS_CODES.TEAM_ALREADY_EXISTS,
        message: TEAMS_ERRORS.DUPLICATE_ENTRY,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TEAMS_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// RÉCUPÉRATION PAR GUID
// ============================================

/**
 * GET /:guid - Récupérer une équipe par GUID
 */
router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!TeamsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.INVALID_GUID,
        message: TEAMS_ERRORS.GUID_INVALID,
      });
    }

    const teamObj = await Teams._load(guid, true);
    if (!teamObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TEAMS_CODES.TEAM_NOT_FOUND,
        message: TEAMS_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      team: await teamObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TEAMS_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// MISE À JOUR
// ============================================

/**
 * PUT /:guid - Mettre à jour une équipe
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!TeamsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.INVALID_GUID,
        message: TEAMS_ERRORS.GUID_INVALID,
      });
    }

    const teamObj = await Teams._load(guid, true);
    if (!teamObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TEAMS_CODES.TEAM_NOT_FOUND,
        message: TEAMS_ERRORS.NOT_FOUND,
      });
    }

    const validatedData = validateTeamsUpdate(req.body);

    // Mettre à jour les champs fournis
    if (validatedData.name !== undefined) {
      teamObj.setName(validatedData.name);
    }

    if (validatedData.manager !== undefined) {
      const managerObj = await User._load(validatedData.manager, true);
      if (!managerObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: TEAMS_CODES.MANAGER_NOT_FOUND,
          message: TEAMS_ERRORS.MANAGER_NOT_FOUND,
        });
      }
      teamObj.setManager(managerObj.getId()!);
    }

    if (validatedData.members !== undefined) {
      let membersData: TeamMember[] = [];
      // Vérifier tous les membres
      for (const member of validatedData.members) {
        const userObj = await User._load(member.user, true);
        if (!userObj) {
          return R.handleError(res, HttpStatus.NOT_FOUND, {
            code: TEAMS_CODES.MEMBER_USER_NOT_FOUND,
            message: `${TEAMS_ERRORS.MEMBER_USER_NOT_FOUND}: ${member.user}`,
          });
        }
        membersData.push({
          user: userObj.getId()!,
          joined_at: member.joined_at,
          active: member.active,
        });
      }
      teamObj.setMembers(membersData);
    }

    if (validatedData.assigned_sessions !== undefined) {
      // Vérifier toutes les sessions
      let templateSessionData: AssignedSession[] = [];
      for (const session of validatedData.assigned_sessions) {
        const templateObj = await SessionTemplate._load(session.session_template, true);
        if (!templateObj) {
          return R.handleError(res, HttpStatus.NOT_FOUND, {
            code: TEAMS_CODES.SESSION_TEMPLATE_NOT_FOUND,
            message: `${TEAMS_ERRORS.SESSION_TEMPLATE_NOT_FOUND}: ${session.session_template}`,
          });
        }

        templateSessionData.push({
          session_template: templateObj.getId()!,
          assign_at: session.assign_at,
          active: session.active,
        });
      }
      teamObj.setAssignedSessions(templateSessionData);
    }

    await teamObj.save();

    return R.handleSuccess(res, {
      message: TEAMS_ERRORS.TEAM + ' updated successfully',
      team: await teamObj.toJSON(),
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.VALIDATION_FAILED,
        message: TEAMS_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TEAMS_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// GESTION DES MEMBRES
// ============================================

/**
 * POST /:guid/members - Ajouter un membre
 */
router.post('/:guid/members', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!TeamsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.INVALID_GUID,
        message: TEAMS_ERRORS.GUID_INVALID,
      });
    }

    const teamObj = await Teams._load(guid, true);
    if (!teamObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TEAMS_CODES.TEAM_NOT_FOUND,
        message: TEAMS_ERRORS.NOT_FOUND,
      });
    }

    const validatedMember = validateMemberAddition(teamObj.getMembers(), req.body);

    // Vérifier que l'utilisateur existe
    const userObj = await User._load(validatedMember.user, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TEAMS_CODES.MEMBER_USER_NOT_FOUND,
        message: TEAMS_ERRORS.MEMBER_USER_NOT_FOUND,
      });
    }

    teamObj.addMember(userObj.getId()!, validatedMember.joined_at, validatedMember.active);
    await teamObj.save();

    return R.handleSuccess(res, {
      message: 'Member added successfully',
      team: await teamObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code === TEAMS_CODES.MEMBER_DUPLICATE) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TEAMS_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

/**
 * DELETE /:guid/members/:user_guid - Retirer un membre
 */
router.delete('/:guid/members/:user', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const { guid, user } = req.params;

    if (!TeamsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.INVALID_GUID,
        message: TEAMS_ERRORS.GUID_INVALID,
      });
    }

    if (!TeamsValidationUtils.validateUser(user)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.MEMBER_USER_INVALID,
        message: TEAMS_ERRORS.MEMBER_USER_INVALID,
      });
    }

    const userObj = await User._load(user, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TEAMS_CODES.MEMBER_USER_NOT_FOUND,
        message: TEAMS_ERRORS.MEMBER_USER_NOT_FOUND,
      });
    }

    const teamObj = await Teams._load(guid, true);
    if (!teamObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TEAMS_CODES.TEAM_NOT_FOUND,
        message: TEAMS_ERRORS.NOT_FOUND,
      });
    }

    if (!teamObj.hasMember(userObj.getId()!)) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TEAMS_CODES.MEMBER_USER_NOT_FOUND,
        message: 'Member not found in team',
      });
    }

    teamObj.removeMember(userObj.getId()!);
    await teamObj.save();

    return R.handleSuccess(res, {
      message: 'Member removed successfully',
      team: await teamObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TEAMS_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

/**
 * PATCH /:guid/members/:user_guid/status - Modifier le statut d'un membre
 */
router.patch('/:guid/members/:user/status', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guid, user } = req.params;
    const { active } = req.body;

    if (!TeamsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.INVALID_GUID,
        message: TEAMS_ERRORS.GUID_INVALID,
      });
    }

    if (!TeamsValidationUtils.validateUser(user)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.MEMBER_USER_INVALID,
        message: TEAMS_ERRORS.MEMBER_USER_INVALID,
      });
    }

    if (typeof active !== 'boolean') {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.MEMBER_ACTIVE_INVALID,
        message: TEAMS_ERRORS.MEMBER_ACTIVE_INVALID,
      });
    }

    const userObj = await User._load(user, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TEAMS_CODES.MEMBER_USER_NOT_FOUND,
        message: TEAMS_ERRORS.MEMBER_USER_NOT_FOUND,
      });
    }

    const teamObj = await Teams._load(guid, true);
    if (!teamObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TEAMS_CODES.TEAM_NOT_FOUND,
        message: TEAMS_ERRORS.NOT_FOUND,
      });
    }

    if (!teamObj.hasMember(userObj.getId()!)) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TEAMS_CODES.MEMBER_USER_NOT_FOUND,
        message: 'Member not found in team',
      });
    }

    teamObj.updateMemberStatus(userObj.getId()!, active);
    await teamObj.save();

    return R.handleSuccess(res, {
      message: 'Member status updated successfully',
      team: await teamObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TEAMS_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// GESTION DES SESSIONS
// ============================================

/**
 * POST /:guid/sessions - Assigner une session template
 */
router.post('/:guid/sessions', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!TeamsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.INVALID_GUID,
        message: TEAMS_ERRORS.GUID_INVALID,
      });
    }

    const teamObj = await Teams._load(guid, true);
    if (!teamObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TEAMS_CODES.TEAM_NOT_FOUND,
        message: TEAMS_ERRORS.NOT_FOUND,
      });
    }

    const validatedSession = validateSessionAssignment(teamObj.getAssignedSessions(), req.body);

    // Vérifier que la session template existe
    const templateObj = await SessionTemplate._load(validatedSession.session_template, true);
    if (!templateObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TEAMS_CODES.SESSION_TEMPLATE_NOT_FOUND,
        message: TEAMS_ERRORS.SESSION_TEMPLATE_NOT_FOUND,
      });
    }

    teamObj.assignSession(
      templateObj.getId()!,
      validatedSession.assign_at,
      validatedSession.active,
    );
    await teamObj.save();

    return R.handleSuccess(res, {
      message: 'Session assigned successfully',
      team: await teamObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code === TEAMS_CODES.MULTIPLE_ACTIVE_SESSIONS) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TEAMS_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

/**
 * PATCH /:guid/sessions/:template_guid/activate - Activer une session
 */
router.patch(
  '/:guid/sessions/:template/activate',
  Ensure.patch(),
  async (req: Request, res: Response) => {
    try {
      const { guid, template } = req.params;

      if (!TeamsValidationUtils.validateGuid(guid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: TEAMS_CODES.INVALID_GUID,
          message: TEAMS_ERRORS.GUID_INVALID,
        });
      }

      if (!TeamsValidationUtils.validateSessionTemplate(template)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: TEAMS_CODES.SESSION_TEMPLATE_INVALID,
          message: TEAMS_ERRORS.SESSION_TEMPLATE_INVALID,
        });
      }

      const teamObj = await Teams._load(guid, true);
      if (!teamObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: TEAMS_CODES.TEAM_NOT_FOUND,
          message: TEAMS_ERRORS.NOT_FOUND,
        });
      }

      const templateObj = await SessionTemplate._load(template, true);
      if (!templateObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: TEAMS_CODES.SESSION_TEMPLATE_NOT_FOUND,
          message: TEAMS_ERRORS.SESSION_TEMPLATE_NOT_FOUND,
        });
      }

      teamObj.activateSession(templateObj.getId()!);
      await teamObj.save();

      return R.handleSuccess(res, {
        message: 'Session activated successfully',
        team: await teamObj.toJSON(),
      });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: TEAMS_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  },
);

/**
 * PATCH /:guid/sessions/deactivate-all - Désactiver toutes les sessions
 */
router.patch(
  '/:guid/sessions/deactivate-all',
  Ensure.patch(),
  async (req: Request, res: Response) => {
    try {
      const { guid } = req.params;

      if (!TeamsValidationUtils.validateGuid(guid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: TEAMS_CODES.INVALID_GUID,
          message: TEAMS_ERRORS.GUID_INVALID,
        });
      }

      const teamObj = await Teams._load(guid, true);
      if (!teamObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: TEAMS_CODES.TEAM_NOT_FOUND,
          message: TEAMS_ERRORS.NOT_FOUND,
        });
      }

      teamObj.deactivateAllSessions();
      await teamObj.save();

      return R.handleSuccess(res, {
        message: 'All sessions deactivated successfully',
        team: await teamObj.toJSON(),
      });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: TEAMS_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  },
);

// ============================================
// STATISTIQUES ET RAPPORTS
// ============================================

/**
 * GET /:guid/summary - Récupérer un résumé de l'équipe
 */
router.get('/:guid/summary', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!TeamsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.INVALID_GUID,
        message: TEAMS_ERRORS.GUID_INVALID,
      });
    }

    const teamObj = await Teams._load(guid, true);
    if (!teamObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TEAMS_CODES.TEAM_NOT_FOUND,
        message: TEAMS_ERRORS.NOT_FOUND,
      });
    }

    const summary = teamObj.getSummary();

    return R.handleSuccess(res, {
      team_guid: guid,
      team_name: teamObj.getName(),
      summary,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TEAMS_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /:guid/report - Générer un rapport complet de l'équipe
 */
router.get('/:guid/report', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!TeamsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TEAMS_CODES.INVALID_GUID,
        message: TEAMS_ERRORS.GUID_INVALID,
      });
    }

    const teamObj = await Teams._load(guid, true);
    if (!teamObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TEAMS_CODES.TEAM_NOT_FOUND,
        message: TEAMS_ERRORS.NOT_FOUND,
      });
    }

    const report = await teamObj.generateReport();

    return R.handleSuccess(res, {
      report,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TEAMS_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

// // ============================================
// // SUPPRESSION
// // ============================================
//
// /**
//  * DELETE /:guid - Supprimer une équipe (soft delete)
//  */
// router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
//   try {
//     const { guid } = req.params;
//
//     if (!TeamsValidationUtils.validateGuid(guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: TEAMS_CODES.INVALID_GUID,
//         message: TEAMS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const teamObj = await Teams._load(guid, true);
//     if (!teamObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: TEAMS_CODES.TEAM_NOT_FOUND,
//         message: TEAMS_ERRORS.NOT_FOUND,

export default router;
