import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  ROLES_CODES,
  ROLES_ERRORS,
  USER_ROLES_CODES,
  USER_ROLES_ERRORS,
  UserRolesValidationUtils,
  USERS_CODES,
  USERS_ERRORS,
  validateUserRoleAssignment,
  validateUserRolesFilters,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import User from '../class/User.js';
import Role from '../class/Role.js';
import UserRole from '../class/UserRole.js';
import Revision from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';

const router = Router();

// === ROUTES DE LISTAGE GÉNÉRAL ===

router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const exportableUserRoles = await UserRole.exportable({}, paginationData);

    return R.handleSuccess(res, {
      exportableUserRoles,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USER_ROLES_CODES.PAGINATION_INVALID,
        message: USER_ROLES_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: USER_ROLES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.USER_ROLES);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USER_ROLES_CODES.REVISION_FAILED,
      message: error.message,
    });
  }
});

router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const filters = validateUserRolesFilters(req.query);
    const paginationOptions = paginationSchema.parse(req.query);
    const conditions: Record<string, any> = {};

    if (filters.user) {
      conditions.user = filters.user;
    }
    if (filters.role) {
      conditions.role = filters.role;
    }
    if (filters.assigned_by) {
      conditions.assigned_by = filters.assigned_by;
    }

    const userRoleEntries = await UserRole._list(conditions, paginationOptions);
    const userRoles = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || userRoleEntries?.length || 0,
        count: userRoleEntries?.length || 0,
      },
      items: userRoleEntries
        ? await Promise.all(userRoleEntries.map(async (userRole) => await userRole.toJSON()))
        : [],
    };

    return R.handleSuccess(res, { userRoles });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USER_ROLES_CODES.PAGINATION_INVALID,
        message: USER_ROLES_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: USER_ROLES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

// === ASSIGNMENT DE RÔLES ===

router.post('/assign', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateUserRoleAssignment(req.body);

    // Vérification de l'existence de l'utilisateur
    const userObj = await User._load(validatedData.user, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    // Vérification de l'existence du rôle
    const roleObj = await Role._load(validatedData.role, true);
    if (!roleObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROLES_CODES.ROLE_NOT_FOUND,
        message: ROLES_ERRORS.NOT_FOUND,
      });
    }

    // Vérification de l'assignateur
    const assignedByObj = await User._load(validatedData.assigned_by, true);
    if (!assignedByObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: 'Assigned by user not found',
      });
    }

    // Assignment du rôle
    const userRole = await UserRole.assignRole(
      userObj.getId()!,
      roleObj.getId()!,
      assignedByObj.getId()!,
    );

    return R.handleCreated(res, await userRole.toJSON());
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USER_ROLES_CODES.VALIDATION_FAILED,
        message: USER_ROLES_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('DUPLICATE_ASSIGNMENT')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: USER_ROLES_CODES.DUPLICATE_ASSIGNMENT,
        message: USER_ROLES_ERRORS.DUPLICATE_ASSIGNMENT,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: USER_ROLES_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  }
});

// === ROUTES PAR UTILISATEUR ===

router.get('/user/:userGuid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!UserRolesValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USER_ROLES_CODES.INVALID_GUID,
        message: USER_ROLES_ERRORS.GUID_INVALID,
      });
    }

    const userGuid = req.params.userGuid;

    const userObj = await User._load(userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USER_ROLES_CODES.USER_NOT_FOUND,
        message: USER_ROLES_ERRORS.USER_NOT_FOUND,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const userRoleEntries = await UserRole._listByUser(userObj.getId()!, paginationOptions);

    const userRoles = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || userRoleEntries?.length || 0,
        count: userRoleEntries?.length || 0,
      },
      items: userRoleEntries
        ? await Promise.all(userRoleEntries.map(async (userRole) => await userRole.toJSON()))
        : [],
    };

    return R.handleSuccess(res, { userRoles });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USER_ROLES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// router.get(
//   '/user/:userId/has-role/:roleCode',
//   Ensure.get(),
//   async (req: Request, res: Response) => {
//     try {
//       const userId = parseInt(req.params.userId, 10);
//       const { roleCode } = req.params;
//
//       if (isNaN(userId)) {
//         return R.handleError(res, HttpStatus.BAD_REQUEST, {
//           code: USER_ROLES_CODES.INVALID_USER_ID,
//           message: 'Invalid user ID',
//         });
//       }
//
//       if (!roleCode) {
//         return R.handleError(res, HttpStatus.BAD_REQUEST, {
//           code: USER_ROLES_CODES.INVALID_ROLE_CODE,
//           message: 'Role code is required',
//         });
//       }
//
//       const hasRole = await UserRole.hasRole(userId, roleCode);
//
//       return R.handleSuccess(res, {
//         user_id: userId,
//         role_code: roleCode,
//         has_role: hasRole,
//       });
//     } catch (error: any) {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: USER_ROLES_CODES.ROLE_CHECK_FAILED,
//         message: error.message,
//       });
//     }
//   },
// );

// === ROUTES PAR RÔLE ===

// router.get('/role/:roleId/list', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const roleId = parseInt(req.params.roleId, 10);
//     if (isNaN(roleId)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: USER_ROLES_CODES.INVALID_ROLE_ID,
//         message: 'Invalid role ID',
//       });
//     }
//
//     const paginationOptions = paginationSchema.parse(req.query);
//     const userRoleEntries = await UserRole._listByRole(roleId, paginationOptions);
//
//     const userRoles = {
//       pagination: {
//         offset: paginationOptions.offset || 0,
//         limit: paginationOptions.limit || userRoleEntries?.length || 0,
//         count: userRoleEntries?.length || 0,
//       },
//       items: userRoleEntries
//         ? await Promise.all(userRoleEntries.map(async (userRole) => await userRole.toJSON()))
//         : [],
//     };
//
//     return R.handleSuccess(res, { userRoles });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: USER_ROLES_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// router.get('/role/:roleId/users', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const roleId = parseInt(req.params.roleId, 10);
//     if (isNaN(roleId)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: USER_ROLES_CODES.INVALID_ROLE_ID,
//         message: 'Invalid role ID',
//       });
//     }
//
//     // Vérification de l'existence du rôle
//     const roleObj = await Role._load(roleId);
//     if (!roleObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: ROLES_CODES.ROLE_NOT_FOUND,
//         message: ROLES_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const paginationOptions = paginationSchema.parse(req.query);
//     const userRoleEntries = await UserRole._listByRole(roleId, paginationOptions);
//
//     const users = [];
//     if (userRoleEntries) {
//       for (const userRole of userRoleEntries) {
//         const user = await userRole.getUserObject();
//         if (user) {
//           users.push({
//             ...user.toJSON(),
//             assignment_date: userRole.getCreatedAt(),
//             assigned_by: await userRole.getAssignedByObject(),
//           });
//         }
//       }
//     }
//
//     return R.handleSuccess(res, {
//       role: roleObj.toJSON(),
//       users: {
//         pagination: {
//           offset: paginationOptions.offset || 0,
//           limit: paginationOptions.limit || users.length,
//           count: users.length,
//         },
//         items: users,
//       },
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: USER_ROLES_CODES.USERS_RETRIEVAL_FAILED,
//       message: error.message,
//     });
//   }
// });

// === RÉCUPÉRATION D'UN ASSIGNMENT SPÉCIFIQUE ===

// router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const validGuid = UserRolesValidationUtils.validateGuid(req.params.guid);
//     if (!validGuid) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: USER_ROLES_CODES.INVALID_GUID,
//         message: USER_ROLES_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const userRoleObj = await UserRole._load(req.params.guid, true);
//     if (!userRoleObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: USER_ROLES_CODES.ASSIGNMENT_NOT_FOUND,
//         message: USER_ROLES_ERRORS.NOT_FOUND,
//       });
//     }
//
//     return R.handleSuccess(res, {
//       userRole: await userRoleObj.toJSON(),
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: USER_ROLES_CODES.RETRIEVAL_FAILED,
//       message: error.message,
//     });
//   }
// });

// === SUPPRESSION D'UN ASSIGNMENT SPÉCIFIQUE ===

router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const validGuid = UserRolesValidationUtils.validateGuid(req.params.guid);
    if (!validGuid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USER_ROLES_CODES.INVALID_GUID,
        message: USER_ROLES_ERRORS.GUID_INVALID,
      });
    }

    const { assigned_by } = req.body;

    if (!UserRolesValidationUtils.validateAssignedBy(assigned_by)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USER_ROLES_CODES.ASSIGNED_BY_INVALID,
        message: USER_ROLES_ERRORS.ASSIGNED_BY_INVALID,
      });
    }

    const userRoleObj = await UserRole._load(req.params.guid, true);
    if (!userRoleObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USER_ROLES_CODES.USER_ROLE_NOT_FOUND,
        message: USER_ROLES_ERRORS.NOT_FOUND,
      });
    }

    if ((await userRoleObj.getAssignedByObject())?.getGuid() !== assigned_by) {
      return R.handleError(res, HttpStatus.FORBIDDEN, {
        code: USER_ROLES_CODES.INSUFFICIENT_PERMISSIONS,
        message: USER_ROLES_ERRORS.DELETE_FAILED,
      });
    }

    await userRoleObj.delete();
    return R.handleSuccess(res, {
      message: 'User role assignment deleted successfully',
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USER_ROLES_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

// === ASSIGNMENT EN MASSE ===

// router.post('/bulk-assign', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     const { user_ids, role_ids, assigned_by } = req.body;
//
//     if (!Array.isArray(user_ids) || !Array.isArray(role_ids) || !assigned_by) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: USER_ROLES_CODES.VALIDATION_FAILED,
//         message: 'user_ids, role_ids arrays and assigned_by are required',
//       });
//     }
//
//     const assignments = [];
//     const errors = [];
//
//     for (const userId of user_ids) {
//       for (const roleId of role_ids) {
//         try {
//           const userRole = await UserRole.assignRole(userId, roleId, assigned_by);
//           assignments.push(await userRole.toJSON());
//         } catch (error: any) {
//           errors.push({
//             user_id: userId,
//             role_id: roleId,
//             error: error.message,
//           });
//         }
//       }
//     }
//
//     return R.handleSuccess(res, {
//       successful_assignments: assignments.length,
//       failed_assignments: errors.length,
//       assignments,
//       errors,
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: USER_ROLES_CODES.BULK_ASSIGNMENT_FAILED,
//       message: error.message,
//     });
//   }
// });

export default router;
