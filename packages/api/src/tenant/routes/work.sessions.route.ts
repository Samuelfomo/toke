import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  SITES_ERRORS,
  validateWorkSessionsFilters,
  WORK_SESSIONS_CODES,
  WORK_SESSIONS_ERRORS,
  WorkSessionsValidationUtils,
} from '@toke/shared';
import { Op } from 'sequelize';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import User from '../class/User.js';
import Site from '../class/Site.js';
import WorkSessions from '../class/WorkSessions.js';
import Revision from '../../tools/revision.js';
import { responseValue, tableName } from '../../utils/response.model.js';

const router = Router();

// === ROUTES DE LISTAGE GÉNÉRAL ===

router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const exportableSessions = await WorkSessions.exportable({}, paginationData);

    return R.handleSuccess(res, {
      exportableSessions,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: WORK_SESSIONS_CODES.PAGINATION_INVALID,
        message: WORK_SESSIONS_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: WORK_SESSIONS_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.WORK_SESSIONS);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: WORK_SESSIONS_CODES.REVISION_FAILED,
      message: error.message,
    });
  }
});

router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const filters = validateWorkSessionsFilters(req.query);
    const paginationOptions = paginationSchema.parse(req.query);
    const conditions: Record<string, any> = {};

    if (filters.user) {
      const userObj = await User._load(filters.user, true);
      if (userObj) conditions.user = userObj.getId();
    }

    if (filters.site) {
      const siteObj = await Site._load(filters.site, true);
      if (siteObj) conditions.site = siteObj.getId();
    }

    if (filters.session_status) {
      conditions.session_status = filters.session_status;
    }

    if (filters.session_start_from) {
      conditions.session_start_at = { [Op.gte]: new Date(filters.session_start_from) };
    }

    if (filters.session_end_to) {
      conditions.session_end_at = { [Op.lte]: new Date(filters.session_end_to) };
    }

    const sessionEntries = await WorkSessions._list(conditions, paginationOptions);
    const sessions = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || sessionEntries?.length || 0,
        count: sessionEntries?.length || 0,
      },
      items: sessionEntries
        ? await Promise.all(
            sessionEntries.map(async (session) => await session.toJSON(responseValue.MINIMAL)),
          )
        : [],
    };

    return R.handleSuccess(res, { sessions });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: WORK_SESSIONS_CODES.VALIDATION_FAILED,
        message: WORK_SESSIONS_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: WORK_SESSIONS_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

// === RÉCUPÉRATION PAR GUID ===

router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!WorkSessionsValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: WORK_SESSIONS_CODES.INVALID_GUID,
        message: WORK_SESSIONS_ERRORS.GUID_INVALID,
      });
    }

    const sessionObj = await WorkSessions._load(req.params.guid, true);
    if (!sessionObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: WORK_SESSIONS_CODES.WORK_SESSION_NOT_FOUND,
        message: WORK_SESSIONS_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      session: await sessionObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: WORK_SESSIONS_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// === SESSIONS PAR UTILISATEUR ===

router.get('/user/:userGuid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!WorkSessionsValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: WORK_SESSIONS_CODES.INVALID_GUID,
        message: WORK_SESSIONS_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(req.params.userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: WORK_SESSIONS_CODES.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const sessionEntries = await WorkSessions._listByUser(userObj.getId()!);
    const sessions = {
      user: userObj.toPublicJSON(),
      sessions: sessionEntries
        ? await Promise.all(
            sessionEntries.map(async (session) => await session.toJSON(responseValue.MINIMAL)),
          )
        : [],
      count: sessionEntries?.length || 0,
    };

    return R.handleSuccess(res, { sessions });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: WORK_SESSIONS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

router.get('/user/:userGuid/active', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!WorkSessionsValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: WORK_SESSIONS_CODES.INVALID_GUID,
        message: WORK_SESSIONS_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(req.params.userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: WORK_SESSIONS_CODES.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const activeSession = await WorkSessions._findActiveSessionByUser(userObj.getId()!);

    if (!activeSession) {
      return R.handleSuccess(res, {
        has_active_session: false,
        message: 'No active session found',
      });
    }

    return R.handleSuccess(res, {
      has_active_session: true,
      session: await activeSession.toJSON(),
      pause_status: await activeSession.getPauseStatusDetailed(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: WORK_SESSIONS_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// === SESSIONS PAR SITE ===

router.get('/site/:siteGuid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!WorkSessionsValidationUtils.validateGuid(req.params.siteGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: WORK_SESSIONS_CODES.INVALID_GUID,
        message: WORK_SESSIONS_ERRORS.GUID_INVALID,
      });
    }

    const siteObj = await Site._load(req.params.siteGuid, true);
    if (!siteObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: WORK_SESSIONS_CODES.SITE_NOT_FOUND,
        message: SITES_ERRORS.NOT_FOUND,
      });
    }

    const sessionEntries = await WorkSessions._listBySite(siteObj.getId()!);
    const sessions = {
      site: await siteObj.toJSON(responseValue.MINIMAL),
      sessions: sessionEntries
        ? await Promise.all(
            sessionEntries.map(async (session) => await session.toJSON(responseValue.MINIMAL)),
          )
        : [],
      count: sessionEntries?.length || 0,
    };

    return R.handleSuccess(res, { sessions });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: WORK_SESSIONS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === SESSIONS ABANDONNÉES ===

router.get('/abandoned/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { hours = 24 } = req.query;
    const hoursThreshold = parseInt(hours as string, 10);

    const abandonedSessions = await WorkSessions._detectAbandonedSessions(hoursThreshold);

    const sessions = {
      hours_threshold: hoursThreshold,
      abandoned_sessions: abandonedSessions
        ? await Promise.all(
            abandonedSessions.map(async (session) => ({
              ...(await session.toJSON(responseValue.MINIMAL)),
              hours_abandoned: Math.floor(
                (new Date().getTime() - session.getSessionStartAt()!.getTime()) / (1000 * 60 * 60),
              ),
            })),
          )
        : [],
      count: abandonedSessions?.length || 0,
    };

    return R.handleSuccess(res, { sessions });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: WORK_SESSIONS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === CORRECTIONS MANAGER ===

router.patch('/:guid/correct', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    if (!WorkSessionsValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: WORK_SESSIONS_CODES.INVALID_GUID,
        message: WORK_SESSIONS_ERRORS.GUID_INVALID,
      });
    }

    const sessionObj = await WorkSessions._load(req.params.guid, true);
    if (!sessionObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: WORK_SESSIONS_CODES.WORK_SESSION_NOT_FOUND,
        message: WORK_SESSIONS_ERRORS.NOT_FOUND,
      });
    }

    const { corrections, manager_guid } = req.body;

    if (!corrections || !manager_guid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: WORK_SESSIONS_CODES.VALIDATION_FAILED,
        message: 'corrections and manager_guid are required',
      });
    }

    const managerObj = await User._load(manager_guid, true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: WORK_SESSIONS_CODES.USER_NOT_FOUND,
        message: 'Manager not found',
      });
    }

    await sessionObj.applyManagerCorrection(corrections, managerObj.getId()!);

    return R.handleSuccess(res, {
      message: 'Corrections applied successfully',
      session: await sessionObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: WORK_SESSIONS_CODES.CORRECTION_FAILED,
      message: error.message,
    });
  }
});

// === RAPPORTS ===

router.post('/report/generate', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { user_guid, site_guid, start_date, end_date, status } = req.body;

    const filters: any = {};

    if (user_guid) {
      const userObj = await User._load(user_guid, true);
      if (userObj) filters.user = userObj.getId();
    }

    if (site_guid) {
      const siteObj = await Site._load(site_guid, true);
      if (siteObj) filters.site = siteObj.getId();
    }

    if (start_date) filters.start_date = new Date(start_date);
    if (end_date) filters.end_date = new Date(end_date);
    if (status) filters.status = status;

    const report = await WorkSessions.generateSessionReport(filters);

    return R.handleSuccess(res, { report });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: WORK_SESSIONS_CODES.REPORT_GENERATION_FAILED,
      message: error.message,
    });
  }
});

// === STATISTIQUES ===

router.get('/statistics/overview', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const filters: Record<string, any> = {};

    if (req.query.user) {
      const userObj = await User._load(req.query.user as string, true);
      if (userObj) filters.user = userObj.getId();
    }

    if (req.query.site) {
      const siteObj = await Site._load(req.query.site as string, true);
      if (siteObj) filters.site = siteObj.getId();
    }

    const statistics = await WorkSessions.getSessionsStatistics(filters);

    return R.handleSuccess(res, { statistics });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: WORK_SESSIONS_CODES.STATISTICS_FAILED,
      message: error.message,
    });
  }
});

// === MAINTENANCE AUTOMATIQUE ===

router.patch(
  '/maintenance/auto-close-abandoned',
  Ensure.patch(),
  async (req: Request, res: Response) => {
    try {
      const { hours = 24 } = req.body;
      const closedCount = await WorkSessions.autoCloseAbandonedSessions(hours);

      return R.handleSuccess(res, {
        message: 'Abandoned sessions maintenance completed',
        closed_sessions: closedCount,
        processed_at: new Date().toISOString(),
      });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: WORK_SESSIONS_CODES.MAINTENANCE_FAILED,
        message: error.message,
      });
    }
  },
);

export default router;
