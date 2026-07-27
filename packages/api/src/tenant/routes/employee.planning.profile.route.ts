import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  UsersValidationUtils,
  validateEmployeePlanningProfileCreation,
  validateEmployeePlanningProfileGuid,
  validateEmployeePlanningProfileUpdate,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import EmployeePlanningProfile from '../class/EmployeePlanningProfile.js';
import SessionTemplate from '../class/SessionTemplates.js';
import User from '../class/User.js';

const router = Router();

const CODES = {
  NOT_FOUND: 'EMPLOYEE_PLANNING_PROFILE_NOT_FOUND',
  USER_NOT_FOUND: 'EMPLOYEE_PLANNING_PROFILE_USER_NOT_FOUND',
  TEMPLATE_NOT_FOUND: 'EMPLOYEE_PLANNING_PROFILE_TEMPLATE_NOT_FOUND',
  CREATION_FAILED: 'EMPLOYEE_PLANNING_PROFILE_CREATION_FAILED',
  UPDATE_FAILED: 'EMPLOYEE_PLANNING_PROFILE_UPDATE_FAILED',
  LISTING_FAILED: 'EMPLOYEE_PLANNING_PROFILE_LISTING_FAILED',
  DELETION_FAILED: 'EMPLOYEE_PLANNING_PROFILE_DELETION_FAILED',
} as const;

router.get('/', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const profiles = await EmployeePlanningProfile._listActive();

    return R.handleSuccess(res, {
      employee_planning_profiles: {
        count: profiles?.length ?? 0,
        items: profiles ? await Promise.all(profiles.map((profile) => profile.toJSON())) : [],
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

router.get('/user/:userGuid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const userGuid = req.params.userGuid;

    if (!UsersValidationUtils.validateGuid(userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'INVALID_USER_GUID',
        message: 'Invalid user GUID',
      });
    }

    const user = await User._load(userGuid, true);
    if (!user) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.USER_NOT_FOUND,
        message: 'Employee not found',
      });
    }

    const profile = await EmployeePlanningProfile._loadByUser(user.getId()!);

    return R.handleSuccess(res, {
      employee_planning_profile: profile ? await profile.toJSON() : null,
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
    const guid = validateEmployeePlanningProfileGuid(req.params.guid);
    const profile = await EmployeePlanningProfile._load(guid, true);

    if (!profile) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.NOT_FOUND,
        message: 'Employee planning profile not found',
      });
    }

    return R.handleSuccess(res, {
      employee_planning_profile: await profile.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, error.code ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_ERROR, {
      code: error.code ?? CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const data = validateEmployeePlanningProfileCreation(req.body);

    const user = await User._load(data.user, true);
    if (!user) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.USER_NOT_FOUND,
        message: 'Employee not found',
      });
    }

    let fixedTemplateId: number | null = null;

    if (data.fixed_session_template) {
      const template = await SessionTemplate._load(data.fixed_session_template, true);
      if (!template) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: CODES.TEMPLATE_NOT_FOUND,
          message: 'Fixed session template not found',
        });
      }
      fixedTemplateId = template.getId()!;
    }

    const profile = new EmployeePlanningProfile()
      .setUser(user.getId()!)
      .setPlanningMode(data.planning_mode)
      .setFixedSessionTemplate(fixedTemplateId)
      .setRotationOrder(data.rotation_order ?? null)
      .setMaxWeeklyMinutes(data.max_weekly_minutes ?? null)
      .setActive(data.active);

    await profile.save();

    return R.handleCreated(res, {
      message: 'Employee planning profile created successfully',
      employee_planning_profile: await profile.toJSON(),
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
    const guid = validateEmployeePlanningProfileGuid(req.params.guid);
    const data = validateEmployeePlanningProfileUpdate(req.body);

    const profile = await EmployeePlanningProfile._load(guid, true);
    if (!profile) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.NOT_FOUND,
        message: 'Employee planning profile not found',
      });
    }

    if (data.planning_mode !== undefined) {
      profile.setPlanningMode(data.planning_mode);
    }

    if (data.fixed_session_template !== undefined) {
      if (data.fixed_session_template === null) {
        profile.setFixedSessionTemplate(null);
      } else {
        const template = await SessionTemplate._load(data.fixed_session_template, true);
        if (!template) {
          return R.handleError(res, HttpStatus.NOT_FOUND, {
            code: CODES.TEMPLATE_NOT_FOUND,
            message: 'Fixed session template not found',
          });
        }
        profile.setFixedSessionTemplate(template.getId()!);
      }
    }

    if (data.rotation_order !== undefined) {
      profile.setRotationOrder(data.rotation_order ?? null);
    }
    if (data.max_weekly_minutes !== undefined) {
      profile.setMaxWeeklyMinutes(data.max_weekly_minutes ?? null);
    }
    if (data.active !== undefined) {
      profile.setActive(data.active);
    }

    await profile.save();

    return R.handleSuccess(res, {
      message: 'Employee planning profile updated successfully',
      employee_planning_profile: await profile.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, error.code ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_ERROR, {
      code: error.code ?? CODES.UPDATE_FAILED,
      message: error.message,
    });
  }
});

router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const guid = validateEmployeePlanningProfileGuid(req.params.guid);
    const profile = await EmployeePlanningProfile._load(guid, true);

    if (!profile) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.NOT_FOUND,
        message: 'Employee planning profile not found',
      });
    }

    await profile.softDelete();

    return R.handleSuccess(res, {
      message: 'Employee planning profile deleted successfully',
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: error.code ?? CODES.DELETION_FAILED,
      message: error.message,
    });
  }
});

export default router;
