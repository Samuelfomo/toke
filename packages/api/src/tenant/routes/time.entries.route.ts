import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  TIME_ENTRIES_CODES,
  TIME_ENTRIES_ERRORS,
  TIME_ENTRIES_MESSAGES,
  TimeEntriesValidationUtils,
  validateTimeEntriesCreation,
  validateTimeEntriesFilters,
  validateTimeEntriesUpdate,
} from '@toke/shared';
import { Op } from 'sequelize';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import User from '../class/User.js';
import Site from '../class/Site.js';
import WorkSessions from '../class/WorkSessions.js';
import TimeEntries from '../class/TimeEntries.js';
import Revision from '../../tools/revision.js';
import { responseValue, tableName } from '../../utils/response.model.js';

const router = Router();

// === ROUTES DE LISTAGE GÉNÉRAL ===

router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const exportableEntries = await TimeEntries.exportable({}, paginationData);

    return R.handleSuccess(res, {
      exportableEntries,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.PAGINATION_INVALID,
        message: TIME_ENTRIES_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: TIME_ENTRIES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.TIME_ENTRIES);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.REVISION_FAILED,
      message: error.message,
    });
  }
});

router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const filters = validateTimeEntriesFilters(req.query);
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

    if (filters.session) {
      const sessionObj = await WorkSessions._load(filters.session, true);
      if (sessionObj) conditions.session = sessionObj.getId();
    }

    if (filters.pointage_type) {
      conditions.pointage_type = filters.pointage_type;
    }

    if (filters.pointage_status) {
      conditions.pointage_status = filters.pointage_status;
    }

    if (filters.created_offline !== undefined) {
      conditions.created_offline = filters.created_offline;
    }

    if (filters.clocked_at_from) {
      conditions.clocked_at_from = { [Op.gte]: new Date(filters.clocked_at_from) };
    }

    if (filters.clocked_at_to) {
      conditions.clocked_at_to = {
        ...conditions.clocked_at_to,
        [Op.lte]: new Date(filters.clocked_at_to),
      };
    }

    const entryList = await TimeEntries._list(conditions, paginationOptions);
    const entries = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || entryList?.length || 0,
        count: entryList?.length || 0,
      },
      items: entryList
        ? await Promise.all(
            entryList.map(async (entry) => await entry.toJSON(responseValue.MINIMAL)),
          )
        : [],
    };

    return R.handleSuccess(res, { entries });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.VALIDATION_FAILED,
        message: TIME_ENTRIES_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: TIME_ENTRIES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

// === CRÉATION POINTAGE ===

router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateTimeEntriesCreation(req.body);

    // Vérifier session
    const sessionObj = await WorkSessions._load(validatedData.session, true);
    if (!sessionObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.SESSION_NOT_FOUND,
        message: 'Session not found',
      });
    }

    // Vérifier utilisateur
    const userObj = await User._load(validatedData.user, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    // Vérifier site
    const siteObj = await Site._load(validatedData.site, true);
    if (!siteObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.SITE_NOT_FOUND,
        message: 'Site not found',
      });
    }

    const entryObj = new TimeEntries()
      .setSession(sessionObj.getId()!)
      .setUser(userObj.getId()!)
      .setSite(siteObj.getId()!)
      .setPointageType(validatedData.pointage_type)
      .setClockedAt(new Date(validatedData.clocked_at))
      .setCoordinates(validatedData.latitude, validatedData.longitude);

    if (validatedData.gps_accuracy) {
      entryObj.setGpsAccuracy(validatedData.gps_accuracy);
    }

    if (validatedData.device_info) {
      entryObj.setDeviceInfo(validatedData.device_info);
    }

    if (validatedData.ip_address) {
      entryObj.setIpAddress(validatedData.ip_address);
    }

    // if (validatedData.user_agent) {
    //   entryObj.setUserAgent(validatedData.user_agent);
    // }

    if (validatedData.created_offline) {
      entryObj.setOfflineData(validatedData.local_id || `offline_${Date.now()}`);
    }

    // Validation métier
    const isValid = await entryObj.isValid();
    if (!isValid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.VALIDATION_FAILED,
        message: 'Entry validation failed: invalid sequence, geofencing, or duplicate',
      });
    }

    await entryObj.save();

    // Auto-accept si pas d'anomalies
    const canAccept = await entryObj.canBeAccepted();
    if (canAccept) {
      await entryObj.accept();
    }

    return R.handleCreated(res, {
      message: TIME_ENTRIES_MESSAGES.CREATED_SUCCESSFULLY,
      entry: await entryObj.toJSON(),
      requires_validation: await entryObj.requiresManagerValidation(),
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.VALIDATION_FAILED,
        message: TIME_ENTRIES_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: TIME_ENTRIES_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  }
});

// === SYNCHRONISATION BATCH OFFLINE ===

// router.post('/sync/batch', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     const validatedData = validateBatchSync(req.body);
//
//     const userObj = await User._load(validatedData.user_guid, true);
//     if (!userObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: TIME_ENTRIES_CODES.USER_NOT_FOUND,
//         message: 'User not found',
//       });
//     }
//
//     const syncResult = await TimeEntries.processBatchSynchronization(
//       userObj.getId()!,
//       validatedData.entries,
//     );
//
//     return R.handleSuccess(res, {
//       message: 'Batch synchronization completed',
//       sync_result: syncResult,
//       processed_at: new Date().toISOString(),
//     });
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: TIME_ENTRIES_CODES.VALIDATION_FAILED,
//         message: TIME_ENTRIES_ERRORS.VALIDATION_FAILED,
//         details: error.issues,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: TIME_ENTRIES_CODES.SYNC_FAILED,
//         message: error.message,
//       });
//     }
//   }
// });

// === RÉCUPÉRATION PAR GUID ===

router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const entryObj = await TimeEntries._load(req.params.guid, true);
    if (!entryObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.TIME_ENTRY_NOT_FOUND,
        message: TIME_ENTRIES_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      entry: await entryObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// === POINTAGES PAR SESSION ===

router.get('/session/:sessionGuid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.sessionGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const sessionObj = await WorkSessions._load(req.params.sessionGuid, true);
    if (!sessionObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.SESSION_NOT_FOUND,
        message: TIME_ENTRIES_ERRORS.SESSION_NOT_FOUND,
      });
    }

    const entryList = await TimeEntries._listBySession(sessionObj.getId()!);
    const entries = {
      session: await sessionObj.toJSON(responseValue.MINIMAL),
      entries: entryList
        ? await Promise.all(
            entryList.map(async (entry) => await entry.toJSON(responseValue.MINIMAL)),
          )
        : [],
      count: entryList?.length || 0,
    };

    return R.handleSuccess(res, { entries });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === POINTAGES PAR UTILISATEUR ===

router.get('/user/:userGuid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(req.params.userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const entryList = await TimeEntries._listByUser(userObj.getId()!);
    const entries = {
      user: userObj.toPublicJSON(),
      entries: entryList
        ? await Promise.all(
            entryList.map(async (entry) => await entry.toJSON(responseValue.MINIMAL)),
          )
        : [],
      count: entryList?.length || 0,
    };

    return R.handleSuccess(res, { entries });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === POINTAGES OFFLINE EN ATTENTE ===

router.get('/user/:userGuid/offline', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(req.params.userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const offlineEntries = await TimeEntries._findOfflineEntries(userObj.getId()!);
    const entries = {
      user: userObj.toPublicJSON(),
      offline_entries: offlineEntries
        ? await Promise.all(
            offlineEntries.map(async (entry) => await entry.toJSON(responseValue.MINIMAL)),
          )
        : [],
      count: offlineEntries?.length || 0,
    };

    return R.handleSuccess(res, { entries });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === POINTAGES EN ATTENTE VALIDATION ===

router.get('/pending/validation', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const pendingEntries = await TimeEntries._findPendingValidation();
    const entries = {
      pending_entries: pendingEntries
        ? await Promise.all(
            pendingEntries.map(async (entry) => await entry.toJSON(responseValue.MINIMAL)),
          )
        : [],
      count: pendingEntries?.length || 0,
    };

    return R.handleSuccess(res, { entries });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === VALIDATION MANAGER ===

router.post('/:guid/approve', Ensure.post(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const entryObj = await TimeEntries._load(req.params.guid, true);
    if (!entryObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.TIME_ENTRY_NOT_FOUND,
        message: TIME_ENTRIES_ERRORS.NOT_FOUND,
      });
    }

    const { manager_guid } = req.body;

    if (!manager_guid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.VALIDATION_FAILED,
        message: 'Manager guid is required',
      });
    }

    const managerObj = await User._load(manager_guid, true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.USER_NOT_FOUND,
        message: 'Manager not found',
      });
    }

    await entryObj.approve(managerObj.getId()!);

    return R.handleSuccess(res, {
      message: 'Entry approved successfully',
      entry: await entryObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.APPROVAL_FAILED,
      message: error.message,
    });
  }
});

router.post('/:guid/reject', Ensure.post(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const entryObj = await TimeEntries._load(req.params.guid, true);
    if (!entryObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.TIME_ENTRY_NOT_FOUND,
        message: TIME_ENTRIES_ERRORS.NOT_FOUND,
      });
    }

    const { reason } = req.body;

    if (!reason) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.VALIDATION_FAILED,
        message: 'Rejection reason is required',
      });
    }

    await entryObj.reject(reason);

    return R.handleSuccess(res, {
      message: 'Entry rejected successfully',
      entry: await entryObj.toJSON(),
      rejection_reason: reason,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.REJECTION_FAILED,
      message: error.message,
    });
  }
});

// === CORRECTIONS ===

router.post('/:guid/correct', Ensure.post(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const entryObj = await TimeEntries._load(req.params.guid, true);
    if (!entryObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.TIME_ENTRY_NOT_FOUND,
        message: TIME_ENTRIES_ERRORS.NOT_FOUND,
      });
    }

    const { corrections, manager_guid } = req.body;

    if (!corrections || !manager_guid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.VALIDATION_FAILED,
        message: 'corrections and manager_guid are required',
      });
    }

    const managerObj = await User._load(manager_guid, true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.USER_NOT_FOUND,
        message: 'Manager not found',
      });
    }

    await entryObj.applyManagerCorrection(corrections, managerObj.getId()!);

    return R.handleSuccess(res, {
      message: 'Corrections applied successfully',
      entry: await entryObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.CORRECTION_FAILED,
      message: error.message,
    });
  }
});

// === DÉTECTION ANOMALIES ===

router.get('/:guid/anomalies', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const entryObj = await TimeEntries._load(req.params.guid, true);
    if (!entryObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.TIME_ENTRY_NOT_FOUND,
        message: TIME_ENTRIES_ERRORS.NOT_FOUND,
      });
    }

    const anomalies = await entryObj.detectAnomalies();
    const fraudScore = await entryObj.getFraudScore();

    return R.handleSuccess(res, {
      entry_guid: entryObj.getGuid(),
      has_anomalies: anomalies.length > 0,
      fraud_score: fraudScore,
      anomalies,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.ANOMALY_DETECTION_FAILED,
      message: error.message,
    });
  }
});

// router.get('/user/:userGuid/anomalies', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     if (!TimeEntriesValidationUtils.validateGuid(req.params.userGuid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: TIME_ENTRIES_CODES.INVALID_GUID,
//         message: TIME_ENTRIES_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const userObj = await User._load(req.params.userGuid, true);
//     if (!userObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: TIME_ENTRIES_CODES.USER_NOT_FOUND,
//         message: 'User not found',
//       });
//     }
//
//     const { days = 7 } = req.query;
//     const anomalies = await TimeEntries.detectUserAnomalies(
//       userObj.getId()!,
//       parseInt(days as string, 10),
//     );
//
//     return R.handleSuccess(res, {
//       user: userObj.toPublicJSON(),
//       days_analyzed: days,
//       anomalies,
//       anomaly_count: anomalies.length,
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: TIME_ENTRIES_CODES.ANOMALY_DETECTION_FAILED,
//       message: error.message,
//     });
//   }
// });

// === STATISTIQUES ===

router.get('/statistics/overview', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const filters: Record<string, any> = {};

    if (req.query.user_guid) {
      const userObj = await User._load(req.query.user_guid as string, true);
      if (userObj) filters.user = userObj.getId();
    }

    if (req.query.site_guid) {
      const siteObj = await Site._load(req.query.site_guid as string, true);
      if (siteObj) filters.site = siteObj.getId();
    }

    const statistics = await TimeEntries.getEntriesStatistics(filters);

    return R.handleSuccess(res, { statistics });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.STATISTICS_FAILED,
      message: error.message,
    });
  }
});

// === MISE À JOUR ===

router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const entryObj = await TimeEntries._load(req.params.guid, true);
    if (!entryObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.TIME_ENTRY_NOT_FOUND,
        message: TIME_ENTRIES_ERRORS.NOT_FOUND,
      });
    }

    const validatedData = validateTimeEntriesUpdate(req.body);

    if (validatedData.pointage_status) {
      entryObj.setPointageStatus(validatedData.pointage_status);
    }

    if (validatedData.memo) {
      entryObj.setMemo(validatedData.memo);
    }

    if (validatedData.correction_reason) {
      entryObj.setCorrectionReason(validatedData.correction_reason);
    }

    await entryObj.save();
    return R.handleSuccess(res, await entryObj.toJSON());
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.VALIDATION_FAILED,
        message: TIME_ENTRIES_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: TIME_ENTRIES_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  }
});

// === SUPPRESSION ===

router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const entryObj = await TimeEntries._load(req.params.guid, true);
    if (!entryObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.TIME_ENTRY_NOT_FOUND,
        message: TIME_ENTRIES_ERRORS.NOT_FOUND,
      });
    }

    await entryObj.delete();
    return R.handleSuccess(res, {
      message: TIME_ENTRIES_MESSAGES.DELETED_SUCCESSFULLY,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

export default router;
