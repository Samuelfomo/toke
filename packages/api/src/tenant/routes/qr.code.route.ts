import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  QR_CODE_CODES,
  QR_CODE_ERRORS,
  QR_CODE_MESSAGES,
  SITES_CODES,
  SITES_ERRORS,
  USERS_CODES,
  USERS_ERRORS,
  validateQrCodeCreation,
  validateQrCodeFilters,
  validateQrCodeGuid,
  validateQrCodeUpdate,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import Site from '../class/Site.js';
import User from '../class/User.js';
import QrCodeGeneration from '../class/QrCodeGeneration.js';
import { TenantRevision } from '../../tools/revision.js';
import { tableName } from '../../utils/response.model.js';

const router = Router();

router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);

    const qrCodes = await QrCodeGeneration.exportable(paginationData);
    return R.handleSuccess(res, {
      qrCodes,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: QR_CODE_CODES.PAGINATION_INVALID,
        message: QR_CODE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: QR_CODE_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await TenantRevision.getRevision(tableName.QR_CODE_GENERATION);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: QR_CODE_CODES.REVISION_FAILED,
      message: error.message,
    });
  }
});

router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validation = validateQrCodeCreation(req.body);
    if (!validation.success || !validation.data) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: QR_CODE_CODES.VALIDATION_FAILED,
        message: QR_CODE_ERRORS.VALIDATION_FAILED,
        details: validation.errors,
      });
    }

    const validatedData = validation.data;

    // Vérifier site
    const siteObj = await Site._load(validatedData.site, true);
    if (!siteObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SITES_CODES.SITE_NOT_FOUND,
        message: SITES_ERRORS.NOT_FOUND,
      });
    }

    // Vérifier manager
    const managerObj = await User._load(validatedData.manager, true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const qrCodeObj = new QrCodeGeneration()
      .setSite(siteObj.getId()!)
      .setManager(managerObj.getId()!);

    if (validatedData.valid_from) {
      qrCodeObj.setValidFrom(validatedData.valid_from);
    }
    if (validatedData.valid_to) {
      qrCodeObj.setValidTo(validatedData.valid_to);
    }

    await qrCodeObj.save();

    return R.handleCreated(res, await qrCodeObj.toJSON());
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: QR_CODE_CODES.VALIDATION_FAILED,
        message: QR_CODE_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('already exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: QR_CODE_CODES.QR_CODE_ALREADY_EXISTS,
        message: error.message,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: QR_CODE_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: QR_CODE_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  }
});

router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const validGuid = validateQrCodeGuid(req.params.guid);
    if (!validGuid.success) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: QR_CODE_CODES.INVALID_GUID,
        message: QR_CODE_ERRORS.GUID_INVALID,
      });
    }

    const qrCodeObj = await QrCodeGeneration._load(req.params.guid, true);
    if (!qrCodeObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: QR_CODE_CODES.QR_CODE_NOT_FOUND,
        message: QR_CODE_ERRORS.NOT_FOUND,
      });
    }

    const validation = validateQrCodeUpdate(req.body);
    if (!validation.success || !validation.data) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: QR_CODE_CODES.VALIDATION_FAILED,
        message: QR_CODE_ERRORS.VALIDATION_FAILED,
        details: validation.errors,
      });
    }

    const validatedData = validation.data;

    if (validatedData.site) {
      const siteObj = await Site._load(validatedData.site, true);
      if (!siteObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: SITES_CODES.SITE_NOT_FOUND,
          message: SITES_ERRORS.NOT_FOUND,
        });
      }
      qrCodeObj.setSite(siteObj.getId()!);
    }

    if (validatedData.manager) {
      const managerObj = await User._load(validatedData.manager, true);
      if (!managerObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.USER_NOT_FOUND,
          message: USERS_ERRORS.NOT_FOUND,
        });
      }
      qrCodeObj.setManager(managerObj.getId()!);
    }

    if (validatedData.valid_from !== undefined) {
      qrCodeObj.setValidFrom(validatedData.valid_from);
    }
    if (validatedData.valid_to !== undefined) {
      qrCodeObj.setValidTo(validatedData.valid_to);
    }

    await qrCodeObj.save();

    return R.handleSuccess(res, await qrCodeObj.toJSON());
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: QR_CODE_CODES.INVALID_GUID,
        message: QR_CODE_ERRORS.GUID_INVALID,
      });
    } else if (error.message.includes('already exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: QR_CODE_CODES.QR_CODE_ALREADY_EXISTS,
        message: error.message,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: QR_CODE_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: QR_CODE_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  }
});

router.patch('/shared/:guid', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!guid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: QR_CODE_CODES.GUID_REQUIRED,
        message: QR_CODE_ERRORS.GUID_REQUIRED,
      });
    }
    const isValidGuid = validateQrCodeGuid(guid);
    if (!isValidGuid.success) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: QR_CODE_CODES.INVALID_GUID,
        message: QR_CODE_ERRORS.GUID_INVALID,
      });
    }

    const qrCodeObj = await QrCodeGeneration._load(guid, true);
    if (!qrCodeObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: QR_CODE_CODES.QR_CODE_NOT_FOUND,
        message: QR_CODE_ERRORS.NOT_FOUND,
      });
    }

    qrCodeObj.toggleShared();

    await qrCodeObj.sharedSiteQrCode();

    return R.handleSuccess(res, {
      message: QR_CODE_MESSAGES.SHARED_SUCCESSFULLY,
      // await qrCodeObj.toJSON()
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: QR_CODE_CODES.SHARED_FAILED,
      message: error.message,
    });
  }
});

router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit, ...filterQuery } = req.query;
    const paginationOptions = paginationSchema.parse(req.query);
    const filtersValidation = validateQrCodeFilters(filterQuery);
    if (!filtersValidation.success) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: QR_CODE_CODES.VALIDATION_FAILED,
        message: QR_CODE_ERRORS.VALIDATION_FAILED,
        details: filtersValidation.errors,
      });
    }

    const filters = filtersValidation.data;
    const conditions: Record<string, any> = {};

    if (filters?.site) {
      conditions.site = filters.site;
    }
    if (filters?.manager) {
      conditions.manager = filters.manager;
    }

    const qrCodeEntries = await QrCodeGeneration._list(conditions, paginationOptions);
    const qrCodes = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || qrCodeEntries?.length,
        count: qrCodeEntries?.length || 0,
      },
      // items: await Promise.all((qrCodeEntries ?? []).map(async (qrCode) => await qrCode.toJSON())),
      items: await Promise.all((qrCodeEntries ?? []).map((qrCode) => qrCode.toJSON())),
    };
    return R.handleSuccess(res, { qrCodes });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: QR_CODE_CODES.PAGINATION_INVALID,
        message: QR_CODE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: QR_CODE_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/site/:site/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { site } = req.params;

    const siteObj = await Site._load(site, true);
    if (!siteObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: SITES_CODES.SITE_NOT_FOUND,
        message: SITES_ERRORS.NOT_FOUND,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const qrCodeEntries = await QrCodeGeneration._listBySite(siteObj.getId()!, paginationOptions);

    const qrCodes = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || qrCodeEntries?.length,
        count: qrCodeEntries?.length || 0,
      },
      // items: await Promise.all((qrCodeEntries ?? []).map(async (qrCode) => await qrCode.toJSON())),
      items: await Promise.all((qrCodeEntries ?? []).map((qrCode) => qrCode.toJSON())),
    };
    return R.handleSuccess(res, { qrCodes });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: QR_CODE_CODES.PAGINATION_INVALID,
        message: QR_CODE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: QR_CODE_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/manager/:manager/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager } = req.params;

    const managerObj = await User._load(manager, true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const qrCodeEntries = await QrCodeGeneration._listByManager(
      managerObj.getId()!,
      paginationOptions,
    );

    const qrCodes = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || qrCodeEntries?.length,
        count: qrCodeEntries?.length || 0,
      },
      // items: await Promise.all((qrCodeEntries ?? []).map(async (qrCode) => await qrCode.toJSON())),
      items: await Promise.all((qrCodeEntries ?? []).map((qrCode) => qrCode.toJSON())),
    };
    return R.handleSuccess(res, { qrCodes });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: QR_CODE_CODES.PAGINATION_INVALID,
        message: QR_CODE_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: QR_CODE_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const validGuid = validateQrCodeGuid(req.params.guid);
    if (!validGuid.success) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: QR_CODE_CODES.INVALID_GUID,
        message: QR_CODE_ERRORS.GUID_INVALID,
      });
    }

    const qrCodeObj = await QrCodeGeneration._load(req.params.guid, true);
    if (!qrCodeObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: QR_CODE_CODES.QR_CODE_NOT_FOUND,
        message: QR_CODE_ERRORS.NOT_FOUND,
      });
    }

    await qrCodeObj.delete();
    return R.handleSuccess(res, { message: QR_CODE_MESSAGES.DELETED_SUCCESSFULLY });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: QR_CODE_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

export default router;
