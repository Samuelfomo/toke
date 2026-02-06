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
  UsersValidationUtils,
  validateUserRoleAssignment,
  validateUserRolesFilters,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import User from '../class/User.js';
import Role from '../class/Role.js';
import UserRole from '../class/UserRole.js';
import { TenantRevision } from '../../tools/revision.js';
import { RoleValues, tableName } from '../../utils/response.model.js';

const router = Router();

// === ROUTES DE LISTAGE GÉNÉRAL ===

router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const userRoles = await UserRole.exportable({}, paginationData);

    return R.handleSuccess(res, {
      userRoles,
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
    const revision = await TenantRevision.getRevision(tableName.USER_ROLES);

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
    const { offset, limit, view, ...filterQuery } = req.query;
    const filters = validateUserRolesFilters(filterQuery);
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

router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateUserRoleAssignment(req.body);

    // const { country } = req.body;
    // if (!country || CountryValidationUtils.validateIsoCode(country)) {
    //   return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //     code: 'invalid_entry',
    //     message: COUNTRY_ERRORS.CODE_INVALID,
    //   });
    // }
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

    if (roleObj.isSystemRole()) {
      return R.handleError(res, HttpStatus.FORBIDDEN, {
        code: 'role_not_allowed',
        message: 'System roles are not permitted to perform this action.',
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

    // const otp = GenerateOtp.generateOTP(6).toString();
    // userObj.setOtpToken(otp);
    //
    // await userObj.save();
    //
    // const sendOtp = await WapService.sendOtp(
    //   userObj.getOtpToken()!,
    //   userObj.getPhoneNumber()!,
    //   country,
    // );
    //
    // if (sendOtp.status !== HttpStatus.SUCCESS) {
    //   return R.handleError(res, sendOtp.status, sendOtp.response);
    // }
    return R.handleCreated(
      res,
      // message: 'User role assignment created and OTP dispatch successful',
      await userRole.toJSON(),
    );
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USER_ROLES_CODES.VALIDATION_FAILED,
        message: USER_ROLES_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('duplicate_assignment')) {
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

// === Répertorier tous les rôles attribués à un utilisateur === //
router.get('/:guid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!UserRolesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USER_ROLES_CODES.INVALID_GUID,
        message: USER_ROLES_ERRORS.GUID_INVALID,
      });
    }

    const userGuid = req.params.guid;

    const userObj = await User._load(userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USER_ROLES_CODES.USER_NOT_FOUND,
        message: USER_ROLES_ERRORS.USER_NOT_FOUND,
      });
    }

    // const paginationOptions = paginationSchema.parse(req.query);
    const userRoleEntries = await UserRole._listByUser(userObj.getId()!);

    const userRoles = {
      count: userRoleEntries?.length || 0,
      items: userRoleEntries
        ? await Promise.all(userRoleEntries.map(async (userRole) => await userRole.toJSON()))
        : [],
    };

    return R.handleSuccess(res, { roles: userRoles });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USER_ROLES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

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

// 👤 Promote an existing employee to manager
router.post('/manager', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { user, affiliate } = req.body;
    if (!UsersValidationUtils.validateGuid(user)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USER_ROLES_CODES.USER_INVALID,
        message: USER_ROLES_ERRORS.USER_INVALID,
      });
    }
    const userObj = await User._load(user, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    // Charger les rôles requis
    const [managerRole, defaultRole] = await Promise.all([
      Role._load(RoleValues.MANAGER, false, true),
      Role._load(RoleValues.EMPLOYEE, false, true),
    ]);

    if (!managerRole || !defaultRole) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USER_ROLES_CODES.ROLE_NOT_FOUND,
        message: 'One or more roles (manager/employee) are missing',
      });
    }

    const identified1 = { user: userObj.getId()!, role: defaultRole.getId()! };
    const identified2 = { user: userObj.getId()!, role: managerRole.getId()! };

    const [isEmployee, isManager] = await Promise.all([
      UserRole._load(identified1, false, true),
      UserRole._load(identified2, false, true),
    ]);
    if (!isEmployee) {
      return R.handleError(res, HttpStatus.UNAUTHORIZED, {
        code: 'user_not_employee',
        message: 'User must be an employee before becoming a manager',
      });
    }

    if (isManager) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: 'already_manager',
        message: 'User is already assigned as manager',
      });
    }
    let assignedBy: number = isEmployee.getAssignedBy()!;

    if (affiliate) {
      if (!UsersValidationUtils.validateGuid(affiliate)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USER_ROLES_CODES.ASSIGNED_BY_INVALID,
          message: USER_ROLES_ERRORS.ASSIGNED_BY_INVALID,
        });
      }

      const assignedObj = await User._load(affiliate, true);
      if (!assignedObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USER_ROLES_CODES.ASSIGNED_BY_NOT_FOUND,
          message: USER_ROLES_ERRORS.ASSIGNED_BY_NOT_FOUND,
        });
      }
      assignedBy = assignedObj.getId()!;
    }

    const userRoleObj = new UserRole()
      .setRole(managerRole.getId()!)
      .setUser(userObj.getId()!)
      .setAssignedBy(assignedBy);
    await userRoleObj.save();
    return R.handleCreated(res, await userRoleObj.toJSON());
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USER_ROLES_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

// === ASSIGNMENT EN MASSE ===

// router.post('/bulk-assign', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     const { users, roles, assigned_by } = req.body;
//
//     if (!Array.isArray(users) || !Array.isArray(roles) || !assigned_by) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: USER_ROLES_CODES.VALIDATION_FAILED,
//         message: 'user_ids, role_ids arrays and assigned_by are required',
//       });
//     }
//
//     const userIds = [];
//     const roleIds = [];
//
//     const assignments = [];
//     const errors = [];
//
//     for (const userId of users) {
//       for (const roleId of roles) {
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
