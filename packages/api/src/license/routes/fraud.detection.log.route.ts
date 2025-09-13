import { Request, Response, Router } from 'express';
import {
  FD,
  FRAUD_DETECTION_CODES,
  FRAUD_DETECTION_DEFAULTS,
  FRAUD_DETECTION_ERRORS,
  FraudDetection,
  FraudDetectionValidationUtils,
  HttpStatus,
  RiskLevel
} from '@toke/shared';

import FraudDetectionLog from '../class/FraudDetectionLog.js';
import Ensure from '../middle/ensured-routes.js';
import Revision from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';
import R from '../../tools/response.js';
// import Tenant from '../class/Tenant.js';

const router = Router();

// Get revision
router.get('/revision', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.FRAUD_DETECTION_LOG);
    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error retrieving revision:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'failed_to_get_revision',
      message: 'Failed to get current revision',
    });
  }
});

// Export fraud detection logs
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit, tenant, risk_level, resolved, detection_type } = req.query;

    const paginationOptions = {
      offset: offset ? parseInt(offset as string) : FRAUD_DETECTION_DEFAULTS.PAGINATION.OFFSET,
      limit: limit ? Math.min(parseInt(limit as string), FRAUD_DETECTION_DEFAULTS.PAGINATION.MAX_LIMIT) : FRAUD_DETECTION_DEFAULTS.PAGINATION.LIMIT,
    };

    const filters: any = {};
    if (risk_level && Object.values(RiskLevel).includes(risk_level as RiskLevel)) {
      filters.risk_level = risk_level as RiskLevel;
    }
    if (resolved === 'true' || resolved === 'false') {
      filters.resolved = resolved === 'true';
    }
    if (detection_type && Object.values(FraudDetection).includes(detection_type as FraudDetection)) {
      filters.detection_type = detection_type as FraudDetection;
    }

    const tenantId = tenant ? parseInt(tenant as string) : undefined;
    const exportData = await FraudDetectionLog.exportable(tenantId, filters, paginationOptions);

    R.handleSuccess(res, exportData);
  } catch (error: any) {
    console.error('❌ Error exporting fraud detection logs:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_DETECTION_CODES.EXPORT_FAILED,
      message: FRAUD_DETECTION_ERRORS.EXPORT_FAILED,
      details: error.message,
    });
  }
});

// List fraud detection logs with filters
router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit, ...filters } = req.query;

    // Validate pagination
    const paginationOptions = {
      offset: offset ? parseInt(offset as string) : FRAUD_DETECTION_DEFAULTS.PAGINATION.OFFSET,
      limit: limit ? Math.min(parseInt(limit as string), FRAUD_DETECTION_DEFAULTS.PAGINATION.MAX_LIMIT) : FRAUD_DETECTION_DEFAULTS.PAGINATION.LIMIT,
    };

    if (paginationOptions.offset < 0 || paginationOptions.limit <= 0) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_DETECTION_CODES.PAGINATION_INVALID,
        message: FRAUD_DETECTION_ERRORS.PAGINATION_INVALID,
      });
    }

    // Validate and clean filters
    let cleanedFilters: any = {};
    if (Object.keys(filters).length > 0) {
      try {
        cleanedFilters = FD.validateFraudDetectionFilters(filters);
      } catch (error: any) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: FRAUD_DETECTION_CODES.FILTER_INVALID,
          message: error.message,
        });
      }
    }

    const fraudLogs = await FraudDetectionLog._list(cleanedFilters, paginationOptions);

    if (!fraudLogs) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
      });
    }

    const items = await Promise.all(
      fraudLogs.map(async log => await log.toJSON())
    );

    R.handleSuccess(res, {
      items,
      pagination: paginationOptions,
      count: items.length,
    });
  } catch (error: any) {
    console.error('❌ Error listing fraud detection logs:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_DETECTION_CODES.LISTING_FAILED,
      message: FRAUD_DETECTION_ERRORS.LISTING_FAILED,
      details: error.message,
    });
  }
});

// Get fraud detection log by ID
router.get('/:id', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID
    let validatedId: number;
    try {
      validatedId = FD.validateFraudDetectionLogId(id);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_DETECTION_CODES.INVALID_ID,
        message: error.message,
      });
    }

    const fraudLog = await FraudDetectionLog._load(validatedId);

    if (!fraudLog) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: FRAUD_DETECTION_CODES.FRAUD_LOG_NOT_FOUND,
        message: FRAUD_DETECTION_ERRORS.NOT_FOUND,
      });
    }

    const jsonData = await fraudLog.toJSON();
    R.handleSuccess(res, jsonData);
  } catch (error: any) {
    console.error('❌ Error retrieving fraud detection log:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_DETECTION_CODES.SEARCH_FAILED,
      message: 'Failed to retrieve fraud detection log',
      details: error.message,
    });
  }
});

// Update fraud detection log (administrative fields only)
router.put('/:id', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID
    let validatedId: number;
    try {
      validatedId = FD.validateFraudDetectionLogId(id);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_DETECTION_CODES.INVALID_ID,
        message: error.message,
      });
    }

    // Load existing fraud log
    const fraudLog = await FraudDetectionLog._load(validatedId);
    if (!fraudLog) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: FRAUD_DETECTION_CODES.FRAUD_LOG_NOT_FOUND,
        message: FRAUD_DETECTION_ERRORS.NOT_FOUND,
      });
    }

    // Validate and clean input data (only administrative fields)
    let validatedData: any;
    try {
      const cleanedData = FraudDetectionValidationUtils.cleanFraudDetectionAdminData(req.body);
      validatedData = FD.validateFraudDetectionUpdate(cleanedData);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_DETECTION_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    }

    // Update administrative fields only
    if (validatedData.action_taken !== undefined) {
      fraudLog.setActionTaken(validatedData.action_taken);
    }
    if (validatedData.notes !== undefined) {
      fraudLog.setNotes(validatedData.notes);
    }
    if (validatedData.resolved_at !== undefined) {
      fraudLog.setResolvedAt(validatedData.resolved_at);
    }
    if (validatedData.resolved_by !== undefined) {
      fraudLog.setResolvedBy(validatedData.resolved_by);
    }

    await fraudLog.save();
    const jsonData = await fraudLog.toJSON();

    R.handleSuccess(res, jsonData);
  } catch (error: any) {
    console.error('❌ Error updating fraud detection log:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_DETECTION_CODES.UPDATE_FAILED,
      message: FRAUD_DETECTION_ERRORS.UPDATE_FAILED,
      details: error.message,
    });
  }
});

// Delete fraud detection log (admin only)
router.delete('/:id', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID
    let validatedId: number;
    try {
      validatedId = FD.validateFraudDetectionLogId(id);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_DETECTION_CODES.INVALID_ID,
        message: error.message,
      });
    }

    // Load existing fraud log
    const fraudLog = await FraudDetectionLog._load(validatedId);
    if (!fraudLog) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: FRAUD_DETECTION_CODES.FRAUD_LOG_NOT_FOUND,
        message: FRAUD_DETECTION_ERRORS.NOT_FOUND,
      });
    }

    const success = await fraudLog.delete();
    if (!success) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: FRAUD_DETECTION_CODES.DELETE_FAILED,
        message: FRAUD_DETECTION_ERRORS.DELETE_FAILED,
      });
    }

    R.handleSuccess(res, {
      message: 'Fraud detection log deleted successfully',
      id: validatedId,
    });
  } catch (error: any) {
    console.error('❌ Error deleting fraud detection log:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_DETECTION_CODES.DELETE_FAILED,
      message: FRAUD_DETECTION_ERRORS.DELETE_FAILED,
      details: error.message,
    });
  }
});

// List fraud detection logs by tenant
router.get('/tenant/:tenantId', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { offset, limit } = req.query;

    const tenant = parseInt(tenantId);
    if (!FraudDetectionValidationUtils.validateTenantId(tenant)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_DETECTION_CODES.TENANT_INVALID,
        message: FRAUD_DETECTION_ERRORS.TENANT_INVALID,
      });
    }

    const paginationOptions = {
      offset: offset ? parseInt(offset as string) : FRAUD_DETECTION_DEFAULTS.PAGINATION.OFFSET,
      limit: limit ? Math.min(parseInt(limit as string), FRAUD_DETECTION_DEFAULTS.PAGINATION.MAX_LIMIT) : FRAUD_DETECTION_DEFAULTS.PAGINATION.LIMIT,
    };

    const fraudLogs = await FraudDetectionLog._listByTenant(tenant, paginationOptions);

    if (!fraudLogs) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
      });
    }

    const items = await Promise.all(
      fraudLogs.map(log => log.toJSON())
    );

    R.handleSuccess(res, {
      items,
      pagination: paginationOptions,
      count: items.length,
    });
  } catch (error: any) {
    console.error('❌ Error listing fraud detection logs by tenant:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_DETECTION_CODES.LISTING_FAILED,
      message: 'Failed to list fraud detection logs',
      details: error.message,
    });
  }
});

// List fraud detection logs by detection type
router.get('/type/:detectionType', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { detectionType } = req.params;
    const { offset, limit } = req.query;

    if (!Object.values(FraudDetection).includes(detectionType as FraudDetection)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_DETECTION_CODES.DETECTION_TYPE_INVALID,
        message: FRAUD_DETECTION_ERRORS.DETECTION_TYPE_INVALID,
      });
    }

    const paginationOptions = {
      offset: offset ? parseInt(offset as string) : FRAUD_DETECTION_DEFAULTS.PAGINATION.OFFSET,
      limit: limit ? Math.min(parseInt(limit as string), FRAUD_DETECTION_DEFAULTS.PAGINATION.MAX_LIMIT) : FRAUD_DETECTION_DEFAULTS.PAGINATION.LIMIT,
    };

    const fraudLogs = await FraudDetectionLog._listByDetectionType(detectionType as FraudDetection, paginationOptions);

    if (!fraudLogs) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
      });
    }

    const items = await Promise.all(
      fraudLogs.map(log => log.toJSON())
    );

    R.handleSuccess(res, {
      items,
      pagination: paginationOptions,
      count: items.length,
    });
  } catch (error: any) {
    console.error('❌ Error listing fraud detection logs by type:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_DETECTION_CODES.LISTING_FAILED,
      message: 'Failed to list fraud detection logs',
      details: error.message,
    });
  }
});

// List fraud detection logs by risk level
router.get('/risk/:riskLevel', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { riskLevel } = req.params;
    const { offset, limit } = req.query;

    if (!Object.values(RiskLevel).includes(riskLevel as RiskLevel)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_DETECTION_CODES.RISK_LEVEL_INVALID,
        message: FRAUD_DETECTION_ERRORS.RISK_LEVEL_INVALID,
      });
    }

    const paginationOptions = {
      offset: offset ? parseInt(offset as string) : FRAUD_DETECTION_DEFAULTS.PAGINATION.OFFSET,
      limit: limit ? Math.min(parseInt(limit as string), FRAUD_DETECTION_DEFAULTS.PAGINATION.MAX_LIMIT) : FRAUD_DETECTION_DEFAULTS.PAGINATION.LIMIT,
    };

    const fraudLogs = await FraudDetectionLog._listByRiskLevel(riskLevel as RiskLevel, paginationOptions);

    if (!fraudLogs) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
      });
    }

    const items = await Promise.all(
      fraudLogs.map(log => log.toJSON())
    );

    R.handleSuccess(res, {
      items,
      pagination: paginationOptions,
      count: items.length,
    });
  } catch (error: any) {
    console.error('❌ Error listing fraud detection logs by risk level:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_DETECTION_CODES.LISTING_FAILED,
      message: 'Failed to list fraud detection logs',
      details: error.message,
    });
  }
});

// List unresolved fraud detection logs
router.get('/status/unresolved', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit, tenant } = req.query;

    const paginationOptions = {
      offset: offset ? parseInt(offset as string) : FRAUD_DETECTION_DEFAULTS.PAGINATION.OFFSET,
      limit: limit ? Math.min(parseInt(limit as string), FRAUD_DETECTION_DEFAULTS.PAGINATION.MAX_LIMIT) : FRAUD_DETECTION_DEFAULTS.PAGINATION.LIMIT,
    };

    const tenantId = tenant ? parseInt(tenant as string) : undefined;
    const fraudLogs = await FraudDetectionLog._listUnresolved(tenantId, paginationOptions);

    if (!fraudLogs) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
      });
    }

    const items = await Promise.all(
      fraudLogs.map(log => log.toJSON())
    );

    R.handleSuccess(res, {
      items,
      pagination: paginationOptions,
      count: items.length,
    });
  } catch (error: any) {
    console.error('❌ Error listing unresolved fraud detection logs:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_DETECTION_CODES.LISTING_FAILED,
      message: 'Failed to list unresolved fraud detection logs',
      details: error.message,
    });
  }
});

// List critical unresolved fraud detection logs
router.get('/status/critical', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit, tenant } = req.query;

    const paginationOptions = {
      offset: offset ? parseInt(offset as string) : FRAUD_DETECTION_DEFAULTS.PAGINATION.OFFSET,
      limit: limit ? Math.min(parseInt(limit as string), FRAUD_DETECTION_DEFAULTS.PAGINATION.MAX_LIMIT) : FRAUD_DETECTION_DEFAULTS.PAGINATION.LIMIT,
    };

    const tenantId = tenant ? parseInt(tenant as string) : undefined;
    const fraudLogs = await FraudDetectionLog._listCriticalUnresolved(tenantId, paginationOptions);

    if (!fraudLogs) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
      });
    }

    const items = await Promise.all(
      fraudLogs.map(log => log.toJSON())
    );

    R.handleSuccess(res, {
      items,
      pagination: paginationOptions,
      count: items.length,
    });
  } catch (error: any) {
    console.error('❌ Error listing critical fraud detection logs:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_DETECTION_CODES.LISTING_FAILED,
      message: 'Failed to list critical fraud detection logs',
      details: error.message,
    });
  }
});

// List fraud detection logs by employee
router.get('/employee/:employeeId', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { offset, limit } = req.query;

    if (!FraudDetectionValidationUtils.validateEmployee(employeeId)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_DETECTION_CODES.EMPLOYEE_INVALID,
        message: FRAUD_DETECTION_ERRORS.EMPLOYEE_INVALID,
      });
    }

    const paginationOptions = {
      offset: offset ? parseInt(offset as string) : FRAUD_DETECTION_DEFAULTS.PAGINATION.OFFSET,
      limit: limit ? Math.min(parseInt(limit as string), FRAUD_DETECTION_DEFAULTS.PAGINATION.MAX_LIMIT) : FRAUD_DETECTION_DEFAULTS.PAGINATION.LIMIT,
    };

    const fraudLogs = await FraudDetectionLog._listByEmployee(employeeId, paginationOptions);

    if (!fraudLogs) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
      });
    }

    const items = await Promise.all(
      fraudLogs.map(log => log.toJSON())
    );

    R.handleSuccess(res, {
      items,
      pagination: paginationOptions,
      count: items.length,
    });
  } catch (error: any) {
    console.error('❌ Error listing fraud detection logs by employee:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_DETECTION_CODES.LISTING_FAILED,
      message: 'Failed to list fraud detection logs',
      details: error.message,
    });
  }
});

// Get alert summary for tenant
router.get('/stats/summary/:tenantId', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const tenant = parseInt(tenantId);
    if (!FraudDetectionValidationUtils.validateTenantId(tenant)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_DETECTION_CODES.TENANT_INVALID,
        message: FRAUD_DETECTION_ERRORS.TENANT_INVALID,
      });
    }

    const stats = await FraudDetectionLog._getAlertSummary(tenant);
    R.handleSuccess(res, {
      tenant: tenant,
      alert_statistics: stats,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error retrieving alert summary:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_DETECTION_CODES.SEARCH_FAILED,
      message: 'Failed to retrieve alert summary',
      details: error.message,
    });
  }
});

// Resolve fraud detection alert
router.patch('/resolve/:id', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolved_by, action_taken } = req.body;

    // Validate ID
    let validatedId: number;
    try {
      validatedId = FD.validateFraudDetectionLogId(id);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_DETECTION_CODES.INVALID_ID,
        message: error.message,
      });
    }

    if (!resolved_by || !FraudDetectionValidationUtils.validateResolvedBy(resolved_by)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_DETECTION_CODES.RESOLVED_BY_INVALID,
        message: FRAUD_DETECTION_ERRORS.RESOLVED_BY_INVALID,
      });
    }

    if (action_taken && !FraudDetectionValidationUtils.validateActionTaken(action_taken)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_DETECTION_CODES.ACTION_TAKEN_INVALID,
        message: FRAUD_DETECTION_ERRORS.ACTION_TAKEN_INVALID,
      });
    }

    const success = await FraudDetectionLog._resolveAlert(
      validatedId,
      parseInt(resolved_by),
      action_taken
    );

    if (!success) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: FRAUD_DETECTION_CODES.FRAUD_LOG_NOT_FOUND,
        message: FRAUD_DETECTION_ERRORS.NOT_FOUND,
      });
    }

    R.handleSuccess(res, {
      message: 'Fraud detection alert resolved successfully',
      id: validatedId,
      resolved_by: parseInt(resolved_by),
      action_taken,
      resolved_at: new Date(),
    });
  } catch (error: any) {
    console.error('❌ Error resolving fraud detection alert:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_DETECTION_CODES.UPDATE_FAILED,
      message: 'Failed to resolve fraud detection alert',
      details: error.message,
    });
  }
});

// Update action taken for fraud detection alert
router.patch('/action/:id', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action_taken } = req.body;

    // Validate ID
    let validatedId: number;
    try {
      validatedId = FD.validateFraudDetectionLogId(id);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_DETECTION_CODES.INVALID_ID,
        message: error.message,
      });
    }

    if (!action_taken || !FraudDetectionValidationUtils.validateActionTaken(action_taken)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_DETECTION_CODES.ACTION_TAKEN_INVALID,
        message: FRAUD_DETECTION_ERRORS.ACTION_TAKEN_INVALID,
      });
    }

    const success = await FraudDetectionLog._updateAction(validatedId, action_taken);

    if (!success) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: FRAUD_DETECTION_CODES.FRAUD_LOG_NOT_FOUND,
        message: FRAUD_DETECTION_ERRORS.NOT_FOUND,
      });
    }

    R.handleSuccess(res, {
      message: 'Action updated successfully',
      id: validatedId,
      action_taken,
    });
  } catch (error: any) {
    console.error('❌ Error updating action:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_DETECTION_CODES.UPDATE_FAILED,
      message: 'Failed to update action',
      details: error.message,
    });
  }
});

// Update notes for fraud detection alert
router.patch('/notes/:id', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Validate ID
    let validatedId: number;
    try {
      validatedId = FD.validateFraudDetectionLogId(id);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_DETECTION_CODES.INVALID_ID,
        message: error.message,
      });
    }

    if (!notes || !FraudDetectionValidationUtils.validateNotes(notes)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: FRAUD_DETECTION_CODES.NOTES_INVALID,
        message: FRAUD_DETECTION_ERRORS.NOTES_INVALID,
      });
    }

    const success = await FraudDetectionLog._updateNotes(validatedId, notes);

    if (!success) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: FRAUD_DETECTION_CODES.FRAUD_LOG_NOT_FOUND,
        message: FRAUD_DETECTION_ERRORS.NOT_FOUND,
      });
    }

    R.handleSuccess(res, {
      message: 'Notes updated successfully',
      id: validatedId,
      notes,
    });
  } catch (error: any) {
    console.error('❌ Error updating notes:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: FRAUD_DETECTION_CODES.UPDATE_FAILED,
      message: 'Failed to update notes',
      details: error.message,
    });
  }
});

export default router;