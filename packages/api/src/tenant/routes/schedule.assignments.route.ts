import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  SCHEDULE_ASSIGNMENTS_CODES,
  SCHEDULE_ASSIGNMENTS_DEFAULTS,
  SCHEDULE_ASSIGNMENTS_ERRORS,
  SCHEDULE_ASSIGNMENTS_MESSAGES,
  ScheduleAssignmentsValidationUtils,
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

    if (filters.session_template) {
      conditions.session_template = filters.session_template;
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

    const exceptionList = await ScheduleAssignments._list(conditions, paginationOptions);
    const exceptions = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || exceptionList?.length || 0,
        count: exceptionList?.length || 0,
      },
      items: exceptionList
        ? await Promise.all(exceptionList.map(async (e) => await e.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { schedule_assignments: exceptions });
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
      console.log('no scheduleAssignments', scheduleAssignments);
      return R.handleSuccess(res, {
        schedule_assignments: {
          count: 0,
          items: [],
        },
      });
    }
    console.log('scheduleAssignments', scheduleAssignments);
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

    const exceptionObj = new ScheduleAssignments()
      .setTenant(tenant.config.reference)
      .setSessionTemplate(templateObj.getId()!)
      .setStartDate(validatedData.start_date)
      .setEndDate(validatedData.end_date)
      .setActive(validatedData.active ?? SCHEDULE_ASSIGNMENTS_DEFAULTS.ACTIVE);

    // Exception pour un utilisateur spécifique
    if (validatedData.user) {
      const userObj = await User._load(validatedData.user, true);
      if (!userObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.USER_NOT_FOUND,
          message: USERS_ERRORS.NOT_FOUND,
        });
      }
      exceptionObj.setUser(userObj.getId()!);
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
      exceptionObj.setGroups(groupsObj.getId()!);
    }

    if (validatedData.created_by) {
      const createdByObj = await User._load(validatedData.created_by, true);
      if (createdByObj) {
        exceptionObj.setCreatedBy(createdByObj.getId()!);
      }
    }

    if (validatedData.reason) {
      exceptionObj.setReason(validatedData.reason);
    }

    await exceptionObj.save();

    return R.handleCreated(res, {
      message: SCHEDULE_ASSIGNMENTS_MESSAGES.CREATED_SUCCESSFULLY,
      schedule_assignments: await exceptionObj.toJSON(),
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

    const exceptionObj = await ScheduleAssignments._load(req.params.guid, true);
    if (!exceptionObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_ASSIGNMENTS_CODES.SCHEDULE_ASSIGNMENTS_NOT_FOUND,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      schedule_assignments: await exceptionObj.toJSON(views),
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

    const exceptionList = await ScheduleAssignments._listByUser(
      userObj.getId()!,
      paginationOptions,
    );

    const assignments = {
      user: await userObj.toJSON(),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || exceptionList?.length || 0,
        count: exceptionList?.length || 0,
      },
      items: exceptionList
        ? await Promise.all(exceptionList.map(async (e) => await e.toJSON(views)))
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

    const exceptionList = await ScheduleAssignments._listForUserOnDate(
      userObj.getId()!,
      date,
      paginationOptions,
    );

    const assignments = {
      user: await userObj.toJSON(),
      date,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || exceptionList?.length || 0,
        count: exceptionList?.length || 0,
      },
      items: exceptionList
        ? await Promise.all(exceptionList.map(async (e) => await e.toJSON(views)))
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

    const exceptionList = await ScheduleAssignments._listByGroups(
      groupsObj.getId()!,
      paginationOptions,
    );

    const assignments = {
      groups: await groupsObj.toJSON(responseValue.MINIMAL),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || exceptionList?.length || 0,
        count: exceptionList?.length || 0,
      },
      items: exceptionList
        ? await Promise.all(exceptionList.map(async (e) => await e.toJSON(views)))
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

    const exceptionList = await ScheduleAssignments._listByDateRange(
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
        limit: paginationOptions.limit || exceptionList?.length || 0,
        count: exceptionList?.length || 0,
      },
      items: exceptionList
        ? await Promise.all(exceptionList.map(async (e) => await e.toJSON(views)))
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
    const exceptionList = await ScheduleAssignments._listByDateRange(
      today,
      today,
      paginationOptions,
    );

    // Filtrer uniquement les actives
    const activeExceptions = exceptionList?.filter((e) => e.isActive() && e.isCurrentlyActive());

    const assignments = {
      date: today,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || activeExceptions?.length || 0,
        count: activeExceptions?.length || 0,
      },
      items: activeExceptions
        ? await Promise.all(activeExceptions.map(async (e) => await e.toJSON(views)))
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

    const exceptionObj = await ScheduleAssignments._load(req.params.guid, true);
    if (!exceptionObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_ASSIGNMENTS_CODES.SCHEDULE_ASSIGNMENTS_NOT_FOUND,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.NOT_FOUND,
      });
    }

    const validatedData = validateScheduleAssignmentsUpdate(req.body);

    if (validatedData.session_template !== undefined) {
      const templateObj = await SessionTemplate._load(validatedData.session_template, true);
      if (!templateObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: SCHEDULE_ASSIGNMENTS_CODES.SESSION_TEMPLATE_NOT_FOUND,
          message: SCHEDULE_ASSIGNMENTS_ERRORS.SESSION_TEMPLATE_NOT_FOUND,
        });
      }
      exceptionObj.setSessionTemplate(templateObj.getId()!);
    }

    if (validatedData.start_date !== undefined) {
      exceptionObj.setStartDate(validatedData.start_date);
    }

    if (validatedData.end_date !== undefined) {
      exceptionObj.setEndDate(validatedData.end_date);
    }

    if (validatedData.reason !== undefined) {
      exceptionObj.setReason(validatedData.reason);
    }

    if (validatedData.active !== undefined) {
      exceptionObj.setActive(validatedData.active);
    }

    await exceptionObj.save();

    return R.handleSuccess(res, {
      message: SCHEDULE_ASSIGNMENTS_MESSAGES.UPDATED_SUCCESSFULLY,
      schedule_assignments: await exceptionObj.toJSON(),
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

    const exceptionObj = await ScheduleAssignments._load(req.params.guid, true);
    if (!exceptionObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_ASSIGNMENTS_CODES.SCHEDULE_ASSIGNMENTS_NOT_FOUND,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.NOT_FOUND,
      });
    }

    await exceptionObj.delete();

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

    const exceptionObj = await ScheduleAssignments._load(req.params.guid, true);
    if (!exceptionObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_ASSIGNMENTS_CODES.SCHEDULE_ASSIGNMENTS_NOT_FOUND,
        message: SCHEDULE_ASSIGNMENTS_ERRORS.NOT_FOUND,
      });
    }

    const user = await exceptionObj.getUserObj();
    const groups = await exceptionObj.getGroupsObj();
    const template = await exceptionObj.getSessionTemplateObj();
    const createdBy = await exceptionObj.getCreatedByObj();

    const statistics = {
      assignments: await exceptionObj.toJSON(responseValue.MINIMAL),
      type: exceptionObj.isUserException() ? 'user' : 'groups',
      target: exceptionObj.isUserException()
        ? user
          ? await user.toJSON()
          : null
        : groups
          ? await groups.toJSON(responseValue.MINIMAL)
          : null,
      template: template ? template.toJSON(responseValue.MINIMAL) : null,
      created_by: createdBy ? await createdBy.toJSON() : null,
      duration_days: exceptionObj.getDurationInDays(),
      is_single_day: exceptionObj.isSingleDay(),
      is_active: exceptionObj.isActive(),
      is_currently_active: exceptionObj.isCurrentlyActive(),
      is_past: exceptionObj.isInPast(),
      is_future: exceptionObj.isInFuture(),
      has_reason: exceptionObj.hasReason(),
      reason: exceptionObj.getReason(),
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
