import { Request, Response, Router } from 'express';
import {
  DEPARTMENT_CODES,
  DEPARTMENT_ERRORS,
  DEPARTMENT_MESSAGES,
  DepartmentValidationUtils,
  HttpStatus,
  paginationSchema,
  validateDepartmentCreation,
  validateDepartmentFilters,
  validateDepartmentUpdate,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import Department from '../class/Department.js';
import User from '../class/User.js';
import { TenantRevision } from '../../tools/revision.js';
import { responseValue, tableName } from '../../utils/response.model.js';
import { ValidationUtils } from '../../utils/view.validator.js';

const router = Router();

// === ROUTES DE LISTAGE GÉNÉRAL ===

router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const departments = await Department.exportable({}, paginationData);

    return R.handleSuccess(res, {
      departments,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEPARTMENT_CODES.PAGINATION_INVALID,
        message: DEPARTMENT_ERRORS.PAGINATION_INVALID,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: DEPARTMENT_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await TenantRevision.getRevision(tableName.DEPARTMENT);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEPARTMENT_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const filtersQuery = { ...req.query };
    delete filtersQuery.offset;
    delete filtersQuery.limit;
    delete filtersQuery.view;

    const filters = validateDepartmentFilters(filtersQuery);
    const conditions: Record<string, any> = {};

    if (filters.name) {
      conditions.name = filters.name;
    }

    if (filters.code) {
      conditions.code = filters.code;
    }

    if (filters.manager) {
      conditions.manager = filters.manager;
    }

    if (filters.active !== undefined) {
      conditions.active = filters.active;
    }

    const departmentList = await Department._list(conditions, paginationOptions);
    const departments = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || departmentList?.length || 0,
        count: departmentList?.length || 0,
      },
      items: departmentList ? departmentList.map(async (dept) => await dept.toJSON()) : [],
    };

    return R.handleSuccess(res, { departments });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }

    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEPARTMENT_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === CRÉATION DEPARTMENT ===

router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateDepartmentCreation(req.body);

    // Vérifier si le code existe déjà
    const existingByCode = await Department._load(validatedData.code, false, true);
    if (existingByCode) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: DEPARTMENT_CODES.CODE_ALREADY_EXISTS,
        message: DEPARTMENT_ERRORS.CODE_ALREADY_EXISTS,
      });
    }

    // Vérifier le manager si fourni
    if (validatedData.manager) {
      const managerObj = await User._load(validatedData.manager, true);
      if (!managerObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: DEPARTMENT_CODES.MANAGER_NOT_FOUND,
          message: DEPARTMENT_ERRORS.MANAGER_NOT_FOUND,
        });
      }
    }

    const departmentObj = new Department()
      .setName(validatedData.name)
      .setCode(validatedData.code)
      .setActive(validatedData.active);

    if (validatedData.description) {
      departmentObj.setDescription(validatedData.description);
    }

    if (validatedData.manager) {
      const managerObj = await User._load(validatedData.manager, true);
      departmentObj.setManager(managerObj?.getId()!);
    }

    await departmentObj.save();

    return R.handleCreated(res, {
      message: DEPARTMENT_MESSAGES.CREATED_SUCCESSFULLY,
      department: await departmentObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }

    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEPARTMENT_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

// === LISTING PAR MANAGER ===

router.get('/manager/:managerGuid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!DepartmentValidationUtils.validateGuid(req.params.managerGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEPARTMENT_CODES.INVALID_GUID,
        message: DEPARTMENT_ERRORS.GUID_INVALID,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const managerObj = await User._load(req.params.managerGuid, true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: DEPARTMENT_CODES.MANAGER_NOT_FOUND,
        message: DEPARTMENT_ERRORS.MANAGER_NOT_FOUND,
      });
    }

    const departmentList = await Department._listByManager(managerObj.getId()!, paginationOptions);
    const departments = {
      items: departmentList ? departmentList.map(async (dept) => await dept.toJSON()) : [],
      count: departmentList?.length || 0,
    };

    return R.handleSuccess(res, { departments });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEPARTMENT_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === LISTING PAR STATUT ACTIF ===

router.get('/active/:status', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const isActive = req.params.status === 'true';
    const paginationOptions = paginationSchema.parse(req.query);

    const departmentList = await Department._listByActiveStatus(isActive, paginationOptions);
    const departments = {
      active: isActive,
      items: departmentList ? departmentList.map(async (dept) => await dept.toJSON()) : [],
      count: departmentList?.length || 0,
    };

    return R.handleSuccess(res, { departments });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEPARTMENT_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === RÉCUPÉRATION PAR GUID ===

router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!DepartmentValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEPARTMENT_CODES.INVALID_GUID,
        message: DEPARTMENT_ERRORS.GUID_INVALID,
      });
    }

    const departmentObj = await Department._load(req.params.guid, true);
    if (!departmentObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: DEPARTMENT_CODES.DEPARTMENT_NOT_FOUND,
        message: DEPARTMENT_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      department: await departmentObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEPARTMENT_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

// === MISE À JOUR ===

router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    if (!DepartmentValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEPARTMENT_CODES.INVALID_GUID,
        message: DEPARTMENT_ERRORS.GUID_INVALID,
      });
    }

    const departmentObj = await Department._load(req.params.guid, true);
    if (!departmentObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: DEPARTMENT_CODES.DEPARTMENT_NOT_FOUND,
        message: DEPARTMENT_ERRORS.NOT_FOUND,
      });
    }

    const validatedData = validateDepartmentUpdate(req.body);

    // Vérifier si le code est modifié et s'il existe déjà
    if (validatedData.code && validatedData.code !== departmentObj.getCode()) {
      const existingByCode = await Department._load(validatedData.code, false, true);
      if (existingByCode) {
        return R.handleError(res, HttpStatus.CONFLICT, {
          code: DEPARTMENT_CODES.CODE_ALREADY_EXISTS,
          message: DEPARTMENT_ERRORS.CODE_ALREADY_EXISTS,
        });
      }
    }

    // Vérifier le manager si fourni
    if (validatedData.manager) {
      const managerObj = await User._load(validatedData.manager, true);
      if (!managerObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: DEPARTMENT_CODES.MANAGER_NOT_FOUND,
          message: DEPARTMENT_ERRORS.MANAGER_NOT_FOUND,
        });
      }
      departmentObj.setManager(managerObj.getId()!);
    }

    if (validatedData.name) {
      departmentObj.setName(validatedData.name);
    }

    if (validatedData.code) {
      departmentObj.setCode(validatedData.code);
    }

    if (validatedData.description) {
      departmentObj.setDescription(validatedData.description);
    }

    if (validatedData.active !== undefined) {
      departmentObj.setActive(validatedData.active);
    }

    await departmentObj.save();

    return R.handleSuccess(res, {
      message: DEPARTMENT_MESSAGES.UPDATED_SUCCESSFULLY,
      department: await departmentObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }

    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEPARTMENT_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// === SUPPRESSION ===

router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    if (!DepartmentValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: DEPARTMENT_CODES.INVALID_GUID,
        message: DEPARTMENT_ERRORS.GUID_INVALID,
      });
    }

    const departmentObj = await Department._load(req.params.guid, true);
    if (!departmentObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: DEPARTMENT_CODES.DEPARTMENT_NOT_FOUND,
        message: DEPARTMENT_ERRORS.NOT_FOUND,
      });
    }

    await departmentObj.delete();

    return R.handleSuccess(res, {
      message: DEPARTMENT_MESSAGES.DELETED_SUCCESSFULLY,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: DEPARTMENT_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

export default router;
