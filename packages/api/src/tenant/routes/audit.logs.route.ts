// src/api/routes/audit.logs.route.ts

import { Request, Response, Router } from 'express';
import {
  AUDIT_LOGS_CODES,
  AUDIT_LOGS_ERRORS,
  AuditLogsValidationUtils,
  HttpStatus,
  paginationSchema,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import AuditLogs from '../class/AuditLogs.js';
import User from '../class/User.js';
import Revision from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';

const router = Router();

// === LISTAGE GÉNÉRAL ===

router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);
    const logs = await AuditLogs._list({}, paginationOptions);

    const items = logs ? await Promise.all(logs.map(async (log) => await log.toJSON())) : [];

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
      code: AUDIT_LOGS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// src/api/routes/audit.logs.route.ts (suite)

router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.AUDIT_LOGS);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: AUDIT_LOGS_CODES.REVISION_FAILED,
      message: error.message,
    });
  }
});

// === RECHERCHE PAR CRITÈRES ===

router.get('/search', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const filters = {
      table_name: req.query.table_name as string | undefined,
      user_id: req.query.user_id ? parseInt(req.query.user_id as string) : undefined,
      operation: req.query.operation as string | undefined,
      changed_by_type: req.query.changed_by_type as string | undefined,
      start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
      end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
      record_guid: req.query.record_guid as string | undefined,
      search_values: req.query.search_values as string | undefined,
    };

    const logs = await AuditLogs._searchLogs(filters);

    const items = logs ? await Promise.all(logs.map(async (log) => await log.toJSON())) : [];

    return R.handleSuccess(res, {
      filters,
      count: items.length,
      items,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: AUDIT_LOGS_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

// === PAR GUID ===

router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!AuditLogsValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: AUDIT_LOGS_CODES.INVALID_GUID,
        message: AUDIT_LOGS_ERRORS.GUID_INVALID,
      });
    }

    const log = await AuditLogs._load(req.params.guid, true);
    if (!log) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: AUDIT_LOGS_CODES.LOG_NOT_FOUND,
        message: AUDIT_LOGS_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      log: await log.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: AUDIT_LOGS_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// === PAR TABLE ===

router.get('/table/:tableName/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;

    if (!AuditLogsValidationUtils.validateTableName(tableName)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: AUDIT_LOGS_CODES.TABLE_NAME_INVALID,
        message: AUDIT_LOGS_ERRORS.TABLE_NAME_INVALID,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const logs = await AuditLogs._listByTable(tableName);

    // Pagination manuelle
    const offset = paginationOptions.offset || 0;
    const limit = paginationOptions.limit;
    const paginatedLogs = limit ? logs?.slice(offset, offset + limit) : logs?.slice(offset);

    const items = paginatedLogs
      ? await Promise.all(paginatedLogs.map(async (log) => await log.toJSON()))
      : [];

    return R.handleSuccess(res, {
      table_name: tableName,
      pagination: {
        offset,
        limit: limit || items.length,
        count: items.length,
        total: logs?.length || 0,
      },
      items,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: AUDIT_LOGS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === PAR UTILISATEUR ===

router.get('/user/:userGuid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!AuditLogsValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: AUDIT_LOGS_CODES.INVALID_GUID,
        message: AUDIT_LOGS_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(req.params.userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: AUDIT_LOGS_CODES.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const logs = await AuditLogs._listByUser(userObj.getId()!);

    const offset = paginationOptions.offset || 0;
    const limit = paginationOptions.limit;
    const paginatedLogs = limit ? logs?.slice(offset, offset + limit) : logs?.slice(offset);

    const items = paginatedLogs
      ? await Promise.all(paginatedLogs.map(async (log) => await log.toJSON()))
      : [];

    return R.handleSuccess(res, {
      user: userObj.toPublicJSON(),
      pagination: {
        offset,
        limit: limit || items.length,
        count: items.length,
        total: logs?.length || 0,
      },
      items,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: AUDIT_LOGS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === HISTORIQUE MODIFICATIONS ENREGISTREMENT ===

router.get('/record/:recordGuid/history', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { recordGuid } = req.params;
    const { table_name } = req.query;

    if (!AuditLogsValidationUtils.validateGuid(recordGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: AUDIT_LOGS_CODES.INVALID_GUID,
        message: AUDIT_LOGS_ERRORS.GUID_INVALID,
      });
    }

    if (!table_name) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: AUDIT_LOGS_CODES.TABLE_NAME_REQUIRED,
        message: AUDIT_LOGS_ERRORS.TABLE_NAME_REQUIRED,
      });
    }

    const logs = await AuditLogs.getModificationHistory(table_name as string, recordGuid);

    const items = logs ? await Promise.all(logs.map(async (log) => await log.toJSON())) : [];

    return R.handleSuccess(res, {
      record_guid: recordGuid,
      table_name,
      modification_count: items.length,
      history: items,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: AUDIT_LOGS_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// === RAPPORT ACTIVITÉ UTILISATEUR ===

router.get('/user/:userGuid/activity-report', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!AuditLogsValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: AUDIT_LOGS_CODES.INVALID_GUID,
        message: AUDIT_LOGS_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(req.params.userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: AUDIT_LOGS_CODES.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: AUDIT_LOGS_CODES.DATE_RANGE_REQUIRED,
        message: 'start_date and end_date are required',
      });
    }

    const startDate = new Date(start_date as string);
    const endDate = new Date(end_date as string);

    const report = await AuditLogs.getUserActivityReport(userObj.getId()!, startDate, endDate);

    return R.handleSuccess(res, {
      user: userObj.toPublicJSON(),
      period: {
        start: startDate,
        end: endDate,
      },
      report,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: AUDIT_LOGS_CODES.REPORT_FAILED,
      message: error.message,
    });
  }
});

// === DÉTECTION PATTERNS FRAUDULEUX ===

router.get('/fraud/detect-patterns', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { analysis_days = 30 } = req.query;
    const days = parseInt(analysis_days as string, 10);

    const patterns = await AuditLogs.detectFraudPatterns(days);

    return R.handleSuccess(res, {
      message: 'Fraud pattern detection completed',
      patterns,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: AUDIT_LOGS_CODES.DETECTION_FAILED,
      message: error.message,
    });
  }
});

// === PERFORMANCE SYSTÈME ===

router.get('/performance/analyze', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: AUDIT_LOGS_CODES.DATE_RANGE_REQUIRED,
        message: 'start_date and end_date are required',
      });
    }

    const startDate = new Date(start_date as string);
    const endDate = new Date(end_date as string);

    const performance = await AuditLogs.analyzeSystemPerformance(startDate, endDate);

    return R.handleSuccess(res, {
      message: 'System performance analysis completed',
      performance,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: AUDIT_LOGS_CODES.ANALYSIS_FAILED,
      message: error.message,
    });
  }
});

// === RGPD / COMPLIANCE ===

router.get('/gdpr/report/:userGuid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!AuditLogsValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: AUDIT_LOGS_CODES.INVALID_GUID,
        message: AUDIT_LOGS_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(req.params.userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: AUDIT_LOGS_CODES.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const report = await AuditLogs.generateGDPRReport(userObj.getId()!);

    return R.handleSuccess(res, {
      message: 'GDPR report generated successfully',
      report,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: AUDIT_LOGS_CODES.GDPR_REPORT_FAILED,
      message: error.message,
    });
  }
});

router.get(
  '/gdpr/sensitive-access/:userGuid',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      if (!AuditLogsValidationUtils.validateGuid(req.params.userGuid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: AUDIT_LOGS_CODES.INVALID_GUID,
          message: AUDIT_LOGS_ERRORS.GUID_INVALID,
        });
      }

      const userObj = await User._load(req.params.userGuid, true);
      if (!userObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: AUDIT_LOGS_CODES.USER_NOT_FOUND,
          message: 'User not found',
        });
      }

      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: AUDIT_LOGS_CODES.DATE_RANGE_REQUIRED,
          message: 'start_date and end_date are required',
        });
      }

      const startDate = new Date(start_date as string);
      const endDate = new Date(end_date as string);

      const logs = await AuditLogs.getSensitiveDataAccess(userObj.getId()!, startDate, endDate);

      const items = logs ? await Promise.all(logs.map(async (log) => await log.toJSON())) : [];

      return R.handleSuccess(res, {
        user: userObj.toPublicJSON(),
        period: { start: startDate, end: endDate },
        sensitive_access_count: items.length,
        logs: items,
      });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: AUDIT_LOGS_CODES.RETRIEVAL_FAILED,
        message: error.message,
      });
    }
  },
);

export default router;
