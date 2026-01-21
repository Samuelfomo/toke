import { Request, Response, Router } from 'express';
import {
  DEVICES_CODES,
  DEVICES_ERRORS,
  DEVICES_MESSAGES,
  DevicesValidationUtils,
  DeviceType,
  HttpStatus,
  paginationSchema,
  TimezoneConfigUtils,
  USERS_CODES,
  USERS_ERRORS,
  validateDevicesCreation,
  validateDevicesFilters,
  validateDevicesUpdate,
  validateReassignDevice,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import User from '../class/User.js';
import Device from '../class/Device.js';
import { TenantRevision } from '../../tools/revision.js';
import { responseValue, tableName } from '../../utils/response.model.js';

const router = Router();

// === ROUTES DE LISTAGE GÉNÉRAL ===

router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const devices = await Device.exportable({}, paginationData);

    return R.handleSuccess(res, {
      devices,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.PAGINATION_INVALID,
        message: DEVICES_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: DEVICES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await TenantRevision.getRevision(tableName.DEVICE);

    R.handleSuccess(res, {
      revision,
      checked_at: TimezoneConfigUtils.getCurrentTime().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEVICES_CODES.REVISION_FAILED,
      message: error.message,
    });
  }
});

router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit, ...filterQuery } = req.query;
    const filters = validateDevicesFilters(filterQuery);
    const paginationOptions = paginationSchema.parse(req.query);
    const conditions: Record<string, any> = {};

    if (filters.device_type) {
      conditions.device_type = filters.device_type;
    }
    if (filters.active !== undefined) {
      conditions.active = filters.active;
    }
    if (filters.assigned_to) {
      conditions.assigned_to = filters.assigned_to;
    }
    if (filters.config_by) {
      conditions.config_by = filters.config_by;
    }

    const deviceEntries = await Device._list(conditions, paginationOptions);
    const devices = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || deviceEntries?.length || 0,
        count: deviceEntries?.length || 0,
      },
      items: deviceEntries
        ? await Promise.all(deviceEntries.map(async (device) => await device.toJSON()))
        : [],
    };

    return R.handleSuccess(res, { devices });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.VALIDATION_FAILED,
        message: DEVICES_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: DEVICES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

// === ROUTES PAR TYPE DE DEVICE ===

router.get('/type/:deviceType/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { deviceType } = req.params;

    if (!Object.values(DeviceType).includes(deviceType as DeviceType)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.DEVICE_TYPE_INVALID,
        message: DEVICES_ERRORS.DEVICE_TYPE_INVALID,
      });
    }

    const deviceEntries = await Device._listByType(deviceType);
    const devices = {
      device_type: deviceType,
      items: deviceEntries
        ? await Promise.all(
            deviceEntries.map(async (device) => await device.toJSON(responseValue.MINIMAL)),
          )
        : [],
      count: deviceEntries?.length || 0,
    };

    return R.handleSuccess(res, { devices });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEVICES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === DEVICES ACTIFS ===

router.get('/active', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);
    const deviceEntries = await Device._listActiveDevices();

    const offset = paginationOptions.offset || 0;
    const limit = paginationOptions.limit;
    const paginatedItems = limit
      ? deviceEntries?.slice(offset, offset + limit)
      : deviceEntries?.slice(offset);

    const devices = {
      pagination: {
        offset,
        limit: limit || paginatedItems?.length || 0,
        count: paginatedItems?.length || 0,
        total: deviceEntries?.length || 0,
      },
      items: paginatedItems
        ? await Promise.all(
            paginatedItems.map(async (device) => await device.toJSON(responseValue.MINIMAL)),
          )
        : [],
    };

    return R.handleSuccess(res, { activeDevices: devices });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEVICES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === CRÉATION DE DEVICE ===
// 📱 Register new device for user with GPS and geofencing configuration
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateDevicesCreation(req.body);

    // Vérification de l'utilisateur assigné
    const assignedUserObj = await User._load(validatedData.assigned_to, true);
    if (!assignedUserObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: 'Assigned user not found',
      });
    }

    // // Vérification du créateur
    // const creatorObj = await User._load(validatedData.config_by, true);
    // if (!creatorObj) {
    //   return R.handleError(res, HttpStatus.NOT_FOUND, {
    //     code: USERS_CODES.USER_NOT_FOUND,
    //     message: 'Creator user not found',
    //   });
    // }

    const deviceObj = new Device()
      .setName(validatedData.name)
      .setDeviceType(validatedData.device_type || DeviceType.OTHER)
      .setAssignedTo(assignedUserObj.getId()!);
    // .setGpsAccuracy(validatedData.gps_accuracy)
    // .setCustomGeofenceRadius(validatedData.custom_geofence_radius);

    // if (validatedData.config_by) {
    //   // Vérification du créateur
    //   const creatorObj = await User._load(validatedData.config_by, true);
    //   if (!creatorObj) {
    //     return R.handleError(res, HttpStatus.NOT_FOUND, {
    //       code: USERS_CODES.USER_NOT_FOUND,
    //       message: 'Creator user not found',
    //     });
    //   }
    //   deviceObj.setConfigBy(creatorObj.getId()!);
    // }
    // if (validatedData.last_seen_at) {
    //   deviceObj.setLastSeenAt(new Date(validatedData.last_seen_at));
    // }

    // if (validatedData.active !== undefined) {
    //   deviceObj.setActive(validatedData.active);
    // }

    await deviceObj.save();

    return R.handleCreated(res, await deviceObj.toJSON(responseValue.MINIMAL));
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.VALIDATION_FAILED,
        message: DEVICES_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: DEVICES_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  }
});

router.patch('/:guid/config', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!DevicesValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.INVALID_GUID,
        message: DEVICES_ERRORS.GUID_INVALID,
      });
    }
    const deviceObj = await Device._load(guid, true);
    if (!deviceObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: DEVICES_CODES.DEVICE_NOT_FOUND,
        message: DEVICES_ERRORS.NOT_FOUND,
      });
    }
    const { manager, custom_geofence_radius } = req.body;

    if (!manager) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.CREATED_BY_REQUIRED,
        message: DEVICES_ERRORS.CREATED_BY_REQUIRED,
      });
    }
    if (!custom_geofence_radius) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.GEOFENCE_RADIUS_INVALID,
        message: DEVICES_ERRORS.GEOFENCE_RADIUS_INVALID,
      });
    }
    if (!DevicesValidationUtils.validateGuid(manager)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.CREATED_BY_INVALID,
        message: DEVICES_ERRORS.CREATED_BY_INVALID,
      });
    }
    if (!DevicesValidationUtils.validateGeofenceRadius(custom_geofence_radius)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.GEOFENCE_RADIUS_INVALID,
        message: DEVICES_ERRORS.GEOFENCE_RADIUS_INVALID,
      });
    }
    const managerObj = await User._load(manager, true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: DEVICES_CODES.CREATED_BY_NOT_FOUND,
        message: DEVICES_ERRORS.CREATED_BY_NOT_FOUND,
      });
    }
    deviceObj.setConfigBy(managerObj.getId()!);
    deviceObj.setCustomGeofenceRadius(custom_geofence_radius);
    await deviceObj.save();
    return R.handleSuccess(res, {
      message: DEVICES_MESSAGES.CONFIG_SUCCESSFULLY,
      device: await deviceObj.toJSON(responseValue.MINIMAL),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEVICES_CODES.CONFIG_FAILED,
      message: error.message,
    });
  }
});

// === RÉCUPÉRATION PAR GUID ===
// 🔍 Get Device Details
router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!DevicesValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.INVALID_GUID,
        message: DEVICES_ERRORS.GUID_INVALID,
      });
    }

    const deviceObj = await Device._load(guid, true);
    if (!deviceObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: DEVICES_CODES.DEVICE_NOT_FOUND,
        message: DEVICES_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      device: await deviceObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEVICES_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// === MISE À JOUR DE DEVICE ===

router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    if (!DevicesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.INVALID_GUID,
        message: DEVICES_ERRORS.GUID_INVALID,
      });
    }

    const deviceObj = await Device._load(req.params.guid, true);
    if (!deviceObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: DEVICES_CODES.DEVICE_NOT_FOUND,
        message: DEVICES_ERRORS.NOT_FOUND,
      });
    }

    const validatedData = validateDevicesUpdate(req.body);

    if (validatedData.name) {
      deviceObj.setName(validatedData.name);
    }
    if (validatedData.device_type) {
      deviceObj.setDeviceType(validatedData.device_type);
    }
    if (validatedData.gps_accuracy) {
      deviceObj.setGpsAccuracy(validatedData.gps_accuracy);
    }
    if (validatedData.custom_geofence_radius) {
      deviceObj.setCustomGeofenceRadius(validatedData.custom_geofence_radius);
    }
    if (validatedData.last_seen_at) {
      deviceObj.setLastSeenAt(new Date(validatedData.last_seen_at));
    }
    if (validatedData.active !== undefined) {
      deviceObj.setActive(validatedData.active);
    }

    await deviceObj.save();
    return R.handleSuccess(res, await deviceObj.toJSON(responseValue.MINIMAL));
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.VALIDATION_FAILED,
        message: DEVICES_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: DEVICES_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  }
});

// === SUPPRESSION DE DEVICE ===

router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    if (!DevicesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.INVALID_GUID,
        message: DEVICES_ERRORS.GUID_INVALID,
      });
    }

    const deviceObj = await Device._load(req.params.guid, true);
    if (!deviceObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: DEVICES_CODES.DEVICE_NOT_FOUND,
        message: DEVICES_ERRORS.NOT_FOUND,
      });
    }

    await deviceObj.delete();
    return R.handleSuccess(res, {
      message: DEVICES_MESSAGES.DELETED_SUCCESSFULLY,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEVICES_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

// === ROUTES PAR UTILISATEUR ===

router.get('/user/:guid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!DevicesValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.INVALID_GUID,
        message: DEVICES_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(guid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const deviceEntries = await Device._listByUser(userObj.getId()!);
    const devices = {
      user: userObj.toPublicJSON(),
      devices: deviceEntries
        ? await Promise.all(
            deviceEntries.map(async (device) => await device.toJSON(responseValue.MINIMAL)),
          )
        : [],
      count: deviceEntries?.length || 0,
    };

    return R.handleSuccess(res, { devices });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEVICES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// 📱 Get all active devices for specific user with location tracking status
router.get('/user/:guid/active', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!DevicesValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.INVALID_GUID,
        message: DEVICES_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(guid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const conditions: Record<string, any> = {
      ['active']: true,
      ['assigned_to']: userObj.getId()!,
    };

    const deviceEntries = await Device._list(conditions);
    const devices = {
      user: userObj.toPublicJSON(),
      devices: deviceEntries
        ? await Promise.all(
            deviceEntries.map(async (device) => await device.toJSON(responseValue.MINIMAL)),
          )
        : [],
      count: deviceEntries?.length || 0,
    };

    return R.handleSuccess(res, { devices });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEVICES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === RÉASSIGNATION DE DEVICE ===

router.patch('/:guid/reassign', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    if (!DevicesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.INVALID_GUID,
        message: DEVICES_ERRORS.GUID_INVALID,
      });
    }

    const deviceObj = await Device._load(req.params.guid, true);
    if (!deviceObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: DEVICES_CODES.DEVICE_NOT_FOUND,
        message: DEVICES_ERRORS.NOT_FOUND,
      });
    }

    const validatedData = validateReassignDevice(req.body);

    const newUserObj = await User._load(validatedData.new_assigned_to, true);
    if (!newUserObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: 'New assigned user not found',
      });
    }

    await deviceObj.reassignDevice(newUserObj.getId()!, validatedData.reason);

    return R.handleSuccess(res, {
      message: DEVICES_MESSAGES.REASSIGNED_SUCCESSFULLY,
      device: await deviceObj.toJSON(responseValue.MINIMAL),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEVICES_CODES.REASSIGNMENT_FAILED,
      message: error.message,
    });
  }
});

// === MISE À JOUR LAST SEEN ===

router.patch('/:guid/update-last-seen', Ensure.patch(), async (req: Request, res: Response) => {
  const { guid } = req.params;
  try {
    if (!DevicesValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.INVALID_GUID,
        message: DEVICES_ERRORS.GUID_INVALID,
      });
    }

    const deviceObj = await Device._load(guid, true);
    if (!deviceObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: DEVICES_CODES.DEVICE_NOT_FOUND,
        message: DEVICES_ERRORS.NOT_FOUND,
      });
    }

    await deviceObj.updateLastSeen();

    return R.handleSuccess(res, {
      message: DEVICES_MESSAGES.LAST_SEEN_UPDATED,
      last_seen_at: deviceObj.getLastSeenAt(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEVICES_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// === MAINTENANCE AUTOMATIQUE ===

router.patch(
  '/maintenance/deactivate-inactive',
  Ensure.patch(),
  async (req: Request, res: Response) => {
    try {
      const { days = 90 } = req.query;
      const daysInactive = parseInt(days as string, 10);

      const deactivatedCount = await Device.deactivateInactiveDevices(daysInactive);

      return R.handleSuccess(res, {
        message: 'Inactive devices maintenance completed',
        deactivated_devices: deactivatedCount,
        processed_at: TimezoneConfigUtils.getCurrentTime().toISOString(),
      });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: DEVICES_CODES.MAINTENANCE_FAILED,
        message: error.message,
      });
    }
  },
);

// === STATISTIQUES ===

router.get('/statistics/overview', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const statistics = await Device.getDeviceStatistics();

    return R.handleSuccess(res, { statistics });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEVICES_CODES.STATISTICS_FAILED,
      message: error.message,
    });
  }
});

// === CHANGEMENT DE STATUT ===
// 🔃 Change device status (active/inactive)
router.patch('/:guid/status', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    const { active } = req.query;

    if (!DevicesValidationUtils.validateGuid(String(guid))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.INVALID_GUID,
        message: DEVICES_ERRORS.GUID_INVALID,
      });
    }

    const isActive =
      active === 'true' || active === '1'
        ? true
        : active === 'false' || active === '0'
          ? false
          : undefined;

    if (isActive === undefined || !DevicesValidationUtils.validateActive(isActive)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEVICES_CODES.ACTIVE_STATUS_INVALID,
        message: DEVICES_ERRORS.ACTIVE_STATUS_INVALID,
      });
    }

    const deviceObj = await Device._load(String(guid), true);
    if (!deviceObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: DEVICES_CODES.DEVICE_NOT_FOUND,
        message: DEVICES_ERRORS.NOT_FOUND,
      });
    }

    deviceObj.setActive(isActive);

    await deviceObj.save();

    return R.handleSuccess(res, await deviceObj.toJSON(responseValue.MINIMAL));
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEVICES_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

export default router;
