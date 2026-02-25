import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  SCHEDULE_ASSIGNMENTS_CODES,
  SCHEDULE_ASSIGNMENTS_DEFAULTS,
  SCHEDULE_ASSIGNMENTS_ERRORS,
  SCHEDULE_ASSIGNMENTS_MESSAGES,
  ScheduleAssignmentsValidationUtils,
  SESSION_TEMPLATE_CODES,
  SESSION_TEMPLATE_ERRORS,
  SESSION_TEMPLATE_MESSAGES,
  SessionTemplateValidationUtils,
  TimezoneConfigUtils,
  USERS_CODES,
  USERS_ERRORS,
  UsersValidationUtils,
  validateScheduleAssignmentsCreation,
  validateScheduleAssignmentsFilters,
  validateScheduleAssignmentsUpdate,
} from '@toke/shared';
import { Op } from 'sequelize';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import ScheduleAssignments from '../class/ScheduleAssignments.js';
import SessionTemplate from '../class/SessionTemplates.js';
import User from '../class/User.js';
import { TenantRevision } from '../../tools/revision.js';
import { responseValue, tableName } from '../../utils/response.model.js';
import { ValidationUtils } from '../../utils/view.validator.js';
import Groups from '../class/Groups.js';
import OrgHierarchy from '../class/OrgHierarchy.js';

const router = Router();

// ============================================
// ROUTES DE LISTAGE GÉNÉRAL
// ============================================

/**
 * GET /api/schedule-assignments
 * Liste toutes les assignments
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const assignments = await ScheduleAssignments.exportable({}, paginationData);

    return R.handleSuccess(res, {
      schedule_assignments: assignments,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_ASSIGNMENTS_CODES.PAGINATION_INVALID,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.PAGINATION_INVALID,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_ASSIGNMENTS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/schedule-assignments/revision
 * Obtient la révision actuelle
 */
router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await TenantRevision.getRevision(tableName.SCHEDULE_ASSIGNMENTS);

    R.handleSuccess(res, {
      revision,
      checked_at: TimezoneConfigUtils.getCurrentTime().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_ASSIGNMENTS_CODES.REVISION_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/schedule-assignments/list
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

    const filters = validateScheduleAssignmentsFilters(filtersQuery);
    const conditions: Record<string, any> = {};

    if (filters.user) {
      const userObj = await User._load(filters.user, true);
      if (userObj) conditions.user = userObj.getId();
    }

    if (filters.groups) {
      const groupsObj = await Groups._load(filters.groups, true);
      if (groupsObj) conditions.groups = groupsObj.getId();
    }

    if (filters.active !== undefined) {
      conditions.active = filters.active;
    }

    if (filters.start_date_from || filters.start_date_to) {
      conditions.start_date = {};

      if (filters.start_date_from) {
        conditions.start_date[Op.gte] = filters.start_date_from;
      }
      if (filters.start_date_to) {
        conditions.start_date[Op.lte] = filters.start_date_to;
      }
    }

    if (filters.end_date_from || filters.end_date_to) {
      conditions.end_date = {};

      if (filters.end_date_from) {
        conditions.end_date[Op.gte] = filters.end_date_from;
      }
      if (filters.end_date_to) {
        conditions.end_date[Op.lte] = filters.end_date_to;
      }
    }

    if (filters.created_by) {
      conditions.created_by = filters.created_by;
    }

    const assignmentList = await ScheduleAssignments._list(conditions, paginationOptions);
    const schedule_assignments = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || assignmentList?.length || 0,
        count: assignmentList?.length || 0,
      },
      items: assignmentList
        ? await Promise.all(assignmentList.map(async (e) => await e.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { schedule_assignments });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_ASSIGNMENTS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

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
    // const paginationOptions = paginationSchema.parse(req.query);
    // const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const scheduleAssignments = await ScheduleAssignments._listByCreatedBy(managerObj.getId()!);
    if (!scheduleAssignments || scheduleAssignments.length === 0) {
      console.log('no scheduleAssignments', scheduleAssignments, managerObj.getId());
      return R.handleSuccess(res, {
        schedule_assignments: {
          count: 0,
          items: [],
        },
      });
    }
    console.log('scheduleAssignments', scheduleAssignments, managerObj.getId());
    return R.handleSuccess(res, {
      schedule_assignments: {
        count: scheduleAssignments.length,
        items: await Promise.all(scheduleAssignments.map(async (a) => await a.toJSON())),
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_ASSIGNMENTS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// CRÉATION
// ============================================

/**
 * POST /api/schedule-assignments
 * Crée une nouvelle assignments d'horaire
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateScheduleAssignmentsCreation(req.body);

    // Valider le template
    const templateObj = await SessionTemplate._load(validatedData.session_template, true);
    if (!templateObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_ASSIGNMENTS_CODES.SESSION_TEMPLATE_NOT_FOUND,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.SESSION_TEMPLATE_NOT_FOUND,
      });
    }

    const createdByObj = await User._load(validatedData.created_by, true);
    if (!createdByObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_ASSIGNMENTS_CODES.CREATED_BY_NOT_FOUND,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.CREATED_BY_NOT_FOUND,
      });
    }

    if (validatedData.user && validatedData.groups) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_ASSIGNMENTS_CODES.VALIDATION_FAILED,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.BOTH_USER_AND_GROUPS,
      });
    }

    if (!validatedData.user && !validatedData.groups) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_ASSIGNMENTS_CODES.VALIDATION_FAILED,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.USER_OR_GROUPS_REQUIRED,
      });
    }

    const tenant = req.tenant;

    const assignmentObj = new ScheduleAssignments()
      .setTenant(tenant.config.reference)
      .setSessionTemplate(templateObj)
      .setCreatedBy(createdByObj.getId()!)
      .setStartDate(validatedData.start_date)
      .setActive(validatedData.active ?? SCHEDULE_ASSIGNMENTS_DEFAULTS.ACTIVE);
    if (validatedData.end_date) {
      assignmentObj.setEndDate(validatedData.end_date);
    }
    // // ✅ 3. Assigner le template (copie complète en JSONB avec version)
    // await assignmentObj.assignFromSessionTemplate(
    //   templateObj,
    //   createdByObj.getId()!,
    //   validatedData.reason ? validatedData.reason : undefined,
    // );
    if (validatedData.reason) {
      assignmentObj.setReason(validatedData.reason);
    }

    // Exception pour un utilisateur spécifique
    if (validatedData.user) {
      const userObj = await User._load(validatedData.user, true);
      if (!userObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.USER_NOT_FOUND,
          message: USERS_ERRORS.NOT_FOUND,
        });
      }
      assignmentObj.setUser(userObj.getId()!);
    }

    // Exception pour une groups
    if (validatedData.groups) {
      const groupsObj = await Groups._load(validatedData.groups, true);
      if (!groupsObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: SCHEDULE_ASSIGNMENTS_CODES.GROUPS_NOT_FOUND,
          message: SCHEDULE_ASSIGNMENTS_ERRORS.GROUPS_NOT_FOUND,
        });
      }
      assignmentObj.setGroups(groupsObj.getId()!);
    }

    if (validatedData.reason) {
      assignmentObj.setReason(validatedData.reason);
    }

    await assignmentObj.save();

    return R.handleCreated(res, {
      message: SCHEDULE_ASSIGNMENTS_MESSAGES.CREATED_SUCCESSFULLY,
      schedule_assignments: await assignmentObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_ASSIGNMENTS_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// RÉCUPÉRATION PAR GUID
// ============================================

/**
 * GET /api/schedule-assignments/:guid
 * Récupère une assignments spécifique
 */
router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!ScheduleAssignmentsValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_ASSIGNMENTS_CODES.INVALID_GUID,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.GUID_INVALID,
      });
    }

    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const assignmentObj = await ScheduleAssignments._load(req.params.guid, true);
    if (!assignmentObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_ASSIGNMENTS_CODES.SCHEDULE_ASSIGNMENTS_NOT_FOUND,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      schedule_assignments: await assignmentObj.toJSON(views),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_ASSIGNMENTS_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// ASSIGNMENTS PAR UTILISATEUR
// ============================================

/**
 * GET /api/schedule-assignments/user/:userGuid
 * Liste toutes les assignments pour un utilisateur
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

    const assignmentList = await ScheduleAssignments._listByUser(
      userObj.getId()!,
      paginationOptions,
    );

    const assignments = {
      user: await userObj.toJSON(),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || assignmentList?.length || 0,
        count: assignmentList?.length || 0,
      },
      items: assignmentList
        ? await Promise.all(assignmentList.map(async (e) => await e.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { assignments });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_ASSIGNMENTS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/schedule-assignments/user/:userGuid/on-date
 * Trouve les assignments actives pour un utilisateur à une date donnée
 */
router.get('/user/:userGuid/on-date', Ensure.get(), async (req: Request, res: Response) => {
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

    const date = req.query.date
      ? (req.query.date as string)
      : TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0];

    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const assignmentList = await ScheduleAssignments._listForUserOnDate(
      userObj.getId()!,
      date,
      paginationOptions,
    );

    const assignments = {
      user: await userObj.toJSON(),
      date,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || assignmentList?.length || 0,
        count: assignmentList?.length || 0,
      },
      items: assignmentList
        ? await Promise.all(assignmentList.map(async (e) => await e.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { assignments });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_ASSIGNMENTS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// ASSIGNMENTS PAR GROUPS
// ============================================

/**
 * GET /api/schedule-assignments/groups/:groupsGuid
 * Liste toutes les assignments pour une groups
 */
router.get('/groups/:groupsGuid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { groupsGuid } = req.params;
    if (!ScheduleAssignmentsValidationUtils.validateGuid(groupsGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_ASSIGNMENTS_CODES.INVALID_GUID,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.GUID_INVALID,
      });
    }

    const groupsObj = await Groups._load(groupsGuid, true);
    if (!groupsObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_ASSIGNMENTS_CODES.GROUPS_NOT_FOUND,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.GROUPS_NOT_FOUND,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const assignmentList = await ScheduleAssignments._listByGroups(
      groupsObj.getId()!,
      paginationOptions,
    );

    const assignments = {
      groups: await groupsObj.toJSON(responseValue.MINIMAL),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || assignmentList?.length || 0,
        count: assignmentList?.length || 0,
      },
      items: assignmentList
        ? await Promise.all(assignmentList.map(async (e) => await e.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { assignments });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_ASSIGNMENTS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// ASSIGNMENTS PAR PÉRIODE
// ============================================

/**
 * GET /api/schedule-assignments/date-range
 * Liste les assignments dans une période donnée
 */
router.get('/date-range', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_ASSIGNMENTS_CODES.VALIDATION_FAILED,
        message: 'start_date and end_date are required',
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const assignmentList = await ScheduleAssignments._listByDateRange(
      start_date as string,
      end_date as string,
      paginationOptions,
    );

    const assignments = {
      date_range: {
        start: start_date,
        end: end_date,
      },
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || assignmentList?.length || 0,
        count: assignmentList?.length || 0,
      },
      items: assignmentList
        ? await Promise.all(assignmentList.map(async (e) => await e.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { assignments });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_ASSIGNMENTS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// ASSIGNMENTS ACTIVES
// ============================================

/**
 * GET /api/schedule-assignments/active/current
 * Liste toutes les assignments actuellement actives
 */
router.get('/active/current', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const today = TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0];
    const assignmentList = await ScheduleAssignments._listByDateRange(
      today,
      today,
      paginationOptions,
    );

    // Filtrer uniquement les actives
    const activeAssignments = assignmentList?.filter((e) => e.isActive() && e.isCurrentlyActive());

    const assignments = {
      date: today,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || activeAssignments?.length || 0,
        count: activeAssignments?.length || 0,
      },
      items: activeAssignments
        ? await Promise.all(activeAssignments.map(async (e) => await e.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { assignments });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_ASSIGNMENTS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// MISE À JOUR
// ============================================

/**
 * PUT /api/schedule-assignments/:guid
 * Met à jour une assignments
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    if (!ScheduleAssignmentsValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_ASSIGNMENTS_CODES.INVALID_GUID,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.GUID_INVALID,
      });
    }

    const assignmentObj = await ScheduleAssignments._load(req.params.guid, true);
    if (!assignmentObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_ASSIGNMENTS_CODES.SCHEDULE_ASSIGNMENTS_NOT_FOUND,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.NOT_FOUND,
      });
    }

    console.log('req.body', req.body);

    const validatedData = validateScheduleAssignmentsUpdate(req.body);

    // if (validatedData.session_template !== undefined) {
    //   const templateObj = await SessionTemplate._load(validatedData.session_template, true);
    //   if (!templateObj) {
    //     return R.handleError(res, HttpStatus.NOT_FOUND, {
    //       code: SCHEDULE_ASSIGNMENTS_CODES.SESSION_TEMPLATE_NOT_FOUND,
    //       message: SCHEDULE_ASSIGNMENTS_ERRORS.SESSION_TEMPLATE_NOT_FOUND,
    //     });
    //   }
    //   assignmentObj.setSessionTemplate(templateObj.getId()!);
    // }

    if (validatedData.start_date !== undefined) {
      assignmentObj.setStartDate(validatedData.start_date);
    }

    if (validatedData.end_date !== undefined && validatedData.end_date !== null) {
      assignmentObj.setEndDate(validatedData.end_date);
    }

    if (validatedData.reason !== undefined) {
      assignmentObj.setReason(validatedData.reason);
    }

    if (validatedData.active !== undefined) {
      assignmentObj.setActive(validatedData.active);
    }

    if (validatedData.user !== undefined && validatedData.user !== null) {
      const userObj = await User._load(validatedData.user, true);
      if (!userObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: SCHEDULE_ASSIGNMENTS_CODES.USER_NOT_FOUND,
          message: SCHEDULE_ASSIGNMENTS_ERRORS.USER_NOT_FOUND,
        });
      }
      assignmentObj.setUser(userObj.getId()!);
    }

    if (validatedData.groups !== undefined && validatedData.groups !== null) {
      const groupsObj = await Groups._load(validatedData.groups, true);
      if (!groupsObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: SCHEDULE_ASSIGNMENTS_CODES.GROUPS_NOT_FOUND,
          message: SCHEDULE_ASSIGNMENTS_ERRORS.GROUPS_NOT_FOUND,
        });
      }
      assignmentObj.setGroups(groupsObj.getId()!);
    }

    const { new_definition } = req.body;
    if (new_definition) {
      if (!SessionTemplateValidationUtils.validateDefinition(new_definition)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: SESSION_TEMPLATE_CODES.DEFINITION_INVALID,
          message: SESSION_TEMPLATE_ERRORS.DEFINITION_INVALID,
        });
      }

      const session_template = SessionTemplate.toObject(assignmentObj.getSessionTemplate());

      const normalizedDefinition =
        SessionTemplateValidationUtils.normalizeDefinition(new_definition);

      session_template.setDefinition(normalizedDefinition);

      assignmentObj.setNewSessionTemplate(session_template);
    }

    await assignmentObj.save();

    return R.handleSuccess(res, {
      message: SCHEDULE_ASSIGNMENTS_MESSAGES.UPDATED_SUCCESSFULLY,
      schedule_assignments: await assignmentObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_ASSIGNMENTS_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

/**
 * PATCH /api/schedule-assignments/:guid/template
 * ✅ Modifie le template d'un assignment (avec log automatique)
 */
router.patch('/template/:guid', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!ScheduleAssignmentsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_ASSIGNMENTS_CODES.INVALID_GUID,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.GUID_INVALID,
      });
    }

    const assignment = await ScheduleAssignments._load(guid, true);
    if (!assignment) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_ASSIGNMENTS_CODES.SCHEDULE_ASSIGNMENTS_NOT_FOUND,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.NOT_FOUND,
      });
    }

    const { new_definition, user, reason } = req.body;

    if (!new_definition) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_ASSIGNMENTS_CODES.SESSION_TEMPLATE_REQUIRED,
        message: 'New template is required',
      });
    }

    if (!SessionTemplateValidationUtils.validateDefinition(new_definition)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SESSION_TEMPLATE_CODES.DEFINITION_INVALID,
        message: SESSION_TEMPLATE_ERRORS.DEFINITION_INVALID,
      });
    }

    if (!user) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'user_required',
        message: 'User is required',
      });
    }

    if (!UsersValidationUtils.validateGuid(user)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_ASSIGNMENTS_CODES.USER_INVALID,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.USER_INVALID,
      });
    }

    const currentUser = await User._load(user, true);
    if (!currentUser) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_ASSIGNMENTS_CODES.USER_NOT_FOUND,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.USER_NOT_FOUND,
      });
    }

    const session_template = SessionTemplate.toObject(assignment.getSessionTemplate());

    const normalizedDefinition = SessionTemplateValidationUtils.normalizeDefinition(new_definition);

    session_template.setDefinition(normalizedDefinition);

    // ✅ Mettre à jour le template (log automatique créé)
    await assignment.updateSessionTemplate(session_template, currentUser.getId()!, reason);

    return R.handleSuccess(res, {
      message: SESSION_TEMPLATE_MESSAGES.UPDATED_SUCCESSFULLY,
      assignment: await assignment.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_ASSIGNMENTS_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// SUPPRESSION
// ============================================

/**
 * DELETE /api/schedule-assignments/:guid
 * Supprime une assignments
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    if (!ScheduleAssignmentsValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_ASSIGNMENTS_CODES.INVALID_GUID,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.GUID_INVALID,
      });
    }

    const assignmentObj = await ScheduleAssignments._load(req.params.guid, true);
    if (!assignmentObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_ASSIGNMENTS_CODES.SCHEDULE_ASSIGNMENTS_NOT_FOUND,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.NOT_FOUND,
      });
    }

    await assignmentObj.delete();

    return R.handleSuccess(res, {
      message: SCHEDULE_ASSIGNMENTS_MESSAGES.DELETED_SUCCESSFULLY,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_ASSIGNMENTS_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// HISTORIQUE DES MODIFICATIONS
// ============================================

/**
 * GET /api/schedule-assignments/:guid/history
 * ✅ Récupère l'historique complet des modifications d'un assignment
 */
router.get('/:guid/history', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    const paginationOptions = paginationSchema.parse(req.query);

    if (!ScheduleAssignmentsValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_ASSIGNMENTS_CODES.INVALID_GUID,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.GUID_INVALID,
      });
    }

    const assignment = await ScheduleAssignments._load(guid, true);
    if (!assignment) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_ASSIGNMENTS_CODES.SCHEDULE_ASSIGNMENTS_NOT_FOUND,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.NOT_FOUND,
      });
    }

    const history = await assignment.getHistory(paginationOptions);

    const historyData = {
      assignment: assignment.toJSON(responseValue.MINIMAL),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || history?.length || 0,
        count: history?.length || 0,
      },
      logs: history ? history.map((log) => log.toJSON()) : [],
    };

    return R.handleSuccess(res, { history: historyData });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_ASSIGNMENTS_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// STATISTIQUES
// ============================================

/**
 * GET /api/schedule-assignments/:guid/statistics
 * Statistiques sur une assignments
 */
router.get('/:guid/statistics', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!ScheduleAssignmentsValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_ASSIGNMENTS_CODES.INVALID_GUID,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.GUID_INVALID,
      });
    }

    const assignmentObj = await ScheduleAssignments._load(req.params.guid, true);
    if (!assignmentObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_ASSIGNMENTS_CODES.SCHEDULE_ASSIGNMENTS_NOT_FOUND,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.NOT_FOUND,
      });
    }

    const user = await assignmentObj.getUserObj();
    const groups = await assignmentObj.getGroupsObj();
    const template = SessionTemplate.toObject(assignmentObj.getSessionTemplate());
    const createdBy = await assignmentObj.getCreatedByObj();

    const statistics = {
      assignments: await assignmentObj.toJSON(responseValue.MINIMAL),
      type: assignmentObj.isForUser() ? 'user' : 'groups',
      target: assignmentObj.isForUser()
        ? user
          ? await user.toJSON()
          : null
        : groups
          ? await groups.toJSON(responseValue.MINIMAL)
          : null,
      template: template ? template.toJSON(responseValue.MINIMAL) : null,
      created_by: createdBy ? await createdBy.toJSON() : null,
      duration_days: assignmentObj.getDurationInDays(),
      is_single_day: assignmentObj.isSingleDay(),
      is_active: assignmentObj.isActive(),
      is_currently_active: assignmentObj.isCurrentlyActive(),
      is_past: assignmentObj.isInPast(),
      is_future: assignmentObj.isInFuture(),
      has_reason: assignmentObj.hasReason(),
      reason: assignmentObj.getReason(),
    };

    return R.handleSuccess(res, { statistics });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_ASSIGNMENTS_CODES.STATISTICS_FAILED,
      message: error.message,
    });
  }
});

export default router;
