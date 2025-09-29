import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  SITES_CODES,
  SITES_ERRORS,
  SITES_MESSAGES,
  SitesValidationUtils,
  SiteType,
  USERS_CODES,
  USERS_ERRORS,
  validateSitesCreation,
  validateSitesFilters,
  validateSitesUpdate,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import User from '../class/User.js';
import Site from '../class/Site.js';
import Revision from '../../tools/revision.js';
import { responseValue, tableName } from '../../utils/response.model.js';

const router = Router();

// === ROUTES DE LISTAGE GÉNÉRAL ===

router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const exportableSites = await Site.exportable({}, paginationData);

    return R.handleSuccess(res, {
      exportableSites,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.PAGINATION_INVALID,
        message: SITES_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.SITES);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SITES_CODES.REVISION_FAILED,
      message: error.message,
    });
  }
});

router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const filters = validateSitesFilters(req.query);
    const paginationOptions = paginationSchema.parse(req.query);
    const conditions: Record<string, any> = {};

    if (filters.site_type) {
      conditions.site_type = filters.site_type;
    }
    if (filters.active !== undefined) {
      conditions.active = filters.active;
    }
    if (filters.public !== undefined) {
      conditions.public = filters.public;
    }
    if (filters.tenant) {
      conditions.tenant = filters.tenant;
    }
    if (filters.created_by) {
      conditions.created_by = filters.created_by;
    }

    const siteEntries = await Site._list(conditions, paginationOptions);
    const sites = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || siteEntries?.length || 0,
        count: siteEntries?.length || 0,
      },
      items: siteEntries
        ? await Promise.all(
            siteEntries.map(async (site) => await site.toJSON(responseValue.MINIMAL)),
          )
        : [],
    };

    return R.handleSuccess(res, { sites });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.VALIDATION_FAILED,
        message: SITES_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

// === ROUTES PAR TYPE DE SITE ===

router.get('/type/:siteType/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { siteType } = req.params;

    if (!Object.values(SiteType).includes(siteType as SiteType)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.SITE_TYPE_INVALID,
        message: SITES_ERRORS.SITE_TYPE_INVALID,
      });
    }

    const siteEntries = await Site._listByType(siteType);
    const sites = {
      site_type: siteType,
      items: siteEntries
        ? await Promise.all(
            siteEntries.map(async (site) => await site.toJSON(responseValue.MINIMAL)),
          )
        : [],
      count: siteEntries?.length || 0,
    };

    return R.handleSuccess(res, { sites });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SITES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === SITES ACTIFS ET PUBLICS ===

router.get('/active', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);
    const siteEntries = await Site._listActiveSites();

    // Application de la pagination
    const offset = paginationOptions.offset || 0;
    const limit = paginationOptions.limit;
    const paginatedItems = limit
      ? siteEntries?.slice(offset, offset + limit)
      : siteEntries?.slice(offset);

    const sites = {
      pagination: {
        offset,
        limit: limit || paginatedItems?.length || 0,
        count: paginatedItems?.length || 0,
        total: siteEntries?.length || 0,
      },
      items: paginatedItems
        ? await Promise.all(
            paginatedItems.map(async (site) => await site.toJSON(responseValue.MINIMAL)),
          )
        : [],
    };

    return R.handleSuccess(res, { activeSites: sites });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SITES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

router.get('/public', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const siteEntries = await Site._listPublicSites();
    const sites = {
      items: siteEntries
        ? await Promise.all(
            siteEntries.map(async (site) => await site.toJSON(responseValue.MINIMAL)),
          )
        : [],
      count: siteEntries?.length || 0,
    };

    return R.handleSuccess(res, { publicSites: sites });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SITES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === CRÉATION DE SITE ===

router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateSitesCreation(req.body);

    // Vérification de l'existence du créateur
    const creatorObj = await User._load(validatedData.created_by, true);
    if (!creatorObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: 'Creator user not found',
      });
    }

    const siteObj = new Site()
      .setTenant(validatedData.tenant)
      .setCreatedBy(creatorObj.getId()!)
      .setName(validatedData.name)
      .setSiteType(validatedData.site_type || SiteType.MANAGER)
      .setGeofencePolygon(validatedData.geofence_polygon)
      .setGeofenceRadius(validatedData.geofence_radius);

    if (validatedData.address) {
      siteObj.setAddress(validatedData.address);
    }

    if (validatedData.qr_reference) {
      const qrRefObj = await User._load(validatedData.qr_reference, true);
      if (qrRefObj) {
        siteObj.setQRReference(qrRefObj.getId()!);
      }
    }

    if (validatedData.active !== undefined) {
      siteObj.setActive(validatedData.active);
    }

    if (validatedData.public !== undefined) {
      siteObj.setPublic(validatedData.public);
    }

    if (validatedData.allowed_roles) {
      siteObj.setAllowedRoles(validatedData.allowed_roles);
    }

    await siteObj.save();

    return R.handleCreated(res, await siteObj.toJSON());
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.VALIDATION_FAILED,
        message: SITES_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  }
});

// === RÉCUPÉRATION PAR GUID ===

router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!SitesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.INVALID_GUID,
        message: SITES_ERRORS.GUID_INVALID,
      });
    }

    const siteObj = await Site._load(req.params.guid, true);
    if (!siteObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SITES_CODES.SITE_NOT_FOUND,
        message: SITES_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      site: await siteObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SITES_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// === MISE À JOUR DE SITE ===

router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    if (!SitesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.INVALID_GUID,
        message: SITES_ERRORS.GUID_INVALID,
      });
    }

    const siteObj = await Site._load(req.params.guid, true);
    if (!siteObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SITES_CODES.SITE_NOT_FOUND,
        message: SITES_ERRORS.NOT_FOUND,
      });
    }

    const validatedData = validateSitesUpdate(req.body);

    if (validatedData.name) {
      siteObj.setName(validatedData.name);
    }
    if (validatedData.address !== undefined) {
      siteObj.setAddress(validatedData.address);
    }
    if (validatedData.geofence_polygon) {
      siteObj.setGeofencePolygon(validatedData.geofence_polygon);
    }
    if (validatedData.geofence_radius) {
      siteObj.setGeofenceRadius(validatedData.geofence_radius);
    }
    if (validatedData.active !== undefined) {
      siteObj.setActive(validatedData.active);
    }
    if (validatedData.public !== undefined) {
      siteObj.setPublic(validatedData.public);
    }
    if (validatedData.allowed_roles) {
      siteObj.setAllowedRoles(validatedData.allowed_roles);
    }

    await siteObj.save();
    return R.handleSuccess(res, await siteObj.toJSON());
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.VALIDATION_FAILED,
        message: SITES_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  }
});

// === SUPPRESSION DE SITE ===

router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    if (!SitesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.INVALID_GUID,
        message: SITES_ERRORS.GUID_INVALID,
      });
    }

    const siteObj = await Site._load(req.params.guid, true);
    if (!siteObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SITES_CODES.SITE_NOT_FOUND,
        message: SITES_ERRORS.NOT_FOUND,
      });
    }

    await siteObj.delete();
    return R.handleSuccess(res, {
      message: SITES_MESSAGES.DELETED_SUCCESSFULLY,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SITES_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

// === GESTION DES QR CODES ===

router.post('/:guid/regenerate-qr', Ensure.post(), async (req: Request, res: Response) => {
  try {
    if (!SitesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.INVALID_GUID,
        message: SITES_ERRORS.GUID_INVALID,
      });
    }

    const siteObj = await Site._load(req.params.guid, true);
    if (!siteObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SITES_CODES.SITE_NOT_FOUND,
        message: SITES_ERRORS.NOT_FOUND,
      });
    }

    const { reason } = req.body;
    const newQRData = await siteObj.regenerateQRCode(reason);

    return R.handleSuccess(res, {
      message: 'QR code regenerated successfully',
      qr_data: newQRData,
      site_guid: siteObj.getGuid(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SITES_CODES.QR_REGENERATION_FAILED,
      message: error.message,
    });
  }
});

router.post('/validate-qr', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { qr_token } = req.body;

    if (!qr_token) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.VALIDATION_FAILED,
        message: 'QR token is required',
      });
    }

    const siteObj = await Site.validateQRAccess(qr_token);

    if (!siteObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SITES_CODES.QR_CODE_DATA_INVALID,
        message: 'Invalid QR token or site not found',
      });
    }

    return R.handleSuccess(res, {
      valid: true,
      site: await siteObj.toJSON(responseValue.MINIMAL),
      access_granted: siteObj.isActive(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SITES_CODES.QR_CODE_DATA_INVALID,
      message: error.message,
    });
  }
});

// === GESTION GÉOSPATIALE ===

// router.post('/:guid/expand-geofence', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     if (!SitesValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: SITES_CODES.INVALID_GUID,
//         message: SITES_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const siteObj = await Site._load(req.params.guid, true);
//     if (!siteObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: SITES_CODES.SITE_NOT_FOUND,
//         message: SITES_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const validatedData = validateGeofenceExpansion(req.body);
//
//     await siteObj.expandGeofence(
//       validatedData.new_polygon,
//       validatedData.reason || 'Geofence expansion',
//     );
//
//     return R.handleSuccess(res, {
//       message: 'Geofence expanded successfully',
//       site: await siteObj.toJSON(),
//     });
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: SITES_CODES.VALIDATION_FAILED,
//         message: SITES_ERRORS.VALIDATION_FAILED,
//         details: error.issues,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: SITES_CODES.GEOFENCE_EXPANSION_FAILED,
//         message: error.message,
//       });
//     }
//   }
// });

// === ROUTES PAR CRÉATEUR ===

router.get('/creator/:userGuid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!SitesValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.INVALID_GUID,
        message: SITES_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(req.params.userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const siteEntries = await Site._listByCreator(userObj.getId()!);
    const sites = {
      creator: userObj.toPublicJSON(),
      sites: siteEntries
        ? await Promise.all(
            siteEntries.map(async (site) => await site.toJSON(responseValue.MINIMAL)),
          )
        : [],
      count: siteEntries?.length || 0,
    };

    return R.handleSuccess(res, { sites });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SITES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === GESTION ÉQUIPE ===

router.post('/:guid/team/add', Ensure.post(), async (req: Request, res: Response) => {
  try {
    if (!SitesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.INVALID_GUID,
        message: SITES_ERRORS.GUID_INVALID,
      });
    }

    const siteObj = await Site._load(req.params.guid, true);
    if (!siteObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SITES_CODES.SITE_NOT_FOUND,
        message: SITES_ERRORS.NOT_FOUND,
      });
    }

    const { user_guids, reason } = req.body;

    if (!Array.isArray(user_guids) || user_guids.length === 0) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.VALIDATION_FAILED,
        message: 'user_guids array is required and cannot be empty',
      });
    }

    // Validation des utilisateurs
    const user_ids: number[] = [];
    for (const guid of user_guids) {
      const userObj = await User._load(guid, true);
      if (userObj) {
        user_ids.push(userObj.getId()!);
      }
    }

    await siteObj.addTeamMembers(user_ids);

    return R.handleSuccess(res, {
      message: 'Team members added successfully',
      added_users: user_ids.length,
      reason: reason || 'Team expansion',
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SITES_CODES.TEAM_MANAGEMENT_FAILED,
      message: error.message,
    });
  }
});

router.post('/:guid/team/remove', Ensure.post(), async (req: Request, res: Response) => {
  try {
    if (!SitesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.INVALID_GUID,
        message: SITES_ERRORS.GUID_INVALID,
      });
    }

    const siteObj = await Site._load(req.params.guid, true);
    if (!siteObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SITES_CODES.SITE_NOT_FOUND,
        message: SITES_ERRORS.NOT_FOUND,
      });
    }

    const { user_guids, reason } = req.body;

    if (!Array.isArray(user_guids) || user_guids.length === 0) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.VALIDATION_FAILED,
        message: 'user_guids array is required and cannot be empty',
      });
    }

    // Validation des utilisateurs
    const user_ids: number[] = [];
    for (const guid of user_guids) {
      const userObj = await User._load(guid, true);
      if (userObj) {
        user_ids.push(userObj.getId()!);
      }
    }

    await siteObj.removeTeamMembers(user_ids);

    return R.handleSuccess(res, {
      message: 'Team members removed successfully',
      removed_users: user_ids.length,
      reason: reason || 'Team restructuring',
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SITES_CODES.TEAM_MANAGEMENT_FAILED,
      message: error.message,
    });
  }
});

// === SITES TEMPORAIRES ===

router.get('/temporary/expiring', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const checkDays = parseInt(days as string, 10);

    const temporarySites = await Site._listByType(SiteType.TEMPORARY);
    const expiringSites = temporarySites?.filter((site) => site.isExpiringSoon(checkDays)) || [];

    const sites = {
      days_threshold: checkDays,
      expiring_sites: await Promise.all(
        expiringSites.map(async (site) => ({
          ...(await site.toJSON(responseValue.MINIMAL)),
          days_until_expiration: site.getDaysUntilExpiration(),
        })),
      ),
      count: expiringSites.length,
    };

    return R.handleSuccess(res, { sites });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SITES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

router.post('/:guid/extend-validity', Ensure.post(), async (req: Request, res: Response) => {
  try {
    if (!SitesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.INVALID_GUID,
        message: SITES_ERRORS.GUID_INVALID,
      });
    }

    const siteObj = await Site._load(req.params.guid, true);
    if (!siteObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SITES_CODES.SITE_NOT_FOUND,
        message: SITES_ERRORS.NOT_FOUND,
      });
    }

    if (!siteObj.isTemporarySite()) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.SITE_TYPE_INVALID,
        message: SITES_ERRORS.UNABLE_EXPAND_SITE,
      });
    }

    const { new_end_date, approved_by } = req.body;

    if (!new_end_date || !approved_by) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.VALIDATION_FAILED,
        message: 'new_end_date and approved_by are required',
      });
    }

    const approverObj = await User._load(approved_by, true);
    if (!approverObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
      });
    }

    await siteObj.extendValidity(new Date(new_end_date), approverObj.getId()!);

    return R.handleSuccess(res, {
      message: 'Site validity extended successfully',
      site: await siteObj.toJSON(),
      extended_until: new_end_date,
      approved_by: approverObj.toPublicJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SITES_CODES.VALIDITY_EXTENSION_FAILED,
      message: error.message,
    });
  }
});

// === MAINTENANCE AUTOMATIQUE ===

router.post(
  '/maintenance/deactivate-expired',
  Ensure.post(),
  async (_req: Request, res: Response) => {
    try {
      const deactivatedCount = await Site.deactivateExpiredSites();

      return R.handleSuccess(res, {
        message: 'Expired sites maintenance completed',
        deactivated_sites: deactivatedCount,
        processed_at: new Date().toISOString(),
      });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.MAINTENANCE_FAILED,
        message: error.message,
      });
    }
  },
);

// === STATISTIQUES ===

router.get('/statistics/overview', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const statistics = await Site.getSiteStatistics();

    return R.handleSuccess(res, { statistics });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SITES_CODES.STATISTICS_FAILED,
      message: error.message,
    });
  }
});

export default router;
