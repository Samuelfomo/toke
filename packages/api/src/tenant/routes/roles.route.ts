import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  ROLES_CODES,
  ROLES_ERRORS,
  RolesValidationUtils,
  TENANT_CODES,
  validateRolesCreation,
  validateRolesFilters,
  validateRolesUpdate,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response';
import Role from '../class/Role';
import Revision from '../../tools/revision';
import { tableName } from '../../utils/response.model';

const router = Router();

router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);

    const exportableRoles = await Role.exportable(paginationData);
    return R.handleSuccess(res, {
      exportableRoles,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROLES_CODES.PAGINATION_INVALID,
        message: ROLES_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ROLES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.ROLES);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TENANT_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateRolesCreation(req.body);
    const roleObj = new Role()
      .setCode(validatedData.code)
      .setName(validatedData.name)
      .setPermission(validatedData.permissions);
    if (validatedData.description) {
      roleObj.setDescription(validatedData.description);
    }
    if (validatedData.system_role) {
      roleObj.setSystemRole(validatedData.system_role);
    }
    await roleObj.save();
    return R.handleCreated(res, roleObj.toJSON());
  } catch (error: any) {
    if (error.issues) {
      // Erreur Zod
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROLES_CODES.VALIDATION_FAILED,
        message: ROLES_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('already exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: ROLES_CODES.ROLE_ALREADY_EXISTS,
        message: error.message,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROLES_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ROLES_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  }
});

router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const validGuid = RolesValidationUtils.validateGuid(req.params.guid);
    if (!validGuid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROLES_CODES.INVALID_GUID,
        message: ROLES_ERRORS.GUID_INVALID,
      });
    }

    const guid = parseInt(req.params.guid, 10);

    const roleObj = await Role._load(guid, true);
    if (!roleObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROLES_CODES.ROLE_NOT_FOUND,
        message: ROLES_ERRORS.NOT_FOUND,
      });
    }
    const validatedData = validateRolesUpdate(req.body);

    if (validatedData.code) {
      roleObj.setCode(validatedData.code);
    }
    if (validatedData.name) {
      roleObj.setName(validatedData.name);
    }
    if (validatedData.description) {
      roleObj.setDescription(validatedData.description);
    }
    if (validatedData.permissions) {
      roleObj.setPermission(validatedData.permissions);
    }
    if (validatedData.system_role) {
      roleObj.setSystemRole(validatedData.system_role);
    }
    await roleObj.save();
    return R.handleSuccess(res, roleObj.toJSON());
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROLES_CODES.INVALID_GUID,
        message: ROLES_ERRORS.GUID_INVALID,
      });
    } else if (error.message.includes('already exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: ROLES_CODES.ROLE_ALREADY_EXISTS,
        message: error.message,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROLES_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ROLES_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/:list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const filters = validateRolesFilters(req.query);
    const paginationOptions = paginationSchema.parse(req.query);
    const conditions: Record<string, any> = {};
    if (filters.system_role) {
      conditions.system_role = filters.system_role;
    }
    if (filters.permissions) {
      conditions.permissions = filters.permissions;
    }

    const roleEntries = await Role._list(conditions, paginationOptions);
    const roles = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || roleEntries?.length,
        count: roleEntries?.length || 0,
      },
      items: roleEntries?.map((role) => role.toJSON()),
    };
    return R.handleSuccess(res, { roles });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROLES_CODES.PAGINATION_INVALID,
        message: ROLES_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ROLES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/:system_role/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { system_role } = req.params;
    const values = system_role.toLowerCase() === 'true' || system_role === '1';

    const paginationOptions = paginationSchema.parse(req.query);
    const RoleEntries = await Role._listBySystemRole(values, paginationOptions);
    const roles = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || RoleEntries?.length,
        count: RoleEntries?.length || 0,
      },
      items: RoleEntries?.map((role) => role.toJSON()),
    };
    return R.handleSuccess(res, { roles });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROLES_CODES.PAGINATION_INVALID,
        message: ROLES_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ROLES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const validGuid = RolesValidationUtils.validateGuid(req.params.guid);
    if (!validGuid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ROLES_CODES.INVALID_GUID,
        message: ROLES_ERRORS.GUID_INVALID,
      });
    }
    const guid = parseInt(req.params.guid, 10);
    const roleObj = await Role._load(guid, true);
    if (!roleObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROLES_CODES.ROLE_NOT_FOUND,
        message: ROLES_ERRORS.NOT_FOUND,
      });
    }
    await roleObj.delete();
    return R.handleSuccess(res, { message: 'Role deleted successfully' });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ROLES_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

export default router;
