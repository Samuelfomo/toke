import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  RAFamily,
  ROTATION_ASSIGNMENT_CODES,
  ROTATION_ASSIGNMENT_DEFAULTS,
  ROTATION_ASSIGNMENT_ERRORS,
  ROTATION_ASSIGNMENT_MESSAGES,
  RotationAssignmentValidationUtils,
  TimezoneConfigUtils,
  USERS_CODES,
  USERS_ERRORS,
  UsersValidationUtils,
  validateRotationAssignmentCreation,
  validateRotationAssignmentFilters,
  validateRotationAssignmentUpdate,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import RotationAssignment from '../class/RotationAssignments.js';
import RotationGroup from '../class/RotationGroups.js';
import User from '../class/User.js';
import Groups from '../class/Groups.js';
import { TenantRevision } from '../../tools/revision.js';
import { responseValue, tableName } from '../../utils/response.model.js';
import { ValidationUtils } from '../../utils/view.validator.js';
import OrgHierarchy from '../class/OrgHierarchy.js';

const router = Router();

// ============================================
// ROUTES DE LISTAGE GÉNÉRAL
// ============================================

/**
 * GET /api/rotation-assignments
 * Liste toutes les assignations
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const assignments = await RotationAssignment.exportable({}, paginationData);

    return R.handleSuccess(res, {
      rotation_assignments: assignments,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_ASSIGNMENT_CODES.PAGINATION_INVALID,
        message: ROTATION_ASSIGNMENT_ERRORS.PAGINATION_INVALID,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_ASSIGNMENT_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/rotation-assignments/revision
 * Obtient la révision actuelle
 */
router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await TenantRevision.getRevision(tableName.ROTATION_ASSIGNMENTS);

    R.handleSuccess(res, {
      revision,
      checked_at: TimezoneConfigUtils.getCurrentTime().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_ASSIGNMENT_CODES.REVISION_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/rotation-assignments/list
 * Liste avec filtres avancés
 */
router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const filtersQuery = { ...req.query };
    delete filtersQuery.offset;
    delete filtersQuery.limit;
    delete filtersQuery.view;

    const filters = validateRotationAssignmentFilters(filtersQuery);
    const conditions: Record<string, any> = {};

    if (filters.family) {
      conditions.family = filters.family;
    }

    if (filters.related) {
      conditions.related = filters.related;
    }

    if (filters.rotation_group) {
      const groupObj = await RotationGroup._load(filters.rotation_group, true);
      if (groupObj) conditions.rotation_group = groupObj.getId();
    }

    if (filters.offset !== undefined) {
      conditions.offset = filters.offset;
    }

    const assignmentList = await RotationAssignment._list(conditions, paginationOptions);
    const assignments = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || assignmentList?.length || 0,
        count: assignmentList?.length || 0,
      },
      items: assignmentList
        ? await Promise.all(assignmentList.map(async (a) => await a.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { rotation_assignments: assignments });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_ASSIGNMENT_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/rotation-assignments/:manager/list
 * Liste des assignations d'un gestionnaire
 */
router.get('/:manager/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager } = req.params;
    if (!manager || !UsersValidationUtils.validateGuid(manager)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.INVALID_GUID,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }
    const managerObj = await User._load(manager, true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }
    const isManager = await OrgHierarchy.hasManagerRole(managerObj.getId()!);
    if (!isManager) {
      return R.handleError(res, HttpStatus.FORBIDDEN, {
        code: USERS_CODES.AUTHORIZATION_FAILED,
        message: USERS_ERRORS.AUTHORIZATION_FAILED,
      });
    }

    const rotationAssignments = await RotationAssignment._listByAssignedBy(managerObj.getId()!);
    if (!rotationAssignments || rotationAssignments.length === 0) {
      return R.handleSuccess(res, {
        rotation_assignments: { count: 0, items: [] },
      });
    }
    return R.handleSuccess(res, {
      rotation_assignments: {
        count: rotationAssignments.length,
        items: await Promise.all(rotationAssignments.map(async (a) => await a.toJSON())),
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_ASSIGNMENT_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// CRÉATION (ASSIGNER UN EMPLOYÉ OU GROUPE)
// ============================================

/**
 * POST /api/rotation-assignments
 * Assigne un employé ou une group à un groupe de rotation
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateRotationAssignmentCreation(req.body);

    // Valider le groupe de rotation
    const groupObj = await RotationGroup._load(validatedData.rotation_group, true);
    if (!groupObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROTATION_ASSIGNMENT_CODES.ROTATION_GROUP_NOT_FOUND,
        message: ROTATION_ASSIGNMENT_ERRORS.ROTATION_GROUP_NOT_FOUND,
      });
    }

    const assignedByObj = await User._load(validatedData.assigned_by, true);
    if (!assignedByObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROTATION_ASSIGNMENT_CODES.ASSIGNED_BY_NOT_FOUND,
        message: ROTATION_ASSIGNMENT_ERRORS.ASSIGNED_BY_NOT_FOUND,
      });
    }

    const assignmentObj = new RotationAssignment()
      .setRotationGroup(groupObj.getId()!)
      .setAssignedBy(assignedByObj.getId()!)
      .setOffset(validatedData.offset ?? ROTATION_ASSIGNMENT_DEFAULTS.OFFSET)
      .setAssignedAt(
        validatedData.assigned_at instanceof Date
          ? validatedData.assigned_at
          : new Date(validatedData.assigned_at),
      );

    // Résolution du related selon la family
    const { family, related: relatedGuid } = validatedData;

    if (family === RAFamily.USER) {
      const userObj = await User._load(relatedGuid, true);
      if (!userObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: ROTATION_ASSIGNMENT_CODES.USER_NOT_FOUND,
          message: ROTATION_ASSIGNMENT_ERRORS.USER_NOT_FOUND,
        });
      }

      // Vérifier si déjà assigné à ce groupe de rotation
      const existing = await RotationAssignment._load(
        { family: RAFamily.USER, related: userObj.getGuid()!, rotationGroup: groupObj.getId()! },
        false,
        true,
      );
      if (existing) {
        return R.handleError(res, HttpStatus.CONFLICT, {
          code: ROTATION_ASSIGNMENT_CODES.ALREADY_ASSIGNED,
          message: ROTATION_ASSIGNMENT_ERRORS.USER_ALREADY_ASSIGNED,
        });
      }

      assignmentObj.setFamily(RAFamily.USER).setRelated(userObj.getGuid()!);
    } else {
      const groupsObj = await Groups._load(relatedGuid, true);
      if (!groupsObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: ROTATION_ASSIGNMENT_CODES.GROUPS_NOT_FOUND,
          message: ROTATION_ASSIGNMENT_ERRORS.GROUPS_NOT_FOUND,
        });
      }

      // Vérifier si déjà assigné à ce groupe de rotation
      const existing = await RotationAssignment._load(
        { family: RAFamily.GROUP, related: groupsObj.getGuid()!, rotationGroup: groupObj.getId()! },
        false,
        true,
      );
      if (existing) {
        return R.handleError(res, HttpStatus.CONFLICT, {
          code: ROTATION_ASSIGNMENT_CODES.ALREADY_ASSIGNED,
          message: ROTATION_ASSIGNMENT_ERRORS.GROUPS_ALREADY_ASSIGNED,
        });
      }

      assignmentObj.setFamily(RAFamily.GROUP).setRelated(groupsObj.getGuid()!);
    }

    await assignmentObj.save();

    return R.handleCreated(res, {
      message: ROTATION_ASSIGNMENT_MESSAGES.CREATED_SUCCESSFULLY,
      rotation_assignment: await assignmentObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_ASSIGNMENT_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// RÉCUPÉRATION PAR GUID
// ============================================

/**
 * GET /api/rotation-assignments/:guid
 * Récupère une assignation spécifique
 */
router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!RotationAssignmentValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_ASSIGNMENT_CODES.INVALID_GUID,
        message: ROTATION_ASSIGNMENT_ERRORS.GUID_INVALID,
      });
    }

    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const assignmentObj = await RotationAssignment._load(req.params.guid, true);
    if (!assignmentObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROTATION_ASSIGNMENT_CODES.ROTATION_ASSIGNMENT_NOT_FOUND,
        message: ROTATION_ASSIGNMENT_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      rotation_assignment: await assignmentObj.toJSON(views),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_ASSIGNMENT_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// ASSIGNATIONS PAR UTILISATEUR
// ============================================

/**
 * GET /api/rotation-assignments/user/:userGuid
 * Liste toutes les assignations d'un utilisateur
 */
router.get('/user/:userGuid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!UsersValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.INVALID_GUID,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(req.params.userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const assignmentList = await RotationAssignment._listByRelated(
      RAFamily.USER,
      userObj.getGuid()!,
      paginationOptions,
    );

    const assignments = {
      user: await userObj.toJSON(),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || assignmentList?.length || 0,
        count: assignmentList?.length || 0,
      },
      assignments: assignmentList
        ? await Promise.all(assignmentList.map(async (a) => await a.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { assignments });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_ASSIGNMENT_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/rotation-assignments/user/:userGuid/current-schedule
 * Récupère l'horaire actuel de l'utilisateur basé sur sa rotation
 */
router.get(
  '/user/:userGuid/current-schedule',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      if (!UsersValidationUtils.validateGuid(req.params.userGuid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.INVALID_GUID,
          message: USERS_ERRORS.GUID_INVALID,
        });
      }

      const userObj = await User._load(req.params.userGuid, true);
      if (!userObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.USER_NOT_FOUND,
          message: USERS_ERRORS.NOT_FOUND,
        });
      }

      const assignments = await RotationAssignment._listByRelated(
        RAFamily.USER,
        userObj.getGuid()!,
      );
      if (!assignments || assignments.length === 0) {
        return R.handleSuccess(res, {
          message: 'User has no rotation assignment',
          user: await userObj.toJSON(),
          schedule: null,
        });
      }

      const assignment = assignments[0]!;
      const snapshot = await assignment.getSnapshotForDate();
      const rotationGroup = await assignment.getRotationGroupObj();

      if (!snapshot) {
        return R.handleSuccess(res, {
          message: 'No template found for this date',
          user: await userObj.toJSON(),
          schedule: null,
        });
      }

      return R.handleSuccess(res, {
        user: await userObj.toJSON(),
        rotation_assignment: await assignment.toJSON(responseValue.MINIMAL),
        rotation_group: rotationGroup ? await rotationGroup.toJSON(responseValue.MINIMAL) : null,
        schedule: snapshot,
      });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ROTATION_ASSIGNMENT_CODES.SCHEDULE_RETRIEVAL_FAILED,
        message: error.message,
      });
    }
  },
);

// ============================================
// ASSIGNATIONS PAR GROUPS
// ============================================

/**
 * GET /api/rotation-assignments/groups/:groupsGuid
 * Liste toutes les assignations d'une group
 */
router.get('/groups/:groupsGuid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { groupsGuid } = req.params;
    if (!RotationAssignmentValidationUtils.validateGuid(groupsGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_ASSIGNMENT_CODES.INVALID_GUID,
        message: ROTATION_ASSIGNMENT_ERRORS.GUID_INVALID,
      });
    }

    const groupsObj = await Groups._load(groupsGuid, true);
    if (!groupsObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROTATION_ASSIGNMENT_CODES.GROUPS_NOT_FOUND,
        message: ROTATION_ASSIGNMENT_ERRORS.GROUPS_NOT_FOUND,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const assignmentList = await RotationAssignment._listByRelated(
      RAFamily.GROUP,
      groupsObj.getGuid()!,
      paginationOptions,
    );

    const assignments = {
      groups: await groupsObj.toJSON(responseValue.MINIMAL),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || assignmentList?.length || 0,
        count: assignmentList?.length || 0,
      },
      assignments: assignmentList
        ? await Promise.all(assignmentList.map(async (a) => await a.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { assignments });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_ASSIGNMENT_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// MISE À JOUR
// ============================================

/**
 * PUT /api/rotation-assignments/:guid
 * Met à jour une assignation (surtout l'offset)
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    if (!RotationAssignmentValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_ASSIGNMENT_CODES.INVALID_GUID,
        message: ROTATION_ASSIGNMENT_ERRORS.GUID_INVALID,
      });
    }

    const assignmentObj = await RotationAssignment._load(req.params.guid, true);
    if (!assignmentObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROTATION_ASSIGNMENT_CODES.ROTATION_ASSIGNMENT_NOT_FOUND,
        message: ROTATION_ASSIGNMENT_ERRORS.NOT_FOUND,
      });
    }

    const validatedData = validateRotationAssignmentUpdate(req.body);

    if (validatedData.offset !== undefined) {
      assignmentObj.setOffset(validatedData.offset);
    }

    if (validatedData.rotation_group !== undefined) {
      const groupObj = await RotationGroup._load(validatedData.rotation_group, true);
      if (!groupObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: ROTATION_ASSIGNMENT_CODES.ROTATION_GROUP_NOT_FOUND,
          message: ROTATION_ASSIGNMENT_ERRORS.ROTATION_GROUP_NOT_FOUND,
        });
      }
      assignmentObj.setRotationGroup(groupObj.getId()!);
    }

    // Mise à jour du related si family + related fournis
    if (validatedData.family !== undefined && validatedData.related !== undefined) {
      if (validatedData.family === RAFamily.USER) {
        const userObj = await User._load(validatedData.related, true);
        if (!userObj) {
          return R.handleError(res, HttpStatus.NOT_FOUND, {
            code: ROTATION_ASSIGNMENT_CODES.USER_NOT_FOUND,
            message: ROTATION_ASSIGNMENT_ERRORS.USER_NOT_FOUND,
          });
        }
        assignmentObj.setFamily(RAFamily.USER).setRelated(userObj.getGuid()!);
      } else {
        const groupsObj = await Groups._load(validatedData.related, true);
        if (!groupsObj) {
          return R.handleError(res, HttpStatus.NOT_FOUND, {
            code: ROTATION_ASSIGNMENT_CODES.GROUPS_NOT_FOUND,
            message: ROTATION_ASSIGNMENT_ERRORS.GROUPS_NOT_FOUND,
          });
        }
        assignmentObj.setFamily(RAFamily.GROUP).setRelated(groupsObj.getGuid()!);
      }
    }

    await assignmentObj.save();

    return R.handleSuccess(res, {
      message: ROTATION_ASSIGNMENT_MESSAGES.UPDATED_SUCCESSFULLY,
      rotation_assignment: await assignmentObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_ASSIGNMENT_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// SUPPRESSION (RETIRER DE LA ROTATION)
// ============================================

/**
 * DELETE /api/rotation-assignments/:guid
 * Retire un employé ou une group d'une rotation
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    if (!RotationAssignmentValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_ASSIGNMENT_CODES.INVALID_GUID,
        message: ROTATION_ASSIGNMENT_ERRORS.GUID_INVALID,
      });
    }

    const assignmentObj = await RotationAssignment._load(req.params.guid, true);
    if (!assignmentObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROTATION_ASSIGNMENT_CODES.ROTATION_ASSIGNMENT_NOT_FOUND,
        message: ROTATION_ASSIGNMENT_ERRORS.NOT_FOUND,
      });
    }

    await assignmentObj.delete();

    return R.handleSuccess(res, {
      message: ROTATION_ASSIGNMENT_MESSAGES.DELETED_SUCCESSFULLY,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_ASSIGNMENT_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// STATISTIQUES
// ============================================

/**
 * GET /api/rotation-assignments/:guid/statistics
 * Statistiques sur une assignation
 */
router.get('/:guid/statistics', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!RotationAssignmentValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROTATION_ASSIGNMENT_CODES.INVALID_GUID,
        message: ROTATION_ASSIGNMENT_ERRORS.GUID_INVALID,
      });
    }

    const assignmentObj = await RotationAssignment._load(req.params.guid, true);
    if (!assignmentObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROTATION_ASSIGNMENT_CODES.ROTATION_ASSIGNMENT_NOT_FOUND,
        message: ROTATION_ASSIGNMENT_ERRORS.NOT_FOUND,
      });
    }

    const relatedObj = await assignmentObj.getRelatedObj();
    const rotationGroup = await assignmentObj.getRotationGroupObj();

    const statistics = {
      assignment: await assignmentObj.toJSON(responseValue.MINIMAL),
      type: assignmentObj.getFamily(),
      target: relatedObj
        ? assignmentObj.isUserRotation()
          ? await (relatedObj as User).toJSON()
          : await (relatedObj as Groups).toJSON(responseValue.MINIMAL)
        : null,
      rotation_group: rotationGroup ? await rotationGroup.toJSON(responseValue.MINIMAL) : null,
      days_assigned: assignmentObj.getDaysAssigned(),
      is_recent: assignmentObj.isRecentAssignment(),
      offset: assignmentObj.getOffset(),
      assigned_at: assignmentObj.getCreatedAt(),
    };

    return R.handleSuccess(res, { statistics });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROTATION_ASSIGNMENT_CODES.STATISTICS_FAILED,
      message: error.message,
    });
  }
});

export default router;

// import { Request, Response, Router } from 'express';
// import {
//   HttpStatus,
//   paginationSchema,
//   ROTATION_ASSIGNMENT_CODES,
//   ROTATION_ASSIGNMENT_DEFAULTS,
//   ROTATION_ASSIGNMENT_ERRORS,
//   ROTATION_ASSIGNMENT_MESSAGES,
//   RotationAssignmentValidationUtils,
//   TimezoneConfigUtils,
//   USERS_CODES,
//   USERS_ERRORS,
//   UsersValidationUtils,
//   validateRotationAssignmentCreation,
//   validateRotationAssignmentFilters,
//   validateRotationAssignmentUpdate,
// } from '@toke/shared';
//
// import Ensure from '../../middle/ensured-routes.js';
// import R from '../../tools/response.js';
// import RotationAssignment from '../class/RotationAssignments.js';
// import RotationGroup from '../class/RotationGroups.js';
// import User from '../class/User.js';
// import Groups from '../class/Groups.js';
// import { TenantRevision } from '../../tools/revision.js';
// import { responseValue, tableName } from '../../utils/response.model.js';
// import { ValidationUtils } from '../../utils/view.validator.js';
// import OrgHierarchy from '../class/OrgHierarchy.js';
//
// const router = Router();
//
// // ============================================
// // ROUTES DE LISTAGE GÉNÉRAL
// // ============================================
//
// /**
//  * GET /api/rotation-assignments
//  * Liste toutes les assignations
//  */
// router.get('/', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const paginationData = paginationSchema.parse(req.query);
//     const assignments = await RotationAssignment.exportable({}, paginationData);
//
//     return R.handleSuccess(res, {
//       rotation_assignments: assignments,
//     });
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: ROTATION_ASSIGNMENT_CODES.PAGINATION_INVALID,
//         message: ROTATION_ASSIGNMENT_ERRORS.PAGINATION_INVALID,
//       });
//     }
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: ROTATION_ASSIGNMENT_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// /**
//  * GET /api/rotation-assignments/revision
//  * Obtient la révision actuelle
//  */
// router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
//   try {
//     const revision = await TenantRevision.getRevision(tableName.ROTATION_ASSIGNMENTS);
//
//     R.handleSuccess(res, {
//       revision,
//       checked_at: TimezoneConfigUtils.getCurrentTime().toISOString(),
//     });
//   } catch (error: any) {
//     R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: ROTATION_ASSIGNMENT_CODES.REVISION_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// /**
//  * GET /api/rotation-assignments/list
//  * Liste avec filtres avancés
//  */
// router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const paginationOptions = paginationSchema.parse(req.query);
//     const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);
//
//     const filtersQuery = { ...req.query };
//     delete filtersQuery.offset;
//     delete filtersQuery.limit;
//     delete filtersQuery.view;
//
//     const filters = validateRotationAssignmentFilters(filtersQuery);
//     const conditions: Record<string, any> = {};
//
//     if (filters.user) {
//       const userObj = await User._load(filters.user, true);
//       if (userObj) conditions.user = userObj.getId();
//     }
//
//     if (filters.rotation_group) {
//       const groupObj = await RotationGroup._load(filters.rotation_group, true);
//       if (groupObj) conditions.rotation_group = groupObj.getId();
//     }
//
//     if (filters.offset !== undefined) {
//       conditions.offset = filters.offset;
//     }
//
//     const assignmentList = await RotationAssignment._list(conditions, paginationOptions);
//     const assignments = {
//       pagination: {
//         offset: paginationOptions.offset || 0,
//         limit: paginationOptions.limit || assignmentList?.length || 0,
//         count: assignmentList?.length || 0,
//       },
//       items: assignmentList
//         ? await Promise.all(assignmentList.map(async (a) => await a.toJSON(views)))
//         : [],
//     };
//
//     return R.handleSuccess(res, { rotation_assignments: assignments });
//   } catch (error: any) {
//     if (error.code) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: error.code,
//         message: error.message,
//       });
//     }
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: ROTATION_ASSIGNMENT_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// /**
//  * GET /api/rotation-assignments/list/:manager
//  * Liste des assignations d'un gestionnaire
//  */
// router.get('/:manager/list', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const { manager } = req.params;
//     if (!manager || !UsersValidationUtils.validateGuid(manager)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: USERS_CODES.INVALID_GUID,
//         message: USERS_ERRORS.GUID_INVALID,
//       });
//     }
//     const managerObj = await User._load(manager, true);
//     if (!managerObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: USERS_CODES.USER_NOT_FOUND,
//         message: USERS_ERRORS.NOT_FOUND,
//       });
//     }
//     const isManager = await OrgHierarchy.hasManagerRole(managerObj.getId()!);
//     if (!isManager) {
//       return R.handleError(res, HttpStatus.FORBIDDEN, {
//         code: USERS_CODES.AUTHORIZATION_FAILED,
//         message: USERS_ERRORS.AUTHORIZATION_FAILED,
//       });
//     }
//     // const paginationOptions = paginationSchema.parse(req.query);
//     // const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);
//
//     const rotationAssignments = await RotationAssignment._listByAssignedBy(managerObj.getId()!);
//     if (!rotationAssignments || rotationAssignments.length === 0) {
//       return R.handleSuccess(res, {
//         rotation_assignments: {
//           count: 0,
//           items: [],
//         },
//       });
//     }
//     return R.handleSuccess(res, {
//       rotation_assignments: {
//         count: rotationAssignments.length,
//         items: await Promise.all(rotationAssignments.map(async (a) => await a.toJSON())),
//       },
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: ROTATION_ASSIGNMENT_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // ============================================
// // CRÉATION (ASSIGNER UN EMPLOYÉ)
// // ============================================
//
// /**
//  * POST /api/rotation-assignments
//  * Assigne un employé à un groupe de rotation
//  */
// router.post('/', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     const validatedData = validateRotationAssignmentCreation(req.body);
//
//     // Valider le groupe de rotation
//     const groupObj = await RotationGroup._load(validatedData.rotation_group, true);
//     if (!groupObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: ROTATION_ASSIGNMENT_CODES.ROTATION_GROUP_NOT_FOUND,
//         message: ROTATION_ASSIGNMENT_ERRORS.ROTATION_GROUP_NOT_FOUND,
//       });
//     }
//
//     const assignedByObj = await User._load(validatedData.assigned_by, true);
//     if (!assignedByObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: ROTATION_ASSIGNMENT_CODES.ASSIGNED_BY_NOT_FOUND,
//         message: ROTATION_ASSIGNMENT_ERRORS.ASSIGNED_BY_NOT_FOUND,
//       });
//     }
//
//     if (validatedData.user && validatedData.group) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: ROTATION_ASSIGNMENT_CODES.VALIDATION_FAILED,
//         message: ROTATION_ASSIGNMENT_ERRORS.ONLY_ONE_USER_OR_GROUPS_ALLOWED,
//       });
//     }
//
//     if (!validatedData.user && !validatedData.group) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: ROTATION_ASSIGNMENT_CODES.VALIDATION_FAILED,
//         message: ROTATION_ASSIGNMENT_ERRORS.USER_OR_GROUPS_REQUIRED,
//       });
//     }
//
//     const assignmentObj = new RotationAssignment()
//       .setRotationGroup(groupObj.getId()!)
//       .setAssignedBy(assignedByObj.getId()!)
//       .setOffset(validatedData.offset ?? ROTATION_ASSIGNMENT_DEFAULTS.OFFSET)
//       .setAssignedAt(
//         validatedData.assigned_at instanceof Date
//           ? validatedData.assigned_at
//           : new Date(validatedData.assigned_at),
//       );
//     console.log('assignmentObj', assignmentObj);
//
//     if (validatedData.user) {
//       // Valider l'utilisateur
//       const userObj = await User._load(validatedData.user, true);
//       if (!userObj) {
//         return R.handleError(res, HttpStatus.NOT_FOUND, {
//           code: ROTATION_ASSIGNMENT_CODES.USER_NOT_FOUND,
//           message: ROTATION_ASSIGNMENT_ERRORS.USER_NOT_FOUND,
//         });
//       }
//
//       const userGroupData = {
//         user: userObj.getId()!,
//         rotationGroup: groupObj.getId()!,
//       };
//
//       // Vérifier si l'utilisateur est déjà assigné à ce groupe
//       const existingAssignment = await RotationAssignment._load(userGroupData, false, true);
//
//       if (existingAssignment) {
//         return R.handleError(res, HttpStatus.CONFLICT, {
//           code: ROTATION_ASSIGNMENT_CODES.ALREADY_ASSIGNED,
//           message: ROTATION_ASSIGNMENT_ERRORS.USER_ALREADY_ASSIGNED,
//         });
//       }
//
//       assignmentObj.setUser(userObj.getId()!);
//     }
//     if (validatedData.group) {
//       // Valider la groups
//       const groupsObj = await Groups._load(validatedData.group, true);
//       if (!groupsObj) {
//         return R.handleError(res, HttpStatus.NOT_FOUND, {
//           code: ROTATION_ASSIGNMENT_CODES.GROUPS_NOT_FOUND,
//           message: ROTATION_ASSIGNMENT_ERRORS.GROUPS_NOT_FOUND,
//         });
//       }
//
//       const groupsGroupData = {
//         groups: groupsObj.getId()!,
//         rotationGroup: groupObj.getId()!,
//       };
//
//       // Vérifier si la groups est déjà assigné à ce groupe
//       const existingAssignment = await RotationAssignment._load(
//         groupsGroupData,
//         false,
//         false,
//         true,
//       );
//
//       if (existingAssignment) {
//         return R.handleError(res, HttpStatus.CONFLICT, {
//           code: ROTATION_ASSIGNMENT_CODES.ALREADY_ASSIGNED,
//           message: ROTATION_ASSIGNMENT_ERRORS.GROUPS_ALREADY_ASSIGNED,
//         });
//       }
//
//       assignmentObj.setGroups(groupsObj.getId()!);
//     }
//
//     await assignmentObj.save();
//
//     return R.handleCreated(res, {
//       message: ROTATION_ASSIGNMENT_MESSAGES.CREATED_SUCCESSFULLY,
//       rotation_assignment: await assignmentObj.toJSON(),
//     });
//   } catch (error: any) {
//     if (error.code) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: error.code,
//         message: error.message,
//       });
//     }
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: ROTATION_ASSIGNMENT_CODES.CREATION_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // ============================================
// // RÉCUPÉRATION PAR GUID
// // ============================================
//
// /**
//  * GET /api/rotation-assignments/:guid
//  * Récupère une assignation spécifique
//  */
// router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     if (!RotationAssignmentValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: ROTATION_ASSIGNMENT_CODES.INVALID_GUID,
//         message: ROTATION_ASSIGNMENT_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);
//
//     const assignmentObj = await RotationAssignment._load(req.params.guid, true);
//     if (!assignmentObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: ROTATION_ASSIGNMENT_CODES.ROTATION_ASSIGNMENT_NOT_FOUND,
//         message: ROTATION_ASSIGNMENT_ERRORS.NOT_FOUND,
//       });
//     }
//
//     return R.handleSuccess(res, {
//       rotation_assignment: await assignmentObj.toJSON(views),
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: ROTATION_ASSIGNMENT_CODES.RETRIEVAL_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // ============================================
// // ASSIGNATIONS PAR UTILISATEUR
// // ============================================
//
// /**
//  * GET /api/rotation-assignments/user/:userGuid
//  * Liste toutes les assignations d'un utilisateur
//  */
// router.get('/user/:userGuid', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     if (!UsersValidationUtils.validateGuid(req.params.userGuid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: USERS_CODES.INVALID_GUID,
//         message: USERS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const userObj = await User._load(req.params.userGuid, true);
//     if (!userObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: USERS_CODES.USER_NOT_FOUND,
//         message: USERS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const paginationOptions = paginationSchema.parse(req.query);
//     const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);
//
//     const assignmentList = await RotationAssignment._listByUser(
//       userObj.getId()!,
//       paginationOptions,
//     );
//
//     const assignments = {
//       user: await userObj.toJSON(),
//       pagination: {
//         offset: paginationOptions.offset || 0,
//         limit: paginationOptions.limit || assignmentList?.length || 0,
//         count: assignmentList?.length || 0,
//       },
//       assignments: assignmentList
//         ? await Promise.all(assignmentList.map(async (a) => await a.toJSON(views)))
//         : [],
//     };
//
//     return R.handleSuccess(res, { assignments });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: ROTATION_ASSIGNMENT_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// /**
//  * GET /api/rotation-assignments/user/:userGuid/current-schedule
//  * Récupère l'horaire actuel de l'utilisateur basé sur sa rotation
//  */
// router.get(
//   '/user/:userGuid/current-schedule',
//   Ensure.get(),
//   async (req: Request, res: Response) => {
//     try {
//       if (!UsersValidationUtils.validateGuid(req.params.userGuid)) {
//         return R.handleError(res, HttpStatus.BAD_REQUEST, {
//           code: USERS_CODES.INVALID_GUID,
//           message: USERS_ERRORS.GUID_INVALID,
//         });
//       }
//
//       const userObj = await User._load(req.params.userGuid, true);
//       if (!userObj) {
//         return R.handleError(res, HttpStatus.NOT_FOUND, {
//           code: USERS_CODES.USER_NOT_FOUND,
//           message: USERS_ERRORS.NOT_FOUND,
//         });
//       }
//
//       // Date cible (aujourd'hui par défaut)
//       const targetDate = req.query.date
//         ? new Date(req.query.date as string)
//         : TimezoneConfigUtils.getCurrentTime();
//
//       // Trouver l'assignation active
//       const assignments = await RotationAssignment._listByUser(userObj.getId()!);
//       if (!assignments || assignments.length === 0) {
//         return R.handleSuccess(res, {
//           message: 'User has no rotation assignment',
//           user: await userObj.toJSON(),
//           schedule: null,
//         });
//       }
//
//       // Prendre la première assignation active (normalement il n'y en a qu'une)
//       const assignment = assignments[0];
//       const snapshot = await assignment.getSnapshotForDate(targetDate);
//       const rotationGroup = await assignment.getRotationGroupObj();
//
//       if (!snapshot) {
//         return R.handleSuccess(res, {
//           message: 'No template found for this date',
//           user: await userObj.toJSON(),
//           date: targetDate.toISOString().split('T')[0],
//           schedule: null,
//         });
//       }
//
//       // const template = await SessionTemplate._load(templateId);
//       // const rotationGroup = await assignment.getRotationGroupObj();
//
//       return R.handleSuccess(res, {
//         user: await userObj.toJSON(),
//         date: targetDate.toISOString().split('T')[0],
//         rotation_assignment: await assignment.toJSON(responseValue.MINIMAL),
//         rotation_group: rotationGroup ? await rotationGroup.toJSON(responseValue.MINIMAL) : null,
//         schedule: snapshot,
//       });
//     } catch (error: any) {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: ROTATION_ASSIGNMENT_CODES.SCHEDULE_RETRIEVAL_FAILED,
//         message: error.message,
//       });
//     }
//   },
// );
//
// // ============================================
// // MISE À JOUR
// // ============================================
//
// /**
//  * PUT /api/rotation-assignments/:guid
//  * Met à jour une assignation (surtout l'offset)
//  */
// router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
//   try {
//     if (!RotationAssignmentValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: ROTATION_ASSIGNMENT_CODES.INVALID_GUID,
//         message: ROTATION_ASSIGNMENT_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const assignmentObj = await RotationAssignment._load(req.params.guid, true);
//     if (!assignmentObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: ROTATION_ASSIGNMENT_CODES.ROTATION_ASSIGNMENT_NOT_FOUND,
//         message: ROTATION_ASSIGNMENT_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const validatedData = validateRotationAssignmentUpdate(req.body);
//
//     if (validatedData.offset !== undefined) {
//       assignmentObj.setOffset(validatedData.offset);
//     }
//
//     if (validatedData.rotation_group !== undefined) {
//       const groupObj = await RotationGroup._load(validatedData.rotation_group, true);
//       if (!groupObj) {
//         return R.handleError(res, HttpStatus.NOT_FOUND, {
//           code: ROTATION_ASSIGNMENT_CODES.ROTATION_GROUP_NOT_FOUND,
//           message: ROTATION_ASSIGNMENT_ERRORS.ROTATION_GROUP_NOT_FOUND,
//         });
//       }
//       assignmentObj.setRotationGroup(groupObj.getId()!);
//     }
//
//     await assignmentObj.save();
//
//     return R.handleSuccess(res, {
//       message: ROTATION_ASSIGNMENT_MESSAGES.UPDATED_SUCCESSFULLY,
//       rotation_assignment: await assignmentObj.toJSON(),
//     });
//   } catch (error: any) {
//     if (error.code) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: error.code,
//         message: error.message,
//       });
//     }
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: ROTATION_ASSIGNMENT_CODES.UPDATE_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // ============================================
// // SUPPRESSION (RETIRER DE LA ROTATION)
// // ============================================
//
// /**
//  * DELETE /api/rotation-assignments/:guid
//  * Retire un employé d'une rotation
//  */
// router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
//   try {
//     if (!RotationAssignmentValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: ROTATION_ASSIGNMENT_CODES.INVALID_GUID,
//         message: ROTATION_ASSIGNMENT_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const assignmentObj = await RotationAssignment._load(req.params.guid, true);
//     if (!assignmentObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: ROTATION_ASSIGNMENT_CODES.ROTATION_ASSIGNMENT_NOT_FOUND,
//         message: ROTATION_ASSIGNMENT_ERRORS.NOT_FOUND,
//       });
//     }
//
//     await assignmentObj.delete();
//
//     return R.handleSuccess(res, {
//       message: ROTATION_ASSIGNMENT_MESSAGES.DELETED_SUCCESSFULLY,
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: ROTATION_ASSIGNMENT_CODES.DELETE_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // ============================================
// // STATISTIQUES
// // ============================================
//
// /**
//  * GET /api/rotation-assignments/:guid/statistics
//  * Statistiques sur une assignation
//  */
// router.get('/:guid/statistics', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     if (!RotationAssignmentValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: ROTATION_ASSIGNMENT_CODES.INVALID_GUID,
//         message: ROTATION_ASSIGNMENT_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const assignmentObj = await RotationAssignment._load(req.params.guid, true);
//     if (!assignmentObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: ROTATION_ASSIGNMENT_CODES.ROTATION_ASSIGNMENT_NOT_FOUND,
//         message: ROTATION_ASSIGNMENT_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const user = await assignmentObj.getUserObj();
//     const rotationGroup = await assignmentObj.getRotationGroupObj();
//
//     const statistics = {
//       assignment: await assignmentObj.toJSON(responseValue.MINIMAL),
//       user: user ? await user.toJSON() : null,
//       rotation_group: rotationGroup ? await rotationGroup.toJSON(responseValue.MINIMAL) : null,
//       days_assigned: assignmentObj.getDaysAssigned(),
//       is_recent: assignmentObj.isRecentAssignment(),
//       offset: assignmentObj.getOffset(),
//       assigned_at: assignmentObj.getCreatedAt(),
//     };
//
//     return R.handleSuccess(res, { statistics });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: ROTATION_ASSIGNMENT_CODES.STATISTICS_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// export default router;
