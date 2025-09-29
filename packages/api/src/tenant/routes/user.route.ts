import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  ORG_HIERARCHY_DEFAULTS,
  paginationSchema,
  ROLES_CODES,
  ROLES_ERRORS,
  TENANT_CODES,
  USERS_CODES,
  USERS_ERRORS,
  UsersValidationUtils,
  validateUsersCreation,
  validateUsersFilters,
  validateUsersUpdate,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import User from '../class/User.js';
import UserRole from '../class/UserRole.js';
import Revision from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';
import Role from '../class/Role.js';
import OrgHierarchy from '../class/OrgHierarchy.js';
import WapService from '../../tools/send.otp.service.js';

const router = Router();

// === ROUTES DE LISTAGE ===

router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const exportableUsers = await User.exportable({}, paginationData);

    return R.handleSuccess(res, {
      exportableUsers,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.PAGINATION_INVALID,
        message: USERS_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: USERS_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.USERS);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TENANT_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const filters = validateUsersFilters(req.query);
    const paginationOptions = paginationSchema.parse(req.query);
    const conditions: Record<string, any> = {};

    if (filters.department) {
      conditions.department = filters.department;
    }
    if (filters.job_title) {
      conditions.job_title = filters.job_title;
    }
    if (filters.active !== undefined) {
      conditions.active = filters.active;
    }
    if (filters.tenant) {
      conditions.tenant = filters.tenant;
    }

    const userEntries = await User._list(conditions, paginationOptions);
    const users = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || userEntries?.length || 0,
        count: userEntries?.length || 0,
      },
      items: userEntries?.map((user) => user.toJSON()) || [],
    };

    return R.handleSuccess(res, { users });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.PAGINATION_INVALID,
        message: USERS_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: USERS_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

// === ROUTES PAR DÉPARTEMENT ===

router.get('/department/:department/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { department } = req.params;
    const paginationOptions = paginationSchema.parse(req.query);

    const userEntries = await User._listByDepartment(department, paginationOptions);
    const users = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || userEntries?.length || 0,
        count: userEntries?.length || 0,
      },
      items: userEntries?.map((user) => user.toJSON()) || [],
    };

    return R.handleSuccess(res, { users });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === ROUTES PAR STATUT ACTIF ===

router.get('/active/:status/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const isActive = status.toLowerCase() === 'true' || status === '1';
    const paginationOptions = paginationSchema.parse(req.query);

    const userEntries = await User._listByActiveStatus(isActive, paginationOptions);
    const users = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || userEntries?.length || 0,
        count: userEntries?.length || 0,
      },
      items: userEntries?.map((user) => user.toJSON()) || [],
    };

    return R.handleSuccess(res, { users });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === CRÉATION UTILISATEUR ===

router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateUsersCreation(req.body);

    // const existingRole = await Role._load(validatedData.role, true);
    // if (!existingRole) {
    //   return R.handleError(res, HttpStatus.NOT_FOUND, {
    //     code: ROLES_CODES.ROLE_NOT_FOUND,
    //     message: ROLES_ERRORS.NOT_FOUND,
    //   });
    // }

    if (!validatedData.supervisor) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.SUPERVISOR_REQUIRED,
        message: USERS_ERRORS.SUPERVISOR_REQUIRED,
      });
    }

    const existingSupervisor = await User._load(validatedData.supervisor, true);
    if (!existingSupervisor) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.SUPERVISOR_NOT_FOUND,
        message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
      });
    }

    const userObj = new User()
      .setTenant(validatedData.tenant)
      .setFirstName(validatedData.first_name)
      .setLastName(validatedData.last_name)
      .setPhoneNumber(validatedData.phone_number);

    if (validatedData.email) {
      userObj.setEmail(validatedData.email);
    }

    if (validatedData.employee_code) {
      userObj.setEmployeeCode(validatedData.employee_code);
    }

    if (validatedData.hire_date) {
      userObj.setHireDate(new Date(validatedData.hire_date));
    }

    if (validatedData.department) {
      userObj.setDepartment(validatedData.department);
    }

    if (validatedData.job_title) {
      userObj.setJobTitle(validatedData.job_title);
    }

    // if (validatedData.active !== undefined) {
    //   userObj.setActive(validatedData.active);
    // }

    // Génération OTP pour nouvel utilisateur
    // if (validatedData.otp_token) {
    userObj.generateOtpToken(parseInt(validatedData.otp_expires_at?.toDateString()!, 10) || 1440); // 24h par défaut
    // }

    await userObj.save();

    const existingDefaultRole = await Role._loadDefaultRole();
    if (!existingDefaultRole) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROLES_CODES.DEFAULT_ROLE_NOT_FOUND,
        message: ROLES_ERRORS.DEFAULT_ROLE_NOT_FOUND,
      });
    }

    const userRoleObj = new UserRole()
      .setRole(existingDefaultRole.getId()!)
      .setUser(userObj.getId()!)
      .setAssignedBy(existingSupervisor.getId()!);

    await userRoleObj.save();

    const orgHierarchyObj = new OrgHierarchy()
      .setSubordinate(userObj.getId()!)
      .setSupervisor(existingSupervisor.getId()!)
      .setDepartment(userObj.getDepartment()!)
      .setEffectiveFrom(ORG_HIERARCHY_DEFAULTS.EFFECTIVE_FROM);

    await orgHierarchyObj.save();

    return R.handleCreated(res, userObj.toJSON());
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: USERS_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('already exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: USERS_CODES.EMAIL_ALREADY_EXISTS,
        message: error.message,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: USERS_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  }
});

// === RÉCUPÉRATION UTILISATEUR PAR GUID ===

router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const validGuid = UsersValidationUtils.validateGuid(req.params.guid);
    if (!validGuid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.INVALID_GUID,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(req.params.guid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    // Récupération des rôles de l'utilisateur
    const userRoles = await UserRole.getUserRoles(userObj.getId()!);

    const userWithRoles = {
      ...userObj.toJSON(),
      roles: userRoles.map((role) => role.toJSON()),
    };

    return R.handleSuccess(res, { user: userWithRoles });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// === MISE À JOUR UTILISATEUR ===

router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const validGuid = UsersValidationUtils.validateGuid(req.params.guid);
    if (!validGuid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.INVALID_GUID,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(req.params.guid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const validatedData = validateUsersUpdate(req.body);

    if (validatedData.email) {
      userObj.setEmail(validatedData.email);
    }
    if (validatedData.first_name) {
      userObj.setFirstName(validatedData.first_name);
    }
    if (validatedData.last_name) {
      userObj.setLastName(validatedData.last_name);
    }
    if (validatedData.phone_number) {
      userObj.setPhoneNumber(validatedData.phone_number);
    }
    if (validatedData.employee_code) {
      userObj.setEmployeeCode(validatedData.employee_code);
    }
    if (validatedData.hire_date) {
      userObj.setHireDate(new Date(validatedData.hire_date));
    }
    if (validatedData.department) {
      userObj.setDepartment(validatedData.department);
    }
    if (validatedData.job_title) {
      userObj.setJobTitle(validatedData.job_title);
    }
    if (validatedData.active !== undefined) {
      userObj.setActive(validatedData.active);
    }
    if (validatedData.avatar_url) {
      userObj.setAvatarUrl(validatedData.avatar_url);
    }

    await userObj.save();
    return R.handleSuccess(res, userObj.toJSON());
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: USERS_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('already exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: USERS_CODES.EMAIL_ALREADY_EXISTS,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: USERS_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  }
});

// === GESTION DES TOKENS ===

router.post('/:guid/generate-otp', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const userObj = await User._load(req.params.guid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const { expiration_minutes = 1440 } = req.body; // 24h par défaut
    userObj.generateOtpToken(expiration_minutes);
    await userObj.save();

    return R.handleSuccess(res, {
      message: 'OTP generated successfully',
      otp_expires_at: userObj.getOtpExpiresAt(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.OTP_GENERATION_FAILED,
      message: error.message,
    });
  }
});

router.post('/:guid/generate-qr-code', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const userObj = await User._load(req.params.guid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const { expiration_hours = 24 } = req.body;
    userObj.generateQrCodeToken(expiration_hours);
    await userObj.save();

    return R.handleSuccess(res, {
      message: 'QR code generated successfully',
      qr_code_token: userObj.getQrCodeToken(),
      qr_code_expires_at: userObj.getQrCodeExpiresAt(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.QR_GENERATION_FAILED,
      message: error.message,
    });
  }
});

// === GESTION DU PIN ===

router.put('/:guid/change-pin', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const userObj = await User._load(req.params.guid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const { current_pin, new_pin } = req.body;

    if (!current_pin || !new_pin) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: USERS_ERRORS.CURRENT_PIN_REQUIRED,
      });
    }

    // Vérification de l'ancien PIN
    const isValidPin = await userObj.verifyPin(current_pin);
    if (!isValidPin) {
      return R.handleError(res, HttpStatus.UNAUTHORIZED, {
        code: USERS_CODES.PIN_INVALID,
        message: USERS_ERRORS.CURRENT_PIN_INVALID,
      });
    }

    userObj.setPin(new_pin);
    await userObj.save();

    return R.handleSuccess(res, {
      message: 'PIN updated successfully',
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.PIN_UPDATE_FAILED,
      message: error.message,
    });
  }
});

// === SUPPRESSION UTILISATEUR ===

router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const validGuid = UsersValidationUtils.validateGuid(req.params.guid);
    if (!validGuid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.INVALID_GUID,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(req.params.guid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    await userObj.delete();
    return R.handleSuccess(res, { message: 'User deleted successfully' });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

router.post('/admin', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateUsersCreation(req.body);

    const existingSystemSupervisor = await User._load(1);
    if (!existingSystemSupervisor) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'user_system_not_found',
        message: 'User system does not exist',
      });
    }

    const userObj = new User()
      .setTenant(validatedData.tenant)
      .setFirstName(validatedData.first_name)
      .setLastName(validatedData.last_name)
      .setPhoneNumber(validatedData.phone_number);

    if (validatedData.email) {
      userObj.setEmail(validatedData.email);
    }

    if (validatedData.employee_code) {
      userObj.setEmployeeCode(validatedData.employee_code);
    }

    if (validatedData.hire_date) {
      userObj.setHireDate(new Date(validatedData.hire_date));
    }

    if (validatedData.department) {
      userObj.setDepartment(validatedData.department);
    }

    if (validatedData.job_title) {
      userObj.setJobTitle(validatedData.job_title);
    }

    // Génération OTP pour nouvel utilisateur
    userObj.generateOtpToken(parseInt(validatedData.otp_expires_at?.toDateString()!, 10) || 1440); // 24h par défaut

    await userObj.save();

    const existingDefaultRole = await Role._loadDefaultRole();
    if (!existingDefaultRole) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROLES_CODES.DEFAULT_ROLE_NOT_FOUND,
        message: ROLES_ERRORS.DEFAULT_ROLE_NOT_FOUND,
      });
    }

    const existingAdminRole = await Role._loadAdminRole();
    if (!existingAdminRole) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROLES_CODES.ADMIN_ROLE_NOT_FOUND,
        message: ROLES_ERRORS.ADMIN_ROLE_NOT_FOUND,
      });
    }

    const userRoleObj = new UserRole()
      .setRole(existingDefaultRole.getId()!)
      .setUser(userObj.getId()!)
      .setAssignedBy(existingSystemSupervisor.getId()!);

    await userRoleObj.save();

    const newUserRoleObj = new UserRole()
      .setRole(existingAdminRole.getId()!)
      .setUser(userObj.getId()!)
      .setAssignedBy(existingSystemSupervisor.getId()!);

    await newUserRoleObj.save();

    return R.handleCreated(res, userObj.toJSON());
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: USERS_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('already exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: USERS_CODES.EMAIL_ALREADY_EXISTS,
        message: error.message,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: USERS_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  }
});

router.post('/system', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const userObj = new User()
      .setTenant('System')
      .setFirstName('System')
      .setLastName('Account')
      .setPhoneNumber('+237000000000')
      .setEmail('system@local.com')
      .setEmployeeCode('SYS-0001')
      .setHireDate(new Date('2025-01-01'))
      .setDepartment('SYSTEM')
      .setJobTitle('SYSTEM');

    // Génération OTP pour nouvel utilisateur
    userObj.generateOtpToken(1440); // 24h par défaut

    await userObj.save();

    return R.handleCreated(res, userObj.toJSON());
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: USERS_CODES.EMAIL_ALREADY_EXISTS,
        message: error.message,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: USERS_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  }
});

router.post('/otp', Ensure.post(), async (req: Request, res: Response) => {
  const result = await WapService.sendOtp();
  if (result.status !== HttpStatus.CREATED) {
    return R.handleError(res, result.status, result.response);
  }
  return R.handleCreated(res, result.response);
});

export default router;
