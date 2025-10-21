// src/api/routes/fraud.alerts.route.ts

import { Request, Response, Router } from 'express';
import {
  FRAUD_ALERTS_CODES,
  FRAUD_ALERTS_ERRORS,
  FraudAlertsValidationUtils,
  HttpStatus,
  paginationSchema,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import FraudAlerts from '../class/FraudAlerts.js';
import User from '../class/User.js';
import TimeEntries from '../class/TimeEntries.js';
import Revision from '../../tools/revision.js';
import { responseValue, tableName } from '../../utils/response.model.js';
import { ValidationUtils } from '../../utils/view.validator.js';

const router = Router();

// === LISTAGE GÉNÉRAL ===

router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const alerts = await FraudAlerts._list({}, paginationOptions);

    const items = alerts
      ? await Promise.all(alerts.map(async (alert) => await alert.toJSON(views)))
      : [];

    return R.handleSuccess(res, {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || items.length,
        count: items.length,
      },
      items,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_ALERTS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.FRAUD_ALERTS);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_ALERTS_CODES.REVISION_FAILED,
      message: error.message,
    });
  }
});

// === ALERTES EN ATTENTE ===

router.get('/pending', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const alerts = await FraudAlerts._listPending();

    const offset = paginationOptions.offset || 0;
    const limit = paginationOptions.limit;
    const paginatedAlerts = limit ? alerts?.slice(offset, offset + limit) : alerts?.slice(offset);

    const items = paginatedAlerts
      ? await Promise.all(paginatedAlerts.map(async (alert) => await alert.toJSON(views)))
      : [];

    return R.handleSuccess(res, {
      pagination: {
        offset,
        limit: limit || items.length,
        count: items.length,
        total: alerts?.length || 0,
      },
      items,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_ALERTS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === ALERTES CRITIQUES ===

router.get('/critical', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { hours = 24 } = req.query;
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const alerts = await FraudAlerts._listCritical(parseInt(hours as string, 10));

    const items = alerts
      ? await Promise.all(alerts.map(async (alert) => await alert.toJSON(views)))
      : [];

    return R.handleSuccess(res, {
      hours_threshold: hours,
      critical_alerts_count: items.length,
      items,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_ALERTS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === PAR GUID ===

router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!FraudAlertsValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_ALERTS_CODES.INVALID_GUID,
        message: FRAUD_ALERTS_ERRORS.GUID_INVALID,
      });
    }

    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);
    const alert = await FraudAlerts._load(req.params.guid, true);

    if (!alert) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: FRAUD_ALERTS_CODES.ALERT_NOT_FOUND,
        message: FRAUD_ALERTS_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      alert: await alert.toJSON(views),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_ALERTS_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// === PAR UTILISATEUR ===

router.get('/user/:userGuid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!FraudAlertsValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_ALERTS_CODES.INVALID_GUID,
        message: FRAUD_ALERTS_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(req.params.userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: FRAUD_ALERTS_CODES.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const alerts = await FraudAlerts._listByUser(userObj.getId()!);

    const offset = paginationOptions.offset || 0;
    const limit = paginationOptions.limit;
    const paginatedAlerts = limit ? alerts?.slice(offset, offset + limit) : alerts?.slice(offset);

    const items = paginatedAlerts
      ? await Promise.all(paginatedAlerts.map(async (alert) => await alert.toJSON(views)))
      : [];

    return R.handleSuccess(res, {
      user: userObj.toPublicJSON(),
      pagination: {
        offset,
        limit: limit || items.length,
        count: items.length,
        total: alerts?.length || 0,
      },
      items,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_ALERTS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === PAR TIME ENTRY ===

router.get('/time-entry/:entryGuid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!FraudAlertsValidationUtils.validateGuid(req.params.entryGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_ALERTS_CODES.INVALID_GUID,
        message: FRAUD_ALERTS_ERRORS.GUID_INVALID,
      });
    }

    const entryObj = await TimeEntries._load(req.params.entryGuid, true);
    if (!entryObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: FRAUD_ALERTS_CODES.TIME_ENTRY_NOT_FOUND,
        message: 'Time entry not found',
      });
    }

    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);
    const alerts = await FraudAlerts._listByTimeEntry(entryObj.getId()!);

    const items = alerts
      ? await Promise.all(alerts.map(async (alert) => await alert.toJSON(views)))
      : [];

    return R.handleSuccess(res, {
      time_entry: await entryObj.toJSON(responseValue.MINIMAL),
      alerts_count: items.length,
      items,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_ALERTS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === INVESTIGATION ===

router.patch('/:guid/investigate', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    if (!FraudAlertsValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_ALERTS_CODES.INVALID_GUID,
        message: FRAUD_ALERTS_ERRORS.GUID_INVALID,
      });
    }

    const alert = await FraudAlerts._load(req.params.guid, true);
    if (!alert) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: FRAUD_ALERTS_CODES.ALERT_NOT_FOUND,
        message: FRAUD_ALERTS_ERRORS.NOT_FOUND,
      });
    }

    const { investigator_guid, notes } = req.body;

    if (!investigator_guid || !notes) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_ALERTS_CODES.VALIDATION_FAILED,
        message: 'investigator_guid and notes are required',
      });
    }

    const investigator = await User._load(investigator_guid, true);
    if (!investigator) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: FRAUD_ALERTS_CODES.INVESTIGATOR_NOT_FOUND,
        message: 'Investigator not found',
      });
    }

    await alert.investigate(investigator.getId()!, notes);

    return R.handleSuccess(res, {
      message: 'Alert investigated successfully',
      alert: await alert.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_ALERTS_CODES.INVESTIGATION_FAILED,
      message: error.message,
    });
  }
});

router.patch('/:guid/false-positive', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    if (!FraudAlertsValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_ALERTS_CODES.INVALID_GUID,
        message: FRAUD_ALERTS_ERRORS.GUID_INVALID,
      });
    }

    const alert = await FraudAlerts._load(req.params.guid, true);
    if (!alert) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: FRAUD_ALERTS_CODES.ALERT_NOT_FOUND,
        message: FRAUD_ALERTS_ERRORS.NOT_FOUND,
      });
    }

    const { investigator_guid, reason } = req.body;

    if (!investigator_guid || !reason) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_ALERTS_CODES.VALIDATION_FAILED,
        message: 'investigator_guid and reason are required',
      });
    }

    const investigator = await User._load(investigator_guid, true);
    if (!investigator) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: FRAUD_ALERTS_CODES.INVESTIGATOR_NOT_FOUND,
        message: 'Investigator not found',
      });
    }

    await alert.markFalsePositive(investigator.getId()!, reason);

    return R.handleSuccess(res, {
      message: 'Alert marked as false positive',
      alert: await alert.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_ALERTS_CODES.INVESTIGATION_FAILED,
      message: error.message,
    });
  }
});

// === STATISTIQUES ===

router.get('/statistics/overview', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;

    const statistics = await FraudAlerts.getStatistics(startDate, endDate);

    return R.handleSuccess(res, {
      period: startDate && endDate ? { start: startDate, end: endDate } : 'all_time',
      statistics,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_ALERTS_CODES.STATISTICS_FAILED,
      message: error.message,
    });
  }
});

// === UTILISATEURS SUSPECTS ===

router.get('/analysis/suspicious-users', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { min_alerts = 5, days = 30 } = req.query;

    const minAlerts = parseInt(min_alerts as string, 10);
    const analysisDays = parseInt(days as string, 10);

    const suspiciousUsers = await FraudAlerts.detectSuspiciousUsers(minAlerts, analysisDays);

    return R.handleSuccess(res, {
      analysis_params: {
        min_alerts: minAlerts,
        days: analysisDays,
      },
      suspicious_users_count: suspiciousUsers.length,
      users: suspiciousUsers,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_ALERTS_CODES.ANALYSIS_FAILED,
      message: error.message,
    });
  }
});

// === PATTERNS UTILISATEUR ===

router.get(
  '/analysis/user/:userGuid/patterns',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      if (!FraudAlertsValidationUtils.validateGuid(req.params.userGuid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: FRAUD_ALERTS_CODES.INVALID_GUID,
          message: FRAUD_ALERTS_ERRORS.GUID_INVALID,
        });
      }

      const userObj = await User._load(req.params.userGuid, true);
      if (!userObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: FRAUD_ALERTS_CODES.USER_NOT_FOUND,
          message: 'User not found',
        });
      }

      const { days = 30 } = req.query;
      const analysisDays = parseInt(days as string, 10);

      const patterns = await FraudAlerts.analyzeUserPatterns(userObj.getId()!, analysisDays);

      return R.handleSuccess(res, {
        user: userObj.toPublicJSON(),
        patterns,
      });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: FRAUD_ALERTS_CODES.ANALYSIS_FAILED,
        message: error.message,
      });
    }
  },
);

// === SUPPRESSION (ADMIN UNIQUEMENT) ===

router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    if (!FraudAlertsValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_ALERTS_CODES.INVALID_GUID,
        message: FRAUD_ALERTS_ERRORS.GUID_INVALID,
      });
    }

    const alert = await FraudAlerts._load(req.params.guid, true);
    if (!alert) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: FRAUD_ALERTS_CODES.ALERT_NOT_FOUND,
        message: FRAUD_ALERTS_ERRORS.NOT_FOUND,
      });
    }

    await alert.delete();

    return R.handleSuccess(res, {
      message: 'Fraud alert deleted successfully',
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_ALERTS_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

export default router;
