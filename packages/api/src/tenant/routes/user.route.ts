import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  ORG_HIERARCHY_DEFAULTS,
  paginationSchema,
  PointageType,
  ROLES_CODES,
  ROLES_ERRORS,
  SCHEDULE_ASSIGNMENTS_DEFAULTS,
  SITES_ERRORS,
  TENANT_CODES,
  TimezoneConfigUtils,
  USER_ROLES_CODES,
  USER_ROLES_ERRORS,
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
import { responseStructure, responseValue, RoleValues, tableName, } from '../../utils/response.model.js';
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
import ScheduleResolutionService from '../../tools/schedule.resolution.service.js';
import AnomalyDetectionService from '../../tools/anomaly.detection.service.js';
import Groups from '../class/Groups.js';
import SessionTemplate from '../class/SessionTemplates.js';
import ScheduleAssignments from '../class/ScheduleAssignments.js';

import Statistique from './statistique.interface.js';
import TimeEntries from '../class/TimeEntries.js';
// import { AnomalyType } from '../../tools/anomaly.detection.service.js';
// import { AnomalyType } from '../../tools/anomaly.detection.service.js';

// import { MemoType, MemoStatus } from '@toke/shared';
//
// import Memos from '../class/Memos.js';

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
      checked_at: TimezoneConfigUtils.getCurrentTime().toISOString(),
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
      items: userEntries?.length ? await Promise.all(userEntries.map((user) => user.toJSON())) : [],
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

router.get('/list/deleted', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const userEntries = await User._listDeleted();
    const users = {
      count: userEntries?.length || 0,
      items: userEntries?.length ? await Promise.all(userEntries.map((user) => user.toJSON())) : [],
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
      items: userEntries?.length ? await Promise.all(userEntries.map((user) => user.toJSON())) : [],
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
      items: userEntries?.length
        ? await Promise.all(userEntries.map(async (user) => await user.toJSON()))
        : [],
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

/**
 * GET /api/users/unassigned-employees?manager=<guid>
 * Retourne les employés :
 * - Pas actifs dans un groupe
 * - Pas hiérarchiquement supérieurs au manager donné
 */
router.get('/unassigned-employees', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager } = req.query;

    // ============================================
    // 1️⃣ VALIDATION DU MANAGER
    // ============================================
    if (!manager || !UsersValidationUtils.validateGuid(String(manager))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const managerObj = await User._load(String(manager), true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.SUPERVISOR_NOT_FOUND,
        message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
      });
    }

    const managerId = managerObj.getId()!;
    const isUserManager = await OrgHierarchy.hasManagerRole(managerId);
    if (!isUserManager) {
      return R.handleError(res, HttpStatus.FORBIDDEN, {
        code: USERS_CODES.AUTHORIZATION_FAILED,
        message: USERS_ERRORS.AUTHORIZATION_FAILED,
      });
    }

    // ============================================
    // 2️⃣ RÉCUPÉRER TOUS LES EMPLOYÉS ACTIFS
    // ============================================
    const allActiveUsers = await User._listByActiveStatus(true);
    if (!allActiveUsers || allActiveUsers.length === 0) {
      return R.handleSuccess(res, {
        manager: await managerObj.toJSON(responseValue.MINIMAL),
        total_unassigned: 0,
        unassigned_employees: [],
        metadata: {
          total_active_users: 0,
          total_in_groups: 0,
          filtered_count: 0,
        },
      });
    }

    // ============================================
    // 3️⃣ RÉCUPÉRER LES IDS DES MEMBRES ACTIFS DANS DES GROUPES
    // ============================================
    const activeGroupMemberIds = await Groups.getAllActiveGroupMembers();
    const activeGroupMembersSet = new Set(activeGroupMemberIds);

    // ============================================
    // 4️⃣ CONSTRUIRE LA HIÉRARCHIE COMPLÈTE
    // ============================================
    const allHierarchies = await OrgHierarchy._list({});

    // Map: subordinate_id → supervisor_id
    const hierarchyMap = new Map<number, number>();

    if (allHierarchies && allHierarchies.length > 0) {
      for (const hierarchy of allHierarchies) {
        const subordinateId = hierarchy.getSubordinate();
        const supervisorId = hierarchy.getSupervisor();
        if (subordinateId && supervisorId) {
          hierarchyMap.set(subordinateId, supervisorId);
        }
      }
    }

    // ============================================
    // 5️⃣ FONCTION : Vérifier si user est SUPÉRIEUR ou ÉGAL au manager
    // ============================================
    const isUserSuperiorOrEqual = (userId: number): boolean => {
      // Le manager lui-même
      if (userId === managerId) return true;

      // Remonter la hiérarchie depuis le manager pour voir si on trouve userId
      let currentId: number | undefined = managerId;
      const visited = new Set<number>();

      while (currentId) {
        if (visited.has(currentId)) break; // Éviter les boucles infinies
        visited.add(currentId);

        const supervisorId = hierarchyMap.get(currentId);
        if (!supervisorId) break; // Plus de superviseur au-dessus

        if (supervisorId === userId) {
          // userId est un superviseur du manager → donc SUPÉRIEUR
          return true;
        }

        currentId = supervisorId;
      }

      return false;
    };

    // ============================================
    // 6️⃣ FILTRER LES EMPLOYÉS NON ASSIGNÉS
    // ============================================
    const unassignedEmployees: User[] = [];

    for (const user of allActiveUsers) {
      const userId = user.getId();
      if (!userId) continue;

      // ❌ Exclure : Déjà actif dans un groupe
      if (activeGroupMembersSet.has(userId)) continue;

      // ❌ Exclure : Manager lui-même OU supérieur hiérarchique
      if (isUserSuperiorOrEqual(userId)) continue;

      // ✅ Employé valide (peut être un employé simple OU un manager subordonné)
      unassignedEmployees.push(user);
    }

    // ============================================
    // 7️⃣ ENRICHISSEMENT DES DONNÉES
    // ============================================
    const enrichedEmployees = await Promise.all(
      unassignedEmployees.map(async (employee) => {
        const roles = await UserRole._listByUser(employee.getId()!);
        return {
          ...(await employee.toJSON(responseValue.FULL)),
          roles: {
            count: roles?.length,
            items: roles
              ? await Promise.all(roles.map((r) => r.toJSON(responseValue.MINIMAL)))
              : [],
          },
        };
      }),
    );

    // ============================================
    // 8️⃣ RÉPONSE FINALE
    // ============================================
    return R.handleSuccess(res, {
      manager: managerObj.getGuid(),
      total_unassigned: unassignedEmployees.length,
      unassigned_employees: enrichedEmployees,
      metadata: {
        total_active_users: allActiveUsers.length,
        total_in_groups: activeGroupMemberIds.length,
        filtered_count: unassignedEmployees.length,
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.LISTING_FAILED,
      message: error.message || 'Failed to retrieve unassigned employees',
    });
  }
});

// === CRÉATION UTILISATEUR ===
// 👤 Add new employee to manager's team with basic info and automatic role assignment
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateUsersCreation(req.body);

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
      .setLastName(validatedData.last_name)
      .setPhoneNumber(validatedData.phone_number)
      .setCountry(validatedData.country);

    if (validatedData.email) {
      userObj.setEmail(validatedData.email);
    }
    if (validatedData.first_name) {
      userObj.setFirstName(validatedData.first_name);
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

    const defaultSessionTemplate = await SessionTemplate._load({}, false, true);
    if (defaultSessionTemplate) {
      const defaultContrat = new ScheduleAssignments()
        .setTenant(tenant.config.reference)
        .setSessionTemplate(defaultSessionTemplate)
        .setCreatedBy(existingSupervisor.getId()!)
        .setStartDate(TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0])
        .setActive(SCHEDULE_ASSIGNMENTS_DEFAULTS.ACTIVE)
        .setUser(userObj.getId()!);

      await defaultContrat.save();
    }

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

    // const orgHierarchyObj = new OrgHierarchy()
    //   .setSubordinate(userObj.getId()!)
    //   .setSupervisor(existingSupervisor.getId()!)
    //   .setDepartment(userObj.getDepartment()!)
    //   .setEffectiveFrom(ORG_HIERARCHY_DEFAULTS.EFFECTIVE_FROM);

    await userRoleObj.save();

    // await orgHierarchyObj.save();

    // TODO a revoir
    const android: any = await InvitationService.findEmployeeLink(
      responseStructure.EMPLOYEE_ANDROID_APP,
    );

    const ios: any = await InvitationService.findEmployeeLink(responseStructure.EMPLOYEE_IOS_APP);
    const buttons = {
      android_link: android.response.link,
      ios_link: ios.response.link,
    };

    // Envoyer l'OTP via WhatsApp
    const result = await WapService.sendInvitation(
      userObj.getOtpToken()!,
      validatedData.phone_number,
      validatedData.country,
      buttons,
    );
    if (result.status !== HttpStatus.SUCCESS) {
      return R.handleError(res, result.status, result.response);
    }

    return R.handleCreated(res, {
      message: 'User created and OTP sent successfully',
      ...(await userObj.toJSON()),
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
        .setLastName(data.last_name)
        .setPhoneNumber(data.phone_number)
        .setCountry(data.country);

      if (data.first_name) user.setFirstName(data.first_name);
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

    const defaultSessionTemplate = await SessionTemplate._load({}, false, true);
    if (defaultSessionTemplate && !isFirstUser) {
      const defaultContrat = new ScheduleAssignments()
        .setTenant(tenant.config.reference)
        .setSessionTemplate(defaultSessionTemplate)
        .setCreatedBy(supervisorObj?.getId()!)
        .setStartDate(TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0])
        .setActive(SCHEDULE_ASSIGNMENTS_DEFAULTS.ACTIVE)
        .setUser(userObj.getId()!)
        .setReason('Company default contract');

      await defaultContrat.save();
    }

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
          ...(await userObj.toJSON()),
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
        ...(await userObj.toJSON()),
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

router.get('/email/:email', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const validateEmail = UsersValidationUtils.validateEmail(req.params.email);
    if (!validateEmail) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.EMAIL_INVALID,
        message: USERS_ERRORS.EMAIL_INVALID,
      });
    }

    const userObj = await User._load(req.params.email, false, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    // Récupération des rôles de l'utilisateur
    // const userRoles = await UserRole.getUserRoles(userObj.getId()!);

    let roles = [];

    // Charger les rôles requis
    const [adminRole, managerRole] = await Promise.all([
      Role._load(RoleValues.ADMIN, false, true),
      Role._load(RoleValues.MANAGER, false, true),
    ]);

    if (!adminRole || !managerRole) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'role_not_found',
        message: 'One or more roles (admin/manager) are missing',
      });
    }

    const identifierAd = { user: userObj.getId(), role: adminRole.getId() };
    const identifierMn = { user: userObj.getId(), role: managerRole.getId() };

    const userRolesAd = await UserRole._load(identifierAd, false, true);
    if (userRolesAd) {
      roles.push(adminRole.toJSON());
    }
    const userRolesMn = await UserRole._load(identifierMn, false, true);
    if (userRolesMn) {
      roles.push(managerRole.toJSON());
    }

    if (!userRolesAd && !userRolesMn) {
      return R.handleError(res, HttpStatus.FORBIDDEN, {
        code: USER_ROLES_CODES.USER_ROLE_NOT_FOUND,
        message: USER_ROLES_ERRORS.NOT_FOUND,
      });
    }

    const user = {
      ...(await userObj.toJSON()),
      roles: roles,
    };

    return R.handleSuccess(res, user);
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
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

    const user = {
      ...(await userObj.toJSON()),
      roles: userRoles.map((role) => role.toJSON()),
    };

    return R.handleSuccess(res, user);
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
      ...(await userObj.toJSON()),
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
    // let assigns: string[] = [];
    //
    // await Promise.all(
    //   Roles.map(async (role) => {
    //     const assignByObj = await role.getAssignedByObject();
    //     if (assignByObj) {
    //       assigns.push(assignByObj.getGuid()!);
    //     }
    //   }),
    // );

    const assigns = (
      await Promise.all(
        Roles.map(async (role) => {
          const assignByObj = await role.getAssignedByObject();
          return assignByObj?.getGuid() ?? null;
        }),
      )
    ).filter((guid): guid is string => guid !== null);

    // const rolesID = (
    //   await Promise.all(
    //     Roles.map(async (role) => role.getRole())
    //   )
    // ).filter((id): id is number => Boolean(id));

    const rolesID = Roles.map((role) => role.getRole()).filter(Boolean) as number[];

    // Charger les rôles requis
    const [adminRole, managerRole] = await Promise.all([
      Role._load(RoleValues.ADMIN, false, true),
      Role._load(RoleValues.MANAGER, false, true),
    ]);

    if (!adminRole || !managerRole) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'role_not_found',
        message: 'One or more roles (admin/manager) are missing',
      });
    }

    const isAssigned = assigns.includes(validatedData.supervisor!);
    const isAdmin = rolesID.includes(adminRole.getId()!);
    const isManager = rolesID.includes(managerRole.getId()!);

    console.log(isAssigned, isAdmin, isManager);

    if (!isAssigned && !isAdmin && !isManager) {
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

    // if (validatedData.session_template) {
    //   const sessionTemplateObj = await SessionTemplate._load(validatedData.session_template);
    //   if (!sessionTemplateObj) {
    //     return R.handleError(res, HttpStatus.NOT_FOUND, {
    //       code: SESSION_TEMPLATE_CODES.SESSION_TEMPLATE_NOT_FOUND,
    //       message: SESSION_TEMPLATE_ERRORS.NOT_FOUND,
    //     });
    //   }
    //   userObj.setSessionTemplate(sessionTemplateObj.getId()!);
    // }

    await userObj.save();
    return R.handleSuccess(res, await userObj.toJSON());
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
    return R.handleSuccess(res, await userObj.toJSON());
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

router.patch('/restore/:guid', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const validGuid = UsersValidationUtils.validateGuid(req.params.guid);
    if (!validGuid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.INVALID_GUID,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._loadForRestore(req.params.guid);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const roles = await UserRole.getUserRoles(userObj.getId()!);

    await userObj.restoreUser();
    return R.handleSuccess(res, {
      message: 'User restore successfully',
      user: {
        ...(await userObj.toJSON()),
        roles: roles.map((role) => role.toJSON()),
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

router.patch('/terminal/:guid', Ensure.patch(), async (req: Request, res: Response) => {
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

    const { device_token } = req.body;
    if (
      device_token &&
      typeof device_token === 'string' &&
      device_token !== userObj.getDeviceToken()
    ) {
      userObj.setDeviceToken(device_token);
      await userObj.addDeviceToken();
    }

    return R.handleSuccess(res, { message: 'User device token saved successfully' });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: USERS_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

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
      user: await userObj.toJSON(),
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
      user: await userObj.toJSON(),
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
    const { supervisor } = req.query;
    // if (!status || !UsersValidationUtils.validateActive(status)) {
    //   return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //     code: USERS_CODES.ACTIVE_STATUS_INVALID,
    //     message: USERS_ERRORS.ACTIVE_STATUS_INVALID,
    //   });
    // }
    if (!supervisor || !UsersValidationUtils.validateGuid(String(supervisor))) {
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
    const status = userObj.isActive()!;

    userObj.setActive(!status);

    await userObj.save();
    return R.handleSuccess(res, {
      message: 'User status updated successfully',
      user: await userObj.toJSON(),
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

    // // Récupérer les rôles des subordonnés assignés par ce manager
    // const userRolesSub = await UserRole._listByAssignedBy(userObj.getId()!);
    //
    // if (!userRolesSub || userRolesSub.length === 0) {
    //   return R.handleError(res, HttpStatus.NOT_FOUND, {
    //     code: 'subordinate_not_found',
    //     message: 'No subordinates found for this manager',
    //   });
    // }

    // Récupérer les IDs des subordonnés
    // const subordinateIds: number[] = [];
    // await Promise.all(
    //   userRolesSub.map(async (userRole) => {
    //     const userRoleId = userRole.getUser();
    //     if (userRoleId) {
    //       subordinateIds.push(userRoleId);
    //     }
    //   }),
    // );
    const teamData = await OrgHierarchy.getAllTeamMembers(userObj.getId()!);
    const subordinateIds = teamData.all_employees_flat.map((u) => u.getId()!);

    if (subordinateIds.length === 0) {
      return R.handleSuccess(res, {
        code: 'ACTIVE_SESSIONS_RETRIEVED',
        message: 'No active sessions found',
        data: {
          manager: await userObj.toJSON(),
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
            employee: employee ? await employee.toJSON() : null,
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
        manager: await userObj.toJSON(),
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

/**
 * 📊 Vue d'ensemble de la présence sur une période - Structure optimale
 * Données brutes + calculs de base, interprétation côté client
 */
router.get('/attendance/stat0', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager, site, start_date, end_date, exclude } = req.query;

    // ============================================
    // 📅 GESTION DE LA PÉRIODE
    // ============================================
    let startOfPeriod: Date;
    let endOfPeriod: Date;

    if (typeof start_date === 'string' && UsersValidationUtils.isValidDate(start_date)) {
      startOfPeriod = new Date(start_date);
      startOfPeriod.setHours(0, 0, 0, 0);
    } else {
      startOfPeriod = TimezoneConfigUtils.getCurrentTime();
      startOfPeriod.setHours(0, 0, 0, 0);
    }

    if (typeof end_date === 'string' && UsersValidationUtils.isValidDate(end_date)) {
      endOfPeriod = new Date(end_date);
      endOfPeriod.setHours(23, 59, 59, 999);
    } else {
      endOfPeriod = new Date(startOfPeriod);
      endOfPeriod.setHours(23, 59, 59, 999);
    }

    // ============================================
    // 1️⃣ RÉCUPÉRATION DE L'ÉQUIPE
    // ============================================
    let teamMembers: number[] = [];
    // let managerObj: User | null = null;
    let siteObj: Site | null = null;

    if (!UsersValidationUtils.validateGuid(String(manager))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const managerObj = await User._load(String(manager), true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.SUPERVISOR_NOT_FOUND,
        message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
      });
    }

    const teamData = await OrgHierarchy.getAllTeamMembers(managerObj.getId()!);
    teamMembers = teamData.all_employees_flat.map((u) => u.getId()!);

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
    }

    // ============================================
    // 2️⃣ RÉCUPÉRATION DES SESSIONS DE LA PÉRIODE
    // ============================================
    const sessionConditions: Record<string, any> = {
      session_start_at: {
        [Op.between]: [startOfPeriod, endOfPeriod],
      },
    };

    if (teamMembers.length > 0) {
      sessionConditions.user = { [Op.in]: teamMembers };
    }

    if (siteObj) {
      sessionConditions.site = siteObj.getId();
    }

    const periodSessions = await WorkSessions._list(sessionConditions);

    // ============================================
    // 3️⃣ CALCUL DES JOURS DE LA PÉRIODE
    // ============================================

    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    // Dates de calcul (journées)
    const startDateCalc = new Date(startOfPeriod);
    startDateCalc.setHours(0, 0, 0, 0);

    const endDateCalc = new Date(endOfPeriod);
    endDateCalc.setHours(0, 0, 0, 0);

    const totalDays =
      Math.round((endDateCalc.getTime() - startDateCalc.getTime()) / MS_PER_DAY) + 1;

    // const totalDays =
    //   Math.ceil((endOfPeriod.getTime() - startOfPeriod.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // ============================================
    // 4️⃣ ANALYSE PAR JOUR
    // ============================================
    const dailyBreakdown: Array<any> = [];
    const dailyEmployeeData: Map<string, Map<number, any>> = new Map();

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const analysisDate = new Date(startOfPeriod);
    const endOfCalculation = new Date(endOfPeriod);
    endOfCalculation.setHours(0, 0, 0, 0);

    while (analysisDate <= endOfCalculation) {
      const dateKey = analysisDate.toISOString().split('T')[0];
      const dayStart = new Date(analysisDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(analysisDate);
      dayEnd.setHours(23, 59, 59, 999);

      const daySessions = periodSessions?.filter((s) => {
        const sessionStart = s.getSessionStartAt();
        return sessionStart && sessionStart >= dayStart && sessionStart <= dayEnd;
      });

      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;
      let offDayCount = 0;

      const dayEmployeeAnalysis: Map<number, any> = new Map();

      // Analyser chaque employé pour ce jour
      for (const userId of teamMembers) {
        const scheduleResult = await ScheduleResolutionService.getApplicableSchedule(
          userId,
          analysisDate,
        );
        const expectedSchedule = scheduleResult.applicable_schedule;
        const isWorkDay = expectedSchedule?.is_work_day || false;

        console.log('isWorkDay', isWorkDay);

        const userSession = daySessions?.find((s) => s.getUser() === userId);

        let status: 'present' | 'late' | 'absent' | 'off-day' = 'absent';
        let delayMinutes = 0;
        let clockInTime: Date | null = null;
        let clockOutTime: Date | null = null;
        let workHours = 0;

        if (!isWorkDay) {
          status = 'off-day';
          offDayCount++;
        } else if (userSession) {
          clockInTime = userSession.getSessionStartAt()!;
          clockOutTime = userSession.getSessionEndAt() || null;

          // Calcul heures travaillées
          if (userSession.getTotalWorkDuration()) {
            const matches = userSession
              .getTotalWorkDuration()!
              .match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
            if (matches) {
              const hours = parseInt(matches[1]) || 0;
              const minutes = parseInt(matches[2]) || 0;
              workHours = hours + minutes / 60;
            }
          }

          if (expectedSchedule && expectedSchedule.expected_blocks.length > 0) {
            const firstBlock = expectedSchedule.expected_blocks[0];
            const expectedStartTime = firstBlock.work[0];
            const tolerance = firstBlock.tolerance || 0;

            const clockedTime = AnomalyDetectionService.formatTime(clockInTime);
            const clockedMinutes = ScheduleResolutionService.parseTimeToMinutes(clockedTime);
            const expectedMinutes = ScheduleResolutionService.parseTimeToMinutes(expectedStartTime);

            delayMinutes = clockedMinutes - expectedMinutes;

            if (delayMinutes > tolerance) {
              status = 'late';
              lateCount++;
            } else {
              status = 'present';
              presentCount++;
            }
          } else {
            status = 'present';
            presentCount++;
          }
        } else {
          if (isWorkDay) {
            status = 'absent';
            absentCount++;
          }
        }

        // Stocker les détails pour cet employé ce jour
        dayEmployeeAnalysis.set(userId, {
          status,
          clock_in_time: clockInTime ? clockInTime.toISOString() : null,
          clock_out_time: clockOutTime ? clockOutTime.toISOString() : null,
          expected_time: expectedSchedule?.expected_blocks[0]?.work[0] || null,
          delay_minutes: delayMinutes > 0 ? delayMinutes : null,
          work_hours: workHours > 0 ? workHours : null,
        });
      }

      dailyEmployeeData.set(dateKey, dayEmployeeAnalysis);

      const dayOfWeek = analysisDate.getDay();

      dailyBreakdown.push({
        date: dateKey,
        day_of_week: dayNames[dayOfWeek],
        expected_count: teamMembers.length - offDayCount, // ✅ Ajoute cette ligne
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        off_day: offDayCount,
      });

      analysisDate.setDate(analysisDate.getDate() + 1);
    }

    // ============================================
    // 5️⃣ STATISTIQUES PAR EMPLOYÉ
    // ============================================
    const employeesData: Array<any> = [];

    for (const userId of teamMembers) {
      const employee = await User._load(userId);
      if (!employee) continue;

      let workDaysExpected = 0;
      let presentDays = 0;
      let lateDays = 0;
      let absentDays = 0;
      let offDays = 0;
      let totalDelayMinutes = 0;
      let maxDelayMinutes = 0;
      let totalWorkHours = 0;
      const dailyDetails: Array<any> = [];

      // Parcourir tous les jours de la période
      for (const [dateKey, dayData] of dailyEmployeeData.entries()) {
        const employeeDayData = dayData.get(userId);
        if (!employeeDayData) continue;

        const { status, delay_minutes, work_hours, ...rest } = employeeDayData;

        if (status === 'present') {
          presentDays++;
          workDaysExpected++;
        } else if (status === 'late') {
          lateDays++;
          workDaysExpected++;
          if (delay_minutes) {
            totalDelayMinutes += delay_minutes;
            maxDelayMinutes = Math.max(maxDelayMinutes, delay_minutes);
          }
        } else if (status === 'absent') {
          absentDays++;
          workDaysExpected++;
        } else if (status === 'off-day') {
          offDays++;
        }

        if (work_hours) {
          totalWorkHours += work_hours;
        }

        // Ajouter aux détails quotidiens si demandé
        if (exclude !== 'daily_details') {
          dailyDetails.push({
            date: dateKey,
            status,
            ...rest,
            delay_minutes,
            work_hours,
          });
        }
      }

      const attendanceRate =
        workDaysExpected > 0 ? ((presentDays + lateDays) / workDaysExpected) * 100 : 0;

      const punctualityRate =
        presentDays + lateDays > 0 ? (presentDays / (presentDays + lateDays)) * 100 : 0;

      const averageDelayMinutes = lateDays > 0 ? totalDelayMinutes / lateDays : 0;

      const averageWorkHours =
        presentDays + lateDays > 0 ? totalWorkHours / (presentDays + lateDays) : 0;

      const employeeData: any = {
        employee: await employee.toJSON(responseValue.MINIMAL),
        period_stats: {
          work_days_expected: workDaysExpected,
          present_days: presentDays,
          late_days: lateDays,
          absent_days: absentDays,
          off_days: offDays,

          total_delay_minutes: totalDelayMinutes,
          average_delay_minutes: parseFloat(averageDelayMinutes.toFixed(1)),
          max_delay_minutes: maxDelayMinutes,

          total_work_hours: parseFloat(totalWorkHours.toFixed(2)),
          average_work_hours_per_day: parseFloat(averageWorkHours.toFixed(2)),

          attendance_rate: parseFloat(attendanceRate.toFixed(2)),
          punctuality_rate: parseFloat(punctualityRate.toFixed(2)),
        },
      };

      if (exclude !== 'daily_details') {
        employeeData.daily_details = dailyDetails;
      }

      employeesData.push(employeeData);
    }

    // ============================================
    // 6️⃣ CALCUL DES STATISTIQUES GLOBALES
    // ============================================
    let totalPresentOnTime = 0;
    let totalLateArrivals = 0;
    let totalAbsences = 0;
    let totalOffDays = 0;
    let totalDelayMinutes = 0;
    let totalWorkHours = 0;

    employeesData.forEach((emp) => {
      totalPresentOnTime += emp.period_stats.present_days;
      totalLateArrivals += emp.period_stats.late_days;
      totalAbsences += emp.period_stats.absent_days;
      totalOffDays += emp.period_stats.off_days;
      totalDelayMinutes += emp.period_stats.total_delay_minutes;
      totalWorkHours += emp.period_stats.total_work_hours;
    });

    const totalExpectedWorkdays = employeesData.reduce(
      (sum, emp) => sum + emp.period_stats.work_days_expected,
      0,
    );

    const attendanceRate =
      totalExpectedWorkdays > 0 // ✅
        ? ((totalPresentOnTime + totalLateArrivals) / totalExpectedWorkdays) * 100
        : 0;

    const punctualityRate =
      totalPresentOnTime + totalLateArrivals > 0
        ? (totalPresentOnTime / (totalPresentOnTime + totalLateArrivals)) * 100
        : 0;

    const averageDelayMinutes = totalLateArrivals > 0 ? totalDelayMinutes / totalLateArrivals : 0;

    const averageWorkHoursPerDay =
      totalPresentOnTime + totalLateArrivals > 0
        ? totalWorkHours / (totalPresentOnTime + totalLateArrivals)
        : 0;

    // Compter les sessions actives actuellement
    // On récupère toutes les sessions non clôturées (session_end_at = null)
    const currentlySessions = await WorkSessions._list({
      user: { [Op.in]: teamMembers },
      session_end_at: null, // Sessions non terminées
    });

    const currentlyActive = currentlySessions?.filter((s) => s.isActive()).length || 0;

    // Compter les pauses (si getPauseStatus est implémenté)
    let currentlyOnPause = 0;
    if (currentlySessions) {
      for (const session of currentlySessions) {
        const pauseStatus = await session.getPauseStatusDetailed();
        if (pauseStatus?.is_on_pause) {
          currentlyOnPause++;
        }
      }
    }

    // ============================================
    // 7️⃣ RÉPONSE FINALE
    // ============================================
    return R.handleSuccess(res, {
      message: 'Period attendance retrieved successfully',
      data: {
        period: {
          start: startOfPeriod.toISOString().split('T')[0],
          end: endOfPeriod.toISOString().split('T')[0],
          total_days: totalDays,
        },

        filters: {
          manager_guid: managerObj?.getGuid() || null,
          site_guid: siteObj?.getGuid() || null,
        },

        summary: {
          total_team_members: teamMembers.length,

          total_present_on_time: totalPresentOnTime,
          total_late_arrivals: totalLateArrivals,
          total_absences: totalAbsences,
          total_off_days: totalOffDays,
          total_expected_workdays: totalExpectedWorkdays,

          attendance_rate: parseFloat(attendanceRate.toFixed(2)),
          punctuality_rate: parseFloat(punctualityRate.toFixed(2)),
          average_delay_minutes: parseFloat(averageDelayMinutes.toFixed(1)),

          total_work_hours: parseFloat(totalWorkHours.toFixed(2)),
          average_work_hours_per_day: parseFloat(averageWorkHoursPerDay.toFixed(2)),

          currently_active: currentlyActive,
          currently_on_pause: currentlyOnPause,
        },

        daily_breakdown: dailyBreakdown,

        employees: employeesData,
      },
    });
  } catch (error: any) {
    console.error('[Attendance Period] Error:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'attendance_period_failed',
      message: error.message || 'Failed to retrieve period attendance',
    });
  }
});

/**
 * 📊 Vue d'ensemble de la présence sur une période - Structure optimale
 * Données brutes + calculs de base, interprétation côté client
 */
router.get('/attendance/stat1', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager, site, start_date, end_date, exclude } = req.query;

    // ============================================
    // 📅 GESTION DE LA PÉRIODE
    // ============================================
    let startOfPeriod: Date;
    let endOfPeriod: Date;

    if (typeof start_date === 'string' && UsersValidationUtils.isValidDate(start_date)) {
      startOfPeriod = new Date(start_date);
      startOfPeriod.setHours(0, 0, 0, 0);
    } else {
      startOfPeriod = TimezoneConfigUtils.getCurrentTime();
      startOfPeriod.setHours(0, 0, 0, 0);
    }

    if (typeof end_date === 'string' && UsersValidationUtils.isValidDate(end_date)) {
      endOfPeriod = new Date(end_date);
      endOfPeriod.setHours(23, 59, 59, 999);
    } else {
      endOfPeriod = new Date(startOfPeriod);
      endOfPeriod.setHours(23, 59, 59, 999);
    }

    // ============================================
    // 1️⃣ RÉCUPÉRATION DE L'ÉQUIPE
    // ============================================
    let teamMembers: number[] = [];
    // let managerObj: User | null = null;
    let siteObj: Site | null = null;

    if (!UsersValidationUtils.validateGuid(String(manager))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const managerObj = await User._load(String(manager), true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.SUPERVISOR_NOT_FOUND,
        message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
      });
    }

    const teamData = await OrgHierarchy.getAllTeamMembers(managerObj.getId()!);
    teamMembers = teamData.all_employees_flat.map((u) => u.getId()!);

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
    }

    // ============================================
    // 2️⃣ RÉCUPÉRATION DES SESSIONS DE LA PÉRIODE
    // ============================================
    const sessionConditions: Record<string, any> = {
      session_start_at: {
        [Op.between]: [startOfPeriod, endOfPeriod],
      },
    };

    if (teamMembers.length > 0) {
      sessionConditions.user = { [Op.in]: teamMembers };
    }

    if (siteObj) {
      sessionConditions.site = siteObj.getId();
    }

    const periodSessions = await WorkSessions._list(sessionConditions);

    // ============================================
    // 3️⃣ CALCUL DES JOURS DE LA PÉRIODE
    // ============================================

    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    // Dates de calcul (journées)
    const startDateCalc = new Date(startOfPeriod);
    startDateCalc.setHours(0, 0, 0, 0);

    const endDateCalc = new Date(endOfPeriod);
    endDateCalc.setHours(0, 0, 0, 0);

    const totalDays =
      Math.round((endDateCalc.getTime() - startDateCalc.getTime()) / MS_PER_DAY) + 1;

    // const totalDays =
    //   Math.ceil((endOfPeriod.getTime() - startOfPeriod.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // ============================================
    // 4️⃣ ANALYSE PAR JOUR
    // ============================================
    const dailyBreakdown: Array<any> = [];
    const dailyEmployeeData: Map<string, Map<number, any>> = new Map();

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const analysisDate = new Date(startOfPeriod);
    const endOfCalculation = new Date(endOfPeriod);
    endOfCalculation.setHours(0, 0, 0, 0);

    while (analysisDate <= endOfCalculation) {
      const dateKey = analysisDate.toISOString().split('T')[0];
      const dayStart = new Date(analysisDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(analysisDate);
      dayEnd.setHours(23, 59, 59, 999);

      const daySessions = periodSessions?.filter((s) => {
        const sessionStart = s.getSessionStartAt();
        return sessionStart && sessionStart >= dayStart && sessionStart <= dayEnd;
      });

      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;
      let offDayCount = 0;

      const dayEmployeeAnalysis: Map<number, any> = new Map();

      // Analyser chaque employé pour ce jour
      for (const userId of teamMembers) {
        const scheduleResult = await ScheduleResolutionService.getApplicableSchedule(
          userId,
          analysisDate,
        );
        const expectedSchedule = scheduleResult.applicable_schedule;
        const isWorkDay = expectedSchedule?.is_work_day || false;

        console.log('isWorkDay', isWorkDay);

        const userSession = daySessions?.find((s) => s.getUser() === userId);

        let status: 'present' | 'late' | 'absent' | 'off-day' = 'absent';
        let delayMinutes = 0;
        let clockInTime: Date | null = null;
        let clockOutTime: Date | null = null;
        let workHours = 0;

        if (!isWorkDay) {
          status = 'off-day';
          offDayCount++;
        } else if (userSession) {
          clockInTime = userSession.getSessionStartAt()!;
          clockOutTime = userSession.getSessionEndAt() || null;

          // Calcul heures travaillées
          if (userSession.getTotalWorkDuration()) {
            const matches = userSession
              .getTotalWorkDuration()!
              .match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
            if (matches) {
              const hours = parseInt(matches[1]) || 0;
              const minutes = parseInt(matches[2]) || 0;
              workHours = hours + minutes / 60;
            }
          }

          if (expectedSchedule && expectedSchedule.expected_blocks.length > 0) {
            const firstBlock = expectedSchedule.expected_blocks[0];
            const expectedStartTime = firstBlock.work[0];
            const tolerance = firstBlock.tolerance || 0;

            const clockedTime = AnomalyDetectionService.formatTime(clockInTime);
            const clockedMinutes = ScheduleResolutionService.parseTimeToMinutes(clockedTime);
            const expectedMinutes = ScheduleResolutionService.parseTimeToMinutes(expectedStartTime);

            delayMinutes = clockedMinutes - expectedMinutes;

            if (delayMinutes > tolerance) {
              status = 'late';
              lateCount++;
            } else {
              status = 'present';
              presentCount++;
            }
          } else {
            status = 'present';
            presentCount++;
          }
        } else {
          if (isWorkDay) {
            status = 'absent';
            absentCount++;
          }
        }

        // Stocker les détails pour cet employé ce jour
        dayEmployeeAnalysis.set(userId, {
          status,
          clock_in_time: clockInTime ? clockInTime.toISOString() : null,
          clock_out_time: clockOutTime ? clockOutTime.toISOString() : null,
          expected_time: expectedSchedule?.expected_blocks[0]?.work[0] || null,
          delay_minutes: delayMinutes > 0 ? delayMinutes : null,
          work_hours: workHours > 0 ? workHours : null,
        });
      }

      dailyEmployeeData.set(dateKey, dayEmployeeAnalysis);

      const dayOfWeek = analysisDate.getDay();

      dailyBreakdown.push({
        date: dateKey,
        day_of_week: dayNames[dayOfWeek],
        expected_count: teamMembers.length - offDayCount, // ✅ Ajoute cette ligne
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        off_day: offDayCount,
      });

      analysisDate.setDate(analysisDate.getDate() + 1);
    }

    // ============================================
    // 5️⃣ STATISTIQUES PAR EMPLOYÉ
    // ============================================
    const employeesData: Array<any> = [];

    for (const userId of teamMembers) {
      const employee = await User._load(userId);
      if (!employee) continue;

      let workDaysExpected = 0;
      let presentDays = 0;
      let lateDays = 0;
      let absentDays = 0;
      let offDays = 0;
      let totalDelayMinutes = 0;
      let maxDelayMinutes = 0;
      let totalWorkHours = 0;
      const dailyDetails: Array<any> = [];

      // Parcourir tous les jours de la période
      for (const [dateKey, dayData] of dailyEmployeeData.entries()) {
        const employeeDayData = dayData.get(userId);
        if (!employeeDayData) continue;

        const { status, delay_minutes, work_hours, ...rest } = employeeDayData;

        if (status === 'present') {
          presentDays++;
          workDaysExpected++;
        } else if (status === 'late') {
          lateDays++;
          workDaysExpected++;
          if (delay_minutes) {
            totalDelayMinutes += delay_minutes;
            maxDelayMinutes = Math.max(maxDelayMinutes, delay_minutes);
          }
        } else if (status === 'absent') {
          absentDays++;
          workDaysExpected++;
        } else if (status === 'off-day') {
          offDays++;
        }

        if (work_hours) {
          totalWorkHours += work_hours;
        }

        // Ajouter aux détails quotidiens si demandé
        if (exclude !== 'daily_details') {
          dailyDetails.push({
            date: dateKey,
            status,
            ...rest,
            delay_minutes,
            work_hours,
          });
        }
      }

      const attendanceRate =
        workDaysExpected > 0 ? ((presentDays + lateDays) / workDaysExpected) * 100 : 0;

      const punctualityRate =
        presentDays + lateDays > 0 ? (presentDays / (presentDays + lateDays)) * 100 : 0;

      const averageDelayMinutes = lateDays > 0 ? totalDelayMinutes / lateDays : 0;

      const averageWorkHours =
        presentDays + lateDays > 0 ? totalWorkHours / (presentDays + lateDays) : 0;

      const employeeData: any = {
        employee: await employee.toJSON(responseValue.MINIMAL),
        period_stats: {
          work_days_expected: workDaysExpected,
          present_days: presentDays,
          late_days: lateDays,
          absent_days: absentDays,
          off_days: offDays,

          total_delay_minutes: totalDelayMinutes,
          average_delay_minutes: parseFloat(averageDelayMinutes.toFixed(1)),
          max_delay_minutes: maxDelayMinutes,

          total_work_hours: parseFloat(totalWorkHours.toFixed(2)),
          average_work_hours_per_day: parseFloat(averageWorkHours.toFixed(2)),

          attendance_rate: parseFloat(attendanceRate.toFixed(2)),
          punctuality_rate: parseFloat(punctualityRate.toFixed(2)),
        },
      };

      if (exclude !== 'daily_details') {
        employeeData.daily_details = dailyDetails;
      }

      employeesData.push(employeeData);
    }

    // ============================================
    // 6️⃣ CALCUL DES STATISTIQUES GLOBALES
    // ============================================
    let totalPresentOnTime = 0;
    let totalLateArrivals = 0;
    let totalAbsences = 0;
    let totalOffDays = 0;
    let totalDelayMinutes = 0;
    let totalWorkHours = 0;

    employeesData.forEach((emp) => {
      totalPresentOnTime += emp.period_stats.present_days;
      totalLateArrivals += emp.period_stats.late_days;
      totalAbsences += emp.period_stats.absent_days;
      totalOffDays += emp.period_stats.off_days;
      totalDelayMinutes += emp.period_stats.total_delay_minutes;
      totalWorkHours += emp.period_stats.total_work_hours;
    });

    const totalExpectedWorkdays = employeesData.reduce(
      (sum, emp) => sum + emp.period_stats.work_days_expected,
      0,
    );

    const attendanceRate =
      totalExpectedWorkdays > 0 // ✅
        ? ((totalPresentOnTime + totalLateArrivals) / totalExpectedWorkdays) * 100
        : 0;

    const punctualityRate =
      totalPresentOnTime + totalLateArrivals > 0
        ? (totalPresentOnTime / (totalPresentOnTime + totalLateArrivals)) * 100
        : 0;

    const averageDelayMinutes = totalLateArrivals > 0 ? totalDelayMinutes / totalLateArrivals : 0;

    const averageWorkHoursPerDay =
      totalPresentOnTime + totalLateArrivals > 0
        ? totalWorkHours / (totalPresentOnTime + totalLateArrivals)
        : 0;

    // Compter les sessions actives actuellement
    // On récupère toutes les sessions non clôturées (session_end_at = null)
    const currentlySessions = await WorkSessions._list({
      user: { [Op.in]: teamMembers },
      session_end_at: null, // Sessions non terminées
    });

    const currentlyActive = currentlySessions?.filter((s) => s.isActive()).length || 0;

    // Compter les pauses (si getPauseStatus est implémenté)
    let currentlyOnPause = 0;
    if (currentlySessions) {
      for (const session of currentlySessions) {
        const pauseStatus = await session.getPauseStatusDetailed();
        if (pauseStatus?.is_on_pause) {
          currentlyOnPause++;
        }
      }
    }

    // ============================================
    // 7️⃣ RÉPONSE FINALE
    // ============================================
    return R.handleSuccess(res, {
      message: 'Period attendance retrieved successfully',
      data: {
        period: {
          start: startOfPeriod.toISOString().split('T')[0],
          end: endOfPeriod.toISOString().split('T')[0],
          total_days: totalDays,
        },

        filters: {
          manager_guid: managerObj?.getGuid() || null,
          site_guid: siteObj?.getGuid() || null,
        },

        summary: {
          total_team_members: teamMembers.length,

          total_present_on_time: totalPresentOnTime,
          total_late_arrivals: totalLateArrivals,
          total_absences: totalAbsences,
          total_off_days: totalOffDays,
          total_expected_workdays: totalExpectedWorkdays,

          attendance_rate: parseFloat(attendanceRate.toFixed(2)),
          punctuality_rate: parseFloat(punctualityRate.toFixed(2)),
          average_delay_minutes: parseFloat(averageDelayMinutes.toFixed(1)),

          total_work_hours: parseFloat(totalWorkHours.toFixed(2)),
          average_work_hours_per_day: parseFloat(averageWorkHoursPerDay.toFixed(2)),

          currently_active: currentlyActive,
          currently_on_pause: currentlyOnPause,
        },

        daily_breakdown: dailyBreakdown,

        employees: employeesData,
      },
    });
  } catch (error: any) {
    console.error('[Attendance Period] Error:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'attendance_period_failed',
      message: error.message || 'Failed to retrieve period attendance',
    });
  }
});

/**
 * 📊 Vue d'ensemble de la présence sur une période - Version enrichie
 * Données brutes + calculs enrichis avec 5 nouvelles valeurs statistiques
 */
router.get('/attendance/stat', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager, site, start_date, end_date, exclude } = req.query;

    // ============================================
    // 📅 GESTION DE LA PÉRIODE
    // ============================================
    let startOfPeriod: Date;
    let endOfPeriod: Date;

    if (typeof start_date === 'string' && UsersValidationUtils.isValidDate(start_date)) {
      startOfPeriod = new Date(start_date);
      startOfPeriod.setHours(0, 0, 0, 0);
    } else {
      startOfPeriod = TimezoneConfigUtils.getCurrentTime();
      startOfPeriod.setHours(0, 0, 0, 0);
    }

    if (typeof end_date === 'string' && UsersValidationUtils.isValidDate(end_date)) {
      endOfPeriod = new Date(end_date);
      endOfPeriod.setHours(23, 59, 59, 999);
    } else {
      endOfPeriod = new Date(startOfPeriod);
      endOfPeriod.setHours(23, 59, 59, 999);
    }

    // ============================================
    // 1️⃣ RÉCUPÉRATION DE L'ÉQUIPE
    // ============================================
    let teamMembers: number[] = [];
    let siteObj: Site | null = null;

    if (!UsersValidationUtils.validateGuid(String(manager))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const managerObj = await User._load(String(manager), true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.SUPERVISOR_NOT_FOUND,
        message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
      });
    }

    const teamData = await OrgHierarchy.getAllTeamMembers(managerObj.getId()!);
    teamMembers = teamData.all_employees_flat.map((u) => u.getId()!);

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
    }

    // ============================================
    // 2️⃣ RÉCUPÉRATION DES SESSIONS DE LA PÉRIODE
    // ============================================
    const sessionConditions: Record<string, any> = {
      session_start_at: {
        [Op.between]: [startOfPeriod, endOfPeriod],
      },
    };

    if (teamMembers.length > 0) {
      sessionConditions.user = { [Op.in]: teamMembers };
    }

    if (siteObj) {
      sessionConditions.site = siteObj.getId();
    }

    const periodSessions = await WorkSessions._list(sessionConditions);

    // ============================================
    // 3️⃣ CALCUL DES JOURS DE LA PÉRIODE
    // ============================================
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    const startDateCalc = new Date(startOfPeriod);
    startDateCalc.setHours(0, 0, 0, 0);

    const endDateCalc = new Date(endOfPeriod);
    endDateCalc.setHours(0, 0, 0, 0);

    const totalDays =
      Math.round((endDateCalc.getTime() - startDateCalc.getTime()) / MS_PER_DAY) + 1;

    // ============================================
    // 4️⃣ ANALYSE PAR JOUR
    // ============================================
    const dailyBreakdown: Array<any> = [];
    const dailyEmployeeData: Map<string, Map<number, any>> = new Map();

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const analysisDate = new Date(startOfPeriod);
    const endOfCalculation = new Date(endOfPeriod);
    endOfCalculation.setHours(0, 0, 0, 0);

    while (analysisDate <= endOfCalculation) {
      const dateKey = analysisDate.toISOString().split('T')[0];
      const dayStart = new Date(analysisDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(analysisDate);
      dayEnd.setHours(23, 59, 59, 999);

      const daySessions = periodSessions?.filter((s) => {
        const sessionStart = s.getSessionStartAt();
        return sessionStart && sessionStart >= dayStart && sessionStart <= dayEnd;
      });

      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;
      let offDayCount = 0;

      const dayEmployeeAnalysis: Map<number, any> = new Map();

      // Analyser chaque employé pour ce jour
      for (const userId of teamMembers) {
        const scheduleResult = await ScheduleResolutionService.getApplicableSchedule(
          userId,
          analysisDate,
        );
        const expectedSchedule = scheduleResult.applicable_schedule;
        const isWorkDay = expectedSchedule?.is_work_day || false;

        const userSession = daySessions?.find((s) => s.getUser() === userId);

        let status: 'present' | 'late' | 'absent' | 'off-day' = 'absent';
        let delayMinutes = 0;
        let clockInTime: Date | null = null;
        let clockOutTime: Date | null = null;
        let workHours = 0;

        if (!isWorkDay) {
          status = 'off-day';
          offDayCount++;
        } else if (userSession) {
          clockInTime = userSession.getSessionStartAt()!;
          clockOutTime = userSession.getSessionEndAt() || null;

          // Calcul heures travaillées
          if (userSession.getTotalWorkDuration()) {
            const matches = userSession
              .getTotalWorkDuration()!
              .match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
            if (matches) {
              const hours = parseInt(matches[1]) || 0;
              const minutes = parseInt(matches[2]) || 0;
              workHours = hours + minutes / 60;
            }
          }

          if (expectedSchedule && expectedSchedule.expected_blocks.length > 0) {
            const firstBlock = expectedSchedule.expected_blocks[0];
            const expectedStartTime = firstBlock.work[0];
            const tolerance = firstBlock.tolerance || 0;

            const clockedTime = AnomalyDetectionService.formatTime(clockInTime);
            const clockedMinutes = ScheduleResolutionService.parseTimeToMinutes(clockedTime);
            const expectedMinutes = ScheduleResolutionService.parseTimeToMinutes(expectedStartTime);

            delayMinutes = clockedMinutes - expectedMinutes;

            if (delayMinutes > tolerance) {
              status = 'late';
              lateCount++;
            } else {
              status = 'present';
              presentCount++;
            }
          } else {
            status = 'present';
            presentCount++;
          }
        } else {
          if (isWorkDay) {
            status = 'absent';
            absentCount++;
          }
        }

        // 🆕 Stocker expectedSchedule pour utilisation ultérieure
        dayEmployeeAnalysis.set(userId, {
          status,
          clock_in_time: clockInTime ? clockInTime.toISOString() : null,
          clock_out_time: clockOutTime ? clockOutTime.toISOString() : null,
          expected_time: expectedSchedule?.expected_blocks[0]?.work[0] || null,
          delay_minutes: delayMinutes > 0 ? delayMinutes : null,
          work_hours: workHours > 0 ? workHours : null,
          date: dateKey, // 🆕 Ajouter la date pour enrichDailyDetail
        });
      }

      dailyEmployeeData.set(dateKey, dayEmployeeAnalysis);

      const dayOfWeek = analysisDate.getDay();

      dailyBreakdown.push({
        date: dateKey,
        day_of_week: dayNames[dayOfWeek],
        expected_count: teamMembers.length - offDayCount,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        off_day: offDayCount,
      });

      analysisDate.setDate(analysisDate.getDate() + 1);
    }

    // ============================================
    // 5️⃣ STATISTIQUES PAR EMPLOYÉ (🆕 ENRICHIES)
    // ============================================
    const employeesData: Array<any> = [];

    for (const userId of teamMembers) {
      const employee = await User._load(userId);
      if (!employee) continue;

      let workDaysExpected = 0;
      let presentDays = 0;
      let lateDays = 0;
      let absentDays = 0;
      let offDays = 0;
      let totalDelayMinutes = 0;
      let maxDelayMinutes = 0;
      let totalWorkHours = 0;
      let totalPauseMinutes = 0; // 🆕 Pour calculer effective_presence

      // Parcourir tous les jours de la période
      for (const [dateKey, dayData] of dailyEmployeeData.entries()) {
        const employeeDayData = dayData.get(userId);
        if (!employeeDayData) continue;

        const { status, delay_minutes, work_hours } = employeeDayData;

        if (status === 'present') {
          presentDays++;
          workDaysExpected++;
        } else if (status === 'late') {
          lateDays++;
          workDaysExpected++;
          if (delay_minutes) {
            totalDelayMinutes += delay_minutes;
            maxDelayMinutes = Math.max(maxDelayMinutes, delay_minutes);
          }
        } else if (status === 'absent') {
          absentDays++;
          workDaysExpected++;
        } else if (status === 'off-day') {
          offDays++;
        }

        if (work_hours) {
          totalWorkHours += work_hours;
        }

        // 🆕 Calculer totalPauseMinutes si disponible
        // (À adapter selon votre structure de données)
        // Pour l'instant on laisse à 0, mais vous pouvez l'extraire des sessions
      }

      const attendanceRate =
        workDaysExpected > 0 ? ((presentDays + lateDays) / workDaysExpected) * 100 : 0;

      const punctualityRate =
        presentDays + lateDays > 0 ? (presentDays / (presentDays + lateDays)) * 100 : 0;

      const averageDelayMinutes = lateDays > 0 ? totalDelayMinutes / lateDays : 0;

      const averageWorkHours =
        presentDays + lateDays > 0 ? totalWorkHours / (presentDays + lateDays) : 0;

      // 🆕 CONSTRUCTION ENRICHIE DE employeeData
      const employeeData: any = {
        employee: await employee.toJSON(responseValue.MINIMAL),
        period_stats: {
          work_days_expected: workDaysExpected,
          present_days: presentDays,
          late_days: lateDays,
          absent_days: absentDays,
          off_days: offDays,

          total_delay_minutes: totalDelayMinutes,
          average_delay_minutes: parseFloat(averageDelayMinutes.toFixed(1)),
          max_delay_minutes: maxDelayMinutes,

          total_work_hours: parseFloat(totalWorkHours.toFixed(2)),
          average_work_hours_per_day: parseFloat(averageWorkHours.toFixed(2)),

          attendance_rate: parseFloat(attendanceRate.toFixed(2)),
          punctuality_rate: parseFloat(punctualityRate.toFixed(2)),
        },

        // 🆕 VALEUR 1: Présence effective
        effective_presence: Statistique.calculateEffectivePresence(
          totalWorkHours,
          totalPauseMinutes,
          presentDays,
          lateDays,
        ),
      };

      // 🆕 ENRICHIR daily_details avec is_within_tolerance
      if (exclude !== 'daily_details') {
        const enrichedDailyDetails: Array<any> = [];

        for (const [dateKey, dayData] of dailyEmployeeData.entries()) {
          const employeeDayData = dayData.get(userId);
          if (!employeeDayData) continue;

          // Récupérer le schedule pour ce jour
          const dateForSchedule = new Date(dateKey);
          const scheduleResult = await ScheduleResolutionService.getApplicableSchedule(
            userId,
            dateForSchedule,
          );

          // Enrichir avec is_within_tolerance
          const enrichedDay = Statistique.enrichDailyDetail(
            employeeDayData,
            scheduleResult.applicable_schedule,
          );

          enrichedDailyDetails.push(enrichedDay);
        }

        employeeData.daily_details = enrichedDailyDetails;
      }

      employeesData.push(employeeData);
    }

    // ============================================
    // 6️⃣ CALCUL DES STATISTIQUES GLOBALES (🆕 ENRICHIES)
    // ============================================
    let totalPresentOnTime = 0;
    let totalLateArrivals = 0;
    let totalAbsences = 0;
    let totalOffDays = 0;
    let totalDelayMinutes = 0;
    let totalWorkHours = 0;

    employeesData.forEach((emp) => {
      totalPresentOnTime += emp.period_stats.present_days;
      totalLateArrivals += emp.period_stats.late_days;
      totalAbsences += emp.period_stats.absent_days;
      totalOffDays += emp.period_stats.off_days;
      totalDelayMinutes += emp.period_stats.total_delay_minutes;
      totalWorkHours += emp.period_stats.total_work_hours;
    });

    const totalExpectedWorkdays = employeesData.reduce(
      (sum, emp) => sum + emp.period_stats.work_days_expected,
      0,
    );

    const attendanceRate =
      totalExpectedWorkdays > 0
        ? ((totalPresentOnTime + totalLateArrivals) / totalExpectedWorkdays) * 100
        : 0;

    const punctualityRate =
      totalPresentOnTime + totalLateArrivals > 0
        ? (totalPresentOnTime / (totalPresentOnTime + totalLateArrivals)) * 100
        : 0;

    const averageDelayMinutes = totalLateArrivals > 0 ? totalDelayMinutes / totalLateArrivals : 0;

    const averageWorkHoursPerDay =
      totalPresentOnTime + totalLateArrivals > 0
        ? totalWorkHours / (totalPresentOnTime + totalLateArrivals)
        : 0;

    // Compter les sessions actives actuellement
    const currentlySessions = await WorkSessions._list({
      user: { [Op.in]: teamMembers },
      session_end_at: null,
    });

    const currentlyActive = currentlySessions?.filter((s) => s.isActive()).length || 0;

    let currentlyOnPause = 0;
    if (currentlySessions) {
      for (const session of currentlySessions) {
        const pauseStatus = await session.getPauseStatusDetailed();
        if (pauseStatus?.is_on_pause) {
          currentlyOnPause++;
        }
      }
    }

    // 🆕 CALCULS DES NOUVELLES STATISTIQUES GLOBALES
    // ============================================

    // 🆕 VALEUR 2: Couverture équipe temps réel
    const team_coverage = await Statistique.calculateTeamCoverage(
      employeesData,
      currentlyActive,
      currentlyOnPause,
    );

    // 🆕 VALEUR 3: Analyse durée des sessions
    const session_analysis = await Statistique.analyzeSessionDurations(employeesData);

    // 🆕 VALEUR 4: Analyse des justifications
    const justification_status = await Statistique.analyzeJustifications(
      totalAbsences,
      teamMembers,
      startOfPeriod,
      endOfPeriod,
    );

    // 🆕 VALEUR 5: Conformité aux horaires
    const schedule_compliance = Statistique.calculateScheduleCompliance(employeesData);

    // ============================================
    // 7️⃣ RÉPONSE FINALE (🆕 ENRICHIE)
    // ============================================
    return R.handleSuccess(res, {
      message: 'Period attendance retrieved successfully',
      data: {
        period: {
          start: startOfPeriod.toISOString().split('T')[0],
          end: endOfPeriod.toISOString().split('T')[0],
          total_days: totalDays,
        },

        filters: {
          manager_guid: managerObj?.getGuid() || null,
          site_guid: siteObj?.getGuid() || null,
        },

        summary: {
          // ========================================
          // STATS EXISTANTES (inchangées)
          // ========================================
          total_team_members: teamMembers.length,

          total_present_on_time: totalPresentOnTime,
          total_late_arrivals: totalLateArrivals,
          total_absences: totalAbsences,
          total_off_days: totalOffDays,
          total_expected_workdays: totalExpectedWorkdays,

          attendance_rate: parseFloat(attendanceRate.toFixed(2)),
          punctuality_rate: parseFloat(punctualityRate.toFixed(2)),
          average_delay_minutes: parseFloat(averageDelayMinutes.toFixed(1)),

          total_work_hours: parseFloat(totalWorkHours.toFixed(2)),
          average_work_hours_per_day: parseFloat(averageWorkHoursPerDay.toFixed(2)),

          currently_active: currentlyActive,
          currently_on_pause: currentlyOnPause,

          // ========================================
          // 🆕 NOUVELLES STATISTIQUES
          // ========================================
          team_coverage, // Valeur 2: Couverture temps réel
          session_analysis, // Valeur 3: Analyse sessions
          justification_status, // Valeur 4: Statut justifications
          schedule_compliance, // Valeur 5: Conformité horaires
        },

        daily_breakdown: dailyBreakdown,

        employees: employeesData,
      },
    });
  } catch (error: any) {
    console.error('[Attendance Period] Error:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'attendance_period_failed',
      message: error.message || 'Failed to retrieve period attendance',
    });
  }
});

/**
 * GET /api/users/attendance/daily
 * 📊 Vue détaillée des pointages par employé sur la journée
 *
 * Query params:
 * - manager: string (GUID du manager, requis)
 * - date: string (YYYY-MM-DD, défaut: aujourd'hui)
 * - employee?: string (GUID de l'employé, optionnel - si fourni, retourne 1 seul employé)
 * - include_history?: boolean (inclure punch_history détaillé, défaut: true)
 * - site?: string (GUID du site, filtre optionnel)
 *
 * Cas d'usage:
 * - Vue d'ensemble équipe : ?manager=xxx
 * - Détail d'un employé : ?manager=xxx&employee=yyy
 * - Export léger : ?manager=xxx&include_history=false
 */
router.get('/attendance/daily', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager, date, employee, include_history = 'true', site } = req.query;

    // ============================================
    // 1️⃣ VALIDATION DU MANAGER
    // ============================================
    if (!manager || !UsersValidationUtils.validateGuid(String(manager))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const managerObj = await User._load(String(manager), true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.SUPERVISOR_NOT_FOUND,
        message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
      });
    }

    // ============================================
    // 2️⃣ GESTION DE LA DATE (UN SEUL JOUR)
    // ============================================
    let targetDate: Date;

    if (typeof date === 'string' && UsersValidationUtils.isValidDate(date)) {
      targetDate = new Date(date);
    } else {
      targetDate = TimezoneConfigUtils.getCurrentTime();
    }

    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const dateStr = targetDate.toISOString().split('T')[0];

    const includeHistory = String(include_history).toLowerCase() === 'true';

    // ============================================
    // 3️⃣ RÉCUPÉRATION DE L'ÉQUIPE
    // ============================================
    let targetEmployees: number[];

    if (employee) {
      // Cas spécifique : 1 seul employé
      if (!UsersValidationUtils.validateGuid(String(employee))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.VALIDATION_FAILED,
          message: USERS_ERRORS.GUID_INVALID,
        });
      }

      const employeeObj = await User._load(String(employee), true);
      if (!employeeObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.USER_NOT_FOUND,
          message: USERS_ERRORS.NOT_FOUND,
        });
      }

      // Vérifier que l'employé fait partie de l'équipe
      const isInTeam = await OrgHierarchy.isUserInHierarchy(
        employeeObj.getId()!,
        managerObj.getId()!,
      );

      if (!isInTeam) {
        return R.handleError(res, HttpStatus.FORBIDDEN, {
          code: USERS_CODES.AUTHORIZATION_FAILED,
          message: 'Employee is not in manager team',
        });
      }

      targetEmployees = [employeeObj.getId()!];
    } else {
      // Toute l'équipe
      const teamData = await OrgHierarchy.getAllTeamMembers(managerObj.getId()!);
      targetEmployees = teamData.all_employees_flat.map((u) => u.getId()!);
    }

    if (targetEmployees.length === 0) {
      return R.handleSuccess(res, {
        date: dateStr,
        filters: {
          manager_guid: managerObj.getGuid(),
          employee_guid: employee || null,
          site_guid: site || null,
        },
        total_employees: 0,
        employees: [],
      });
    }

    // ============================================
    // 4️⃣ FILTRAGE PAR SITE (OPTIONNEL)
    // ============================================
    let siteObj: Site | null = null;

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
    }

    // ============================================
    // 5️⃣ RÉCUPÉRATION DES SESSIONS DU JOUR
    // ============================================
    const sessionConditions: Record<string, any> = {
      session_start_at: {
        [Op.between]: [dayStart, dayEnd],
      },
      user: { [Op.in]: targetEmployees },
    };

    if (siteObj) {
      sessionConditions.site = siteObj.getId();
    }

    const daySessions = await WorkSessions._list(sessionConditions);

    // ============================================
    // 6️⃣ ANALYSE DÉTAILLÉE PAR EMPLOYÉ
    // ============================================
    const employeesData: Array<any> = [];

    for (const userId of targetEmployees) {
      const employeeObj = await User._load(userId);
      if (!employeeObj) continue;

      // ========================================
      // A. Récupérer le schedule attendu
      // ========================================
      const scheduleResult = await ScheduleResolutionService.getApplicableSchedule(
        userId,
        targetDate,
      );
      const expectedSchedule = scheduleResult.applicable_schedule;
      const isWorkDay = expectedSchedule?.is_work_day || false;

      // ========================================
      // B. Récupérer la/les session(s)
      // ========================================
      const userSessions = daySessions?.filter((s) => s.getUser() === userId) || [];

      // ========================================
      // C. Déterminer le statut global
      // ========================================
      let dailyStatus: any = {
        status: 'ABSENT',
        is_work_day: isWorkDay,
        scheduled_start: null,
        actual_start: null,
        delay_minutes: null,
        is_within_tolerance: null,
        tolerance_minutes: null,
      };

      let workHours: any = {
        total_hours: 0,
        total_pause_minutes: 0,
        net_work_hours: 0,
        expected_hours: 0,
      };

      let punchHistory: Array<any> = [];
      let sessionsInfo: Array<any> = [];
      let anomalies: Array<any> = [];

      // ========================================
      // D. Cas OFF_DUTY
      // ========================================
      if (!isWorkDay) {
        dailyStatus.status = 'OFF_DUTY';
      }
      // ========================================
      // E. Cas PRESENT/LATE
      // ========================================
      else if (userSessions.length > 0) {
        const firstSession = userSessions[0];
        const clockInTime = firstSession.getSessionStartAt()!;

        dailyStatus.actual_start = AnomalyDetectionService.formatTime(clockInTime);

        // Calculer retard si schedule existe
        if (expectedSchedule && expectedSchedule.expected_blocks.length > 0) {
          const firstBlock = expectedSchedule.expected_blocks[0];
          dailyStatus.scheduled_start = firstBlock.work[0];
          dailyStatus.tolerance_minutes = firstBlock.tolerance || 0;

          const clockedMinutes = ScheduleResolutionService.parseTimeToMinutes(
            dailyStatus.actual_start,
          );
          const expectedMinutes = ScheduleResolutionService.parseTimeToMinutes(
            dailyStatus.scheduled_start,
          );

          const delay = clockedMinutes - expectedMinutes;
          dailyStatus.delay_minutes = delay > 0 ? delay : 0;
          dailyStatus.is_within_tolerance = delay <= dailyStatus.tolerance_minutes;

          if (delay > dailyStatus.tolerance_minutes) {
            dailyStatus.status = 'LATE';
            anomalies.push({
              type: 'LATE_ARRIVAL',
              severity: 'warning',
              description: `Arrivée ${delay} min après l'heure prévue (tolérance: ${dailyStatus.tolerance_minutes} min)`,
            });
          } else {
            dailyStatus.status = 'PRESENT';
          }

          // Calculer heures attendues
          workHours.expected_hours = expectedSchedule.expected_blocks.reduce((sum, block) => {
            const startMinutes = ScheduleResolutionService.parseTimeToMinutes(block.work[0]);
            const endMinutes = ScheduleResolutionService.parseTimeToMinutes(block.work[1]);
            return sum + (endMinutes - startMinutes) / 60;
          }, 0);
        } else {
          dailyStatus.status = 'PRESENT';
        }

        // ========================================
        // F. Calculer heures travaillées
        // ========================================
        let totalWorkMinutes = 0;
        let totalPauseMinutes = 0;

        for (const session of userSessions) {
          // Heures de travail
          if (session.getTotalWorkDuration()) {
            const matches = session
              .getTotalWorkDuration()!
              .match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
            if (matches) {
              const hours = parseInt(matches[1]) || 0;
              const minutes = parseInt(matches[2]) || 0;
              totalWorkMinutes += hours * 60 + minutes;
            }
          }

          // Temps de pause
          const pauseMinutes = await session.getTotalPauseTime();
          totalPauseMinutes += pauseMinutes;

          // ========================================
          // G. Construire punch_history
          // ========================================

          if (includeHistory) {
            // ✅ CORRECT : Chercher les TimeEntries qui référencent cette session

            const sessionEntries = await TimeEntries._listBySession(session.getId()!);

            if (sessionEntries && sessionEntries.length > 0) {
              for (const entry of sessionEntries) {
                punchHistory.push({
                  timestamp: entry.getClockedAt()?.toISOString(),
                  punch_type: entry.getPointageType(),
                  location: {
                    name: (await entry.getSiteObj())?.getName(),
                    latitude: entry.getLatitude(),
                    longitude: entry.getLongitude(),
                  },
                });
              }
            } else {
              // Fallback si pas de TimeEntries enregistrées
              punchHistory.push({
                timestamp: session.getSessionStartAt()!.toISOString(),
                punch_type: PointageType.CLOCK_IN,
                location: {
                  name: 'Unknown',
                  latitude: session.getStartLatitude(),
                  longitude: session.getStartLongitude(),
                },
              });

              if (session.getSessionEndAt()) {
                punchHistory.push({
                  timestamp: session.getSessionEndAt()!.toISOString(),
                  punch_type: PointageType.CLOCK_OUT,
                  location: {
                    name: 'Unknown',
                    latitude: session.getEndLatitude(),
                    longitude: session.getEndLongitude(),
                  },
                });
              }
            }
          }

          // ========================================
          // H. Info session
          // ========================================
          const sessionSite = await session.getSiteObj();
          const pauseStatus = await session.getPauseStatusDetailed();

          sessionsInfo.push({
            session_guid: session.getGuid(),
            is_active: session.isActive(),
            started_at: session.getSessionStartAt()?.toISOString(),
            ended_at: session.getSessionEndAt()?.toISOString() || null,
            site: sessionSite
              ? {
                  guid: sessionSite.getGuid(),
                  name: sessionSite.getName(),
                }
              : null,
            is_on_pause: pauseStatus?.is_on_pause || false,
            current_pause_duration_minutes: pauseStatus?.current_pause_duration_minutes || null,
          });
        }

        workHours.total_hours = parseFloat((totalWorkMinutes / 60).toFixed(2));
        workHours.total_pause_minutes = totalPauseMinutes;
        workHours.net_work_hours = parseFloat(
          ((totalWorkMinutes - totalPauseMinutes) / 60).toFixed(2),
        );

        // ========================================
        // I. Détecter anomalies supplémentaires
        // ========================================
        if (workHours.total_hours < 4 && dailyStatus.status !== 'OFF_DUTY') {
          anomalies.push({
            type: 'SHORT_SESSION',
            severity: 'info',
            description: `Session courte (${workHours.total_hours}h)`,
          });
        }

        if (!userSessions[0].getSessionEndAt()) {
          anomalies.push({
            type: 'INCOMPLETE_SESSION',
            severity: 'warning',
            description: 'Session non clôturée',
          });
        }
      }
      // ========================================
      // J. Cas ABSENT
      // ========================================
      else if (isWorkDay) {
        dailyStatus.status = 'ABSENT';

        if (expectedSchedule && expectedSchedule.expected_blocks.length > 0) {
          dailyStatus.scheduled_start = expectedSchedule.expected_blocks[0].work[0];

          workHours.expected_hours = expectedSchedule.expected_blocks.reduce((sum, block) => {
            const startMinutes = ScheduleResolutionService.parseTimeToMinutes(block.work[0]);
            const endMinutes = ScheduleResolutionService.parseTimeToMinutes(block.work[1]);
            return sum + (endMinutes - startMinutes) / 60;
          }, 0);
        }

        anomalies.push({
          type: 'ABSENCE',
          severity: 'error',
          description: 'Aucun pointage enregistré',
        });
      }

      // ========================================
      // K. Trier punch_history chronologiquement
      // ========================================
      if (includeHistory) {
        punchHistory.sort((a, b) => {
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });
      }

      // ========================================
      // L. Construire l'objet final
      // ========================================
      const employeeData: any = {
        employee: {
          guid: employeeObj.getGuid(),
          first_name: employeeObj.getFirstName(),
          last_name: employeeObj.getLastName(),
          employee_code: employeeObj.getEmployeeCode(),
          avatar_url: employeeObj.getAvatarUrl(),
          department: employeeObj.getDepartment(),
          job_title: employeeObj.getJobTitle(),
        },
        daily_status: dailyStatus,
        work_hours: workHours,
        sessions: sessionsInfo,
        anomalies: anomalies.length > 0 ? anomalies : null,
      };

      if (includeHistory) {
        employeeData.punch_history = punchHistory;
      }

      employeesData.push(employeeData);
    }

    // ============================================
    // 7️⃣ RÉPONSE FINALE
    // ============================================
    return R.handleSuccess(res, {
      date: dateStr,
      timestamp: TimezoneConfigUtils.getCurrentTime().toISOString(),
      filters: {
        manager_guid: managerObj.getGuid(),
        employee_guid: employee || null,
        site_guid: siteObj?.getGuid() || null,
        include_history: includeHistory,
      },
      total_employees: employeesData.length,
      employees: employeesData,
    });
  } catch (error: any) {
    console.error('[Attendance Daily] Error:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'attendance_daily_failed',
      message: error.message || 'Failed to retrieve daily attendance',
    });
  }
});

/**
 * GET /api/users/attendance/summary
 * 📊 Résumé statistique journalier pour vue d'ensemble rapide
 *
 * Query params:
 * - date: string (YYYY-MM-DD, défaut: aujourd'hui)
 * - manager: string (GUID du manager, requis)
 * - site?: string (GUID du site, optionnel)
 */
router.get('/attendance/summary', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager, site, date } = req.query;

    // ============================================
    // 1️⃣ VALIDATION DU MANAGER
    // ============================================
    if (!manager || !UsersValidationUtils.validateGuid(String(manager))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const managerObj = await User._load(String(manager), true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.SUPERVISOR_NOT_FOUND,
        message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
      });
    }

    // ============================================
    // 2️⃣ GESTION DE LA DATE (UN SEUL JOUR)
    // ============================================
    let targetDate: Date;

    if (typeof date === 'string' && UsersValidationUtils.isValidDate(date)) {
      targetDate = new Date(date);
    } else {
      targetDate = TimezoneConfigUtils.getCurrentTime();
    }

    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const dateStr = targetDate.toISOString().split('T')[0];

    // ============================================
    // 3️⃣ RÉCUPÉRATION DE L'ÉQUIPE
    // ============================================
    const teamData = await OrgHierarchy.getAllTeamMembers(managerObj.getId()!);
    const teamMembers = teamData.all_employees_flat.map((u) => u.getId()!);

    if (teamMembers.length === 0) {
      return R.handleSuccess(res, {
        date: dateStr,
        timestamp: TimezoneConfigUtils.getCurrentTime().toISOString(),
        summary: {
          total_expected: 0,
          total_present: 0,
          total_absent: 0,
          total_late: 0,
          total_off_duty: 0,
          attendance_rate: 0,
          punctuality_rate: 0,
          currently_active: 0,
          currently_on_pause: 0,
          coverage_rate: 0,
        },
      });
    }

    // ============================================
    // 4️⃣ FILTRAGE PAR SITE (OPTIONNEL)
    // ============================================
    let siteObj: Site | null = null;

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
    }

    // ============================================
    // 5️⃣ RÉCUPÉRATION DES SESSIONS DU JOUR
    // ============================================
    const sessionConditions: Record<string, any> = {
      session_start_at: {
        [Op.between]: [dayStart, dayEnd],
      },
      user: { [Op.in]: teamMembers },
    };

    if (siteObj) {
      sessionConditions.site = siteObj.getId();
    }

    const daySessions = await WorkSessions._list(sessionConditions);

    // ============================================
    // 6️⃣ CALCUL DES STATUTS PAR EMPLOYÉ
    // ============================================
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let offDayCount = 0;

    for (const userId of teamMembers) {
      const scheduleResult = await ScheduleResolutionService.getApplicableSchedule(
        userId,
        targetDate,
      );
      const expectedSchedule = scheduleResult.applicable_schedule;
      const isWorkDay = expectedSchedule?.is_work_day || false;

      if (!isWorkDay) {
        offDayCount++;
        continue;
      }

      const userSession = daySessions?.find((s) => s.getUser() === userId);

      if (!userSession) {
        absentCount++;
        continue;
      }

      // Vérifier si en retard
      const clockInTime = userSession.getSessionStartAt()!;

      if (expectedSchedule && expectedSchedule.expected_blocks.length > 0) {
        const firstBlock = expectedSchedule.expected_blocks[0];
        const expectedStartTime = firstBlock.work[0];
        const tolerance = firstBlock.tolerance || 0;

        const clockedTime = AnomalyDetectionService.formatTime(clockInTime);
        const clockedMinutes = ScheduleResolutionService.parseTimeToMinutes(clockedTime);
        const expectedMinutes = ScheduleResolutionService.parseTimeToMinutes(expectedStartTime);

        const delayMinutes = clockedMinutes - expectedMinutes;

        if (delayMinutes > tolerance) {
          lateCount++;
        } else {
          presentCount++;
        }
      } else {
        presentCount++;
      }
    }

    const totalExpected = teamMembers.length - offDayCount;

    // ============================================
    // 7️⃣ CALCUL DES SESSIONS ACTIVES (TEMPS RÉEL)
    // ============================================
    const currentlySessions = await WorkSessions._list({
      user: { [Op.in]: teamMembers },
      session_end_at: null,
    });

    const currentlyActive = currentlySessions?.filter((s) => s.isActive()).length || 0;

    let currentlyOnPause = 0;
    if (currentlySessions) {
      for (const session of currentlySessions) {
        const pauseStatus = await session.getPauseStatusDetailed();
        if (pauseStatus?.is_on_pause) {
          currentlyOnPause++;
        }
      }
    }

    // ============================================
    // 8️⃣ CALCUL DES TAUX
    // ============================================
    const attendanceRate =
      totalExpected > 0 ? ((presentCount + lateCount) / totalExpected) * 100 : 0;

    const punctualityRate =
      presentCount + lateCount > 0 ? (presentCount / (presentCount + lateCount)) * 100 : 0;

    const coverageRate = totalExpected > 0 ? (currentlyActive / totalExpected) * 100 : 0;

    // ============================================
    // 9️⃣ RÉPONSE FINALE
    // ============================================
    return R.handleSuccess(res, {
      date: dateStr,
      timestamp: TimezoneConfigUtils.getCurrentTime().toISOString(),
      filters: {
        manager_guid: managerObj.getGuid(),
        site_guid: siteObj?.getGuid() || null,
      },
      summary: {
        total_expected: totalExpected,
        total_present: presentCount,
        total_absent: absentCount,
        total_late: lateCount,
        total_off_duty: offDayCount,

        attendance_rate: parseFloat(attendanceRate.toFixed(2)),
        punctuality_rate: parseFloat(punctualityRate.toFixed(2)),

        currently_active: currentlyActive,
        currently_on_pause: currentlyOnPause,
        coverage_rate: parseFloat(coverageRate.toFixed(2)),
      },
    });
  } catch (error: any) {
    console.error('[Attendance Summary] Error:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'attendance_summary_failed',
      message: error.message || 'Failed to retrieve attendance summary',
    });
  }
});

/**
 * GET /api/users/attendance/timeline
 * 📋 Journal chronologique des pointages du jour
 *
 * Query params:
 * - date: string (YYYY-MM-DD, défaut: aujourd'hui)
 * - manager: string (GUID du manager, requis)
 * - employee?: string (GUID de l'employé, optionnel - filtre)
 * - punch_type?: string (CLOCK_IN,CLOCK_OUT,PAUSE_START,PAUSE_END,EXTERNAL_MISSION - filtre)
 * - site?: string (GUID du site, optionnel - filtre)
 */
router.get('/attendance/timeline', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager, site, date, employee, punch_type } = req.query;

    // ============================================
    // 1️⃣ VALIDATION DU MANAGER
    // ============================================
    if (!manager || !UsersValidationUtils.validateGuid(String(manager))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const managerObj = await User._load(String(manager), true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.SUPERVISOR_NOT_FOUND,
        message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
      });
    }

    // ============================================
    // 2️⃣ GESTION DE LA DATE
    // ============================================
    let targetDate: Date;

    if (typeof date === 'string' && UsersValidationUtils.isValidDate(date)) {
      targetDate = new Date(date);
    } else {
      targetDate = TimezoneConfigUtils.getCurrentTime();
    }

    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const dateStr = targetDate.toISOString().split('T')[0];

    // ============================================
    // 3️⃣ RÉCUPÉRATION DE L'ÉQUIPE
    // ============================================
    let teamMembers: number[];

    if (employee) {
      // Filtre par employé spécifique
      if (!UsersValidationUtils.validateGuid(String(employee))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.VALIDATION_FAILED,
          message: USERS_ERRORS.GUID_INVALID,
        });
      }

      const employeeObj = await User._load(String(employee), true);
      if (!employeeObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.USER_NOT_FOUND,
          message: USERS_ERRORS.NOT_FOUND,
        });
      }

      teamMembers = [employeeObj.getId()!];
    } else {
      // Toute l'équipe
      const teamData = await OrgHierarchy.getAllTeamMembers(managerObj.getId()!);
      teamMembers = teamData.all_employees_flat.map((u) => u.getId()!);
    }

    // ============================================
    // 4️⃣ RÉCUPÉRATION DES SESSIONS DU JOUR
    // ============================================
    const sessionConditions: Record<string, any> = {
      session_start_at: {
        [Op.between]: [dayStart, dayEnd],
      },
      user: { [Op.in]: teamMembers },
    };

    if (site) {
      if (!WorkSessionsValidationUtils.validateGuid(String(site))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: WORK_SESSIONS_CODES.INVALID_GUID,
          message: WORK_SESSIONS_ERRORS.GUID_INVALID,
        });
      }

      const siteObj = await Site._load(String(site), true);
      if (!siteObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: WORK_SESSIONS_CODES.SITE_NOT_FOUND,
          message: SITES_ERRORS.NOT_FOUND,
        });
      }

      sessionConditions.site = siteObj.getId();
    }

    const daySessions = await WorkSessions._list(sessionConditions);

    if (!daySessions || daySessions.length === 0) {
      return R.handleSuccess(res, {
        date: dateStr,
        filters: {
          manager_guid: managerObj.getGuid(),
          employee_guid: employee || null,
          punch_type: punch_type || null,
          site_guid: site || null,
        },
        total_events: 0,
        events: [],
      });
    }

    // ============================================
    // 5️⃣ CONSTRUCTION DE LA TIMELINE
    // ============================================
    const timelineEvents: Array<any> = [];

    for (const session of daySessions) {
      const employeeObj = await User._load(session.getUser()!);
      if (!employeeObj) continue;

      const siteObj = await session.getSiteObj();

      const sessionEntries = await TimeEntries._listBySession(session.getId()!);

      if (sessionEntries && sessionEntries.length > 0) {
        // Ajouter chaque TimeEntry
        for (const entry of sessionEntries) {
          timelineEvents.push({
            timestamp: entry.getClockedAt()?.toISOString(),
            employee: {
              guid: employeeObj.getGuid(),
              first_name: employeeObj.getFirstName(),
              last_name: employeeObj.getLastName(),
              avatar_url: employeeObj.getAvatarUrl(),
            },
            punch_type: entry.getPointageType(),
            location: {
              name: (await entry.getSiteObj())?.getName() || 'Unknown',
              latitude: entry.getLatitude(),
              longitude: entry.getLongitude(),
            },
            session_guid: session.getGuid(),
          });
        }
      } else {
        // ⚠️ FALLBACK : Aucun TimeEntry trouvé
        // Reconstruire les événements minimaux depuis les données de session

        // Événement CLOCK_IN (début de session)
        timelineEvents.push({
          timestamp: session.getSessionStartAt()!.toISOString(),
          employee: {
            guid: employeeObj.getGuid(),
            first_name: employeeObj.getFirstName(),
            last_name: employeeObj.getLastName(),
            avatar_url: employeeObj.getAvatarUrl(),
          },
          punch_type: PointageType.CLOCK_IN,
          location: {
            name: siteObj?.getName() || 'Unknown',
            latitude: session.getStartLatitude(),
            longitude: session.getStartLongitude(),
          },
          session_guid: session.getGuid(),
        });

        // Événement CLOCK_OUT (fin de session, si elle est terminée)
        if (session.getSessionEndAt()) {
          timelineEvents.push({
            timestamp: session.getSessionEndAt()!.toISOString(),
            employee: {
              guid: employeeObj.getGuid(),
              first_name: employeeObj.getFirstName(),
              last_name: employeeObj.getLastName(),
              avatar_url: employeeObj.getAvatarUrl(),
            },
            punch_type: PointageType.CLOCK_OUT,
            location: {
              name: siteObj?.getName() || 'Unknown',
              latitude: session.getEndLatitude(),
              longitude: session.getEndLongitude(),
            },
            session_guid: session.getGuid(),
          });
        }
      }
    }

    // ============================================
    // 6️⃣ FILTRAGE PAR TYPE DE POINTAGE
    // ============================================
    let filteredEvents = timelineEvents;

    if (punch_type) {
      const types = String(punch_type).split(',');
      filteredEvents = timelineEvents.filter((event) => types.includes(event.punch_type));
    }

    // ============================================
    // 7️⃣ TRI CHRONOLOGIQUE (ANCIEN → RÉCENT)
    // ============================================
    filteredEvents.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    // ============================================
    // 8️⃣ RÉPONSE FINALE
    // ============================================
    return R.handleSuccess(res, {
      date: dateStr,
      filters: {
        manager_guid: managerObj.getGuid(),
        employee_guid: employee || null,
        punch_type: punch_type || null,
        site_guid: site || null,
      },
      total_events: filteredEvents.length,
      events: filteredEvents,
    });
  } catch (error: any) {
    console.error('[Attendance Timeline] Error:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'attendance_timeline_failed',
      message: error.message || 'Failed to retrieve attendance timeline',
    });
  }
});

/**
 * GET /api/users/attendance/employees
 * 👥 Liste des employés avec leur statut du jour + filtres + tri
 *
 * Query params:
 * - date: string (YYYY-MM-DD, défaut: aujourd'hui)
 * - manager: string (GUID du manager, requis)
 * - status?: string (LATE,PRESENT,ABSENT,OFF_DUTY - filtre, peut être multiple séparé par virgule)
 * - site?: string (GUID du site, optionnel - filtre)
 * - sort?: string (delay_desc, delay_asc, name_asc, name_desc - défaut: delay_desc pour US4)
 * - limit?: number (nombre max de résultats, défaut: illimité)
 */
router.get('/attendance/employees', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager, site, date, status, sort = 'delay_desc', limit } = req.query;

    // ============================================
    // 1️⃣ VALIDATION DU MANAGER
    // ============================================
    if (!manager || !UsersValidationUtils.validateGuid(String(manager))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.VALIDATION_FAILED,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const managerObj = await User._load(String(manager), true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.SUPERVISOR_NOT_FOUND,
        message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
      });
    }

    // ============================================
    // 2️⃣ GESTION DE LA DATE
    // ============================================
    let targetDate: Date;

    if (typeof date === 'string' && UsersValidationUtils.isValidDate(date)) {
      targetDate = new Date(date);
    } else {
      targetDate = TimezoneConfigUtils.getCurrentTime();
    }

    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const dateStr = targetDate.toISOString().split('T')[0];

    // ============================================
    // 3️⃣ RÉCUPÉRATION DE L'ÉQUIPE
    // ============================================
    const teamData = await OrgHierarchy.getAllTeamMembers(managerObj.getId()!);
    const teamMembers = teamData.all_employees_flat.map((u) => u.getId()!);

    if (teamMembers.length === 0) {
      return R.handleSuccess(res, {
        date: dateStr,
        filters: { status: status || null },
        total_count: 0,
        employees: [],
      });
    }

    // ============================================
    // 4️⃣ RÉCUPÉRATION DES SESSIONS DU JOUR
    // ============================================
    const sessionConditions: Record<string, any> = {
      session_start_at: {
        [Op.between]: [dayStart, dayEnd],
      },
      user: { [Op.in]: teamMembers },
    };

    if (site) {
      if (!WorkSessionsValidationUtils.validateGuid(String(site))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: WORK_SESSIONS_CODES.INVALID_GUID,
          message: WORK_SESSIONS_ERRORS.GUID_INVALID,
        });
      }

      const siteObj = await Site._load(String(site), true);
      if (!siteObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: WORK_SESSIONS_CODES.SITE_NOT_FOUND,
          message: SITES_ERRORS.NOT_FOUND,
        });
      }

      sessionConditions.site = siteObj.getId();
    }

    const daySessions = await WorkSessions._list(sessionConditions);

    // ============================================
    // 5️⃣ ANALYSE DE CHAQUE EMPLOYÉ
    // ============================================
    const employeeDataList: Array<any> = [];

    for (const userId of teamMembers) {
      const employeeObj = await User._load(userId);
      if (!employeeObj) continue;

      // Récupérer le schedule attendu
      const scheduleResult = await ScheduleResolutionService.getApplicableSchedule(
        userId,
        targetDate,
      );
      const expectedSchedule = scheduleResult.applicable_schedule;
      const isWorkDay = expectedSchedule?.is_work_day || false;

      // Récupérer la session
      const userSession = daySessions?.find((s) => s.getUser() === userId);

      // Déterminer le statut
      let employeeStatus: 'PRESENT' | 'LATE' | 'ABSENT' | 'OFF_DUTY' = 'ABSENT';
      let scheduledTime: string | null = null;
      let actualTime: string | null = null;
      let delayMinutes: number | null = null;
      let isWithinTolerance: boolean | null = null;

      if (!isWorkDay) {
        employeeStatus = 'OFF_DUTY';
      } else if (userSession) {
        const clockInTime = userSession.getSessionStartAt()!;
        actualTime = AnomalyDetectionService.formatTime(clockInTime);

        if (expectedSchedule && expectedSchedule.expected_blocks.length > 0) {
          const firstBlock = expectedSchedule.expected_blocks[0];
          scheduledTime = firstBlock.work[0];
          const tolerance = firstBlock.tolerance || 0;

          const clockedMinutes = ScheduleResolutionService.parseTimeToMinutes(actualTime);
          const expectedMinutes = ScheduleResolutionService.parseTimeToMinutes(scheduledTime);

          delayMinutes = clockedMinutes - expectedMinutes;
          isWithinTolerance = delayMinutes <= tolerance;

          if (delayMinutes > tolerance) {
            employeeStatus = 'LATE';
          } else {
            employeeStatus = 'PRESENT';
          }
        } else {
          employeeStatus = 'PRESENT';
        }
      } else if (isWorkDay) {
        employeeStatus = 'ABSENT';
        if (expectedSchedule && expectedSchedule.expected_blocks.length > 0) {
          scheduledTime = expectedSchedule.expected_blocks[0].work[0];
        }
      }

      // Vérifier statut session actuelle
      let currentSessionInfo: any = null;

      if (userSession) {
        const pauseStatus = await userSession.getPauseStatusDetailed();

        currentSessionInfo = {
          session_guid: userSession.getGuid(),
          is_active: userSession.isActive(),
          is_on_pause: pauseStatus?.is_on_pause || false,
          current_pause_duration_minutes: pauseStatus?.current_pause_duration_minutes || null,
        };
      }

      // Construire l'objet employé
      employeeDataList.push({
        employee: {
          guid: employeeObj.getGuid(),
          first_name: employeeObj.getFirstName(),
          last_name: employeeObj.getLastName(),
          employee_code: employeeObj.getEmployeeCode(),
          avatar_url: employeeObj.getAvatarUrl(),
          department: employeeObj.getDepartment(),
          job_title: employeeObj.getJobTitle(),
        },
        status: employeeStatus,
        scheduled_time: scheduledTime,
        actual_time: actualTime,
        delay_minutes: delayMinutes,
        is_within_tolerance: isWithinTolerance,
        current_session: currentSessionInfo,
      });
    }

    // ============================================
    // 6️⃣ FILTRAGE PAR STATUT
    // ============================================
    let filteredEmployees = employeeDataList;

    if (status) {
      const statuses = String(status).toUpperCase().split(',');
      filteredEmployees = employeeDataList.filter((emp) => statuses.includes(emp.status));
    }

    // ============================================
    // 7️⃣ TRI
    // ============================================
    if (sort === 'delay_desc') {
      // US4 : Top retards (plus grand retard en premier)
      filteredEmployees.sort((a, b) => {
        const delayA = a.delay_minutes || 0;
        const delayB = b.delay_minutes || 0;
        return delayB - delayA;
      });
    } else if (sort === 'delay_asc') {
      filteredEmployees.sort((a, b) => {
        const delayA = a.delay_minutes || 0;
        const delayB = b.delay_minutes || 0;
        return delayA - delayB;
      });
    } else if (sort === 'name_asc') {
      filteredEmployees.sort((a, b) => {
        return a.employee.last_name.localeCompare(b.employee.last_name);
      });
    } else if (sort === 'name_desc') {
      filteredEmployees.sort((a, b) => {
        return b.employee.last_name.localeCompare(a.employee.last_name);
      });
    }

    // ============================================
    // 8️⃣ LIMITATION (POUR TOP N)
    // ============================================
    if (limit) {
      const limitNumber = parseInt(String(limit), 10);
      if (!isNaN(limitNumber) && limitNumber > 0) {
        filteredEmployees = filteredEmployees.slice(0, limitNumber);
      }
    }

    // ============================================
    // 9️⃣ AJOUT DU RANKING (POUR US4)
    // ============================================
    const employeesWithRank = filteredEmployees.map((emp, index) => ({
      rank: sort === 'delay_desc' && emp.status === 'LATE' ? index + 1 : null,
      ...emp,
    }));

    // ============================================
    // 🔟 RÉPONSE FINALE
    // ============================================
    return R.handleSuccess(res, {
      date: dateStr,
      filters: {
        manager_guid: managerObj.getGuid(),
        status: status || null,
        site_guid: site || null,
        sort: sort,
      },
      total_count: filteredEmployees.length,
      employees: employeesWithRank,
    });
  } catch (error: any) {
    console.error('[Attendance Employees] Error:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'attendance_employees_failed',
      message: error.message || 'Failed to retrieve employee attendance',
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
            employee: await employee.toJSON(),
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
      const currentTime = TimezoneConfigUtils.getCurrentTime();
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
          employee: await employee.toJSON(),
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
        const currentTime = TimezoneConfigUtils.getCurrentTime();
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
          employee: employee ? await employee.toJSON() : null,
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
        timestamp: TimezoneConfigUtils.getCurrentTime(),
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
          reference: tenant.config.reference,
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
        saved.response.data.invitation.guid,
        String(email),
        // expiration_minutes,
      );
    }
    const response = saved.response.data;
    const sendToken = await WapService.sendInvitation(
      response.invitation.guid,
      response.invitation.phone_number,
      countryValue,
      response.links,
    );
    if (sendToken.status !== HttpStatus.SUCCESS) {
      return R.handleError(res, sendToken.status, sendToken.response);
    }

    const result = await InvitationService.sendInvitation(response.invitation.guid);
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

// /**
//  * DELETE /:guid/sessions/:template_guid - Retirer une session template
//  */
// router.delete('/:guid/sessions/:template', Ensure.delete(), async (req: Request, res: Response) => {
//   try {
//     const { guid, template } = req.params;
//
//     if (!UsersValidationUtils.validateGuid(guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: USERS_CODES.INVALID_GUID,
//         message: USERS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     if (!SessionTemplateValidationUtils.validateGuid(template)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: SESSION_TEMPLATE_CODES.INVALID_GUID,
//         message: SESSION_TEMPLATE_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const userObj = await User._load(guid, true);
//     if (!userObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: USERS_CODES.USER_NOT_FOUND,
//         message: USERS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const templateObj = await SessionTemplate._load(template, true);
//     if (!templateObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: SESSION_TEMPLATE_CODES.SESSION_TEMPLATE_NOT_FOUND,
//         message: SESSION_TEMPLATE_ERRORS.NOT_FOUND,
//       });
//     }
//
//     if (!userObj.hasSessionTemplate(templateObj.getId()!)) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: 'session_not_assigned',
//         message: 'This session template is not assigned to this user',
//       });
//     }
//
//     userObj.removeSession(templateObj.getId()!);
//     await userObj.save();
//
//     return R.handleSuccess(res, {
//       message: 'Session template removed successfully',
//       user: await userObj.toJSON(),
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: USERS_CODES.UPDATE_FAILED,
//       message: error.message,
//     });
//   }
// });
//
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
//       if (!UsersValidationUtils.validateGuid(guid)) {
//         return R.handleError(res, HttpStatus.BAD_REQUEST, {
//           code: USERS_CODES.INVALID_GUID,
//           message: USERS_ERRORS.GUID_INVALID,
//         });
//       }
//
//       const userObj = await User._load(guid, true);
//       if (!userObj) {
//         return R.handleError(res, HttpStatus.NOT_FOUND, {
//           code: USERS_CODES.USER_NOT_FOUND,
//           message: USERS_ERRORS.NOT_FOUND,
//         });
//       }
//
//       userObj.deactivateAllSessions();
//       await userObj.save();
//
//       return R.handleSuccess(res, {
//         message: 'All sessions deactivated successfully',
//         user: await userObj.toJSON(),
//       });
//     } catch (error: any) {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: USERS_CODES.UPDATE_FAILED,
//         message: error.message,
//       });
//     }
//   },
// );
//
// /**
//  * GET /:guid/sessions/active - Récupérer la session active d'un utilisateur
//  */
// router.get('/:guid/sessions/active', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const { guid } = req.params;
//
//     if (!UsersValidationUtils.validateGuid(guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: USERS_CODES.INVALID_GUID,
//         message: USERS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const userObj = await User._load(guid, true);
//     if (!userObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: USERS_CODES.USER_NOT_FOUND,
//         message: USERS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const activeSession = userObj.getActiveSession();
//
//     if (!activeSession) {
//       return R.handleSuccess(res, {
//         user: await userObj.toJSON(responseValue.MINIMAL),
//         has_active_session: false,
//         active_session: null,
//         message: 'No active session for this user',
//       });
//     }
//
//     const sessionTemplateObj = await userObj.getSessionTemplateObjs(activeSession.session_template);
//
//     return R.handleSuccess(res, {
//       user: await userObj.toJSON(responseValue.MINIMAL),
//       has_active_session: true,
//       active_session: {
//         template: sessionTemplateObj ? await sessionTemplateObj.toJSON() : null,
//         assigned_at: activeSession.assign_at,
//         active: activeSession.active,
//       },
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: USERS_CODES.SEARCH_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// /**
//  * GET /:guid/sessions/history - Historique des sessions
//  */
// router.get('/:guid/sessions/history', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const { guid } = req.params;
//
//     if (!UsersValidationUtils.validateGuid(guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: USERS_CODES.INVALID_GUID,
//         message: USERS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const userObj = await User._load(guid, true);
//     if (!userObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: USERS_CODES.USER_NOT_FOUND,
//         message: USERS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const history = userObj.getSessionHistory();
//
//     const enrichedHistory = await Promise.all(
//       history.map(async (session) => {
//         const templateObj = await userObj.getSessionTemplateObjs(session.session_template);
//         return {
//           session_template: templateObj ? await templateObj.toJSON() : null,
//           assign_at: session.assign_at,
//           active: session.active,
//         };
//       }),
//     );
//
//     return R.handleSuccess(res, {
//       user: await userObj.toJSON(responseValue.MINIMAL),
//       total_sessions: history.length,
//       active_count: history.filter((s) => s.active).length,
//       inactive_count: history.filter((s) => !s.active).length,
//       sessions_history: enrichedHistory,
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: USERS_CODES.SEARCH_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// /**
//  * GET /sessions/:template_guid/users - Liste utilisateurs par session template
//  */
// router.get('/sessions/:template/users', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const { template } = req.params;
//
//     if (!SessionTemplateValidationUtils.validateGuid(template)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: SESSION_TEMPLATE_CODES.INVALID_GUID,
//         message: SESSION_TEMPLATE_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const templateObj = await SessionTemplate._load(template, true);
//     if (!templateObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: SESSION_TEMPLATE_CODES.SESSION_TEMPLATE_NOT_FOUND,
//         message: SESSION_TEMPLATE_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const paginationOptions = paginationSchema.parse(req.query);
//     const userEntries = await User._listBySessionTemplate(templateObj.getId()!, paginationOptions);
//
//     const users = {
//       pagination: {
//         offset: paginationOptions.offset || 0,
//         limit: paginationOptions.limit || userEntries?.length || 0,
//         count: userEntries?.length || 0,
//       },
//       items: userEntries?.length
//         ? await Promise.all(userEntries.map((user) => user.toJSON(responseValue.MINIMAL)))
//         : [],
//     };
//
//     return R.handleSuccess(res, {
//       session_template: await templateObj.toJSON(),
//       users,
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: USERS_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// /**
//  * GET /sessions/active/list - Liste utilisateurs avec session active
//  */
// router.get('/sessions/active/list', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const paginationOptions = paginationSchema.parse(req.query);
//     const userEntries = await User._listWithActiveSession(paginationOptions);
//
//     const users = {
//       pagination: {
//         offset: paginationOptions.offset || 0,
//         limit: paginationOptions.limit || userEntries?.length || 0,
//         count: userEntries?.length || 0,
//       },
//       items: userEntries?.length ? await Promise.all(userEntries.map((user) => user.toJSON())) : [],
//     };
//
//     return R.handleSuccess(res, { users });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: USERS_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });

/**
 * GET /api/users/:guid/assignments
 * Récupère toutes les assignations (schedule + rotation) pour un utilisateur
 */
router.get('/:guid/assignments', Ensure.get(), async (req: Request, res: Response) => {
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

    const assignmentType = await userObj.getCurrentAssignmentType();
    const activeSchedule = await userObj.getActiveScheduleAssignment();
    const activeRotation = await userObj.getActiveRotationAssignment();
    const allSchedules = await userObj.getAllScheduleAssignments();
    const allRotations = await userObj.getAllRotationAssignments();

    return R.handleSuccess(res, {
      user: await userObj.toJSON(responseValue.MINIMAL),
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
      code: USERS_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/users/:guid/current-assignment
 * Récupère uniquement l'assignation active (plus rapide)
 */
router.get('/:guid/current-assignment', Ensure.get(), async (req: Request, res: Response) => {
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

    const assignmentType = await userObj.getCurrentAssignmentType();
    const activeSchedule = await userObj.getActiveScheduleAssignment();
    const activeRotation = await userObj.getActiveRotationAssignment();

    return R.handleSuccess(res, {
      user: await userObj.toJSON(responseValue.MINIMAL),
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
      code: USERS_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

export default router;
