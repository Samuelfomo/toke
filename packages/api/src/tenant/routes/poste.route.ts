import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  Level,
  paginationSchema,
  POSTE_CODES,
  POSTE_ERRORS,
  POSTE_MESSAGES,
  PosteValidationUtils,
  validatePosteCreation,
  validatePosteFilters,
  validatePosteUpdate,
} from '@toke/shared';
import { Op } from 'sequelize';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import Poste from '../class/Poste.js';
import Department from '../class/Department.js';
import { TenantRevision } from '../../tools/revision.js';
import { responseValue, tableName } from '../../utils/response.model.js';
import { ValidationUtils } from '../../utils/view.validator.js';

const router = Router();

// === ROUTES DE LISTAGE GÉNÉRAL ===

router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const postes = await Poste.exportable({}, paginationData);

    return R.handleSuccess(res, {
      postes,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: POSTE_CODES.PAGINATION_INVALID,
        message: POSTE_ERRORS.PAGINATION_INVALID,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: POSTE_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await TenantRevision.getRevision(tableName.POSTE);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: POSTE_CODES.LISTING_FAILED,
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

    const filters = validatePosteFilters(filtersQuery);
    const conditions: Record<string, any> = {};

    if (filters.title) {
      conditions.title = filters.title;
    }

    if (filters.code) {
      conditions.code = filters.code;
    }

    if (filters.department) {
      conditions.department = filters.department;
    }

    if (filters.level) {
      conditions.level = filters.level;
    }

    if (filters.active !== undefined) {
      conditions.active = filters.active;
    }

    // Filtre par plage salariale
    if (filters.salary_min !== undefined || filters.salary_max !== undefined) {
      conditions.salary_base = {};
      if (filters.salary_min !== undefined) {
        conditions.salary_base[Op.gte] = filters.salary_min;
      }
      if (filters.salary_max !== undefined) {
        conditions.salary_base[Op.gte] = filters.salary_max;
      }
    }

    const posteList = await Poste._list(conditions, paginationOptions);
    const postes = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || posteList?.length || 0,
        count: posteList?.length || 0,
      },
      items: posteList ? posteList.map(async (poste) => await poste.toJSON()) : [],
    };

    return R.handleSuccess(res, { postes });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }

    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: POSTE_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === CRÉATION POSTE ===

router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validatePosteCreation(req.body);

    // Vérifier si le code existe déjà
    const existingByCode = await Poste._load(validatedData.code, false, true);
    if (existingByCode) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: POSTE_CODES.CODE_ALREADY_EXISTS,
        message: POSTE_ERRORS.CODE_ALREADY_EXISTS,
      });
    }

    // Vérifier le département
    const departmentObj = await Department._load(validatedData.department, true);
    if (!departmentObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: POSTE_CODES.DEPARTMENT_NOT_FOUND,
        message: POSTE_ERRORS.DEPARTMENT_NOT_FOUND,
      });
    }

    const posteObj = new Poste()
      .setTitle(validatedData.title)
      .setCode(validatedData.code)
      .setDepartment(departmentObj.getId()!)
      .setLevel(validatedData.level)
      .setActive(validatedData.active);

    if (validatedData.description) {
      posteObj.setDescription(validatedData.description);
    }

    if (validatedData.salary_base !== undefined && validatedData.salary_base !== null) {
      posteObj.setSalaryBase(validatedData.salary_base);
    }

    await posteObj.save();

    return R.handleCreated(res, {
      message: POSTE_MESSAGES.CREATED_SUCCESSFULLY,
      poste: await posteObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }

    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: POSTE_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

// === LISTING PAR DÉPARTEMENT ===

router.get(
  '/department/:departmentGuid/list',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      if (!PosteValidationUtils.validateGuid(req.params.departmentGuid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: POSTE_CODES.INVALID_GUID,
          message: POSTE_ERRORS.GUID_INVALID,
        });
      }

      const paginationOptions = paginationSchema.parse(req.query);

      const departmentObj = await Department._load(req.params.departmentGuid, true);
      if (!departmentObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: POSTE_CODES.DEPARTMENT_NOT_FOUND,
          message: POSTE_ERRORS.DEPARTMENT_NOT_FOUND,
        });
      }

      const posteList = await Poste._listByDepartment(departmentObj.getId()!, paginationOptions);
      const postes = {
        items: posteList ? posteList.map(async (poste) => await poste.toJSON()) : [],
        count: posteList?.length || 0,
      };

      return R.handleSuccess(res, { postes });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: POSTE_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  },
);

// === LISTING PAR NIVEAU ===

router.get('/level/:level/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const level = req.params.level as Level;

    if (!Object.values(Level).includes(level)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: POSTE_CODES.LEVEL_INVALID,
        message: POSTE_ERRORS.LEVEL_INVALID,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const posteList = await Poste._listByLevel(level, paginationOptions);
    const postes = {
      level,
      items: posteList ? posteList.map(async (poste) => await poste.toJSON()) : [],
      count: posteList?.length || 0,
    };

    return R.handleSuccess(res, { postes });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: POSTE_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === LISTING PAR STATUT ACTIF ===

router.get('/active/:status', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const isActive = req.params.status === 'true';
    const paginationOptions = paginationSchema.parse(req.query);

    const posteList = await Poste._listByActiveStatus(isActive, paginationOptions);
    const postes = {
      active: isActive,
      items: posteList ? posteList.map(async (poste) => await poste.toJSON()) : [],
      count: posteList?.length || 0,
    };

    return R.handleSuccess(res, { postes });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: POSTE_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === LISTING PAR PLAGE SALARIALE ===

router.get('/salary/range', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { min, max } = req.query;

    if (!min || !max) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: POSTE_CODES.SALARY_BASE_INVALID,
        message: 'Min and max salary are required',
      });
    }

    const minSalary = parseFloat(min as string);
    const maxSalary = parseFloat(max as string);

    if (isNaN(minSalary) || isNaN(maxSalary)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: POSTE_CODES.SALARY_BASE_INVALID,
        message: POSTE_ERRORS.SALARY_BASE_INVALID,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const posteList = await Poste._listBySalaryRange(minSalary, maxSalary, paginationOptions);
    const postes = {
      salary_range: {
        min: minSalary,
        max: maxSalary,
      },
      items: posteList ? posteList.map(async (poste) => await poste.toJSON()) : [],
      count: posteList?.length || 0,
    };

    return R.handleSuccess(res, { postes });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: POSTE_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === LISTE DES NIVEAUX DISPONIBLES ===

router.get('/levels/available', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    return R.handleSuccess(res, {
      count: Object.entries(Level).length,
      items: Object.entries(Level).map(([key, value]) => ({
        key,
        value,
      })),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: POSTE_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === RÉCUPÉRATION PAR GUID ===

router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!PosteValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: POSTE_CODES.INVALID_GUID,
        message: POSTE_ERRORS.GUID_INVALID,
      });
    }

    const posteObj = await Poste._load(req.params.guid, true);
    if (!posteObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: POSTE_CODES.POSTE_NOT_FOUND,
        message: POSTE_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      poste: await posteObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: POSTE_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

// === MISE À JOUR ===

router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    if (!PosteValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: POSTE_CODES.INVALID_GUID,
        message: POSTE_ERRORS.GUID_INVALID,
      });
    }

    const posteObj = await Poste._load(req.params.guid, true);
    if (!posteObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: POSTE_CODES.POSTE_NOT_FOUND,
        message: POSTE_ERRORS.NOT_FOUND,
      });
    }

    const validatedData = validatePosteUpdate(req.body);

    // Vérifier si le code est modifié et s'il existe déjà
    if (validatedData.code && validatedData.code !== posteObj.getCode()) {
      const existingByCode = await Poste._load(validatedData.code, false, true);
      if (existingByCode) {
        return R.handleError(res, HttpStatus.CONFLICT, {
          code: POSTE_CODES.CODE_ALREADY_EXISTS,
          message: POSTE_ERRORS.CODE_ALREADY_EXISTS,
        });
      }
    }

    // Vérifier le département si fourni
    if (validatedData.department) {
      const departmentObj = await Department._load(validatedData.department, true);
      if (!departmentObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: POSTE_CODES.DEPARTMENT_NOT_FOUND,
          message: POSTE_ERRORS.DEPARTMENT_NOT_FOUND,
        });
      }
      posteObj.setDepartment(departmentObj.getId()!);
    }

    if (validatedData.title) {
      posteObj.setTitle(validatedData.title);
    }

    if (validatedData.code) {
      posteObj.setCode(validatedData.code);
    }

    if (validatedData.description) {
      posteObj.setDescription(validatedData.description);
    }

    if (validatedData.salary_base) {
      posteObj.setSalaryBase(validatedData.salary_base);
    }

    if (validatedData.level) {
      posteObj.setLevel(validatedData.level);
    }

    if (validatedData.active !== undefined) {
      posteObj.setActive(validatedData.active);
    }

    await posteObj.save();

    return R.handleSuccess(res, {
      message: POSTE_MESSAGES.UPDATED_SUCCESSFULLY,
      poste: await posteObj.toJSON(),
    });
  } catch (error: any) {
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }

    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: POSTE_CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

// === SUPPRESSION ===

router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    if (!PosteValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: POSTE_CODES.INVALID_GUID,
        message: POSTE_ERRORS.GUID_INVALID,
      });
    }

    const posteObj = await Poste._load(req.params.guid, true);
    if (!posteObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: POSTE_CODES.POSTE_NOT_FOUND,
        message: POSTE_ERRORS.NOT_FOUND,
      });
    }

    await posteObj.delete();

    return R.handleSuccess(res, {
      message: POSTE_MESSAGES.DELETED_SUCCESSFULLY,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: POSTE_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

export default router;
