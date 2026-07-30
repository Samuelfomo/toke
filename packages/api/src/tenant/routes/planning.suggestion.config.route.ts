import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  UsersValidationUtils,
  validatePlanningSuggestionConfigCreation,
  validatePlanningSuggestionConfigGuid,
  validatePlanningSuggestionConfigUpdate,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import PlanningSuggestionConfig from '../class/PlanningSuggestionConfig.js';
import User from '../class/User.js';

const router = Router();

const CODES = {
  NOT_FOUND: 'PLANNING_SUGGESTION_CONFIG_NOT_FOUND',
  CREATION_FAILED: 'PLANNING_SUGGESTION_CONFIG_CREATION_FAILED',
  UPDATE_FAILED: 'PLANNING_SUGGESTION_CONFIG_UPDATE_FAILED',
  LISTING_FAILED: 'PLANNING_SUGGESTION_CONFIG_LISTING_FAILED',
  DELETION_FAILED: 'PLANNING_SUGGESTION_CONFIG_DELETION_FAILED',
  MANAGER_NOT_FOUND: 'PLANNING_SUGGESTION_CONFIG_MANAGER_NOT_FOUND',
} as const;

router.get('/', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const configs = await PlanningSuggestionConfig._list();

    return R.handleSuccess(res, {
      planning_suggestion_configs: {
        count: configs?.length ?? 0,
        items: configs ? await Promise.all(configs.map((config) => config.toJSON())) : [],
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

router.get('/active', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const config = await PlanningSuggestionConfig._loadActive();

    return R.handleSuccess(res, {
      planning_suggestion_config: config ? await config.toJSON() : null,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const guid = validatePlanningSuggestionConfigGuid(req.params.guid);
    const config = await PlanningSuggestionConfig._load(guid, true);

    if (!config) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.NOT_FOUND,
        message: 'Planning suggestion configuration not found',
      });
    }

    return R.handleSuccess(res, {
      planning_suggestion_config: await config.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, error.code ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_ERROR, {
      code: error.code ?? CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

router.post('/:manager', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const managerGuid = req.params.manager;

    if (!UsersValidationUtils.validateGuid(managerGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'INVALID_MANAGER_GUID',
        message: 'Invalid manager GUID',
      });
    }

    const manager = await User._load(managerGuid, true);
    if (!manager) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.MANAGER_NOT_FOUND,
        message: 'Manager not found',
      });
    }

    const data = validatePlanningSuggestionConfigCreation(req.body);

    const config = new PlanningSuggestionConfig()
      .setName(data.name)
      .setActive(data.active)
      .setMinRestDaysPerWeek(data.min_rest_days_per_week)
      .setMaxConsecutiveWorkDays(data.max_consecutive_work_days)
      .setMaxWeeklyMinutes(data.max_weekly_minutes ?? null)
      .setMinRestMinutesBetweenShifts(data.min_rest_minutes_between_shifts)
      .setMaxConsecutiveGuards(data.max_consecutive_guards)
      .setRestAfterGuardRequired(data.rest_after_guard_required)
      .setPostGuardRestDays(data.post_guard_rest_days)
      .setMaxRestingEmployeesPerDay(data.max_resting_employees_per_day ?? null)
      .setFairnessWindowWeeks(data.fairness_window_weeks)
      .setStrictCoverage(data.strict_coverage)
      .setSolverType(data.solver_type)
      .setSolverTimeoutSeconds(data.solver_timeout_seconds)
      .setFallbackToGreedy(data.fallback_to_greedy)
      .setCreatedBy(manager.getId()!);

    await config.save();

    return R.handleCreated(res, {
      message: 'Planning suggestion configuration created successfully',
      planning_suggestion_config: await config.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, error.code ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_ERROR, {
      code: error.code ?? CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const guid = validatePlanningSuggestionConfigGuid(req.params.guid);
    const data = validatePlanningSuggestionConfigUpdate(req.body);

    const config = await PlanningSuggestionConfig._load(guid, true);
    if (!config) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.NOT_FOUND,
        message: 'Planning suggestion configuration not found',
      });
    }

    if (data.name !== undefined) config.setName(data.name);
    if (data.active !== undefined) config.setActive(data.active);
    if (data.min_rest_days_per_week !== undefined) {
      config.setMinRestDaysPerWeek(data.min_rest_days_per_week);
    }
    if (data.max_consecutive_work_days !== undefined) {
      config.setMaxConsecutiveWorkDays(data.max_consecutive_work_days);
    }
    if (data.max_weekly_minutes !== undefined) {
      config.setMaxWeeklyMinutes(data.max_weekly_minutes ?? null);
    }
    if (data.min_rest_minutes_between_shifts !== undefined) {
      config.setMinRestMinutesBetweenShifts(data.min_rest_minutes_between_shifts);
    }
    if (data.max_consecutive_guards !== undefined) {
      config.setMaxConsecutiveGuards(data.max_consecutive_guards);
    }
    if (data.rest_after_guard_required !== undefined) {
      config.setRestAfterGuardRequired(data.rest_after_guard_required);
    }
    if (data.post_guard_rest_days !== undefined) {
      config.setPostGuardRestDays(data.post_guard_rest_days);
    }
    if (data.max_resting_employees_per_day !== undefined) {
      config.setMaxRestingEmployeesPerDay(data.max_resting_employees_per_day ?? null);
    }
    if (data.fairness_window_weeks !== undefined) {
      config.setFairnessWindowWeeks(data.fairness_window_weeks);
    }
    if (data.strict_coverage !== undefined) {
      config.setStrictCoverage(data.strict_coverage);
    }
    if (data.solver_type !== undefined) {
      config.setSolverType(data.solver_type);
    }
    if (data.solver_timeout_seconds !== undefined) {
      config.setSolverTimeoutSeconds(data.solver_timeout_seconds);
    }
    if (data.fallback_to_greedy !== undefined) {
      config.setFallbackToGreedy(data.fallback_to_greedy);
    }

    await config.save();

    return R.handleSuccess(res, {
      message: 'Planning suggestion configuration updated successfully',
      planning_suggestion_config: await config.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, error.code ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_ERROR, {
      code: error.code ?? CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

router.patch('/:guid/activate', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const guid = validatePlanningSuggestionConfigGuid(req.params.guid);
    const config = await PlanningSuggestionConfig._load(guid, true);

    if (!config) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.NOT_FOUND,
        message: 'Planning suggestion configuration not found',
      });
    }

    await config.activate();

    return R.handleSuccess(res, {
      message: 'Planning suggestion configuration activated successfully',
      planning_suggestion_config: await config.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.BAD_REQUEST, {
      code: error.code ?? CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

router.patch('/:guid/deactivate', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const guid = validatePlanningSuggestionConfigGuid(req.params.guid);
    const config = await PlanningSuggestionConfig._load(guid, true);

    if (!config) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.NOT_FOUND,
        message: 'Planning suggestion configuration not found',
      });
    }

    await config.deactivate();

    return R.handleSuccess(res, {
      message: 'Planning suggestion configuration deactivated successfully',
      planning_suggestion_config: await config.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.BAD_REQUEST, {
      code: error.code ?? CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const guid = validatePlanningSuggestionConfigGuid(req.params.guid);
    const config = await PlanningSuggestionConfig._load(guid, true);

    if (!config) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.NOT_FOUND,
        message: 'Planning suggestion configuration not found',
      });
    }

    await config.softDelete();

    return R.handleSuccess(res, {
      message: 'Planning suggestion configuration deleted successfully',
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: error.code ?? CODES.DELETION_FAILED,
      message: error.message,
    });
  }
});

export default router;
