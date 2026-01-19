import { Request, Response, Router } from 'express';
import {
  GROUPS_CODES,
  GROUPS_ERRORS,
  GroupsValidationUtils,
  HttpStatus,
  paginationSchema,
  TENANT_CODES,
  TI,
  TimezoneConfigUtils,
  validateGroupsCreation,
  validateGroupsFilters,
  validateGroupsUpdate,
  validateMembersAddition,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import Groups from '../class/Groups.js';
import User from '../class/User.js';
import { TenantRevision } from '../../tools/revision.js';
import { responseValue, tableName } from '../../utils/response.model.js';

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
    const groups = await Groups.exportable({}, paginationData);

    return R.handleSuccess(res, {
      groups,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.PAGINATION_INVALID,
        message: GROUPS_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GROUPS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /revision - Récupère la révision de la table groups
 */
router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await TenantRevision.getRevision(tableName.GROUPS);

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
    const filters = validateGroupsFilters(filterQuery);
    const paginationOptions = paginationSchema.parse(req.query);

    const conditions: Record<string, any> = {};

    if (filters.name) {
      conditions.name = filters.name;
    }
    if (filters.manager) {
      const managerObj = await User._load(filters.manager, true);
      if (!managerObj) {
        return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
          code: GROUPS_CODES.MANAGER_NOT_FOUND,
          message: GROUPS_ERRORS.MANAGER_NOT_FOUND,
        });
      }
      conditions.manager = managerObj.getId()!;
    }

    let groupsEntries;

    // Filtres spéciaux nécessitant une logique personnalisée
    if (filters.has_members !== undefined) {
      groupsEntries = filters.has_members
        ? await Groups._listWithMembers(paginationOptions)
        : await Groups._list({}, paginationOptions);
    }
    // else if (filters.has_active_session !== undefined) {
    //   groupsEntries = filters.has_active_session
    //     ? await Groups._listWithActiveSession(paginationOptions)
    //     : await Groups._list(conditions, paginationOptions);
    // }
    else if (filters.member_user) {
      const userObj = await User._load(filters.member_user, true);
      if (!userObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: GROUPS_CODES.MEMBER_USER_NOT_FOUND,
          message: GROUPS_ERRORS.MEMBER_USER_NOT_FOUND,
        });
      }
      groupsEntries = await Groups._listByMember(userObj.getId()!, paginationOptions);
    }
    // else if (filters.session_template) {
    //   const templateSessionObj = await SessionTemplate._load(filters.session_template, true);
    //   if (!templateSessionObj) {
    //     return R.handleError(res, HttpStatus.NOT_FOUND, {
    //       code: GROUPS_CODES.SESSION_TEMPLATE_NOT_FOUND,
    //       message: GROUPS_ERRORS.SESSION_TEMPLATE_NOT_FOUND,
    //     });
    //   }
    //   groupsEntries = await Groups._listBySession(templateSessionObj.getId()!, paginationOptions);
    // }
    else {
      groupsEntries = await Groups._list(conditions, paginationOptions);
    }

    const groups = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || groupsEntries?.length || 0,
        count: groupsEntries?.length || 0,
      },
      items: groupsEntries?.length
        ? await Promise.all(groupsEntries.map((group) => group.toJSON()))
        : [],
    };

    return R.handleSuccess(res, { groups });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.FILTER_INVALID,
        message: error.message,
        details: error.issues,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GROUPS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /manager/:manager_guid/list - Liste les groupes d'un manager
 */
router.get('/manager/:manager/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager } = req.params;

    if (!GroupsValidationUtils.validateManager(manager)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.MANAGER_INVALID,
        message: GROUPS_ERRORS.MANAGER_INVALID,
      });
    }
    const managerObj = await User._load(manager, true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.MANAGER_NOT_FOUND,
        message: GROUPS_ERRORS.MANAGER_NOT_FOUND,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const groupsEntries = await Groups._listByManager(managerObj.getId()!, paginationOptions);

    const groups = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || groupsEntries?.length || 0,
        count: groupsEntries?.length || 0,
      },
      items: groupsEntries?.length
        ? await Promise.all(groupsEntries.map((group) => group.toJSON()))
        : [],
    };

    return R.handleSuccess(res, { groups });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GROUPS_CODES.LISTING_FAILED,
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

    if (!GroupsValidationUtils.validateUser(String(user))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.MEMBER_USER_INVALID,
        message: GROUPS_ERRORS.MEMBER_USER_INVALID,
      });
    }

    const userObj = await User._load(user, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.MEMBER_USER_NOT_FOUND,
        message: GROUPS_ERRORS.MEMBER_USER_NOT_FOUND,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const groupsEntries = await Groups._listByMember(userObj.getId()!, paginationOptions);

    const groups = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || groupsEntries?.length || 0,
        count: groupsEntries?.length || 0,
      },
      items: groupsEntries?.length
        ? await Promise.all(groupsEntries.map((group) => group.toJSON()))
        : [],
    };

    return R.handleSuccess(res, { groups });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GROUPS_CODES.LISTING_FAILED,
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
    const validatedData = validateGroupsCreation(req.body);

    // Vérifier que le manager existe
    const managerObj = await User._load(validatedData.manager, true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GROUPS_CODES.MANAGER_NOT_FOUND,
        message: GROUPS_ERRORS.MANAGER_NOT_FOUND,
      });
    }

    // Créer l'équipe
    const groupsObj = new Groups().setName(validatedData.name).setManager(managerObj.getId()!);

    // Ajouter les membres si fournis
    if (validatedData.members && validatedData.members.length > 0) {
      for (const member of validatedData.members) {
        // Vérifier que chaque membre existe
        const userObj = await User._load(member.user, true);
        if (!userObj) {
          return R.handleError(res, HttpStatus.NOT_FOUND, {
            code: GROUPS_CODES.MEMBER_USER_NOT_FOUND,
            message: `${GROUPS_ERRORS.MEMBER_USER_NOT_FOUND}: ${member.user}`,
          });
        }

        groupsObj.addMember(userObj.getId()!, member.joined_at, member.active);
      }
    }

    // // Ajouter les sessions assignées si fournies
    // if (validatedData.assigned_sessions && validatedData.assigned_sessions.length > 0) {
    //   for (const session of validatedData.assigned_sessions) {
    //     // Vérifier que chaque session template existe
    //     const templateObj = await SessionTemplate._load(session.session_template, true);
    //     if (!templateObj) {
    //       return R.handleError(res, HttpStatus.NOT_FOUND, {
    //         code: GROUPS_CODES.SESSION_TEMPLATE_NOT_FOUND,
    //         message: `${GROUPS_ERRORS.SESSION_TEMPLATE_NOT_FOUND}: ${session.session_template}`,
    //       });
    //     }
    //
    //     groupsObj.assignSession(templateObj.getId()!, session.assign_at, session.active);
    //   }
    // }

    await groupsObj.save();

    return R.handleCreated(res, {
      message: GROUPS_ERRORS.GROUPS + ' created successfully',
      group: await groupsObj.toJSON(),
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.VALIDATION_FAILED,
        message: GROUPS_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    }
    if (error.message.includes('already exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: GROUPS_CODES.GROUPS_ALREADY_EXISTS,
        message: GROUPS_ERRORS.DUPLICATE_ENTRY,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GROUPS_CODES.CREATION_FAILED,
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

    if (!GroupsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.INVALID_GUID,
        message: GROUPS_ERRORS.GUID_INVALID,
      });
    }

    const groupsObj = await Groups._load(guid, true);
    if (!groupsObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GROUPS_CODES.GROUPS_NOT_FOUND,
        message: GROUPS_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      group: await groupsObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GROUPS_CODES.SEARCH_FAILED,
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

    if (!GroupsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.INVALID_GUID,
        message: GROUPS_ERRORS.GUID_INVALID,
      });
    }

    const groupsObj = await Groups._load(guid, true);
    if (!groupsObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GROUPS_CODES.GROUPS_NOT_FOUND,
        message: GROUPS_ERRORS.NOT_FOUND,
      });
    }

    const validatedData = validateGroupsUpdate(req.body);

    // Mettre à jour les champs fournis
    if (validatedData.name !== undefined) {
      groupsObj.setName(validatedData.name);
    }

    if (validatedData.manager !== undefined) {
      const managerObj = await User._load(validatedData.manager, true);
      if (!managerObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: GROUPS_CODES.MANAGER_NOT_FOUND,
          message: GROUPS_ERRORS.MANAGER_NOT_FOUND,
        });
      }
      groupsObj.setManager(managerObj.getId()!);
    }

    if (validatedData.members !== undefined) {
      let membersData: TI.GroupsMember[] = [];
      // Vérifier tous les membres
      for (const member of validatedData.members) {
        const userObj = await User._load(member.user, true);
        if (!userObj) {
          return R.handleError(res, HttpStatus.NOT_FOUND, {
            code: GROUPS_CODES.MEMBER_USER_NOT_FOUND,
            message: `${GROUPS_ERRORS.MEMBER_USER_NOT_FOUND}: ${member.user}`,
          });
        }
        membersData.push({
          user: userObj.getId()!,
          joined_at: member.joined_at,
          active: member.active,
        });
      }
      groupsObj.setMembers(membersData);
    }

    // if (validatedData.assigned_sessions !== undefined) {
    //   // Vérifier toutes les sessions
    //   let templateSessionData: TI.AssignedSession[] = [];
    //   for (const session of validatedData.assigned_sessions) {
    //     const templateObj = await SessionTemplate._load(session.session_template, true);
    //     if (!templateObj) {
    //       return R.handleError(res, HttpStatus.NOT_FOUND, {
    //         code: GROUPS_CODES.SESSION_TEMPLATE_NOT_FOUND,
    //         message: `${GROUPS_ERRORS.SESSION_TEMPLATE_NOT_FOUND}: ${session.session_template}`,
    //       });
    //     }
    //
    //     templateSessionData.push({
    //       session_template: templateObj.getId()!,
    //       assign_at: session.assign_at,
    //       active: session.active,
    //     });
    //   }
    //   groupsObj.setAssignedSessions(templateSessionData);
    // }

    await groupsObj.save();

    return R.handleSuccess(res, {
      message: GROUPS_ERRORS.GROUPS + ' updated successfully',
      group: await groupsObj.toJSON(),
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.VALIDATION_FAILED,
        message: GROUPS_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GROUPS_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// GESTION DES MEMBRES
// ============================================

// /**
//  * PATCH /:guid/members - Ajouter un membre
//  */
// router.patch('/:guid/members', Ensure.patch(), async (req: Request, res: Response) => {
//   try {
//     const { guid } = req.params;
//
//     if (!GroupsValidationUtils.validateGuid(guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: GROUPS_CODES.INVALID_GUID,
//         message: GROUPS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const groupsObj = await Groups._load(guid, true);
//     if (!groupsObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: GROUPS_CODES.GROUPS_NOT_FOUND,
//         message: GROUPS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const validatedMember = validateMemberAddition(req.body);
//
//     // Vérifier que l'utilisateur existe
//     const userObj = await User._load(validatedMember.user, true);
//     if (!userObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: GROUPS_CODES.MEMBER_USER_NOT_FOUND,
//         message: GROUPS_ERRORS.MEMBER_USER_NOT_FOUND,
//       });
//     }
//
//     // Vérifier si l'utilisateur existe déjà dans la groups
//     const existingMember = groupsObj.getMembers().find((m) => m.user === userObj.getId());
//     if (existingMember) {
//       return R.handleError(res, HttpStatus.CONFLICT, {
//         code: GROUPS_CODES.MEMBER_DUPLICATE,
//         message: GROUPS_ERRORS.MEMBER_DUPLICATE,
//       });
//     }
//
//     // ✅ NOUVELLE VALIDATION : Si le membre est actif, vérifier qu'il n'est pas dans une autre groups
//     if (validatedMember.active) {
//       // Chercher si l'utilisateur est déjà membre actif d'une autre équipe
//       const allGroups = await Groups._list({});
//
//       if (allGroups) {
//         for (const group of allGroups) {
//           if (group.getId() === groupsObj.getId()) continue; // Ignorer l'équipe actuelle
//
//           const existingActiveMember = group
//             .getMembers()
//             .find((m) => m.user === userObj.getId() && m.active !== false);
//
//           if (existingActiveMember) {
//             return R.handleError(res, HttpStatus.CONFLICT, {
//               code: GROUPS_CODES.MEMBER_ALREADY_ACTIVE_IN_ANOTHER_GROUPS,
//               message:
//                 `User is already an active member of group "${group.getName()}". ` +
//                 `A user can only be active in one group at a time.`,
//             });
//           }
//         }
//       }
//     }
//
//     groupsObj.addMember(userObj.getId()!, validatedMember.joined_at, validatedMember.active);
//     await groupsObj.save();
//
//     return R.handleSuccess(res, {
//       message: 'Member added successfully',
//       groups: await groupsObj.toJSON(),
//     });
//   } catch (error: any) {
//     if (error.code === GROUPS_CODES.MEMBER_DUPLICATE) {
//       return R.handleError(res, HttpStatus.CONFLICT, {
//         code: error.code,
//         message: error.message,
//       });
//     }
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: GROUPS_CODES.UPDATE_FAILED,
//       message: error.message,
//     });
//   }
// });

/**
 * PATCH /:guid/members - Ajouter plusieurs membres
 */
router.patch('/:guid/members', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!GroupsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.INVALID_GUID,
        message: GROUPS_ERRORS.GUID_INVALID,
      });
    }

    const groupsObj = await Groups._load(guid, true);
    if (!groupsObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GROUPS_CODES.GROUPS_NOT_FOUND,
        message: GROUPS_ERRORS.NOT_FOUND,
      });
    }

    // ✅ Validation tableau
    const validatedMembers = validateMembersAddition(req.body);

    const allGroups = await Groups._list({});
    const existingMembers = groupsObj.getMembers();

    let membersToAdd: TI.GroupsMember[] = [];

    for (const member of validatedMembers) {
      // Vérifier user existe
      const userObj = await User._load(member.user, true);
      if (!userObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: GROUPS_CODES.MEMBER_USER_NOT_FOUND,
          message: `User ${member.user} not found`,
        });
      }

      // Déjà dans ce groupe ?
      if (existingMembers.find((m) => m.user === userObj.getId())) {
        return R.handleError(res, HttpStatus.CONFLICT, {
          code: GROUPS_CODES.MEMBER_DUPLICATE,
          message: `User ${userObj.getId()} already in this group`,
        });
      }

      // ✅ Actif dans un autre groupe ?
      if (member.active && allGroups) {
        for (const group of allGroups) {
          if (group.getId() === groupsObj.getId()) continue;

          const activeElsewhere = group
            .getMembers()
            .find((m) => m.user === userObj.getId() && m.active !== false);

          if (activeElsewhere) {
            return R.handleError(res, HttpStatus.CONFLICT, {
              code: GROUPS_CODES.MEMBER_ALREADY_ACTIVE_IN_ANOTHER_GROUPS,
              message: `User ${userObj.getGuid()} already active in group "${group.getName()}"`,
            });
          }
        }
      }
      membersToAdd.push({
        user: userObj.getId()!,
        joined_at: member.joined_at,
        active: member.active,
      });
    }

    // ✅ Ajout effectif
    for (const member of membersToAdd) {
      groupsObj.addMember(member.user, member.joined_at, member.active);
    }

    await groupsObj.save();

    return R.handleSuccess(res, {
      message: 'Members added successfully',
      group: await groupsObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: error.code || GROUPS_CODES.UPDATE_FAILED,
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

    if (!GroupsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.INVALID_GUID,
        message: GROUPS_ERRORS.GUID_INVALID,
      });
    }

    if (!GroupsValidationUtils.validateUser(user)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.MEMBER_USER_INVALID,
        message: GROUPS_ERRORS.MEMBER_USER_INVALID,
      });
    }

    const userObj = await User._load(user, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GROUPS_CODES.MEMBER_USER_NOT_FOUND,
        message: GROUPS_ERRORS.MEMBER_USER_NOT_FOUND,
      });
    }

    const groupsObj = await Groups._load(guid, true);
    if (!groupsObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GROUPS_CODES.GROUPS_NOT_FOUND,
        message: GROUPS_ERRORS.NOT_FOUND,
      });
    }

    if (!groupsObj.hasMember(userObj.getId()!)) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GROUPS_CODES.MEMBER_USER_NOT_FOUND,
        message: 'Member not found in groups',
      });
    }

    groupsObj.removeMember(userObj.getId()!);
    await groupsObj.save();

    return R.handleSuccess(res, {
      message: 'Member removed successfully',
      group: await groupsObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GROUPS_CODES.UPDATE_FAILED,
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
    // const { active } = req.body;

    if (!GroupsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.INVALID_GUID,
        message: GROUPS_ERRORS.GUID_INVALID,
      });
    }

    if (!GroupsValidationUtils.validateUser(user)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.MEMBER_USER_INVALID,
        message: GROUPS_ERRORS.MEMBER_USER_INVALID,
      });
    }

    // if (typeof active !== 'boolean') {
    //   return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //     code: GROUPS_CODES.MEMBER_ACTIVE_INVALID,
    //     message: GROUPS_ERRORS.MEMBER_ACTIVE_INVALID,
    //   });
    // }

    const userObj = await User._load(user, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GROUPS_CODES.MEMBER_USER_NOT_FOUND,
        message: GROUPS_ERRORS.MEMBER_USER_NOT_FOUND,
      });
    }

    const groupsObj = await Groups._load(guid, true);
    if (!groupsObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GROUPS_CODES.GROUPS_NOT_FOUND,
        message: GROUPS_ERRORS.NOT_FOUND,
      });
    }

    if (!groupsObj.hasMember(userObj.getId()!)) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GROUPS_CODES.MEMBER_USER_NOT_FOUND,
        message: 'Member not found in groups',
      });
    }
    let active = true;
    const status = groupsObj.isMemberActive(userObj.getId()!);
    if (status) {
      active = false;
    }

    groupsObj.updateMemberStatus(userObj.getId()!, active);
    await groupsObj.save();

    return R.handleSuccess(res, {
      message: 'Member status updated successfully',
      group: await groupsObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GROUPS_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// GESTION DES SESSIONS
// ============================================

// /**
//  * PATCH /:guid/sessions - Assigner une session template
//  */
// router.patch('/:guid/sessions', Ensure.patch(), async (req: Request, res: Response) => {
//   try {
//     const { guid } = req.params;
//
//     if (!GroupsValidationUtils.validateGuid(guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: GROUPS_CODES.INVALID_GUID,
//         message: GROUPS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const groupsObj = await Groups._load(guid, true);
//     if (!groupsObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: GROUPS_CODES.GROUPS_NOT_FOUND,
//         message: GROUPS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const validatedSession = validateSessionAssignment(groupsObj.getAssignedSessions(), req.body);
//
//     // Vérifier que la session template existe
//     const templateObj = await SessionTemplate._load(validatedSession.session_template, true);
//     if (!templateObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: GROUPS_CODES.SESSION_TEMPLATE_NOT_FOUND,
//         message: GROUPS_ERRORS.SESSION_TEMPLATE_NOT_FOUND,
//       });
//     }
//
//     groupsObj.assignSession(
//       templateObj.getId()!,
//       validatedSession.assign_at,
//       validatedSession.active,
//     );
//     await groupsObj.save();
//
//     return R.handleSuccess(res, {
//       message: 'Session assigned successfully',
//       groups: await groupsObj.toJSON(),
//     });
//   } catch (error: any) {
//     if (error.code === GROUPS_CODES.MULTIPLE_ACTIVE_SESSIONS) {
//       return R.handleError(res, HttpStatus.CONFLICT, {
//         code: error.code,
//         message: error.message,
//       });
//     }
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: GROUPS_CODES.UPDATE_FAILED,
//       message: error.message,
//     });
//   }
// });

// /**
//  * PATCH /:guid/sessions/:template_guid/activate - Activer une session
//  */
// router.patch(
//   '/:guid/sessions/:template/activate',
//   Ensure.patch(),
//   async (req: Request, res: Response) => {
//     try {
//       const { guid, template } = req.params;
//
//       if (!GroupsValidationUtils.validateGuid(guid)) {
//         return R.handleError(res, HttpStatus.BAD_REQUEST, {
//           code: GROUPS_CODES.INVALID_GUID,
//           message: GROUPS_ERRORS.GUID_INVALID,
//         });
//       }
//
//       if (!GroupsValidationUtils.validateSessionTemplate(template)) {
//         return R.handleError(res, HttpStatus.BAD_REQUEST, {
//           code: GROUPS_CODES.SESSION_TEMPLATE_INVALID,
//           message: GROUPS_ERRORS.SESSION_TEMPLATE_INVALID,
//         });
//       }
//
//       const groupsObj = await Groups._load(guid, true);
//       if (!groupsObj) {
//         return R.handleError(res, HttpStatus.NOT_FOUND, {
//           code: GROUPS_CODES.GROUPS_NOT_FOUND,
//           message: GROUPS_ERRORS.NOT_FOUND,
//         });
//       }
//
//       const templateObj = await SessionTemplate._load(template, true);
//       if (!templateObj) {
//         return R.handleError(res, HttpStatus.NOT_FOUND, {
//           code: GROUPS_CODES.SESSION_TEMPLATE_NOT_FOUND,
//           message: GROUPS_ERRORS.SESSION_TEMPLATE_NOT_FOUND,
//         });
//       }
//
//       groupsObj.activateSession(templateObj.getId()!);
//       await groupsObj.save();
//
//       return R.handleSuccess(res, {
//         message: 'Session activated successfully',
//         groups: await groupsObj.toJSON(),
//       });
//     } catch (error: any) {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: GROUPS_CODES.UPDATE_FAILED,
//         message: error.message,
//       });
//     }
//   },
// );

// /**
//  * PATCH /:guid/sessions/deactivate-all - Désactiver toutes les sessions
//  */
// router.patch(
//   '/:guid/sessions/deactivate-all',
//   Ensure.patch(),
//   async (req: Request, res: Response) => {
//     try {
//       const { guid } = req.params;
//
//       if (!GroupsValidationUtils.validateGuid(guid)) {
//         return R.handleError(res, HttpStatus.BAD_REQUEST, {
//           code: GROUPS_CODES.INVALID_GUID,
//           message: GROUPS_ERRORS.GUID_INVALID,
//         });
//       }
//
//       const groupsObj = await Groups._load(guid, true);
//       if (!groupsObj) {
//         return R.handleError(res, HttpStatus.NOT_FOUND, {
//           code: GROUPS_CODES.GROUPS_NOT_FOUND,
//           message: GROUPS_ERRORS.NOT_FOUND,
//         });
//       }
//
//       groupsObj.deactivateAllSessions();
//       await groupsObj.save();
//
//       return R.handleSuccess(res, {
//         message: 'All sessions deactivated successfully',
//         groups: await groupsObj.toJSON(),
//       });
//     } catch (error: any) {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: GROUPS_CODES.UPDATE_FAILED,
//         message: error.message,
//       });
//     }
//   },
// );

// ============================================
// STATISTIQUES ET RAPPORTS
// ============================================

/**
 * GET /:guid/summary - Récupérer un résumé de l'équipe
 */
router.get('/:guid/summary', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!GroupsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.INVALID_GUID,
        message: GROUPS_ERRORS.GUID_INVALID,
      });
    }

    const groupsObj = await Groups._load(guid, true);
    if (!groupsObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GROUPS_CODES.GROUPS_NOT_FOUND,
        message: GROUPS_ERRORS.NOT_FOUND,
      });
    }

    const summary = groupsObj.getSummary();

    return R.handleSuccess(res, {
      group_guid: guid,
      group_name: groupsObj.getName(),
      summary,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GROUPS_CODES.SEARCH_FAILED,
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

    if (!GroupsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.INVALID_GUID,
        message: GROUPS_ERRORS.GUID_INVALID,
      });
    }

    const groupsObj = await Groups._load(guid, true);
    if (!groupsObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GROUPS_CODES.GROUPS_NOT_FOUND,
        message: GROUPS_ERRORS.NOT_FOUND,
      });
    }

    const report = await groupsObj.generateReport();

    return R.handleSuccess(res, {
      report,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GROUPS_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// NOUVELLES ROUTES - HIÉRARCHIE DES ÉQUIPES
// ============================================

/**
 * GET /:guid/all-members-recursive - Liste TOUS les membres (incluant sous-équipes)
 */
router.get('/:guid/all-members-recursive', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!GroupsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.INVALID_GUID,
        message: GROUPS_ERRORS.GUID_INVALID,
      });
    }

    const groupsObj = await Groups._load(guid, true);
    if (!groupsObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GROUPS_CODES.GROUPS_NOT_FOUND,
        message: GROUPS_ERRORS.NOT_FOUND,
      });
    }

    const allMembers = await groupsObj.getAllMembersRecursive();

    // Dédupliquer les utilisateurs (un user peut apparaître dans plusieurs sous-équipes)
    const uniqueMembers = Array.from(
      new Map(allMembers.map((member) => [member.getId(), member])).values(),
    );

    const membersData = await Promise.all(
      uniqueMembers.map(async (member) => await member.toJSON(responseValue.MINIMAL)),
    );

    return R.handleSuccess(res, {
      group: await groupsObj.toJSON(responseValue.MINIMAL),
      total_members_recursive: uniqueMembers.length,
      all_members: membersData,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GROUPS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /:guid/hierarchy-tree - Construit l'arbre hiérarchique complet
 */
router.get('/:guid/hierarchy-tree', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!GroupsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.INVALID_GUID,
        message: GROUPS_ERRORS.GUID_INVALID,
      });
    }

    const groupsObj = await Groups._load(guid, true);
    if (!groupsObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GROUPS_CODES.GROUPS_NOT_FOUND,
        message: GROUPS_ERRORS.NOT_FOUND,
      });
    }

    const hierarchyTree = await groupsObj.buildGroupsHierarchyTree();

    return R.handleSuccess(res, {
      hierarchy: hierarchyTree,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GROUPS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// /**
//  * GET /:guid/active-session-details - Récupère les détails de la session active
//  */
// router.get('/:guid/active-session-details', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const { guid } = req.params;
//
//     if (!GroupsValidationUtils.validateGuid(guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: GROUPS_CODES.INVALID_GUID,
//         message: GROUPS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const groupsObj = await Groups._load(guid, true);
//     if (!groupsObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: GROUPS_CODES.GROUPS_NOT_FOUND,
//         message: GROUPS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const activeSession = groupsObj.getActiveSession();
//
//     if (!activeSession) {
//       return R.handleSuccess(res, {
//         groups: await groupsObj.toJSON(responseValue.MINIMAL),
//         has_active_session: false,
//         active_session: null,
//         message: 'No active session for this groups',
//       });
//     }
//
//     const sessionTemplateObj = await groupsObj.getSessionTemplateObj(
//       activeSession.session_template,
//     );
//
//     return R.handleSuccess(res, {
//       groups: await groupsObj.toJSON(responseValue.MINIMAL),
//       has_active_session: true,
//       active_session: {
//         template: sessionTemplateObj ? await sessionTemplateObj.toJSON() : null,
//         assigned_at: activeSession.assign_at,
//         active: activeSession.active,
//       },
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: GROUPS_CODES.SEARCH_FAILED,
//       message: error.message,
//     });
//   }
// });

// ============================================
// 🎯 ROUTES PRINCIPALES - HIÉRARCHIE BASÉE SUR MANAGER
// ============================================

/**
 * 🔥 GET /manager/:manager_guid/groups-hierarchy
 * Point d'entrée principal : Récupère la hiérarchie complète de l'équipe d'un manager
 * Inclut les sous-équipes SI les membres sont managers ET hiérarchiquement en dessous
 */
router.get(
  '/manager/:manager/groups-hierarchy',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { manager } = req.params;

      if (!GroupsValidationUtils.validateManager(manager)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: GROUPS_CODES.MANAGER_INVALID,
          message: GROUPS_ERRORS.MANAGER_INVALID,
        });
      }

      const managerObj = await User._load(manager, true);
      if (!managerObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: GROUPS_CODES.MANAGER_NOT_FOUND,
          message: GROUPS_ERRORS.MANAGER_NOT_FOUND,
        });
      }

      const hierarchy = await Groups.getManagerGroupsHierarchy(managerObj.getId()!);

      return R.handleSuccess(res, {
        hierarchy,
      });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: GROUPS_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  },
);

/**
 * 📋 GET /manager/:manager_guid/direct-members
 * Liste uniquement les membres directs de l'équipe du manager (1er niveau)
 */
router.get(
  '/manager/:manager/direct-members',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { manager } = req.params;

      if (!GroupsValidationUtils.validateManager(manager)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: GROUPS_CODES.MANAGER_INVALID,
          message: GROUPS_ERRORS.MANAGER_INVALID,
        });
      }

      const managerObj = await User._load(manager, true);
      if (!managerObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: GROUPS_CODES.MANAGER_NOT_FOUND,
          message: GROUPS_ERRORS.MANAGER_NOT_FOUND,
        });
      }

      // Récupérer l'équipe du manager
      const groups = await Groups._listByManager(managerObj.getId()!);

      if (!groups || groups.length === 0) {
        return R.handleSuccess(res, {
          manager: await managerObj.toJSON(responseValue.MINIMAL),
          has_groups: false,
          total_direct_members: 0,
          direct_members: [],
        });
      }

      const group = groups[0];
      const directMembers = await group.getDirectMembers();
      const membersData = await Promise.all(
        directMembers.map(async (member) => await member.toJSON(responseValue.MINIMAL)),
      );

      return R.handleSuccess(res, {
        manager: await managerObj.toJSON(responseValue.MINIMAL),
        group: await group.toJSON(responseValue.MINIMAL),
        total_direct_members: directMembers.length,
        direct_members: membersData,
      });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: GROUPS_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  },
);

/**
 * 📊 GET /manager/:manager_guid/all-members-flat
 * Liste TOUS les membres (aplatie) sous un manager
 * Inclut les membres des sous-équipes si hiérarchiquement valides
 */
router.get(
  '/manager/:manager/all-members-flat',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { manager } = req.params;

      if (!GroupsValidationUtils.validateManager(manager)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: GROUPS_CODES.MANAGER_INVALID,
          message: GROUPS_ERRORS.MANAGER_INVALID,
        });
      }

      const managerObj = await User._load(manager, true);
      if (!managerObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: GROUPS_CODES.MANAGER_NOT_FOUND,
          message: GROUPS_ERRORS.MANAGER_NOT_FOUND,
        });
      }

      const groups = await Groups._listByManager(managerObj.getId()!);

      if (!groups || groups.length === 0) {
        return R.handleSuccess(res, {
          manager: await managerObj.toJSON(responseValue.MINIMAL),
          has_group: false,
          total_members: 0,
          all_members: [],
        });
      }

      const group = groups[0];
      const allMembers = await group.getAllMembersFlat(managerObj.getId()!);

      const membersData = await Promise.all(
        allMembers.map(async (member) => await member.toJSON(responseValue.MINIMAL)),
      );

      return R.handleSuccess(res, {
        manager: await managerObj.toJSON(responseValue.MINIMAL),
        group: await group.toJSON(responseValue.MINIMAL),
        total_members: allMembers.length,
        all_members: membersData,
      });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: GROUPS_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  },
);

/**
 * ⏰ GET /manager/:manager_guid/active-session
 * Récupère la session active de l'équipe du manager
 */
router.get(
  '/manager/:manager/active-session',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { manager } = req.params;

      if (!GroupsValidationUtils.validateManager(manager)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: GROUPS_CODES.MANAGER_INVALID,
          message: GROUPS_ERRORS.MANAGER_INVALID,
        });
      }

      const managerObj = await User._load(manager, true);
      if (!managerObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: GROUPS_CODES.MANAGER_NOT_FOUND,
          message: GROUPS_ERRORS.MANAGER_NOT_FOUND,
        });
      }

      const groups = await Groups._listByManager(managerObj.getId()!);

      if (!groups || groups.length === 0) {
        return R.handleSuccess(res, {
          manager: await managerObj.toJSON(responseValue.MINIMAL),
          has_groups: false,
          // has_active_session: false,
          // active_session: null,
        });
      }

      const group = groups[0];
      // const activeSession = group.getActiveSession();

      // if (!activeSession) {
      //   return R.handleSuccess(res, {
      //     manager: await managerObj.toJSON(responseValue.MINIMAL),
      //     groups: await group.toJSON(responseValue.MINIMAL),
      //     has_active_session: false,
      //     active_session: null,
      //     message: 'No active session for this groups',
      //   });
      // }

      // const sessionTemplateObj = await group.getSessionTemplateObj(activeSession.session_template);

      return R.handleSuccess(res, {
        manager: await managerObj.toJSON(responseValue.MINIMAL),
        group: await group.toJSON(responseValue.MINIMAL),
        // has_active_session: true,
        // active_session: {
        //   template: sessionTemplateObj ? await sessionTemplateObj.toJSON() : null,
        //   assigned_at: activeSession.assign_at,
        //   active: activeSession.active,
        // },
      });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: GROUPS_CODES.SEARCH_FAILED,
        message: error.message,
      });
    }
  },
);

// ============================================
// ROUTES COMPLÉMENTAIRES - ÉQUIPE PAR GUID
// ============================================

/**
 * GET /:guid/direct-members - Liste membres directs d'une équipe spécifique
 */
router.get('/:guid/direct-members', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!GroupsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.INVALID_GUID,
        message: GROUPS_ERRORS.GUID_INVALID,
      });
    }

    const groupsObj = await Groups._load(guid, true);
    if (!groupsObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GROUPS_CODES.GROUPS_NOT_FOUND,
        message: GROUPS_ERRORS.NOT_FOUND,
      });
    }

    const directMembers = await groupsObj.getDirectMembers();
    const membersData = await Promise.all(
      directMembers.map(async (member) => await member.toJSON(responseValue.MINIMAL)),
    );

    return R.handleSuccess(res, {
      group: await groupsObj.toJSON(responseValue.MINIMAL),
      total_direct_members: directMembers.length,
      direct_members: membersData,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GROUPS_CODES.LISTING_FAILED,
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
//     if (!GroupsValidationUtils.validateGuid(guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: GROUPS_CODES.INVALID_GUID,
//         message: GROUPS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const groupsObj = await Groups._load(guid, true);
//     if (!groupsObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: GROUPS_CODES.GROUPS_NOT_FOUND,
//         message: GROUPS_ERRORS.NOT_FOUND,

/**
 * GET /api/groups/:guid/assignments
 */
router.get('/:guid/assignments', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!GroupsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.INVALID_GUID,
        message: GROUPS_ERRORS.GUID_INVALID,
      });
    }

    const groupObj = await Groups._load(guid, true);
    if (!groupObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GROUPS_CODES.GROUPS_NOT_FOUND,
        message: GROUPS_ERRORS.NOT_FOUND,
      });
    }

    const assignmentType = await groupObj.getCurrentAssignmentType();
    const activeSchedule = await groupObj.getActiveScheduleAssignment();
    const activeRotation = await groupObj.getActiveRotationAssignment();
    const allSchedules = await groupObj.getAllScheduleAssignments();
    const allRotations = await groupObj.getAllRotationAssignments();

    return R.handleSuccess(res, {
      group: await groupObj.toJSON(responseValue.MINIMAL),
      current_assignment: {
        type: assignmentType,
        active_schedule: activeSchedule ? await activeSchedule.toJSON(responseValue.FULL) : null,
        active_rotation: activeRotation ? await activeRotation.toJSON(responseValue.FULL) : null,
      },
      history: {
        schedule_assignments: {
          count: allSchedules.length,
          items: await Promise.all(allSchedules.map((s) => s.toJSON(responseValue.MINIMAL))),
        },
        rotation_assignments: {
          count: allRotations.length,
          items: await Promise.all(allRotations.map((r) => r.toJSON(responseValue.MINIMAL))),
        },
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GROUPS_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/groups/:guid/current-assignment
 */
router.get('/:guid/current-assignment', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!GroupsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: GROUPS_CODES.INVALID_GUID,
        message: GROUPS_ERRORS.GUID_INVALID,
      });
    }

    const groupObj = await Groups._load(guid, true);
    if (!groupObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GROUPS_CODES.GROUPS_NOT_FOUND,
        message: GROUPS_ERRORS.NOT_FOUND,
      });
    }

    const assignmentType = await groupObj.getCurrentAssignmentType();
    const activeSchedule = await groupObj.getActiveScheduleAssignment();
    const activeRotation = await groupObj.getActiveRotationAssignment();

    return R.handleSuccess(res, {
      group: await groupObj.toJSON(responseValue.MINIMAL),
      current_assignment_type: assignmentType,
      active_schedule_assignment: activeSchedule
        ? await activeSchedule.toJSON(responseValue.FULL)
        : null,
      active_rotation_assignment: activeRotation
        ? await activeRotation.toJSON(responseValue.FULL)
        : null,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: GROUPS_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

export default router;
