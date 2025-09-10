import { Request, Response, Router } from 'express';
import {
  ContractualStatus,
  EL,
  EMPLOYEE_LICENSE_CODES,
  EMPLOYEE_LICENSE_DEFAULTS,
  EMPLOYEE_LICENSE_ERRORS,
  EmployeeLicenseValidationUtils,
  GLOBAL_LICENSE_CODES,
  GLOBAL_LICENSE_ERRORS,
  HttpStatus,
  LeaveType
} from '@toke/shared';

import EmployeeLicense from '../class/EmployeeLicense.js';
import Ensure from '../middle/ensured-routes.js';
import Revision from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';
import R from '../../tools/response.js';
import GlobalLicense from '../class/GlobalLicense';

const router = Router();

// Get revision
router.get('/revision', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.EMPLOYEE_LICENSE);
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

// Export employee licenses
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit } = req.query;
    const paginationOptions = {
      offset: offset ? parseInt(offset as string) : EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.OFFSET,
      limit: limit ? Math.min(parseInt(limit as string), EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.MAX_LIMIT) : EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.LIMIT,
    };

    // const paginationOptions = paginationSchema.parse(req.query);

    const exportData = await EmployeeLicense.exportable(paginationOptions);
    R.handleSuccess(res, exportData);
  } catch (error: any) {
    console.error('❌ Error exporting employee licenses:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.EXPORT_FAILED,
      message: EMPLOYEE_LICENSE_ERRORS.EXPORT_FAILED,
      details: error.message,
    });
  }
});

// List employee licenses with filters
router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit, ...filters } = req.query;

    // Validate pagination
    const paginationOptions = {
      offset: offset ? parseInt(offset as string) : EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.OFFSET,
      limit: limit ? Math.min(parseInt(limit as string), EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.MAX_LIMIT) : EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.LIMIT,
    };

    if (paginationOptions.offset < 0 || paginationOptions.limit <= 0) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.PAGINATION_INVALID,
        message: EMPLOYEE_LICENSE_ERRORS.PAGINATION_INVALID,
      });
    }

    // Validate and clean filters
    let cleanedFilters: any = {};
    if (Object.keys(filters).length > 0) {
      try {
        cleanedFilters = EL.validateEmployeeLicenseFilters(filters);
      } catch (error: any) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: EMPLOYEE_LICENSE_CODES.FILTER_INVALID,
          message: error.message,
        });
      }
    }

    const employeeLicenses = await EmployeeLicense._list(cleanedFilters, paginationOptions);

    if (!employeeLicenses) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
      });
    }

    const items = await Promise.all(
      employeeLicenses.map(async license => await license.toJSON())
    );

    R.handleSuccess(res, {
      items,
      pagination: paginationOptions,
      count: items.length,
    });
  } catch (error: any) {
    console.error('❌ Error listing employee licenses:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.LISTING_FAILED,
      message: EMPLOYEE_LICENSE_ERRORS.VALIDATION_FAILED,
      details: error.message,
    });
  }
});

// Get employee license by GUID
router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    // Validate GUID
    let validatedGuid: number;
    try {
      validatedGuid = EL.validateEmployeeLicenseGuid(guid);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.INVALID_GUID,
        message: error.message,
      });
    }

    const employeeLicense = await EmployeeLicense._load(validatedGuid, true);

    if (!employeeLicense) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_LICENSE_NOT_FOUND,
        message: EMPLOYEE_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    const jsonData = await employeeLicense.toJSON();
    R.handleSuccess(res, jsonData);
  } catch (error: any) {
    console.error('❌ Error retrieving employee license:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.SEARCH_FAILED,
      message: 'Failed to retrieve employee license',
      details: error.message,
    });
  }
});

// Create new employee license
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    // Validate and clean input data
    let validatedData: any;
    try {
      const cleanedData = EmployeeLicenseValidationUtils.cleanEmployeeLicenseData(req.body);
      validatedData = EL.validateEmployeeLicenseCreation(cleanedData);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    }

    // Check for existing license
    const existingLicense = await EmployeeLicense._loadByEmployee(validatedData.employee);
    if (existingLicense) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_LICENSE_ALREADY_EXISTS,
        message: EMPLOYEE_LICENSE_ERRORS.DUPLICATE_LICENSE,
      });
    }

    const existingGlobalLicense = await GlobalLicense._load(validatedData.global_license, true);
    if (!existingGlobalLicense){
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
        message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
      })
    }

    // Create new employee license
    const employeeLicense = new EmployeeLicense()
      .setGlobalLicense(existingGlobalLicense.getId()!)
      .setEmployee(validatedData.employee)
      .setEmployeeCode(validatedData.employee_code)
      .setActivationDate(validatedData.activation_date)
      .setContractualStatus(validatedData.contractual_status || ContractualStatus.ACTIVE);

    // Set optional fields if provided
    if (validatedData.deactivation_date) {
      employeeLicense.setDeactivationDate(validatedData.deactivation_date);
    }
    if (validatedData.last_activity_date) {
      employeeLicense.setLastActivityDate(validatedData.last_activity_date);
    }
    if (validatedData.declared_long_leave) {
      employeeLicense.setDeclaredLongLeave(validatedData.declared_long_leave);
      if (validatedData.long_leave_declared_by) {
        employeeLicense.setLongLeaveDeclaredBy(validatedData.long_leave_declared_by);
      }
      if (validatedData.long_leave_declared_at) {
        employeeLicense.setLongLeaveDeclaredAt(validatedData.long_leave_declared_at);
      }
      if (validatedData.long_leave_type) {
        employeeLicense.setLongLeaveType(validatedData.long_leave_type);
      }
      if (validatedData.long_leave_reason) {
        employeeLicense.setLongLeaveReason(validatedData.long_leave_reason);
      }
    }
    if (validatedData.grace_period_start && validatedData.grace_period_end) {
      employeeLicense.setGracePeriodStart(validatedData.grace_period_start);
      employeeLicense.setGracePeriodEnd(validatedData.grace_period_end);
    }

    await employeeLicense.save();
    const jsonData = await employeeLicense.toJSON();

    R.handleCreated(res, jsonData);
  } catch (error: any) {
    console.error('❌ Error creating employee license:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.CREATION_FAILED,
      message: EMPLOYEE_LICENSE_ERRORS.CREATION_FAILED,
      details: error.message,
    });
  }
});

// Update employee license by GUID
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    // Validate GUID
    let validatedGuid: number;
    try {
      validatedGuid = EL.validateEmployeeLicenseGuid(guid);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.INVALID_GUID,
        message: error.message,
      });
    }

    // Load existing employee license
    const employeeLicense = await EmployeeLicense._load(validatedGuid, true);
    if (!employeeLicense) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_LICENSE_NOT_FOUND,
        message: EMPLOYEE_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    // Validate and clean input data
    let validatedData: any;
    try {
      const cleanedData = EmployeeLicenseValidationUtils.cleanEmployeeLicenseData(req.body);
      validatedData = EL.validateEmployeeLicenseUpdate(cleanedData);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    }

    // Update fields if provided
    if (validatedData.global_license !== undefined) {
      const existingGlobalLicense = await GlobalLicense._load(validatedData.global_license, true);
      if (!existingGlobalLicense){
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: GLOBAL_LICENSE_CODES.GLOBAL_LICENSE_NOT_FOUND,
          message: GLOBAL_LICENSE_ERRORS.NOT_FOUND,
        })
      }
      employeeLicense.setGlobalLicense(existingGlobalLicense.getId()!);
    }
    if (validatedData.employee !== undefined) {
      employeeLicense.setEmployee(validatedData.employee);
    }
    if (validatedData.employee_code !== undefined) {
      employeeLicense.setEmployeeCode(validatedData.employee_code);
    }
    if (validatedData.activation_date !== undefined) {
      employeeLicense.setActivationDate(validatedData.activation_date);
    }
    if (validatedData.deactivation_date !== undefined) {
      employeeLicense.setDeactivationDate(validatedData.deactivation_date);
    }
    if (validatedData.last_activity_date !== undefined) {
      employeeLicense.setLastActivityDate(validatedData.last_activity_date);
    }
    if (validatedData.contractual_status !== undefined) {
      employeeLicense.setContractualStatus(validatedData.contractual_status);
    }
    if (validatedData.declared_long_leave !== undefined) {
      employeeLicense.setDeclaredLongLeave(validatedData.declared_long_leave);
    }
    if (validatedData.long_leave_declared_by !== undefined) {
      employeeLicense.setLongLeaveDeclaredBy(validatedData.long_leave_declared_by);
    }
    if (validatedData.long_leave_declared_at !== undefined) {
      employeeLicense.setLongLeaveDeclaredAt(validatedData.long_leave_declared_at);
    }
    if (validatedData.long_leave_type !== undefined) {
      employeeLicense.setLongLeaveType(validatedData.long_leave_type);
    }
    if (validatedData.long_leave_reason !== undefined) {
      employeeLicense.setLongLeaveReason(validatedData.long_leave_reason);
    }
    if (validatedData.grace_period_start !== undefined) {
      employeeLicense.setGracePeriodStart(validatedData.grace_period_start);
    }
    if (validatedData.grace_period_end !== undefined) {
      employeeLicense.setGracePeriodEnd(validatedData.grace_period_end);
    }

    await employeeLicense.save();
    const jsonData = await employeeLicense.toJSON();

    R.handleSuccess(res, jsonData);
  } catch (error: any) {
    console.error('❌ Error updating employee license:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.UPDATE_FAILED,
      message: EMPLOYEE_LICENSE_ERRORS.UPDATE_FAILED,
      details: error.message,
    });
  }
});

// Delete employee license by GUID
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    // Validate GUID
    let validatedGuid: number;
    try {
      validatedGuid = EL.validateEmployeeLicenseGuid(guid);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.INVALID_GUID,
        message: error.message,
      });
    }

    // Load existing employee license
    const employeeLicense = await EmployeeLicense._load(validatedGuid, true);
    if (!employeeLicense) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_LICENSE_NOT_FOUND,
        message: EMPLOYEE_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    const success = await employeeLicense.delete();
    if (!success) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: EMPLOYEE_LICENSE_CODES.DELETE_FAILED,
        message: EMPLOYEE_LICENSE_ERRORS.DELETE_FAILED,
      });
    }

    R.handleSuccess(res, {
      message: 'Employee license deleted successfully',
      guid: validatedGuid,
    });
  } catch (error: any) {
    console.error('❌ Error deleting employee license:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.DELETE_FAILED,
      message: EMPLOYEE_LICENSE_ERRORS.DELETE_FAILED,
      details: error.message,
    });
  }
});

// Get employee license by employee
router.get('/employee/:employee', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { employee } = req.params;

    if (!EmployeeLicenseValidationUtils.validateEmployee(employee)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_INVALID,
        message: EMPLOYEE_LICENSE_ERRORS.EMPLOYEE_INVALID,
      });
    }

    const employeeLicense = await EmployeeLicense._loadByEmployee(employee);
    if (!employeeLicense) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_LICENSE_NOT_FOUND,
        message: EMPLOYEE_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    const jsonData = await employeeLicense.toJSON();
    R.handleSuccess(res, jsonData);
  } catch (error: any) {
    console.error('❌ Error retrieving employee license by employee ID:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.SEARCH_FAILED,
      message: 'Failed to retrieve employee license',
      details: error.message,
    });
  }
});

// Get employee license by employee code
router.get('/code/:employeeCode', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { employeeCode } = req.params;

    if (!EmployeeLicenseValidationUtils.validateEmployeeCode(employeeCode)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_CODE_INVALID,
        message: EMPLOYEE_LICENSE_ERRORS.EMPLOYEE_CODE_INVALID,
      });
    }

    const employeeLicense = await EmployeeLicense._loadByEmployeeCode(employeeCode);
    if (!employeeLicense) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_LICENSE_NOT_FOUND,
        message: EMPLOYEE_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    const jsonData = await employeeLicense.toJSON();
    R.handleSuccess(res, jsonData);
  } catch (error: any) {
    console.error('❌ Error retrieving employee license by employee code:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.SEARCH_FAILED,
      message: 'Failed to retrieve employee license',
      details: error.message,
    });
  }
});

// List employee licenses by global license
router.get('/global/:globalLicenseId', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { globalLicenseId } = req.params;
    const { offset, limit } = req.query;

    const globalLicense = parseInt(globalLicenseId);
    if (!EmployeeLicenseValidationUtils.validateGlobalLicenseId(globalLicense)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.GLOBAL_LICENSE_INVALID,
        message: EMPLOYEE_LICENSE_ERRORS.GLOBAL_LICENSE_INVALID,
      });
    }

    const paginationOptions = {
      offset: offset ? parseInt(offset as string) : EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.OFFSET,
      limit: limit ? Math.min(parseInt(limit as string), EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.MAX_LIMIT) : EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.LIMIT,
    };

    const employeeLicenses = await EmployeeLicense._listByGlobalLicense(globalLicense, paginationOptions);

    if (!employeeLicenses) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
      });
    }

    const items = await Promise.all(
      employeeLicenses.map(license => license.toJSON())
    );

    R.handleSuccess(res, {
      items,
      pagination: paginationOptions,
      count: items.length,
    });
  } catch (error: any) {
    console.error('❌ Error listing employee licenses by global license:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.LISTING_FAILED,
      message: 'Failed to list employee licenses',
      details: error.message,
    });
  }
});

// Get billing statistics by global license
router.get('/stats/billing/:globalLicenseId', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { globalLicenseId } = req.params;

    const globalLicense = parseInt(globalLicenseId);
    if (!EmployeeLicenseValidationUtils.validateGlobalLicenseId(globalLicense)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.GLOBAL_LICENSE_INVALID,
        message: EMPLOYEE_LICENSE_ERRORS.GLOBAL_LICENSE_INVALID,
      });
    }

    const stats = await EmployeeLicense._getBillingStats(globalLicense);
    R.handleSuccess(res, {
      global_license: globalLicense,
      billing_statistics: stats,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error retrieving billing statistics:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.SEARCH_FAILED,
      message: 'Failed to retrieve billing statistics',
      details: error.message,
    });
  }
});

// Update employee activity
router.post('/activity/:employee', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { employee } = req.params;
    const { activity_date } = req.body;

    if (!EmployeeLicenseValidationUtils.validateEmployee(employee)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_INVALID,
        message: EMPLOYEE_LICENSE_ERRORS.EMPLOYEE_INVALID,
      });
    }

    let activityDate: Date | undefined;
    if (activity_date) {
      activityDate = new Date(activity_date);
      if (isNaN(activityDate.getTime())) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: EMPLOYEE_LICENSE_CODES.LAST_ACTIVITY_DATE_INVALID,
          message: EMPLOYEE_LICENSE_ERRORS.LAST_ACTIVITY_DATE_INVALID,
        });
      }
    }

    const success = await EmployeeLicense._updateActivity(employee, activityDate);
    if (!success) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_LICENSE_NOT_FOUND,
        message: EMPLOYEE_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    R.handleSuccess(res, {
      message: 'Employee activity updated successfully',
      employee: employee,
      activity_date: activityDate || new Date(),
    });
  } catch (error: any) {
    console.error('❌ Error updating employee activity:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.UPDATE_FAILED,
      message: 'Failed to update employee activity',
      details: error.message,
    });
  }
});

// Declare long leave
router.post('/long-leave/:employee', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { employee } = req.params;
    const { declared_by, leave_type, reason } = req.body;

    if (!EmployeeLicenseValidationUtils.validateEmployee(employee)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_INVALID,
        message: EMPLOYEE_LICENSE_ERRORS.EMPLOYEE_INVALID,
      });
    }

    if (!declared_by || !EmployeeLicenseValidationUtils.validateLongLeaveDeclaredBy(declared_by)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.LONG_LEAVE_DECLARED_BY_INVALID,
        message: EMPLOYEE_LICENSE_ERRORS.LONG_LEAVE_DECLARED_BY_INVALID,
      });
    }

    if (!leave_type || !EmployeeLicenseValidationUtils.validateLongLeaveType(leave_type)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.LONG_LEAVE_TYPE_INVALID,
        message: EMPLOYEE_LICENSE_ERRORS.LONG_LEAVE_TYPE_INVALID,
      });
    }

    if (reason && !EmployeeLicenseValidationUtils.validateLongLeaveReason(reason)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.LONG_LEAVE_REASON_INVALID,
        message: EMPLOYEE_LICENSE_ERRORS.LONG_LEAVE_REASON_INVALID,
      });
    }

    const success = await EmployeeLicense._declareLongLeave(
      employee,
      declared_by,
      leave_type.toUpperCase() as LeaveType,
      reason
    );

    if (!success) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_LICENSE_NOT_FOUND,
        message: EMPLOYEE_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    R.handleSuccess(res, {
      message: 'Long leave declared successfully',
      employee: employee,
      declared_by,
      leave_type: leave_type.toUpperCase(),
      reason,
      declared_at: new Date(),
    });
  } catch (error: any) {
    console.error('❌ Error declaring long leave:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.UPDATE_FAILED,
      message: 'Failed to declare long leave',
      details: error.message,
    });
  }
});

// Cancel long leave
router.delete('/long-leave/:employee', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const { employee } = req.params;

    if (!EmployeeLicenseValidationUtils.validateEmployee(employee)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_INVALID,
        message: EMPLOYEE_LICENSE_ERRORS.EMPLOYEE_INVALID,
      });
    }

    const success = await EmployeeLicense._cancelLongLeave(employee);
    if (!success) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_LICENSE_NOT_FOUND,
        message: EMPLOYEE_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    R.handleSuccess(res, {
      message: 'Long leave cancelled successfully',
      employee: employee,
    });
  } catch (error: any) {
    console.error('❌ Error cancelling long leave:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.UPDATE_FAILED,
      message: 'Failed to cancel long leave',
      details: error.message,
    });
  }
});

// Deactivate employee
router.post('/deactivate/:employee', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { employee } = req.params;

    if (!EmployeeLicenseValidationUtils.validateEmployee(employee)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_INVALID,
        message: EMPLOYEE_LICENSE_ERRORS.EMPLOYEE_INVALID,
      });
    }

    const success = await EmployeeLicense._deactivateEmployee(employee);
    if (!success) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_LICENSE_NOT_FOUND,
        message: EMPLOYEE_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    R.handleSuccess(res, {
      message: 'Employee deactivated successfully',
      employee: employee,
      deactivated_at: new Date(),
    });
  } catch (error: any) {
    console.error('❌ Error deactivating employee:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.UPDATE_FAILED,
      message: 'Failed to deactivate employee',
      details: error.message,
    });
  }
});

// Reactivate employee
router.post('/reactivate/:employee', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { employee } = req.params;

    if (!EmployeeLicenseValidationUtils.validateEmployee(employee)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_INVALID,
        message: EMPLOYEE_LICENSE_ERRORS.EMPLOYEE_INVALID,
      });
    }

    const success = await EmployeeLicense._reactivateEmployee(employee);
    if (!success) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: EMPLOYEE_LICENSE_CODES.EMPLOYEE_LICENSE_NOT_FOUND,
        message: EMPLOYEE_LICENSE_ERRORS.NOT_FOUND,
      });
    }

    R.handleSuccess(res, {
      message: 'Employee reactivated successfully',
      employee: employee,
      reactivated_at: new Date(),
    });
  } catch (error: any) {
    console.error('❌ Error reactivating employee:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.UPDATE_FAILED,
      message: 'Failed to reactivate employee',
      details: error.message,
    });
  }
});

// List employees on long leave
router.get('/long-leave/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit } = req.query;

    const paginationOptions = {
      offset: offset ? parseInt(offset as string) : EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.OFFSET,
      limit: limit ? Math.min(parseInt(limit as string), EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.MAX_LIMIT) : EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.LIMIT,
    };

    const employeesOnLeave = await EmployeeLicense._listOnLongLeave(paginationOptions);

    if (!employeesOnLeave) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
      });
    }

    const items = await Promise.all(
      employeesOnLeave.map(license => license.toJSON())
    );

    R.handleSuccess(res, {
      items,
      pagination: paginationOptions,
      count: items.length,
    });
  } catch (error: any) {
    console.error('❌ Error listing employees on long leave:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.LISTING_FAILED,
      message: 'Failed to list employees on long leave',
      details: error.message,
    });
  }
});

// List employees in grace period
router.get('/grace-period/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit } = req.query;

    const paginationOptions = {
      offset: offset ? parseInt(offset as string) : EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.OFFSET,
      limit: limit ? Math.min(parseInt(limit as string), EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.MAX_LIMIT) : EMPLOYEE_LICENSE_DEFAULTS.PAGINATION.LIMIT,
    };

    const employeesInGrace = await EmployeeLicense._listInGracePeriod(paginationOptions);

    if (!employeesInGrace) {
      return R.handleSuccess(res, {
        items: [],
        pagination: paginationOptions,
        count: 0,
      });
    }

    const items = await Promise.all(
      employeesInGrace.map(license => license.toJSON())
    );

    R.handleSuccess(res, {
      items,
      pagination: paginationOptions,
      count: items.length,
    });
  } catch (error: any) {
    console.error('❌ Error listing employees in grace period:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: EMPLOYEE_LICENSE_CODES.LISTING_FAILED,
      message: 'Failed to list employees in grace period',
      details: error.message,
    });
  }
});

export default router;