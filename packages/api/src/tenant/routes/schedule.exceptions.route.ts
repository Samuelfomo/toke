import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  SCHEDULE_EXCEPTION_CODES,
  SCHEDULE_EXCEPTION_DEFAULTS,
  SCHEDULE_EXCEPTION_ERRORS,
  SCHEDULE_EXCEPTION_MESSAGES,
  ScheduleExceptionValidationUtils,
  TimezoneConfigUtils,
  USERS_CODES,
  USERS_ERRORS,
  UsersValidationUtils,
  validateScheduleExceptionCreation,
  validateScheduleExceptionFilters,
  validateScheduleExceptionUpdate,
} from '@toke/shared';
import { Op } from 'sequelize';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import ScheduleException from '../class/ScheduleExceptions.js';
import SessionTemplate from '../class/SessionTemplates.js';
import User from '../class/User.js';
import { TenantRevision } from '../../tools/revision.js';
import { responseValue, tableName } from '../../utils/response.model.js';
import { ValidationUtils } from '../../utils/view.validator.js';
import Teams from '../class/Teams.js';

const router = Router();

// ============================================
// ROUTES DE LISTAGE GÉNÉRAL
// ============================================

/**
 * GET /api/schedule-exceptions
 * Liste toutes les exceptions
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const exceptions = await ScheduleException.exportable({}, paginationData);

    return R.handleSuccess(res, {
      schedule_exceptions: exceptions,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_EXCEPTION_CODES.PAGINATION_INVALID,
        message: SCHEDULE_EXCEPTION_ERRORS.PAGINATION_INVALID,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_EXCEPTION_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/schedule-exceptions/revision
 * Obtient la révision actuelle
 */
router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await TenantRevision.getRevision(tableName.SCHEDULE_EXCEPTIONS);

    R.handleSuccess(res, {
      revision,
      checked_at: TimezoneConfigUtils.getCurrentTime().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_EXCEPTION_CODES.REVISION_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/schedule-exceptions/list
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

    const filters = validateScheduleExceptionFilters(filtersQuery);
    const conditions: Record<string, any> = {};

    if (filters.user) {
      const userObj = await User._load(filters.user, true);
      if (userObj) conditions.user = userObj.getId();
    }

    if (filters.team) {
      const teamObj = await Teams._load(filters.team, true);
      if (teamObj) conditions.team = teamObj.getId();
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

    const exceptionList = await ScheduleException._list(conditions, paginationOptions);
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

    return R.handleSuccess(res, { schedule_exceptions: exceptions });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_EXCEPTION_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// CRÉATION
// ============================================

/**
 * POST /api/schedule-exceptions
 * Crée une nouvelle exception d'horaire
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateScheduleExceptionCreation(req.body);

    // Valider le template
    const templateObj = await SessionTemplate._load(validatedData.session_template, true);
    if (!templateObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_EXCEPTION_CODES.SESSION_TEMPLATE_NOT_FOUND,
        message: SCHEDULE_EXCEPTION_ERRORS.SESSION_TEMPLATE_NOT_FOUND,
      });
    }

    if (validatedData.user && validatedData.team) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_EXCEPTION_CODES.VALIDATION_FAILED,
        message: 'Cannot specify both user and team for an exception',
      });
    }

    if (!validatedData.user && !validatedData.team) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_EXCEPTION_CODES.VALIDATION_FAILED,
        message: 'Must specify either user or team for an exception',
      });
    }

    const tenant = req.tenant;

    const exceptionObj = new ScheduleException()
      .setTenant(tenant.config.reference)
      .setSessionTemplate(templateObj.getId()!)
      .setStartDate(validatedData.start_date)
      .setEndDate(validatedData.end_date)
      .setActive(validatedData.active ?? SCHEDULE_EXCEPTION_DEFAULTS.ACTIVE);

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

    // Exception pour une team
    if (validatedData.team) {
      const teamObj = await Teams._load(validatedData.team, true);
      if (!teamObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: SCHEDULE_EXCEPTION_CODES.TEAM_NOT_FOUND,
          message: SCHEDULE_EXCEPTION_ERRORS.TEAM_NOT_FOUND,
        });
      }
      exceptionObj.setTeam(teamObj.getId()!);
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
      message: SCHEDULE_EXCEPTION_MESSAGES.CREATED_SUCCESSFULLY,
      schedule_exception: await exceptionObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_EXCEPTION_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// RÉCUPÉRATION PAR GUID
// ============================================

/**
 * GET /api/schedule-exceptions/:guid
 * Récupère une exception spécifique
 */
router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!ScheduleExceptionValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_EXCEPTION_CODES.INVALID_GUID,
        message: SCHEDULE_EXCEPTION_ERRORS.GUID_INVALID,
      });
    }

    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const exceptionObj = await ScheduleException._load(req.params.guid, true);
    if (!exceptionObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_EXCEPTION_CODES.SCHEDULE_EXCEPTION_NOT_FOUND,
        message: SCHEDULE_EXCEPTION_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      schedule_exception: await exceptionObj.toJSON(views),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_EXCEPTION_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// EXCEPTIONS PAR UTILISATEUR
// ============================================

/**
 * GET /api/schedule-exceptions/user/:userGuid
 * Liste toutes les exceptions pour un utilisateur
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

    const exceptionList = await ScheduleException._listByUser(userObj.getId()!, paginationOptions);

    const exceptions = {
      user: await userObj.toJSON(),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || exceptionList?.length || 0,
        count: exceptionList?.length || 0,
      },
      exceptions: exceptionList
        ? await Promise.all(exceptionList.map(async (e) => await e.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { exceptions });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_EXCEPTION_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

/**
 * GET /api/schedule-exceptions/user/:userGuid/on-date
 * Trouve les exceptions actives pour un utilisateur à une date donnée
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

    const exceptionList = await ScheduleException._listForUserOnDate(
      userObj.getId()!,
      date,
      paginationOptions,
    );

    const exceptions = {
      user: await userObj.toJSON(),
      date,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || exceptionList?.length || 0,
        count: exceptionList?.length || 0,
      },
      exceptions: exceptionList
        ? await Promise.all(exceptionList.map(async (e) => await e.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { exceptions });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_EXCEPTION_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// EXCEPTIONS PAR TEAM
// ============================================

/**
 * GET /api/schedule-exceptions/team/:teamGuid
 * Liste toutes les exceptions pour une team
 */
router.get('/team/:teamGuid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { teamGuid } = req.params;
    if (!ScheduleExceptionValidationUtils.validateGuid(teamGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_EXCEPTION_CODES.INVALID_GUID,
        message: SCHEDULE_EXCEPTION_ERRORS.GUID_INVALID,
      });
    }

    const teamObj = await Teams._load(teamGuid, true);
    if (!teamObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_EXCEPTION_CODES.TEAM_NOT_FOUND,
        message: SCHEDULE_EXCEPTION_ERRORS.TEAM_NOT_FOUND,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const exceptionList = await ScheduleException._listByTeams(teamObj.getId()!, paginationOptions);

    const exceptions = {
      team: await teamObj.toJSON(responseValue.MINIMAL),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || exceptionList?.length || 0,
        count: exceptionList?.length || 0,
      },
      exceptions: exceptionList
        ? await Promise.all(exceptionList.map(async (e) => await e.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { exceptions });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_EXCEPTION_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// EXCEPTIONS PAR PÉRIODE
// ============================================

/**
 * GET /api/schedule-exceptions/date-range
 * Liste les exceptions dans une période donnée
 */
router.get('/date-range', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_EXCEPTION_CODES.VALIDATION_FAILED,
        message: 'start_date and end_date are required',
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const exceptionList = await ScheduleException._listByDateRange(
      start_date as string,
      end_date as string,
      paginationOptions,
    );

    const exceptions = {
      date_range: {
        start: start_date,
        end: end_date,
      },
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || exceptionList?.length || 0,
        count: exceptionList?.length || 0,
      },
      exceptions: exceptionList
        ? await Promise.all(exceptionList.map(async (e) => await e.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { exceptions });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_EXCEPTION_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// EXCEPTIONS ACTIVES
// ============================================

/**
 * GET /api/schedule-exceptions/active/current
 * Liste toutes les exceptions actuellement actives
 */
router.get('/active/current', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const today = TimezoneConfigUtils.getCurrentTime().toISOString().split('T')[0];
    const exceptionList = await ScheduleException._listByDateRange(today, today, paginationOptions);

    // Filtrer uniquement les actives
    const activeExceptions = exceptionList?.filter((e) => e.isActive() && e.isCurrentlyActive());

    const exceptions = {
      date: today,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || activeExceptions?.length || 0,
        count: activeExceptions?.length || 0,
      },
      exceptions: activeExceptions
        ? await Promise.all(activeExceptions.map(async (e) => await e.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { exceptions });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_EXCEPTION_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// MISE À JOUR
// ============================================

/**
 * PUT /api/schedule-exceptions/:guid
 * Met à jour une exception
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    if (!ScheduleExceptionValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_EXCEPTION_CODES.INVALID_GUID,
        message: SCHEDULE_EXCEPTION_ERRORS.GUID_INVALID,
      });
    }

    const exceptionObj = await ScheduleException._load(req.params.guid, true);
    if (!exceptionObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_EXCEPTION_CODES.SCHEDULE_EXCEPTION_NOT_FOUND,
        message: SCHEDULE_EXCEPTION_ERRORS.NOT_FOUND,
      });
    }

    const validatedData = validateScheduleExceptionUpdate(req.body);

    if (validatedData.session_template !== undefined) {
      const templateObj = await SessionTemplate._load(validatedData.session_template, true);
      if (!templateObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: SCHEDULE_EXCEPTION_CODES.SESSION_TEMPLATE_NOT_FOUND,
          message: SCHEDULE_EXCEPTION_ERRORS.SESSION_TEMPLATE_NOT_FOUND,
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
      message: SCHEDULE_EXCEPTION_MESSAGES.UPDATED_SUCCESSFULLY,
      schedule_exception: await exceptionObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_EXCEPTION_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// SUPPRESSION
// ============================================

/**
 * DELETE /api/schedule-exceptions/:guid
 * Supprime une exception
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    if (!ScheduleExceptionValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_EXCEPTION_CODES.INVALID_GUID,
        message: SCHEDULE_EXCEPTION_ERRORS.GUID_INVALID,
      });
    }

    const exceptionObj = await ScheduleException._load(req.params.guid, true);
    if (!exceptionObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_EXCEPTION_CODES.SCHEDULE_EXCEPTION_NOT_FOUND,
        message: SCHEDULE_EXCEPTION_ERRORS.NOT_FOUND,
      });
    }

    await exceptionObj.delete();

    return R.handleSuccess(res, {
      message: SCHEDULE_EXCEPTION_MESSAGES.DELETED_SUCCESSFULLY,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SCHEDULE_EXCEPTION_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

// ============================================
// STATISTIQUES
// ============================================

/**
 * GET /api/schedule-exceptions/:guid/statistics
 * Statistiques sur une exception
 */
router.get('/:guid/statistics', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!ScheduleExceptionValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SCHEDULE_EXCEPTION_CODES.INVALID_GUID,
        message: SCHEDULE_EXCEPTION_ERRORS.GUID_INVALID,
      });
    }

    const exceptionObj = await ScheduleException._load(req.params.guid, true);
    if (!exceptionObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SCHEDULE_EXCEPTION_CODES.SCHEDULE_EXCEPTION_NOT_FOUND,
        message: SCHEDULE_EXCEPTION_ERRORS.NOT_FOUND,
      });
    }

    const user = await exceptionObj.getUserObj();
    const team = await exceptionObj.getTeamObj();
    const template = await exceptionObj.getSessionTemplateObj();
    const createdBy = await exceptionObj.getCreatedByObj();

    const statistics = {
      exception: await exceptionObj.toJSON(responseValue.MINIMAL),
      type: exceptionObj.isUserException() ? 'user' : 'team',
      target: exceptionObj.isUserException()
        ? user
          ? await user.toJSON()
          : null
        : team
          ? await team.toJSON(responseValue.MINIMAL)
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
      code: SCHEDULE_EXCEPTION_CODES.STATISTICS_FAILED,
      message: error.message,
    });
  }
});

export default router;
