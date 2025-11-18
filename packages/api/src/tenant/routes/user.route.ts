import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  ORG_HIERARCHY_DEFAULTS,
  paginationSchema,
  PointageType,
  ROLES_CODES,
  ROLES_ERRORS,
  SITES_ERRORS,
  TENANT_CODES,
  USERS_CODES,
  USERS_ERRORS,
  UsersValidationUtils,
  validateUsersCreation,
  validateUsersFilters,
  validateUsersUpdate,
  WORK_SESSIONS_CODES,
  WORK_SESSIONS_ERRORS,
  WorkSessionsValidationUtils,
} from '@toke/shared';
import { Op } from 'sequelize';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import User from '../class/User.js';
import UserRole from '../class/UserRole.js';
import { TenantRevision } from '../../tools/revision.js';
import { responseValue, RoleValues, tableName } from '../../utils/response.model.js';
import Role from '../class/Role.js';
import OrgHierarchy from '../class/OrgHierarchy.js';
import { DatabaseEncryption } from '../../utils/encryption.js';
import WapService from '../../tools/send.otp.service.js';
import WorkSessions from '../class/WorkSessions.js';
import Site from '../class/Site.js';
import EmailSender from '../../tools/send.email.service.js';
import InvitationService from '../../tools/spondor.service.js';
import CountryPhoneValidation from '../../tools/country.phone.validation.js';
import EmployeeLicenseService from '../../tools/employee.license.service.js';

const router = Router();

// === ROUTES DE LISTAGE ===

// === RECUPERER LES UTILISATEURS ACTIVES D'UN TENANT
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const users = await User.exportable({}, paginationData);

    return R.handleSuccess(res, {
      users,
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
    const revision = await TenantRevision.getRevision(tableName.USERS);

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
    // 2️⃣ Supprimer les clés offset/limit du query avant la validation des filtres
    const { offset, limit, view, ...filterQuery } = req.query;
    const filters = validateUsersFilters(filterQuery);
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

router.get('/config', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const tenant = req.tenant;

    const tenantToken = DatabaseEncryption.encrypt(tenant.subdomain);
    return R.handleSuccess(res, {
      subdomain: tenantToken,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

// === CRÉATION UTILISATEUR ===
// 👤 Add new employee to manager's team with basic info and automatic role assignment
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

    const tenant = req.tenant;

    const existingSupervisor = await User._load(validatedData.supervisor, true);
    if (!existingSupervisor) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.SUPERVISOR_NOT_FOUND,
        message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
      });
    }

    const userObj = new User()
      .setTenant(tenant.config.reference)
      .setFirstName(validatedData.first_name)
      .setLastName(validatedData.last_name)
      .setPhoneNumber(validatedData.phone_number)
      .setCountry(validatedData.country);

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
    await userObj.generateUniqueOtpToken(
      parseInt(validatedData.otp_expires_at?.toDateString()!, 10) || 1440,
    ); // 24h par défaut
    // }

    // const { country } = req.body;
    // if (!CountryValidationUtils.validateIsoCode(country)) {
    //   return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //     code: 'country_code_invalid',
    //     message: COUNTRY_ERRORS.CODE_INVALID,
    //   });
    // }

    // const existingCountry = await Country._load(country, false, true);
    // if (!existingCountry) {
    //   return R.handleError(res, HttpStatus.NOT_FOUND, {
    //     code: 'country_not_found',
    //     message: COUNTRY_ERRORS.NOT_FOUND,
    //   });
    // }

    const existingDefaultRole = await Role._load(RoleValues.EMPLOYEE, false, true);
    if (!existingDefaultRole) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROLES_CODES.DEFAULT_ROLE_NOT_FOUND,
        message: ROLES_ERRORS.DEFAULT_ROLE_NOT_FOUND,
      });
    }

    await userObj.save();

    // 1-Creer une license employee
    const employeeLicense = {
      global_license: tenant.config.global_license,
      employee: userObj.getGuid()!,
      employee_code: userObj.getEmployeeCode()!,
    };

    const serviceEmployee = await EmployeeLicenseService.saveEmployeeLicense(employeeLicense);

    if (serviceEmployee.status !== HttpStatus.CREATED) {
      return R.handleError(res, serviceEmployee.status, serviceEmployee.response);
    }

    const userRoleObj = new UserRole()
      .setRole(existingDefaultRole.getId()!)
      .setUser(userObj.getId()!)
      .setAssignedBy(existingSupervisor.getId()!);

    const orgHierarchyObj = new OrgHierarchy()
      .setSubordinate(userObj.getId()!)
      .setSupervisor(existingSupervisor.getId()!)
      .setDepartment(userObj.getDepartment()!)
      .setEffectiveFrom(ORG_HIERARCHY_DEFAULTS.EFFECTIVE_FROM);

    await userRoleObj.save();

    await orgHierarchyObj.save();

    // Envoyer l'OTP via WhatsApp
    const result = await WapService.sendOtp(
      userObj.getOtpToken()!,
      validatedData.phone_number,
      validatedData.country,
    );
    if (result.status !== HttpStatus.SUCCESS) {
      return R.handleError(res, result.status, result.response);
    }

    return R.handleCreated(res, {
      message: 'User created and OTP sent successfully',
      ...userObj.toJSON(),
      role: existingDefaultRole.toJSON(),
    });
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

//👤 Add a new manager to the tenant with basic information and automatic role assignment.
router.post('/manager', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateUsersCreation(req.body);
    const tenant = req.tenant;
    const { affiliate } = req.query;

    // === 1️⃣ Validation préliminaire avant toute sauvegarde ===
    // Charger les rôles requis
    const [adminRole, managerRole, defaultRole] = await Promise.all([
      Role._load(RoleValues.ADMIN, false, true),
      Role._load(RoleValues.MANAGER, false, true),
      Role._load(RoleValues.EMPLOYEE, false, true),
    ]);

    if (!adminRole || !managerRole || !defaultRole) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'role_not_found',
        message: 'One or more roles (admin/manager/employee) are missing',
      });
    }

    // Vérifier s’il existe déjà un admin
    const existingAdmins = await UserRole._listByRole(adminRole.getId()!);
    // const isFirstUser = existingAdmins?.length === 0;
    const isFirstUser = !existingAdmins || existingAdmins.length === 0;

    let affiliateObj;
    let supervisorObj;

    // === 2️⃣ Vérifications spécifiques avant toute sauvegarde ===
    if (!isFirstUser) {
      if (!affiliate || !validatedData.supervisor) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'missing_required_fields',
          message: 'Both affiliate and supervisor are required for manager creation',
        });
      }

      if (!UsersValidationUtils.validateGuid(String(affiliate))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'affiliate_guid_invalid',
          message: 'Invalid affiliate guid',
        });
      }

      // Charger les utilisateurs assignateurs
      const [existingAffiliate, existingSupervisor] = await Promise.all([
        User._load(affiliate, true),
        User._load(validatedData.supervisor, true),
      ]);

      if (!existingAffiliate) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: 'affiliate_not_found',
          message: 'Affiliate user does not exist',
        });
      }

      affiliateObj = existingAffiliate;

      if (!existingSupervisor) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: 'supervisor_not_found',
          message: 'Supervisor user does not exist',
        });
      }
      supervisorObj = existingSupervisor;
    }

    // === 3️⃣ Construction de l’objet User ===
    const buildUserObject = (data: any, tenant: any) => {
      const user = new User()
        .setTenant(tenant.config.reference)
        .setFirstName(data.first_name)
        .setLastName(data.last_name)
        .setPhoneNumber(data.phone_number)
        .setCountry(data.country);

      if (data.email) user.setEmail(data.email);
      if (data.employee_code) user.setEmployeeCode(data.employee_code);
      if (data.hire_date) user.setHireDate(new Date(data.hire_date));
      if (data.department) user.setDepartment(data.department);
      if (data.job_title) user.setJobTitle(data.job_title);

      return user;
    };

    let userObj = buildUserObject(validatedData, tenant);

    // // Générer l’OTP avant sauvegarde
    // await userObj.generateUniqueOtpToken(
    //   parseInt(validatedData.otp_expires_at?.toDateString()!, 10),
    // );
    //
    // console.log('userObj', userObj);

    // === 4️⃣ Sauvegarde du user ===
    await userObj.save();

    // 1-Creer une license employee
    const employeeLicense = {
      global_license: tenant.config.global_license,
      employee: userObj.getGuid()!,
      employee_code: userObj.getEmployeeCode()!,
    };

    const serviceEmployee = await EmployeeLicenseService.saveEmployeeLicense(employeeLicense);

    if (serviceEmployee.status !== HttpStatus.CREATED) {
      return R.handleError(res, serviceEmployee.status, serviceEmployee.response);
    }

    // === 5️⃣ Attribution des rôles ===
    if (isFirstUser) {
      // Premier utilisateur → Admin (aucun assignedBy)
      const rolesToAssign = [adminRole, managerRole, defaultRole];
      for (const role of rolesToAssign) {
        const userRoleObj = new UserRole().setRole(role.getId()!).setUser(userObj.getId()!);
        await userRoleObj.save();
      }

      const roles = await UserRole.getUserRoles(userObj.getId()!);
      return R.handleCreated(res, {
        message: 'Admin user created successfully',
        user: {
          ...userObj.toJSON(),
          roles: {
            count: roles.length,
            items: roles.map((r) => r.toJSON()),
          },
        },
      });
    }

    // Autres managers
    const managerRoleObj = new UserRole()
      .setRole(managerRole.getId()!)
      .setUser(userObj.getId()!)
      .setAssignedBy(affiliateObj?.getId()!);

    const employeeRoleObj = new UserRole()
      .setRole(defaultRole.getId()!)
      .setUser(userObj.getId()!)
      .setAssignedBy(supervisorObj?.getId()!);

    const orgHierarchyObj = new OrgHierarchy()
      .setSubordinate(userObj.getId()!)
      .setSupervisor(supervisorObj?.getId()!)
      .setDepartment(userObj.getDepartment()!)
      .setEffectiveFrom(ORG_HIERARCHY_DEFAULTS.EFFECTIVE_FROM);

    await managerRoleObj.save();
    await employeeRoleObj.save();

    await orgHierarchyObj.save();

    const roles = await UserRole.getUserRoles(userObj.getId()!);

    return R.handleCreated(res, {
      message: 'Manager user created successfully',
      user: {
        ...userObj.toJSON(),
        roles: {
          count: roles.length,
          items: roles.map((r) => r.toJSON()),
        },
      },
    });
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
        message: error.message || error,
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

router.get('/:token', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    if (!token) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.INVALID_GUID,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const guid = DatabaseEncryption.decrypt(token);
    if (!guid || !UsersValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.INVALID_GUID,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(guid, true);
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

// === mise à jour utilisateur ===

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

    const Roles = await UserRole._listByUser(userObj.getId()!);
    if (!Roles) {
      return R.handleError(res, HttpStatus.NOT_ACCEPTABLE, {
        code: USERS_CODES.AUTHORIZATION_FAILED,
        message: USERS_ERRORS.AUTHORIZATION_FAILED,
      });
    }
    let assigns: string[] = [];

    await Promise.all(
      Roles.map(async (role) => {
        const assignByObj = await role.getAssignedByObject();
        if (assignByObj) {
          assigns.push(assignByObj.getGuid()!);
        }
      }),
    );

    if (!assigns.includes(validatedData.supervisor!)) {
      return R.handleError(res, HttpStatus.UNAUTHORIZED, {
        code: USERS_CODES.AUTHORIZATION_FAILED,
        message: USERS_ERRORS.AUTHORIZATION_FAILED,
      });
    }

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

router.patch('/:guid/generate-otp', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const userObj = await User._load(req.params.guid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const { expiration_minutes = 1440, email } = req.body; // 24h par défaut

    // if (!CountryValidationUtils.validateIsoCode(country)) {
    //   return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //     code: 'country_code_invalid',
    //     message: COUNTRY_ERRORS.CODE_INVALID,
    //   });
    // }

    // const otp = GenerateOtp.generateOTP(6);
    // const expiresAt = new Date(Date.now() + expiration_minutes * 60 * 1000);

    // userObj.setOtpToken(otp);
    // userObj.setOtpExpiresAt(expiresAt);
    await userObj.generateUniqueOtpToken(expiration_minutes);
    // userObj.generateOtpToken(expiration_minutes);
    await userObj.defineOtpToken();

    let sendOtp;
    // 🔹 Envoi du code OTP selon le canal choisi
    if (email) {
      let value = userObj.getEmail();
      if (UsersValidationUtils.validateEmail(email)) {
        // return R.handleError(res, HttpStatus.BAD_REQUEST, {
        //   code: USERS_CODES.EMAIL_INVALID,
        //   message: USERS_ERRORS.EMAIL_INVALID,
        // });
        value = email;
      }
      // Envoi par email
      await EmailSender.sender(
        userObj.getOtpToken()!,
        value!,
        // expiration_minutes,
      );
    } else {
      // Envoi via WhatsApp
      sendOtp = await WapService.sendOtp(
        userObj.getOtpToken()!,
        userObj.getPhoneNumber()!,
        userObj.getCountry()!,
      );

      if (sendOtp.status !== HttpStatus.SUCCESS) {
        return R.handleError(res, sendOtp.status, sendOtp.response);
      }
    }

    // const sendOtp = await WapService.sendOtp(
    //   userObj.getOtpToken()!,
    //   userObj.getPhoneNumber()!,
    //   country,
    // );

    // if (sendOtp.status !== HttpStatus.SUCCESS) {
    //   return R.handleError(res, sendOtp.status, sendOtp.response);
    // }

    return R.handleSuccess(res, {
      message: 'OTP generated and sent successfully',
      otp_expires_at: userObj.getOtpExpiresAt(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.OTP_GENERATION_FAILED,
      message: error.message,
    });
  }
});

router.patch('/:guid/define-qr-code', Ensure.patch(), async (req: Request, res: Response) => {
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
    await userObj.defineQrCodeToken();

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

// === MODIFIER LES INFORMATIONS PERSONNELLES DE L"UTILISATEUR (NOM(S) ET PRENOM(S)) === cette route est à revoir (condition d'existence)

router.patch('/:guid/modify-personal', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!UsersValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.INVALID_GUID,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const { first_name, last_name, phone } = req.body;

    if (first_name) {
      if (!UsersValidationUtils.validateFirstName(first_name)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.FIRST_NAME_INVALID,
          message: USERS_ERRORS.FIRST_NAME_INVALID,
        });
      }
    }
    if (last_name) {
      if (!UsersValidationUtils.validateLastName(last_name)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.LAST_NAME_INVALID,
          message: USERS_ERRORS.LAST_NAME_INVALID,
        });
      }
    }
    if (phone) {
      if (!UsersValidationUtils.validatePhoneNumber(phone)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.PHONE_NUMBER_INVALID,
          message: USERS_ERRORS.PHONE_NUMBER_INVALID,
        });
      }
    }

    const userObj = await User._load(guid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }
    userObj.setFirstName(first_name || userObj.getFirstName());
    userObj.setLastName(last_name || userObj.getLastName());
    userObj.setPhoneNumber(phone || userObj.getPhoneNumber());
    await userObj.save();
    return R.handleSuccess(res, userObj.toJSON());
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// === GESTION DU PIN === (A REVOIR car pas necessaire selon le dev back)

router.patch('/:guid/change-pin', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!UsersValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.INVALID_GUID,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }
    const userObj = await User._load(guid, true);
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
    await userObj.definePin();

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

// === SUPPRESSION UTILISATEUR === (Route à ne pas utiliser, car on ne doit pas delete un user)

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

// router.post('/manager/:affiliate', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     const { affiliate } = req.params;
//     const validatedData = validateUsersCreation(req.body);
//     const tenant = req.tenant;
//
//     // Charger les rôles nécessaires avant toute création
//     const adminRole = await Role._load(RoleValues.ADMIN, false, true);
//     const managerRole = await Role._load(RoleValues.MANAGER, false, true);
//     const defaultRole = await Role._load(RoleValues.EMPLOYEE, false, true);
//
//     if (!adminRole || !managerRole || !defaultRole) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: 'role_not_found',
//         message: 'One or more roles (admin/manager/employee) are missing',
//       });
//     }
//
//     // Vérifier s'il existe déjà un Admin
//     const existingAdmins = await UserRole._listByRole(adminRole.getId()!);
//     const isFirstUser = existingAdmins?.length === 0;
//
//     // === Cas 1 : Premier utilisateur (ADMIN) ===
//     if (isFirstUser) {
//       const userObj = new User()
//         .setTenant(tenant.config.reference)
//         .setFirstName(validatedData.first_name)
//         .setLastName(validatedData.last_name)
//         .setPhoneNumber(validatedData.phone_number);
//
//       if (validatedData.email) userObj.setEmail(validatedData.email);
//       if (validatedData.employee_code) userObj.setEmployeeCode(validatedData.employee_code);
//       if (validatedData.hire_date) userObj.setHireDate(new Date(validatedData.hire_date));
//       if (validatedData.department) userObj.setDepartment(validatedData.department);
//       if (validatedData.job_title) userObj.setJobTitle(validatedData.job_title);
//
//       await userObj.generateUniqueOtpToken(
//         parseInt(validatedData.otp_expires_at?.toDateString()!, 10) || 1440,
//       );
//
//       await userObj.save();
//
//       // L'admin a les trois rôles sans assignedBy
//       const rolesToAssign = [adminRole, managerRole, defaultRole];
//       for (const role of rolesToAssign) {
//         const userRoleObj = new UserRole().setRole(role.getId()!).setUser(userObj.getId()!);
//         await userRoleObj.save();
//       }
//
//       const roles = await UserRole.getUserRoles(userObj.getId()!);
//
//       return R.handleCreated(res, {
//         message: 'Admin user created successfully',
//         user: {
//           ...userObj.toJSON(),
//           roles: {
//             count: roles.length,
//             items: roles.map((r) => r.toJSON()),
//           },
//         },
//       });
//     }
//
//     // === Cas 2 : Managers créés après ===
//
//     // Vérification préliminaire des champs nécessaires (avant création user)
//     if (!affiliate || !validatedData.supervisor) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: 'missing_required_fields',
//         message: 'Both affiliate (param) and supervisor (body) are required for manager creation',
//       });
//     }
//
//     if (!UsersValidationUtils.validateGuid(affiliate)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: 'affiliate_guid_invalid',
//         message: 'Invalid affiliate guid',
//       });
//     }
//
//     const existingAffiliate = await User._load(affiliate, true);
//     const existingSupervisor = await User._load(validatedData.supervisor, true);
//
//     if (!existingAffiliate) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: 'affiliate_not_found',
//         message: 'Affiliate user does not exist',
//       });
//     }
//
//     if (!existingSupervisor) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: 'supervisor_not_found',
//         message: 'Supervisor user does not exist',
//       });
//     }
//
//     // === Validation passée avec succès → création du nouvel utilisateur ===
//     const userObj = new User()
//       .setTenant(tenant.config.reference)
//       .setFirstName(validatedData.first_name)
//       .setLastName(validatedData.last_name)
//       .setPhoneNumber(validatedData.phone_number);
//
//     if (validatedData.email) userObj.setEmail(validatedData.email);
//     if (validatedData.employee_code) userObj.setEmployeeCode(validatedData.employee_code);
//     if (validatedData.hire_date) userObj.setHireDate(new Date(validatedData.hire_date));
//     if (validatedData.department) userObj.setDepartment(validatedData.department);
//     if (validatedData.job_title) userObj.setJobTitle(validatedData.job_title);
//
//     await userObj.generateUniqueOtpToken(
//       parseInt(validatedData.otp_expires_at?.toDateString()!, 10) || 1440,
//     );
//
//     await userObj.save();
//
//     // Attribution des rôles
//     const managerRoleObj = new UserRole()
//       .setRole(managerRole.getId()!)
//       .setUser(userObj.getId()!)
//       .setAssignedBy(existingAffiliate.getId()!);
//
//     const employeeRoleObj = new UserRole()
//       .setRole(defaultRole.getId()!)
//       .setUser(userObj.getId()!)
//       .setAssignedBy(existingSupervisor.getId()!);
//
//     await managerRoleObj.save();
//     await employeeRoleObj.save();
//
//     const roles = await UserRole.getUserRoles(userObj.getId()!);
//
//     return R.handleCreated(res, {
//       message: 'Manager user created successfully',
//       user: {
//         ...userObj.toJSON(),
//         roles: {
//           count: roles.length,
//           items: roles.map((r) => r.toJSON()),
//         },
//       },
//     });
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: USERS_CODES.VALIDATION_FAILED,
//         message: USERS_ERRORS.VALIDATION_FAILED,
//         details: error.issues,
//       });
//     } else if (error.message.includes('already exists')) {
//       return R.handleError(res, HttpStatus.CONFLICT, {
//         code: USERS_CODES.EMAIL_ALREADY_EXISTS,
//         message: error.message,
//       });
//     } else if (error.message.includes('required')) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: USERS_CODES.VALIDATION_FAILED,
//         message: error.message,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: USERS_CODES.CREATION_FAILED,
//         message: error.message || error,
//       });
//     }
//   }
// });

router.patch('/:guid/define-password', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!UsersValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.INVALID_GUID,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }
    const userObj = await User._load(guid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }
    const { password } = req.body;
    if (!UsersValidationUtils.validatePasswordHash(password)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.PASSWORD_INVALID,
        message: USERS_ERRORS.PASSWORD_INVALID,
      });
    }
    const isManager = await UserRole._listByUser(userObj.getId()!);
    if (!isManager || isManager.length < 2) {
      return R.handleError(res, HttpStatus.FORBIDDEN, {
        code: USERS_CODES.AUTHORIZATION_FAILED,
        message: USERS_ERRORS.AUTHORIZATION_FAILED,
      });
    }
    userObj.setPassword(password);
    await userObj.definePassword();
    return R.handleSuccess(res, { message: 'Password defined successfully' });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

router.patch('/manager/password', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!UsersValidationUtils.validateEmail(email)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.EMAIL_INVALID,
        message: USERS_ERRORS.EMAIL_INVALID,
      });
    }
    if (!UsersValidationUtils.validatePasswordHash(password)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.PASSWORD_INVALID,
        message: USERS_ERRORS.PASSWORD_INVALID,
      });
    }
    const userObj = await User._load(email, false, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const isManager = await UserRole._listByUser(userObj.getId()!);

    if (!isManager || isManager.length < 2) {
      return R.handleError(res, HttpStatus.FORBIDDEN, {
        code: USERS_CODES.AUTHORIZATION_FAILED,
        message: USERS_ERRORS.AUTHORIZATION_FAILED,
      });
    }

    const isValidPassword = await userObj.verifyPassword(password);
    if (!isValidPassword) {
      return R.handleError(res, HttpStatus.UNAUTHORIZED, {
        code: USERS_CODES.PASSWORD_INVALID,
        message: USERS_ERRORS.PASSWORD_VERIFICATION_FAILED,
      });
    }
    return R.handleSuccess(res, {
      message: 'Password verified successfully',
      user: userObj.toJSON(),
      roles: await Promise.all(isManager.map(async (role) => await role.getRoleObject())),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

router.patch('/:guid/define-pin', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!UsersValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.INVALID_GUID,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }
    const userObj = await User._load(guid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }
    const { pin } = req.body;
    if (!UsersValidationUtils.validatePinHash(pin.toString())) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.PIN_INVALID,
        message: USERS_ERRORS.PIN_INVALID,
      });
    }
    userObj.setPin(pin.toString());
    await userObj.definePin();
    return R.handleSuccess(res, { message: 'PIN defined successfully' });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

router.patch('/verify-pin', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { phone_number, pin } = req.body;
    if (!UsersValidationUtils.validatePhoneNumber(phone_number)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.PHONE_NUMBER_INVALID,
        message: USERS_ERRORS.PHONE_NUMBER_INVALID,
      });
    }
    if (!UsersValidationUtils.validatePinHash(pin.toString())) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.PIN_INVALID,
        message: USERS_ERRORS.PIN_INVALID,
      });
    }
    const userObj = await User._load(phone_number, false, false, false, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }
    const isValidPin = await userObj.verifyPin(pin.toString());
    if (!isValidPin) {
      return R.handleError(res, HttpStatus.UNAUTHORIZED, {
        code: USERS_CODES.PIN_INVALID,
        message: USERS_ERRORS.PIN_VERIFICATION_FAILED,
      });
    }

    return R.handleSuccess(res, { message: 'PIN verified successfully' });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

router.get('/:otp/verify', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { otp } = req.params;
    if (!UsersValidationUtils.validateOtpToken(otp)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.OTP_TOKEN_INVALID,
        message: USERS_ERRORS.OTP_TOKEN_INVALID,
      });
    }
    const userObj = await User._load(otp, false, false, false, false, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }
    const isExpired = await userObj.isOtpValid(userObj.getOtpToken()!);
    if (!isExpired) {
      return R.handleError(res, HttpStatus.UNAUTHORIZED, {
        code: USERS_CODES.OTP_TOKEN_EXPIRED,
        message: USERS_ERRORS.OTP_TOKEN_EXPIRED,
      });
    }
    await userObj.clearOtp();

    const roles = await UserRole.getUserRoles(userObj.getId()!);
    return R.handleSuccess(res, {
      message: 'OTP verified successfully',
      user: userObj.toJSON(),
      roles: roles.map((role) => role.toJSON()),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

router.patch('/:guid/status', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!UsersValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.INVALID_GUID,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }
    const { status, supervisor } = req.body;
    if (!status || !UsersValidationUtils.validateActive(status)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.ACTIVE_STATUS_INVALID,
        message: USERS_ERRORS.ACTIVE_STATUS_INVALID,
      });
    }
    if (!supervisor || !UsersValidationUtils.validateGuid(supervisor)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.INVALID_GUID,
        message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
      });
    }
    const userObj = await User._load(guid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }
    const supervisorObj = await User._load(supervisor, true);
    if (!supervisorObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.SUPERVISOR_NOT_FOUND,
        message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
      });
    }

    const isManager = await UserRole._listByUser(supervisorObj.getId()!);
    if (!isManager || isManager.length < 2) {
      return R.handleError(res, HttpStatus.FORBIDDEN, {
        code: USERS_CODES.AUTHORIZATION_FAILED,
        message: USERS_ERRORS.AUTHORIZATION_FAILED,
      });
    }

    userObj.setActive(status);

    await userObj.save();
    return R.handleSuccess(res, {
      message: 'User status updated successfully',
      user: userObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// ⚡ Get real-time list of employees currently checked in with active work sessions
router.get('/attendance/active-sessions', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager } = req.query;

    // Validation du GUID du manager
    if (!manager || !UsersValidationUtils.validateGuid(String(manager))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    // Charger le manager
    const userObj = await User._load(String(manager), true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.SUPERVISOR_NOT_FOUND,
        message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
      });
    }

    const isManage = await UserRole.isManager(userObj.getId()!);

    if (!isManage) {
      return R.handleError(res, HttpStatus.UNAUTHORIZED, {
        code: USERS_CODES.AUTHORIZATION_FAILED,
        message: USERS_ERRORS.AUTHORIZATION_FAILED,
      });
    }

    // Récupérer les rôles des subordonnés assignés par ce manager
    const userRolesSub = await UserRole._listByAssignedBy(userObj.getId()!);

    if (!userRolesSub || userRolesSub.length === 0) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'subordinate_not_found',
        message: 'No subordinates found for this manager',
      });
    }

    // Récupérer les IDs des subordonnés
    const subordinateIds: number[] = [];
    await Promise.all(
      userRolesSub.map(async (userRole) => {
        const userRoleId = userRole.getUser();
        if (userRoleId) {
          subordinateIds.push(userRoleId);
        }
      }),
    );

    if (subordinateIds.length === 0) {
      return R.handleSuccess(res, {
        code: 'ACTIVE_SESSIONS_RETRIEVED',
        message: 'No active sessions found',
        data: {
          manager: userObj.toJSON(),
          total_subordinates: 0,
          active_sessions_count: 0,
          active_sessions: [],
        },
      });
    }

    // Récupérer toutes les sessions actives pour ces subordonnés
    const allActiveSessions: any[] = [];

    await Promise.all(
      subordinateIds.map(async (userId) => {
        const activeSession = await WorkSessions._findActiveSessionByUser(userId);
        if (activeSession) {
          // Enrichir avec les informations de l'employé
          const employee = await User._load(userId);
          const sessionData = await activeSession.toJSON(responseValue.FULL);

          // Informations de statut détaillées
          const pauseStatus = await activeSession.getPauseStatusDetailed();
          const lastEntry = await activeSession.LastEntry();
          const hasActiveMission = await activeSession.activeMission();

          allActiveSessions.push({
            ...sessionData,
            employee: employee ? employee.toJSON() : null,
            pause_status: pauseStatus,
            last_activity: lastEntry
              ? {
                  type: lastEntry.pointage_type,
                  timestamp: lastEntry.clocked_at,
                  location: lastEntry.location_name,
                }
              : null,
            is_on_external_mission: hasActiveMission,
          });
        }
      }),
    );

    // Trier par heure de début de session (plus récent en premier)
    allActiveSessions.sort((a, b) => {
      const dateA = new Date(a.session_start_at).getTime();
      const dateB = new Date(b.session_start_at).getTime();
      return dateB - dateA;
    });

    // Statistiques supplémentaires
    const statistics = {
      total_active: allActiveSessions.length,
      on_pause: allActiveSessions.filter((s) => s.pause_status.is_on_pause).length,
      on_mission: allActiveSessions.filter((s) => s.is_on_external_mission).length,
      working: allActiveSessions.filter(
        (s) => !s.pause_status.is_on_pause && !s.is_on_external_mission,
      ).length,
    };

    return R.handleSuccess(res, {
      message: 'Active sessions retrieved successfully',
      data: {
        manager: userObj.toJSON(),
        total_subordinates: subordinateIds.length,
        active_sessions_count: allActiveSessions.length,
        statistics,
        active_sessions: allActiveSessions,
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'ACTIVE_SESSIONS_RETRIEVAL_FAILED',
      message: error.message || 'Failed to retrieve active sessions',
    });
  }
});

// === RÉSUMÉ DE PRÉSENCE DU JOUR ===
// 📊 Complete overview of today's attendance including check-ins, check-outs, and absences
router.get('/attendance/today', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager, site } = req.query;

    // Définir le début et la fin de la journée
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Construire les conditions de recherche
    const conditions: Record<string, any> = {
      session_start_at: {
        [Op.between]: [startOfDay, endOfDay],
      },
    };

    let subordinateIds: number[] | null = null;
    let managerObj: User | null = null;
    let siteObj: Site | null = null;

    // Si un manager est spécifié, filtrer par ses subordonnés
    if (manager) {
      if (!UsersValidationUtils.validateGuid(String(manager))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.VALIDATION_FAILED,
          message: USERS_ERRORS.GUID_INVALID,
        });
      }

      managerObj = await User._load(String(manager), true);
      if (!managerObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.SUPERVISOR_NOT_FOUND,
          message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
        });
      }

      const userRolesSub = await UserRole._listByAssignedBy(managerObj.getId()!);
      if (userRolesSub && userRolesSub.length > 0) {
        subordinateIds = [];
        userRolesSub.forEach((userRole) => {
          const userId = userRole.getUser();
          if (userId) subordinateIds!.push(userId);
        });

        conditions.user = { [Op.in]: subordinateIds };
      } else {
        subordinateIds = [];
      }
    }

    // Si un site est spécifié
    if (site) {
      if (!WorkSessionsValidationUtils.validateGuid(String(site))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: WORK_SESSIONS_CODES.INVALID_GUID,
          message: WORK_SESSIONS_ERRORS.GUID_INVALID,
        });
      }

      siteObj = await Site._load(String(site), true);
      if (!siteObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: WORK_SESSIONS_CODES.SITE_NOT_FOUND,
          message: SITES_ERRORS.NOT_FOUND,
        });
      }

      conditions.site = siteObj.getId();
    }

    // Récupérer toutes les sessions du jour
    const todaySessions = await WorkSessions._list(conditions);

    // Enrichir les données
    const enrichedSessions: any[] = [];
    const activeCheckIns: any[] = [];
    const completedCheckOuts: any[] = [];
    let totalWorkHours = 0;

    if (todaySessions) {
      await Promise.all(
        todaySessions.map(async (session) => {
          const employee = await User._load(session.getUser()!);
          const sessionSite = await Site._load(session.getSite()!);
          const sessionData = await session.toJSON(responseValue.MINIMAL);

          const enrichedSession = {
            ...sessionData,
            employee: employee ? employee.toJSON() : null,
            site: sessionSite ? await sessionSite.toJSON(responseValue.MINIMAL) : null,
          };

          enrichedSessions.push(enrichedSession);

          // Classer les sessions
          if (session.isActive()) {
            const pauseStatus = await session.getPauseStatusDetailed();
            const lastEntry = await session.LastEntry();
            const hasActiveMission = await session.activeMission();

            activeCheckIns.push({
              ...enrichedSession,
              pause_status: pauseStatus,
              last_activity: lastEntry
                ? {
                    type: lastEntry.pointage_type,
                    timestamp: lastEntry.clocked_at,
                  }
                : null,
              is_on_external_mission: hasActiveMission,
            });
          } else if (session.isClosed()) {
            completedCheckOuts.push(enrichedSession);

            // Calculer les heures travaillées
            if (session.getTotalWorkDuration()) {
              const matches = session
                .getTotalWorkDuration()!
                .match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
              if (matches) {
                const hours = parseInt(matches[1]) || 0;
                const minutes = parseInt(matches[2]) || 0;
                totalWorkHours += hours + minutes / 60;
              }
            }
          }
        }),
      );
    }

    // Calculer les absences (si on filtre par manager)
    let absences: any[] = [];
    if (subordinateIds !== null) {
      const presentUserIds = new Set(todaySessions?.map((s) => s.getUser()) || []);

      await Promise.all(
        subordinateIds.map(async (userId) => {
          if (!presentUserIds.has(userId)) {
            const employee = await User._load(userId);
            if (employee) {
              absences.push({
                employee: employee.toJSON(),
                status: 'absent',
                last_seen: null, // TODO: Récupérer la dernière session
              });
            }
          }
        }),
      );
    }

    // Statistiques globales
    const statistics = {
      total_employees: subordinateIds ? subordinateIds.length : enrichedSessions.length,
      present_count: enrichedSessions.length,
      absent_count: absences.length,
      active_now: activeCheckIns.length,
      checked_out: completedCheckOuts.length,
      on_pause: activeCheckIns.filter((s) => s.pause_status?.is_on_pause).length,
      on_mission: activeCheckIns.filter((s) => s.is_on_external_mission).length,
      total_work_hours: totalWorkHours.toFixed(2),
      average_work_hours:
        enrichedSessions.length > 0
          ? (totalWorkHours / completedCheckOuts.length).toFixed(2)
          : '0.00',
    };

    // Grouper par site si plusieurs sites
    const sessionsBySite: Record<string, any> = {};
    if (!site && todaySessions) {
      for (const session of todaySessions) {
        const siteId = session.getSite();
        if (siteId) {
          if (!sessionsBySite[siteId]) {
            const siteData = await Site._load(siteId);
            sessionsBySite[siteId] = {
              site: siteData ? await siteData.toJSON(responseValue.MINIMAL) : null,
              sessions_count: 0,
              active_count: 0,
            };
          }
          sessionsBySite[siteId].sessions_count++;
          if (session.isActive()) {
            sessionsBySite[siteId].active_count++;
          }
        }
      }
    }

    return R.handleSuccess(res, {
      message: "Today's attendance summary retrieved successfully",
      data: {
        date: startOfDay.toISOString().split('T')[0],
        manager: managerObj ? managerObj.toJSON() : null,
        site_filter: siteObj ? await siteObj.toJSON(responseValue.MINIMAL) : null,
        statistics,
        active_check_ins: activeCheckIns,
        completed_check_outs: completedCheckOuts,
        absences,
        sessions_by_site:
          Object.keys(sessionsBySite).length > 0 ? Object.values(sessionsBySite) : null,
        all_sessions: enrichedSessions,
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'today_attendance_retrieval_failed',
      message: error.message || "Failed to retrieve today's attendance",
    });
  }
});

// === SESSION ACTUELLE PAR EMPLOYÉ ===
// 🔍 Get detailed current work session for specific employee with timing and location
router.get(
  '/attendance/employee/:guid/current',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { guid } = req.params;

      // Validation du GUID
      if (!UsersValidationUtils.validateGuid(guid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.VALIDATION_FAILED,
          message: USERS_ERRORS.GUID_INVALID,
        });
      }

      // Charger l'employé
      const employee = await User._load(guid, true);
      if (!employee) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.USER_NOT_FOUND,
          message: USERS_ERRORS.NOT_FOUND,
        });
      }

      // Récupérer la session active
      const activeSession = await WorkSessions._findActiveSessionByUser(employee.getId()!);

      if (!activeSession) {
        return R.handleSuccess(res, {
          message: 'Employee has no active session',
          data: {
            employee: employee.toJSON(),
            has_active_session: false,
            last_session: null, // TODO: Récupérer la dernière session
          },
        });
      }

      // Enrichir les données de la session
      const sessionData = await activeSession.toJSON(responseValue.FULL);
      const pauseStatus = await activeSession.getPauseStatusDetailed();
      const lastEntry = await activeSession.LastEntry();
      const hasActiveMission = await activeSession.activeMission();
      const pauseDetails = await activeSession.getPauseDetails();

      // Calculer la durée actuelle de travail
      const startTime = activeSession.getSessionStartAt();
      const currentTime = new Date();
      const workDurationMs = startTime ? currentTime.getTime() - startTime.getTime() : 0;
      const workHours = Math.floor(workDurationMs / (1000 * 60 * 60));
      const workMinutes = Math.floor((workDurationMs % (1000 * 60 * 60)) / (1000 * 60));

      // Calculer temps de pause total
      const totalPauseMinutes = await activeSession.getTotalPauseTime();

      // Temps de travail net (sans les pauses)
      const netWorkMinutes = Math.floor(workDurationMs / (1000 * 60)) - totalPauseMinutes;
      const netWorkHours = Math.floor(netWorkMinutes / 60);
      const netWorkRemainingMinutes = netWorkMinutes % 60;

      // Récupérer le site
      const siteObj = await activeSession.getSiteObj();

      return R.handleSuccess(res, {
        message: 'Current session retrieved successfully',
        data: {
          employee: employee.toJSON(),
          has_active_session: true,
          session: {
            ...sessionData,
            site: siteObj ? await siteObj.toJSON(responseValue.MINIMAL) : null,
          },
          current_status: {
            is_working: !pauseStatus.is_on_pause && !hasActiveMission,
            is_on_pause: pauseStatus.is_on_pause,
            is_on_external_mission: hasActiveMission,
            current_pause_start: pauseStatus.current_pause_start,
            current_pause_duration_minutes: pauseStatus.current_pause_duration_minutes,
          },
          timing: {
            session_start: startTime,
            current_time: currentTime,
            total_duration: `${workHours}h ${workMinutes}m`,
            total_pause_time: `${Math.floor(totalPauseMinutes / 60)}h ${totalPauseMinutes % 60}m`,
            net_work_time: `${netWorkHours}h ${netWorkRemainingMinutes}m`,
            total_pauses_count: pauseDetails.length,
          },
          location: {
            check_in: {
              latitude: activeSession.getStartLatitude(),
              longitude: activeSession.getStartLongitude(),
            },
            current: lastEntry
              ? {
                  name: lastEntry.location_name,
                  latitude: lastEntry.latitude,
                  longitude: lastEntry.longitude,
                }
              : null,
          },
          last_activity: lastEntry
            ? {
                type: lastEntry.pointage_type,
                timestamp: lastEntry.clocked_at,
                location: lastEntry.location_name,
              }
            : null,
          pause_history: pauseDetails,
        },
      });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'current_session_retrieval_failed',
        message: error.message || 'Failed to retrieve current session',
      });
    }
  },
);

// === PRÉSENCE ACTUELLE PAR SITE ===
// 📍 List all employees currently present at specific site with check-in times
router.get('/attendance/site/:guid/current', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    // Validation du GUID
    if (!WorkSessionsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: WORK_SESSIONS_CODES.INVALID_GUID,
        message: WORK_SESSIONS_ERRORS.GUID_INVALID,
      });
    }

    // Charger le site
    const siteObj = await Site._load(guid, true);
    if (!siteObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: WORK_SESSIONS_CODES.SITE_NOT_FOUND,
        message: SITES_ERRORS.NOT_FOUND,
      });
    }

    // Récupérer toutes les sessions du site
    const allSessions = await WorkSessions._listBySite(siteObj.getId()!);

    // Filtrer uniquement les sessions actives
    const activeSessions = allSessions?.filter((session) => session.isActive()) || [];

    // Enrichir les données
    const currentPresence: any[] = [];
    let workingCount = 0;
    let onPauseCount = 0;
    let onMissionCount = 0;

    await Promise.all(
      activeSessions.map(async (session) => {
        const employee = await User._load(session.getUser()!);
        const sessionData = await session.toJSON(responseValue.MINIMAL);
        const pauseStatus = await session.getPauseStatusDetailed();
        const lastEntry = await session.LastEntry();
        const hasActiveMission = await session.activeMission();

        // Calculer la durée de présence
        const startTime = session.getSessionStartAt();
        const currentTime = new Date();
        const durationMs = startTime ? currentTime.getTime() - startTime.getTime() : 0;
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

        // Compter les statuts
        if (pauseStatus.is_on_pause) {
          onPauseCount++;
        } else if (hasActiveMission) {
          onMissionCount++;
        } else {
          workingCount++;
        }

        currentPresence.push({
          employee: employee ? employee.toJSON() : null,
          session: sessionData,
          check_in_time: startTime,
          duration_on_site: `${hours}h ${minutes}m`,
          current_status: {
            is_working: !pauseStatus.is_on_pause && !hasActiveMission,
            is_on_pause: pauseStatus.is_on_pause,
            is_on_external_mission: hasActiveMission,
            status_label: pauseStatus.is_on_pause
              ? PointageType.PAUSE_START
              : hasActiveMission
                ? PointageType.EXTERNAL_MISSION
                : PointageType.CLOCK_IN,
          },
          pause_info: {
            total_pauses_today: pauseStatus.total_pauses_today,
            current_pause_duration_minutes: pauseStatus.current_pause_duration_minutes,
          },
          check_in_location: {
            latitude: session.getStartLatitude(),
            longitude: session.getStartLongitude(),
          },
          last_activity: lastEntry
            ? {
                type: lastEntry.pointage_type,
                timestamp: lastEntry.clocked_at,
                location: lastEntry.location_name,
              }
            : null,
        });
      }),
    );

    // Trier par heure d'arrivée (plus ancien en premier)
    currentPresence.sort((a, b) => {
      const dateA = new Date(a.check_in_time).getTime();
      const dateB = new Date(b.check_in_time).getTime();
      return dateA - dateB;
    });

    // Statistiques du site
    const statistics = {
      total_present: currentPresence.length,
      currently_working: workingCount,
      on_pause: onPauseCount,
      on_external_mission: onMissionCount,
      // site_capacity: siteObj.getCapacity?.() || null,
      // occupancy_rate: siteObj.getCapacity?.()
      //   ? `${((currentPresence.length / siteObj.getCapacity()) * 100).toFixed(1)}%`
      //   : null,
    };

    // Grouper par département/rôle si disponible
    const byDepartment: Record<string, number> = {};
    await Promise.all(
      currentPresence.map(async (presence) => {
        const employeeId = presence.employee?.id;
        if (employeeId) {
          const userRoles = await UserRole._listByUser(employeeId);
          if (userRoles && userRoles.length > 0) {
            const roleName = (await userRoles[0].getRoleObject())?.getName() || 'Unknown';
            byDepartment[roleName] = (byDepartment[roleName] || 0) + 1;
          }
        }
      }),
    );

    return R.handleSuccess(res, {
      message: 'Current site presence retrieved successfully',
      data: {
        site: await siteObj.toJSON(responseValue.MINIMAL),
        timestamp: new Date(),
        statistics,
        presence_by_department: Object.keys(byDepartment).length > 0 ? byDepartment : null,
        current_presence: currentPresence,
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'site_presence_retrieval_failed',
      message: error.message || 'Failed to retrieve site presence',
    });
  }
});

// - Add this validation in the /share POST route

router.post('/share', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { user, phone_number, affiliate, country } = req.body;

    // if (!country) {
    //   return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //     code: 'country_is_required',
    //     message: COUNTRY_ERRORS.CODE_REQUIRED,
    //   });
    // }
    //
    // if (!CountryValidationUtils.validateIsoCode(country)) {
    //   return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //     code: 'invalid_country_code',
    //     message: COUNTRY_ERRORS.CODE_INVALID,
    //   });
    // }

    // === TODO implementer la logique de verification d'existence du country dans le système via le master ===/

    if (!affiliate) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'affiliate_is_required',
        message: 'Affiliate is required',
      });
    }
    if (!UsersValidationUtils.validateGuid(affiliate)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'affiliate_is_invalid',
        message: 'Affiliate is invalid',
      });
    }

    const assignByObj = await User._load(affiliate, true);
    if (!assignByObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'affiliate_not_found',
        message: 'Affiliate not found',
      });
    }

    let phone: string;
    let lead: string;
    let countryValue: string;
    // let userIdToCheck: number | null = null;
    let userToCheck: string | null = null;

    // let userInstance: User | null = null;

    // Cas 1 : user fourni
    if (user) {
      const userObj = await User._load(user, true);
      if (!userObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.USER_NOT_FOUND,
          message: USERS_ERRORS.NOT_FOUND,
        });
      }

      // ✅ NEW: Check if user is already a manager
      const userRoles = await UserRole._listByUser(userObj.getId()!);
      if (userRoles && userRoles.length >= 2) {
        return R.handleError(res, HttpStatus.CONFLICT, {
          code: 'user_already_manager',
          message: 'This user is already a manager and cannot be invited',
        });
      }

      phone = userObj.getPhoneNumber()!;
      lead = assignByObj.getGuid()!;
      countryValue = userObj.getCountry()!;
      // userIdToCheck = userObj.getId()!;
      userToCheck = userObj.getGuid()!;
      // userInstance = userObj;
    }
    // Cas 2 : phone_number fourni
    else if (!phone_number) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'phone_number_is_required',
        message: 'Phone number is required',
      });
    } else if (!country) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.COUNTRY_REQUIRED,
        message: USERS_ERRORS.COUNTRY_REQUIRED,
      });
    } else if (!UsersValidationUtils.validateCountryCode(country)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.COUNTRY_INVALID,
        message: USERS_ERRORS.COUNTRY_INVALID,
      });
    } else if (!UsersValidationUtils.validatePhoneNumber(phone_number)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.PHONE_NUMBER_INVALID,
        message: USERS_ERRORS.PHONE_NUMBER_INVALID,
      });
    }
    // else if (!UsersValidationUtils.validatePhoneNumber(phone_number)) {
    //   return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //     code: USERS_CODES.PHONE_NUMBER_INVALID,
    //     message: USERS_ERRORS.PHONE_NUMBER_INVALID,
    //   });
    // }
    else {
      phone = phone_number;
      countryValue = country;

      // Try to find existing user by phone number
      const existingUserByPhone = await User._load(phone_number, false, false, false, true);

      // ✅ NEW: If user exists with this phone, check if they're already a manager
      if (existingUserByPhone) {
        const existingUserRoles = await UserRole._listByUser(existingUserByPhone.getId()!);
        if (existingUserRoles && existingUserRoles.length >= 2) {
          return R.handleError(res, HttpStatus.CONFLICT, {
            code: 'user_already_manager',
            message: 'A user with this phone number is already a manager and cannot be invited',
          });
        }
        // userIdToCheck = existingUserByPhone.getId()!;
        userToCheck = existingUserByPhone.getGuid()!;
        // userInstance = existingUserByPhone;
      }

      const roleObj = await Role._load(RoleValues.EMPLOYEE, false, true);
      if (!roleObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: 'default_role_not_found',
          message: 'Default role not found',
        });
      }

      const identified = {
        user: assignByObj.getId(),
        role: roleObj.getId(),
      };
      const leadObj = await UserRole._load(identified, false, true);
      if (!leadObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: 'lead_user_role_not_found',
          message: 'Lead user role not found',
        });
      }

      const supervisorObj = await leadObj.getAssignedByObject();
      if (!supervisorObj) {
        const adminSup = await UserRole._load(null, false, false, true);
        if (!adminSup) {
          return R.handleError(res, HttpStatus.NOT_FOUND, {
            code: 'default_admin_not_found',
            message: 'Default admin not found',
          });
        }
        if (adminSup.getUser() !== assignByObj.getId()) {
          return R.handleError(res, HttpStatus.CONFLICT, {
            code: 'affiliate_not_admin',
            message: 'Affiliate is not the default admin',
          });
        }
        lead = assignByObj.getGuid()!;
      } else {
        lead = supervisorObj.getGuid()!;
      }
    }

    if (!CountryPhoneValidation.validatePhoneNumber(phone, countryValue)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.PHONE_NUMBER_INVALID,
        message: USERS_ERRORS.PHONE_NUMBER_INVALID,
      });
    }

    const tenant = req.tenant;
    const data = {
      phone_number: phone,
      country: countryValue,
      metadata: {
        user: userToCheck || null,
        // user: userInstance?.toJSON() || null,
        affiliate: assignByObj.getGuid(),
        lead: lead,
        tenant: {
          subdomain: tenant.subdomain,
          name: tenant.config.name,
          address: tenant.config.address,
          country: tenant.config.country,
          email: tenant.config.email,
          phone: tenant.config.phone,
        },
      },
    };

    const saved: any = await InvitationService.saveInv(data);
    if (saved.status !== HttpStatus.CREATED) {
      return R.handleError(res, saved.status, saved.response);
    }
    // TODO juste pour le teste
    const { email } = req.query;
    if (email) {
      await EmailSender.sender(
        saved.response.data.guid,
        String(email),
        // expiration_minutes,
      );
    }
    const response = saved.response.data;
    const sendToken = await WapService.sendInvitation(
      response.guid,
      response.phone_number,
      countryValue,
      response.links,
    );
    if (sendToken.status !== HttpStatus.SUCCESS) {
      return R.handleError(res, sendToken.status, sendToken.response);
    }

    const result = await InvitationService.sendInvitation(response.guid);
    if (result.status !== HttpStatus.SUCCESS) {
      return R.handleError(res, result.status, result.response);
    }

    return R.handleCreated(res, {
      message: 'The Manager application is waiting for the sender',
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.VALIDATION_FAILED,
      message: error.message,
    });
  }
});

// router.patch('/share', Ensure.patch(), async (req: Request, res: Response) => {
//   try {
//     const { user, phone_number, affiliate } = req.body;
//
//     if (!affiliate) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: 'affiliate_is_required',
//         message: 'Affiliate is required',
//       });
//     }
//     if (!UsersValidationUtils.validateGuid(affiliate)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: 'affiliate_is_invalid',
//         message: 'Affiliate is invalid',
//       });
//     }
//
//     const assignByObj = await User._load(affiliate, true);
//     if (!assignByObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: 'affiliate_not_found',
//         message: 'Affiliate not found',
//       });
//     }
//
//     let phone: string;
//     let lead: string;
//
//     // Cas 1 : user fourni
//     if (user) {
//       const userObj = await User._load(user, true);
//       if (!userObj) {
//         return R.handleError(res, HttpStatus.NOT_FOUND, {
//           code: USERS_CODES.USER_NOT_FOUND,
//           message: USERS_ERRORS.NOT_FOUND,
//         });
//       }
//       phone = userObj.getPhoneNumber()!;
//       lead = assignByObj.getGuid()!;
//     }
//     // Cas 2 : phone_number fourni
//     else if (!phone_number) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: 'phone_number_is_required',
//         message: 'Phone number is required',
//       });
//     } else if (!UsersValidationUtils.validatePhoneNumber(phone_number)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: USERS_CODES.PHONE_NUMBER_INVALID,
//         message: USERS_ERRORS.PHONE_NUMBER_INVALID,
//       });
//     } else {
//       phone = phone_number;
//
//       const roleObj = await Role._loadDefaultRole();
//       if (!roleObj) {
//         return R.handleError(res, HttpStatus.NOT_FOUND, {
//           code: 'default_role_not_found',
//           message: 'Default role not found',
//         });
//       }
//       // const role = roleObj.getId();
//       const identified = {
//         user: assignByObj.getId(),
//         role: roleObj.getId(),
//       };
//       const leadObj = await UserRole._load(identified, false, true);
//       if (!leadObj) {
//         return R.handleError(res, HttpStatus.NOT_FOUND, {
//           code: 'lead_user_role_not_found',
//           message: 'Lead user role not found',
//         });
//       }
//
//       const supervisorObj = await leadObj.getAssignedByObject();
//       if (!supervisorObj) {
//         // Pas de superviseur, vérifier si c'est l'admin principal
//         const adminSup = await UserRole._load(null, false, false, true);
//         if (!adminSup) {
//           return R.handleError(res, HttpStatus.NOT_FOUND, {
//             code: 'default_admin_not_found',
//             message: 'Default admin not found',
//           });
//         }
//         if (adminSup.getUser() !== assignByObj.getId()) {
//           return R.handleError(res, HttpStatus.CONFLICT, {
//             code: 'affiliate_not_admin',
//             message: 'Affiliate is not the default admin',
//           });
//         }
//         lead = assignByObj.getGuid()!;
//       } else {
//         lead = supervisorObj.getGuid()!;
//       }
//     }
//
//     const tenant = req.tenant;
//     const data = {
//       user: user || null,
//       phone_number: phone,
//       affiliate: assignByObj.getGuid(),
//       lead: lead,
//       subdomain: tenant.subdomain,
//     };
//     const encryption = DatabaseEncryption.encrypt(data);
//     return R.handleSuccess(res, { token: encryption });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: USERS_CODES.VALIDATION_FAILED,
//       message: error.message,
//     });
//   }
// });

export default router;
