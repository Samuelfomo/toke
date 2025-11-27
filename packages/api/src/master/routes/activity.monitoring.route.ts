import { Request, Response, Router } from 'express';
import {
  ACTIVITY_MONITORING_CODES,
  ACTIVITY_MONITORING_ERRORS,
  ActivityMonitoringValidationUtils,
  ActivityStatus,
  HttpStatus,
} from '@toke/shared';

import ActivityMonitoring from '../class/ActivityMonitoring.js';
import Ensure from '../../middle/ensured-routes.js';
import Revision from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';
import R from '../../tools/response.js';

const router = Router();

// ==================== UTILITY ENDPOINTS ====================

// Get revision
router.get('/revision', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.ACTIVITY_MONITORING);
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

// ==================== READ OPERATIONS ====================

// Get activity monitoring by ID
router.get('/:id', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let validatedId: number;
    try {
      validatedId = ActivityMonitoringValidationUtils.validateId(id);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ACTIVITY_MONITORING_CODES.INVALID_ID,
        message: error.message,
      });
    }

    const activityMonitoring = await ActivityMonitoring._load(validatedId);

    if (!activityMonitoring) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ACTIVITY_MONITORING_CODES.ACTIVITY_MONITORING_NOT_FOUND,
        message: ACTIVITY_MONITORING_ERRORS.NOT_FOUND,
      });
    }

    const jsonData = await activityMonitoring.toJSON();
    R.handleSuccess(res, jsonData);
  } catch (error: any) {
    console.error('⚠️ Error retrieving activity monitoring:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ACTIVITY_MONITORING_CODES.SEARCH_FAILED,
      message: ACTIVITY_MONITORING_ERRORS.SEARCH_FAILED,
      details: error.message,
    });
  }
});

// Get activity monitoring by employee master and date
router.get(
  '/employee/:employee_license/date/:monitoring_date',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { employee_license, monitoring_date } = req.params;

      let employeeLicenseId: number;
      try {
        employeeLicenseId =
          ActivityMonitoringValidationUtils.validateEmployeeLicense(employee_license);
      } catch (error: any) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ACTIVITY_MONITORING_CODES.INVALID_EMPLOYEE_LICENSE,
          message: error.message,
        });
      }

      let date: Date;
      try {
        date = ActivityMonitoringValidationUtils.validateDate(monitoring_date);
      } catch (error: any) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ACTIVITY_MONITORING_CODES.INVALID_DATE,
          message: error.message,
        });
      }

      const activityMonitoring = await ActivityMonitoring._loadByEmployeeLicenseAndDate(
        employeeLicenseId,
        date,
      );

      if (!activityMonitoring) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: ACTIVITY_MONITORING_CODES.ACTIVITY_MONITORING_NOT_FOUND,
          message: ACTIVITY_MONITORING_ERRORS.NOT_FOUND,
        });
      }

      const jsonData = await activityMonitoring.toJSON();
      R.handleSuccess(res, jsonData);
    } catch (error: any) {
      console.error('⚠️ Error retrieving activity monitoring by employee and date:', error);
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ACTIVITY_MONITORING_CODES.SEARCH_FAILED,
        message: ACTIVITY_MONITORING_ERRORS.SEARCH_FAILED,
        details: error.message,
      });
    }
  },
);

// ==================== LIST OPERATIONS ====================

// List with filters and pagination
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit, ...filters } = req.query;

    // Validate pagination
    let paginationOptions;
    try {
      paginationOptions = ActivityMonitoringValidationUtils.validatePagination(
        offset as string,
        limit as string,
      );
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ACTIVITY_MONITORING_CODES.PAGINATION_INVALID,
        message: error.message,
      });
    }

    // Validate and clean filters
    let cleanedFilters: any = {};
    if (Object.keys(filters).length > 0) {
      try {
        cleanedFilters = ActivityMonitoringValidationUtils.validateFilters(filters);
      } catch (error: any) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ACTIVITY_MONITORING_CODES.INVALID_FILTERS,
          message: error.message,
        });
      }
    }

    const records = await ActivityMonitoring._list(cleanedFilters, paginationOptions);

    if (!records) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
      });
    }

    const items = await Promise.all(records.map(async (record) => await record.toJSON()));

    R.handleSuccess(res, {
      items,
      pagination: paginationOptions,
      count: items.length,
    });
  } catch (error: any) {
    console.error('⚠️ Error listing latest activity monitoring by employee:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ACTIVITY_MONITORING_CODES.LISTING_FAILED,
      message: ACTIVITY_MONITORING_ERRORS.LISTING_FAILED,
      details: error.message,
    });
  }
});

// ==================== ANALYTICS & STATISTICS ====================

// Get activity summary for a specific date
router.get('/analytics/summary', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    let targetDate: Date | undefined;
    if (date) {
      try {
        targetDate = ActivityMonitoringValidationUtils.validateDate(date as string);
      } catch (error: any) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ACTIVITY_MONITORING_CODES.INVALID_DATE,
          message: error.message,
        });
      }
    }

    const summary = await ActivityMonitoring._getActivitySummary(targetDate);

    R.handleSuccess(res, {
      summary,
      date: targetDate || new Date(),
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('⚠️ Error retrieving activity summary:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ACTIVITY_MONITORING_CODES.STATISTICS_FAILED,
      message: 'Failed to retrieve activity summary',
      details: error.message,
    });
  }
});

// Get punch statistics for a period
router.get(
  '/analytics/statistics/:startDate/:endDate',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.params;

      let start: Date, end: Date;
      try {
        const dateRange = ActivityMonitoringValidationUtils.validateDateRange(startDate, endDate);
        start = dateRange.start;
        end = dateRange.end;
      } catch (error: any) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ACTIVITY_MONITORING_CODES.INVALID_DATE,
          message: error.message,
        });
      }

      const stats = await ActivityMonitoring._getPunchStatistics(start, end);

      R.handleSuccess(res, {
        statistics: stats,
        period: { start, end },
        generated_at: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('⚠️ Error retrieving punch statistics:', error);
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ACTIVITY_MONITORING_CODES.STATISTICS_FAILED,
        message: 'Failed to retrieve punch statistics',
        details: error.message,
      });
    }
  },
);

// Get risk assessment dashboard
router.get('/analytics/risk-dashboard', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    let targetDate: Date | undefined;
    if (date) {
      try {
        targetDate = ActivityMonitoringValidationUtils.validateDate(date as string);
      } catch (error: any) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ACTIVITY_MONITORING_CODES.INVALID_DATE,
          message: error.message,
        });
      }
    }

    const [summary, latestRecords] = await Promise.all([
      ActivityMonitoring._getActivitySummary(targetDate),
      ActivityMonitoring._listLatestByEmployee(),
    ]);

    if (!latestRecords) {
      return R.handleSuccess(res, {
        summary,
        risk_distribution: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        attention_required: 0,
        date: targetDate || new Date(),
      });
    }

    // Calculate risk distribution
    const riskDistribution = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    let attentionRequired = 0;

    latestRecords.forEach((record) => {
      const riskLevel = record.getRiskLevel();
      riskDistribution[riskLevel]++;
      if (record.requiresAttention()) {
        attentionRequired++;
      }
    });

    R.handleSuccess(res, {
      summary,
      risk_distribution: riskDistribution,
      attention_required: attentionRequired,
      total_monitored: latestRecords.length,
      date: targetDate || new Date(),
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('⚠️ Error generating risk assessment dashboard:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ACTIVITY_MONITORING_CODES.STATISTICS_FAILED,
      message: 'Failed to generate risk assessment dashboard',
      details: error.message,
    });
  }
});

// ==================== ATTENTION & ALERTS ====================

// Get employees requiring attention
router.get('/alerts/attention-required', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit } = req.query;

    let paginationOptions;
    try {
      paginationOptions = ActivityMonitoringValidationUtils.validatePagination(
        offset as string,
        limit as string,
      );
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ACTIVITY_MONITORING_CODES.PAGINATION_INVALID,
        message: error.message,
      });
    }

    const latestRecords = await ActivityMonitoring._listLatestByEmployee();

    if (!latestRecords) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
      });
    }

    // Filter and sort employees requiring attention
    const employeesRequiringAttention = latestRecords
      .filter((record) => record.requiresAttention())
      .sort((a, b) => a.getAttentionPriority() - b.getAttentionPriority())
      .slice(paginationOptions.offset, paginationOptions.offset + paginationOptions.limit);

    const items = await Promise.all(
      employeesRequiringAttention.map(async (record) => ({
        ...(await record.toJSON()),
        attention_priority: record.getAttentionPriority(),
        risk_level: record.getRiskLevel(),
        action_recommendations: record.getActionRecommendations(),
      })),
    );

    R.handleSuccess(res, {
      items,
      pagination: {
        ...paginationOptions,
        count: items.length,
        total_requiring_attention: latestRecords.filter((r) => r.requiresAttention()).length,
      },
    });
  } catch (error: any) {
    console.error('⚠️ Error listing employees requiring attention:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ACTIVITY_MONITORING_CODES.LISTING_FAILED,
      message: 'Failed to list employees requiring attention',
      details: error.message,
    });
  }
});

// List suspicious employees (shortcut for status=SUSPICIOUS)
router.get('/alerts/suspicious', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit } = req.query;

    let paginationOptions;
    try {
      paginationOptions = ActivityMonitoringValidationUtils.validatePagination(
        offset as string,
        limit as string,
      );
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ACTIVITY_MONITORING_CODES.PAGINATION_INVALID,
        message: error.message,
      });
    }

    const records = await ActivityMonitoring._listSuspiciousEmployees(paginationOptions);

    if (!records) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
      });
    }

    const items = await Promise.all(records.map(async (record) => await record.toJSON()));

    R.handleSuccess(res, {
      items,
      pagination: paginationOptions,
      count: items.length,
      status: ActivityStatus.SUSPICIOUS,
    });
  } catch (error: any) {
    console.error('⚠️ Error listing suspicious employees:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ACTIVITY_MONITORING_CODES.LISTING_FAILED,
      message: ACTIVITY_MONITORING_ERRORS.LISTING_FAILED,
      details: error.message,
    });
  }
});

// ==================== UPDATE OPERATIONS ====================

// Update activity monitoring status (limited capability)
router.put('/:id', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status_at_date } = req.body;

    let validatedId: number;
    try {
      validatedId = ActivityMonitoringValidationUtils.validateId(id);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ACTIVITY_MONITORING_CODES.INVALID_ID,
        message: error.message,
      });
    }

    const activityMonitoring = await ActivityMonitoring._load(validatedId);
    if (!activityMonitoring) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ACTIVITY_MONITORING_CODES.ACTIVITY_MONITORING_NOT_FOUND,
        message: ACTIVITY_MONITORING_ERRORS.NOT_FOUND,
      });
    }

    // Only allow status updates
    if (status_at_date !== undefined) {
      try {
        const validatedStatus =
          ActivityMonitoringValidationUtils.validateActivityStatus(status_at_date);
        activityMonitoring.setStatusAtDate(validatedStatus);
      } catch (error: any) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ACTIVITY_MONITORING_CODES.INVALID_STATUS,
          message: error.message,
        });
      }
    } else {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ACTIVITY_MONITORING_CODES.VALIDATION_FAILED,
        message: 'No valid fields provided for update',
      });
    }

    await activityMonitoring.save();
    const jsonData = await activityMonitoring.toJSON();

    R.handleSuccess(res, jsonData);
  } catch (error: any) {
    console.error('⚠️ Error updating activity monitoring:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ACTIVITY_MONITORING_CODES.UPDATE_FAILED,
      message: ACTIVITY_MONITORING_ERRORS.UPDATE_FAILED,
      details: error.message,
    });
  }
});

// ==================== DELETE OPERATIONS ====================

// List by employee master
router.get('/employee/:employee_license', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { employee_license } = req.params;
    const { offset, limit } = req.query;

    let employeeLicenseId: number;
    try {
      employeeLicenseId =
        ActivityMonitoringValidationUtils.validateEmployeeLicense(employee_license);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ACTIVITY_MONITORING_CODES.INVALID_EMPLOYEE_LICENSE,
        message: error.message,
      });
    }

    let paginationOptions;
    try {
      paginationOptions = ActivityMonitoringValidationUtils.validatePagination(
        offset as string,
        limit as string,
      );
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ACTIVITY_MONITORING_CODES.PAGINATION_INVALID,
        message: error.message,
      });
    }

    const records = await ActivityMonitoring._listByEmployeeLicense(
      employeeLicenseId,
      paginationOptions,
    );

    if (!records) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
        employee_license: employeeLicenseId,
      });
    }

    const items = await Promise.all(records.map(async (record) => await record.toJSON()));

    R.handleSuccess(res, {
      items,
      pagination: paginationOptions,
      count: items.length,
      employee_license: employeeLicenseId,
    });
  } catch (error: any) {
    console.error('⚠️ Error listing activity monitoring by employee master:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ACTIVITY_MONITORING_CODES.LISTING_FAILED,
      message: ACTIVITY_MONITORING_ERRORS.LISTING_FAILED,
      details: error.message,
    });
  }
});

// List by status
router.get('/status/:status', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const { offset, limit } = req.query;

    let activityStatus: ActivityStatus;
    try {
      activityStatus = ActivityMonitoringValidationUtils.validateActivityStatus(status);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ACTIVITY_MONITORING_CODES.INVALID_STATUS,
        message: error.message,
      });
    }

    let paginationOptions;
    try {
      paginationOptions = ActivityMonitoringValidationUtils.validatePagination(
        offset as string,
        limit as string,
      );
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ACTIVITY_MONITORING_CODES.PAGINATION_INVALID,
        message: error.message,
      });
    }

    const records = await ActivityMonitoring._listByActivityStatus(
      activityStatus,
      paginationOptions,
    );

    if (!records) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
        status: activityStatus,
      });
    }

    const items = await Promise.all(records.map(async (record) => await record.toJSON()));

    R.handleSuccess(res, {
      items,
      pagination: paginationOptions,
      count: items.length,
      status: activityStatus,
    });
  } catch (error: any) {
    console.error('⚠️ Error listing activity monitoring by status:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ACTIVITY_MONITORING_CODES.LISTING_FAILED,
      message: ACTIVITY_MONITORING_ERRORS.LISTING_FAILED,
      details: error.message,
    });
  }
});

// List between dates
router.get('/period/:startDate/:endDate', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.params;
    const { offset, limit } = req.query;

    let start: Date, end: Date;
    try {
      const dateRange = ActivityMonitoringValidationUtils.validateDateRange(startDate, endDate);
      start = dateRange.start;
      end = dateRange.end;
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ACTIVITY_MONITORING_CODES.INVALID_DATE,
        message: error.message,
      });
    }

    let paginationOptions;
    try {
      paginationOptions = ActivityMonitoringValidationUtils.validatePagination(
        offset as string,
        limit as string,
      );
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ACTIVITY_MONITORING_CODES.PAGINATION_INVALID,
        message: error.message,
      });
    }

    const records = await ActivityMonitoring._listBetweenDates(start, end, paginationOptions);

    if (!records) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
        period: { start, end },
      });
    }

    const items = await Promise.all(records.map(async (record) => await record.toJSON()));

    R.handleSuccess(res, {
      items,
      pagination: paginationOptions,
      count: items.length,
      period: { start, end },
    });
  } catch (error: any) {
    console.error('⚠️ Error listing activity monitoring between dates:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ACTIVITY_MONITORING_CODES.LISTING_FAILED,
      message: ACTIVITY_MONITORING_ERRORS.LISTING_FAILED,
      details: error.message,
    });
  }
});

export default router;
