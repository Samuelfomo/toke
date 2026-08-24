import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes.js';
import R from '@toke/api/dist/tools/response.js';
import { HttpStatus, USERS_CODES, USERS_ERRORS, UsersValidationUtils } from '@toke/shared';

import { TenantConfig } from '../tools/tenant.config.js';
import { ScheduleAssignmentService } from '../services/schedule.assignment.service.js';

const router = Router();

type ServiceResult = {
  status: number;
  response: any;
};

const internalError = (res: Response, error: any) =>
  R.handleError(res, HttpStatus.INTERNAL_ERROR, {
    code: 'schedule_assignments_bff_failed',
    message: error.message,
  });

/**
 * Preserve the API semantic status at the BFF boundary.
 * All successful API payloads have already been unwrapped by the service.
 */
const forwardResult = (res: Response, result: ServiceResult) => {
  if (result.status >= 400) {
    return R.handleError(res, result.status as any, result.response);
  }

  if (result.status === HttpStatus.CREATED) {
    return R.handleCreated(res, result.response);
  }

  return R.handleSuccess(res, result.response);
};

const getClientReference = (req: Request): string => (req as any).client.reference;

const validateGuid = (res: Response, guid: string | undefined, label = 'GUID') => {
  if (!guid || !UsersValidationUtils.validateGuid(guid)) {
    R.handleError(res, HttpStatus.BAD_REQUEST, {
      code: USERS_CODES.INVALID_GUID,
      message: label === 'GUID' ? USERS_ERRORS.GUID_INVALID : `${label} is invalid`,
    });
    return false;
  }
  return true;
};

// =============================================================================
// STATIC GET ROUTES
// Keep these BEFORE GET /:guid, otherwise Express would interpret e.g.
// /revision or /date-range as an assignment GUID.
// =============================================================================

/** GET /schedule-assignments/revision */
router.get('/revision', TenantConfig.authenticate, Ensure.get(), async (req, res) => {
  try {
    const result = await ScheduleAssignmentService.getRevision(getClientReference(req));
    return forwardResult(res, result);
  } catch (error: any) {
    return internalError(res, error);
  }
});

/** GET /schedule-assignments/list?... */
router.get('/list', TenantConfig.authenticate, Ensure.get(), async (req, res) => {
  try {
    const result = await ScheduleAssignmentService.listFiltered(getClientReference(req), req.query);
    return forwardResult(res, result);
  } catch (error: any) {
    return internalError(res, error);
  }
});

/** GET /schedule-assignments/adjustments/services?date=YYYY-MM-DD */
router.get('/adjustments/services', TenantConfig.authenticate, Ensure.get(), async (req, res) => {
  try {
    const date = String(req.query.date ?? '').trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'schedule_adjustment_date_invalid',
        message: 'A valid date (YYYY-MM-DD) is required',
      });
    }

    const result = await ScheduleAssignmentService.getAdjustmentServices(
      getClientReference(req),
      date,
    );
    return forwardResult(res, result);
  } catch (error: any) {
    return internalError(res, error);
  }
});

/** GET /schedule-assignments/date-range?start_date=...&end_date=... */
router.get('/date-range', TenantConfig.authenticate, Ensure.get(), async (req, res) => {
  try {
    const result = await ScheduleAssignmentService.listByDateRange(
      getClientReference(req),
      req.query,
    );
    return forwardResult(res, result);
  } catch (error: any) {
    return internalError(res, error);
  }
});

/** GET /schedule-assignments/active/current */
router.get('/active/current', TenantConfig.authenticate, Ensure.get(), async (req, res) => {
  try {
    const result = await ScheduleAssignmentService.listActiveCurrent(
      getClientReference(req),
      req.query,
    );
    return forwardResult(res, result);
  } catch (error: any) {
    return internalError(res, error);
  }
});

// =============================================================================
// USER / GROUP ROUTES
// =============================================================================

/** GET /schedule-assignments/user/:userGuid/on-date?date=YYYY-MM-DD */
router.get(
  '/user/:userGuid/on-date',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { userGuid } = req.params;
      if (!validateGuid(res, userGuid as string, 'User GUID')) return;

      const result = await ScheduleAssignmentService.listUserAssignmentsOnDate(
        getClientReference(req),
        userGuid as string,
        req.query,
      );
      return forwardResult(res, result);
    } catch (error: any) {
      return internalError(res, error);
    }
  },
);

/** GET /schedule-assignments/user/:userGuid */
router.get(
  '/user/:userGuid',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { userGuid } = req.params;
      if (!validateGuid(res, userGuid as string, 'User GUID')) return;

      const result = await ScheduleAssignmentService.listUserAssignments(
        getClientReference(req),
        userGuid as string,
        req.query,
      );
      return forwardResult(res, result);
    } catch (error: any) {
      return internalError(res, error);
    }
  },
);

/** GET /schedule-assignments/groups/:groupsGuid */
router.get(
  '/groups/:groupsGuid',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { groupsGuid } = req.params;
      if (!validateGuid(res, groupsGuid as string, 'Group GUID')) return;

      const result = await ScheduleAssignmentService.listGroupAssignments(
        getClientReference(req),
        groupsGuid as string,
        req.query,
      );
      return forwardResult(res, result);
    } catch (error: any) {
      return internalError(res, error);
    }
  },
);

// =============================================================================
// MANAGER ROUTE
// =============================================================================

/** GET /schedule-assignments/:manager/list */
router.get(
  '/:manager/list',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { manager } = req.params;
      if (!validateGuid(res, manager as string, 'Manager GUID')) return;

      const result = await ScheduleAssignmentService.listScheduleAssignments(
        getClientReference(req),
        manager as string,
        req.query,
      );
      return forwardResult(res, result);
    } catch (error: any) {
      return internalError(res, error);
    }
  },
);

// =============================================================================
// ADJUSTMENTS / CREATION
// =============================================================================

/** POST /schedule-assignments/adjustments */
router.post('/adjustments', TenantConfig.authenticate, Ensure.post(), async (req, res) => {
  try {
    const result = await ScheduleAssignmentService.createAdjustment(
      getClientReference(req),
      req.body,
    );
    return forwardResult(res, result);
  } catch (error: any) {
    return internalError(res, error);
  }
});

/** POST /schedule-assignments */
router.post('/', TenantConfig.authenticate, Ensure.post(), async (req, res) => {
  try {
    const result = await ScheduleAssignmentService.saveScheduleAssignment(
      getClientReference(req),
      req.body,
    );
    return forwardResult(res, result);
  } catch (error: any) {
    return internalError(res, error);
  }
});

// =============================================================================
// TEMPLATE UPDATE
// =============================================================================

/** PATCH /schedule-assignments/template/:guid */
router.patch(
  '/template/:guid',
  TenantConfig.authenticate,
  Ensure.patch(),
  async (req: Request, res: Response) => {
    try {
      const { guid } = req.params;
      if (!validateGuid(res, guid as string, 'Assignment GUID')) return;

      const result = await ScheduleAssignmentService.updateTemplate(
        getClientReference(req),
        guid as string,
        req.body,
      );
      return forwardResult(res, result);
    } catch (error: any) {
      return internalError(res, error);
    }
  },
);

// =============================================================================
// ASSIGNMENT-SPECIFIC GET ROUTES
// These two-segment routes must stay before GET /:guid for readability and to
// mirror the API contract.
// =============================================================================

/** GET /schedule-assignments/:guid/history */
router.get(
  '/:guid/history',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { guid } = req.params;
      if (!validateGuid(res, guid as string, 'Assignment GUID')) return;

      const result = await ScheduleAssignmentService.getHistory(
        getClientReference(req),
        guid as string,
        req.query,
      );
      return forwardResult(res, result);
    } catch (error: any) {
      return internalError(res, error);
    }
  },
);

/** GET /schedule-assignments/:guid/statistics */
router.get(
  '/:guid/statistics',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { guid } = req.params;
      if (!validateGuid(res, guid as string, 'Assignment GUID')) return;

      const result = await ScheduleAssignmentService.getStatistics(
        getClientReference(req),
        guid as string,
      );
      return forwardResult(res, result);
    } catch (error: any) {
      return internalError(res, error);
    }
  },
);

// =============================================================================
// GENERIC GUID ROUTES
// =============================================================================

/** GET /schedule-assignments/:guid */
router.get(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { guid } = req.params;
      if (!validateGuid(res, guid as string, 'Assignment GUID')) return;

      const result = await ScheduleAssignmentService.getScheduleAssignment(
        getClientReference(req),
        guid as string,
        req.query,
      );
      return forwardResult(res, result);
    } catch (error: any) {
      return internalError(res, error);
    }
  },
);

/** PUT /schedule-assignments/:guid */
router.put(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.put(),
  async (req: Request, res: Response) => {
    try {
      const { guid } = req.params;
      if (!validateGuid(res, guid as string, 'Assignment GUID')) return;

      const result = await ScheduleAssignmentService.updatedScheduleAssignment(
        getClientReference(req),
        guid as string,
        req.body,
      );
      return forwardResult(res, result);
    } catch (error: any) {
      return internalError(res, error);
    }
  },
);

/** DELETE /schedule-assignments/:guid */
router.delete(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.delete(),
  async (req: Request, res: Response) => {
    try {
      const { guid } = req.params;
      if (!validateGuid(res, guid as string, 'Assignment GUID')) return;

      const result = await ScheduleAssignmentService.deleteScheduleAssignment(
        getClientReference(req),
        guid as string,
      );
      return forwardResult(res, result);
    } catch (error: any) {
      return internalError(res, error);
    }
  },
);

// =============================================================================
// ROOT LISTING
// Kept last so all named GET routes are visibly grouped above. '/' itself does
// not conflict with the dynamic routes.
// =============================================================================

/** GET /schedule-assignments */
router.get('/', TenantConfig.authenticate, Ensure.get(), async (req, res) => {
  try {
    const result = await ScheduleAssignmentService.listAll(getClientReference(req), req.query);
    return forwardResult(res, result);
  } catch (error: any) {
    return internalError(res, error);
  }
});

export default router;

// import { Request, Response, Router } from 'express';
// import Ensure from '@toke/api/dist/middle/ensured-routes.js';
// import R from '@toke/api/dist/tools/response.js';
// import {
//   HttpStatus,
//   SessionTemplateValidationUtils,
//   USERS_CODES,
//   USERS_ERRORS,
//   UsersValidationUtils,
// } from '@toke/shared';
//
// import { TenantConfig } from '../tools/tenant.config.js';
// import { ScheduleAssignmentService } from '../services/schedule.assignment.service.js';
//
// const router = Router();
//
// router.get(
//   '/:manager/list',
//   TenantConfig.authenticate,
//   Ensure.get(),
//   async (req: Request, res: Response) => {
//     try {
//       const client = (req as any).client.reference;
//
//       const { manager } = req.params;
//       if (!UsersValidationUtils.validateGuid(manager)) {
//         return R.handleError(res, HttpStatus.BAD_REQUEST, {
//           code: USERS_CODES.INVALID_GUID,
//           message: USERS_ERRORS.GUID_INVALID,
//         });
//       }
//
//       const result: any = await ScheduleAssignmentService.listScheduleAssignments(
//         client,
//         manager as string,
//       );
//
//       if (result.status !== HttpStatus.SUCCESS) {
//         return R.handleError(res, result.status, result.response);
//       }
//       return R.handleSuccess(res, result.response);
//     } catch (error: any) {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: 'search_failed',
//         message: error.message,
//       });
//     }
//   },
// );
//
// router.post('/', TenantConfig.authenticate, Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     const client = (req as any).client.reference;
//
//     const result: any = await ScheduleAssignmentService.saveScheduleAssignment(client, req.body);
//
//     if (result.status !== HttpStatus.CREATED) {
//       return R.handleError(res, result.status, result.response);
//     }
//     return R.handleSuccess(res, result.response);
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: 'search_failed',
//       message: error.message,
//     });
//   }
// });
//
// router.put(
//   '/:guid',
//   TenantConfig.authenticate,
//   Ensure.put(),
//   async (req: Request, res: Response) => {
//     try {
//       const client = (req as any).client.reference;
//       const { guid } = req.params;
//       if (!guid) {
//         return R.handleError(res, HttpStatus.BAD_REQUEST, {
//           code: 'guid_required',
//           message: 'GUID is required',
//         });
//       }
//
//       if (!SessionTemplateValidationUtils.validateGuid(guid)) {
//         return R.handleError(res, HttpStatus.BAD_REQUEST, {
//           code: 'guid_invalid',
//           message: 'GUID is invalid',
//         });
//       }
//
//       const result: any = await ScheduleAssignmentService.updatedScheduleAssignment(
//         client,
//         guid as string,
//         req.body,
//       );
//
//       if (result.status !== HttpStatus.SUCCESS) {
//         return R.handleError(res, result.status, result.response);
//       }
//       return R.handleSuccess(res, result.response);
//     } catch (error: any) {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: 'search_failed',
//         message: error.message,
//       });
//     }
//   },
// );
//
// export default router;
