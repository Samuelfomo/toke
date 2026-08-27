import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes.js';
import R from '@toke/api/dist/tools/response.js';
import {
  HttpStatus,
  SITES_CODES,
  SITES_ERRORS,
  SitesValidationUtils,
  USERS_CODES,
  USERS_ERRORS,
  UsersValidationUtils,
  validateSitesCreation,
  validateSitesUpdate,
} from '@toke/shared';

import { TenantConfig } from '../tools/tenant.config.js';
import { SiteService } from '../services/site.service.js';

const router = Router();

type ServiceResult = {
  status: number;
  response: any;
};

const getClientReference = (req: Request): string => (req as any).client.reference;

const relay = (res: Response, result: ServiceResult) => {
  if (result.status >= 400) {
    return R.handleError(res, result.status, result.response);
  }

  if (result.status === HttpStatus.CREATED) {
    return R.handleCreated(res, result.response);
  }

  return R.handleSuccess(res, result.response);
};

const validateSiteGuid = (guid: string | undefined, res: Response): boolean => {
  if (!guid || !SitesValidationUtils.validateGuid(String(guid))) {
    R.handleError(res, HttpStatus.BAD_REQUEST, {
      code: SITES_CODES.INVALID_GUID,
      message: SITES_ERRORS.GUID_INVALID,
    });
    return false;
  }
  return true;
};

const validateUserGuid = (guid: string | undefined, res: Response): boolean => {
  if (!guid || !UsersValidationUtils.validateGuid(String(guid))) {
    R.handleError(res, HttpStatus.BAD_REQUEST, {
      code: USERS_CODES.INVALID_GUID,
      message: USERS_ERRORS.GUID_INVALID,
    });
    return false;
  }
  return true;
};

// IMPORTANT : les routes statiques/spécifiques sont déclarées avant /:guid.

// ─── Listing / lecture ───────────────────────────────────────────────────────

router.get('/', TenantConfig.authenticate, Ensure.get(), async (req: Request, res: Response) => {
  try {
    const result = await SiteService.exportSites(
      getClientReference(req),
      req.query as Record<string, unknown>,
    );
    return relay(res, result);
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SITES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

router.get(
  '/revision',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      return relay(res, await SiteService.getRevision(getClientReference(req)));
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.REVISION_FAILED,
        message: error.message,
      });
    }
  },
);

router.get(
  '/list',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const result = await SiteService.listSites(
        getClientReference(req),
        req.query as Record<string, unknown>,
      );
      return relay(res, result);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  },
);

router.get(
  '/type/:siteType/list',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      return relay(
        res,
        await SiteService.listSitesByType(getClientReference(req), String(req.params.siteType)),
      );
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  },
);

router.get(
  '/active',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      return relay(
        res,
        await SiteService.listActiveSites(
          getClientReference(req),
          req.query as Record<string, unknown>,
        ),
      );
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  },
);

router.get(
  '/public',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      return relay(res, await SiteService.listPublicSites(getClientReference(req)));
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  },
);

router.get(
  '/creator/:guid/list',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const guid = String(req.params.guid || '');
      if (!validateUserGuid(guid, res)) return;

      return relay(res, await SiteService.listSitesByCreator(getClientReference(req), guid));
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  },
);

router.get(
  '/creator/:guid/active',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const guid = String(req.params.guid || '');
      if (!validateUserGuid(guid, res)) return;

      return relay(res, await SiteService.listActiveSitesByCreator(getClientReference(req), guid));
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  },
);

router.get(
  '/temporary/expiring',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      return relay(
        res,
        await SiteService.listExpiringTemporarySites(
          getClientReference(req),
          String(req.query.days ?? '7'),
        ),
      );
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  },
);

router.get(
  '/statistics/overview',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      return relay(res, await SiteService.getStatistics(getClientReference(req)));
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.STATISTICS_FAILED,
        message: error.message,
      });
    }
  },
);

// ─── QR / maintenance statiques ─────────────────────────────────────────────

router.patch(
  '/validate-qr',
  TenantConfig.authenticate,
  Ensure.patch(),
  async (req: Request, res: Response) => {
    try {
      const qrToken = req.body?.qr_token;
      if (!qrToken) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: SITES_CODES.VALIDATION_FAILED,
          message: 'QR token is required',
        });
      }

      return relay(res, await SiteService.validateQRCode(getClientReference(req), qrToken));
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.QR_CODE_DATA_INVALID,
        message: error.message,
      });
    }
  },
);

router.patch(
  '/maintenance/deactivate-expired',
  TenantConfig.authenticate,
  Ensure.patch(),
  async (req: Request, res: Response) => {
    try {
      return relay(res, await SiteService.deactivateExpiredSites(getClientReference(req)));
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.MAINTENANCE_FAILED,
        message: error.message,
      });
    }
  },
);

router.post(
  '/generate-qr-code',
  TenantConfig.authenticate,
  Ensure.post(),
  async (req: Request, res: Response) => {
    try {
      const { site, manager } = req.body || {};
      return relay(
        res,
        await SiteService.generateQRCode(
          getClientReference(req),
          String(site || ''),
          String(manager || ''),
        ),
      );
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.QR_REGENERATION_FAILED,
        message: error.message,
      });
    }
  },
);

// ─── Création ────────────────────────────────────────────────────────────────

router.post('/', TenantConfig.authenticate, Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateSitesCreation(req.body);
    return relay(res, await SiteService.createSite(getClientReference(req), validatedData));
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: SITES_CODES.VALIDATION_FAILED,
        message: SITES_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    }

    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: SITES_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

// ─── Actions sur un site ────────────────────────────────────────────────────

router.patch(
  '/:guid/regenerate-qr',
  TenantConfig.authenticate,
  Ensure.patch(),
  async (req: Request, res: Response) => {
    try {
      const guid = String(req.params.guid || '');
      if (!validateSiteGuid(guid, res)) return;

      return relay(
        res,
        await SiteService.regenerateQRCode(getClientReference(req), guid, req.body?.reason),
      );
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.QR_REGENERATION_FAILED,
        message: error.message,
      });
    }
  },
);

router.post(
  '/:guid/team/add',
  TenantConfig.authenticate,
  Ensure.post(),
  async (req: Request, res: Response) => {
    try {
      const guid = String(req.params.guid || '');
      if (!validateSiteGuid(guid, res)) return;

      const { user_guids, reason } = req.body || {};
      if (!Array.isArray(user_guids) || user_guids.length === 0) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: SITES_CODES.VALIDATION_FAILED,
          message: 'user_guids array is required and cannot be empty',
        });
      }

      return relay(
        res,
        await SiteService.addTeamMembers(getClientReference(req), guid, user_guids, reason),
      );
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.TEAM_MANAGEMENT_FAILED,
        message: error.message,
      });
    }
  },
);

router.post(
  '/:guid/team/remove',
  TenantConfig.authenticate,
  Ensure.post(),
  async (req: Request, res: Response) => {
    try {
      const guid = String(req.params.guid || '');
      if (!validateSiteGuid(guid, res)) return;

      const { user_guids, reason } = req.body || {};
      if (!Array.isArray(user_guids) || user_guids.length === 0) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: SITES_CODES.VALIDATION_FAILED,
          message: 'user_guids array is required and cannot be empty',
        });
      }

      return relay(
        res,
        await SiteService.removeTeamMembers(getClientReference(req), guid, user_guids, reason),
      );
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.TEAM_MANAGEMENT_FAILED,
        message: error.message,
      });
    }
  },
);

router.patch(
  '/:guid/extend-validity',
  TenantConfig.authenticate,
  Ensure.patch(),
  async (req: Request, res: Response) => {
    try {
      const guid = String(req.params.guid || '');
      if (!validateSiteGuid(guid, res)) return;

      const { new_end_date, approved_by } = req.body || {};
      if (!new_end_date || !approved_by) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: SITES_CODES.VALIDATION_FAILED,
          message: 'new_end_date and approved_by are required',
        });
      }

      return relay(
        res,
        await SiteService.extendTemporarySiteValidity(
          getClientReference(req),
          guid,
          new_end_date,
          approved_by,
        ),
      );
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.VALIDITY_EXTENSION_FAILED,
        message: error.message,
      });
    }
  },
);

router.patch(
  '/:guid/status',
  TenantConfig.authenticate,
  Ensure.patch(),
  async (req: Request, res: Response) => {
    try {
      const guid = String(req.params.guid || '');
      if (!validateSiteGuid(guid, res)) return;

      const active = req.query.active;
      if (active === undefined) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: SITES_CODES.ACTIVE_STATUS_INVALID,
          message: SITES_ERRORS.ACTIVE_STATUS_INVALID,
        });
      }

      return relay(
        res,
        await SiteService.setSiteStatus(getClientReference(req), guid, String(active)),
      );
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  },
);

// ─── CRUD dynamique : toujours en dernier ───────────────────────────────────

router.get(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const guid = String(req.params.guid || '');
      if (!validateSiteGuid(guid, res)) return;

      return relay(res, await SiteService.getSite(getClientReference(req), guid));
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.RETRIEVAL_FAILED,
        message: error.message,
      });
    }
  },
);

router.put(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.put(),
  async (req: Request, res: Response) => {
    try {
      const guid = String(req.params.guid || '');
      if (!validateSiteGuid(guid, res)) return;

      const validatedData = validateSitesUpdate(req.body);
      return relay(res, await SiteService.updateSite(getClientReference(req), guid, validatedData));
    } catch (error: any) {
      if (error.issues) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: SITES_CODES.VALIDATION_FAILED,
          message: SITES_ERRORS.VALIDATION_FAILED,
          details: error.issues,
        });
      }

      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  },
);

router.delete(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.delete(),
  async (req: Request, res: Response) => {
    try {
      const guid = String(req.params.guid || '');
      if (!validateSiteGuid(guid, res)) return;

      return relay(res, await SiteService.deleteSite(getClientReference(req), guid));
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: SITES_CODES.DELETE_FAILED,
        message: error.message,
      });
    }
  },
);

export default router;

// import { Request, Response, Router } from 'express';
// import Ensure from '@toke/api/dist/middle/ensured-routes.js';
// import R from '@toke/api/dist/tools/response.js';
// import {
//   HttpStatus,
//   SITES_CODES,
//   SITES_ERRORS,
//   USERS_CODES,
//   USERS_ERRORS,
//   UsersValidationUtils,
//   validateSitesCreation,
//   validateSitesUpdate,
// } from '@toke/shared';
//
// import { TenantConfig } from '../tools/tenant.config.js';
// import { SiteService } from '../services/site.service.js';
//
// const router = Router();
//
// router.get(
//   '/list',
//   TenantConfig.authenticate,
//   Ensure.get(),
//   async (req: Request, res: Response) => {
//     try {
//       const client = (req as any).client.reference;
//
//       const result: any = await SiteService.listSites(client);
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
// router.get(
//   '/:guid',
//   TenantConfig.authenticate,
//   Ensure.get(),
//   async (req: Request, res: Response) => {
//     try {
//       const { guid } = req.params;
//
//       // Vérification du GUID
//       if (!guid || !UsersValidationUtils.validateGuid(String(guid))) {
//         return R.handleError(res, HttpStatus.BAD_REQUEST, {
//           code: USERS_CODES.INVALID_GUID,
//           message: USERS_ERRORS.GUID_INVALID,
//         });
//       }
//
//       const client = (req as any).client.reference;
//
//       const result: any = await SiteService.getSite(client, String(guid));
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
// router.post('/', Ensure.post(), TenantConfig.authenticate, async (req: Request, res: Response) => {
//   try {
//     const client = (req as any).client.reference;
//     const validatedData = validateSitesCreation(req.body);
//
//     const result = await SiteService.createSite(client, validatedData);
//     if (result.status !== HttpStatus.CREATED) {
//       return R.handleError(res, result.status, result.response);
//     }
//     return R.handleCreated(res, result.response);
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: SITES_CODES.VALIDATION_FAILED,
//         message: SITES_ERRORS.VALIDATION_FAILED,
//         details: error.issues,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: SITES_CODES.CREATION_FAILED,
//         message: error.message,
//       });
//     }
//   }
// });
//
// router.put(
//   '/:guid',
//   Ensure.put(),
//   TenantConfig.authenticate,
//   async (req: Request, res: Response) => {
//     try {
//       const { guid } = req.params;
//       if (!guid || !UsersValidationUtils.validateGuid(String(guid))) {
//         return R.handleError(res, HttpStatus.BAD_REQUEST, {
//           code: SITES_CODES.INVALID_GUID,
//           message: SITES_ERRORS.GUID_INVALID,
//         });
//       }
//       const client = (req as any).client.reference;
//       const validatedData = validateSitesUpdate(req.body);
//
//       const result = await SiteService.updateSite(client, guid as string, validatedData);
//       if (result.status !== HttpStatus.SUCCESS) {
//         return R.handleError(res, result.status, result.response);
//       }
//       return R.handleCreated(res, result.response);
//     } catch (error: any) {
//       if (error.issues) {
//         return R.handleError(res, HttpStatus.BAD_REQUEST, {
//           code: SITES_CODES.VALIDATION_FAILED,
//           message: SITES_ERRORS.VALIDATION_FAILED,
//           details: error.issues,
//         });
//       } else {
//         return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//           code: SITES_CODES.UPDATE_FAILED,
//           message: error.message,
//         });
//       }
//     }
//   },
// );
//
// export default router;
