import { Request, Response, Router } from 'express';
import { HttpStatus } from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import PlanningSuggestionConfig from '../class/PlanningSuggestionConfig.js';
import PlanningSuggestionRequirement from '../class/PlanningSuggestionRequirement.js';
import SessionTemplate from '../class/SessionTemplates.js';

import {
  validatePlanningSuggestionRequirementCreation,
  validatePlanningSuggestionRequirementGuid,
  validatePlanningSuggestionRequirementUpdate,
} from '@toke/shared';

const router = Router();

const DAY_KEYS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
] as const;

const CODES = {
  NOT_FOUND:
    'PLANNING_SUGGESTION_REQUIREMENT_NOT_FOUND',
  CONFIG_NOT_FOUND:
    'PLANNING_SUGGESTION_REQUIREMENT_CONFIG_NOT_FOUND',
  TEMPLATE_NOT_FOUND:
    'PLANNING_SUGGESTION_REQUIREMENT_TEMPLATE_NOT_FOUND',
  CONTINUATION_TEMPLATE_NOT_FOUND:
    'PLANNING_SUGGESTION_REQUIREMENT_CONTINUATION_TEMPLATE_NOT_FOUND',
  TEMPLATE_DAY_INVALID:
    'PLANNING_SUGGESTION_REQUIREMENT_TEMPLATE_DAY_INVALID',
  CONTINUATION_TEMPLATE_DAY_INVALID:
    'PLANNING_SUGGESTION_REQUIREMENT_CONTINUATION_TEMPLATE_DAY_INVALID',
  CREATION_FAILED:
    'PLANNING_SUGGESTION_REQUIREMENT_CREATION_FAILED',
  UPDATE_FAILED:
    'PLANNING_SUGGESTION_REQUIREMENT_UPDATE_FAILED',
  LISTING_FAILED:
    'PLANNING_SUGGESTION_REQUIREMENT_LISTING_FAILED',
  DELETION_FAILED:
    'PLANNING_SUGGESTION_REQUIREMENT_DELETION_FAILED',
} as const;

type DayKey = (typeof DAY_KEYS)[number];

function shiftDay(
  day: DayKey,
  offset: number,
): DayKey {
  const index = DAY_KEYS.indexOf(day);
  return DAY_KEYS[(index + offset) % DAY_KEYS.length]!;
}

function hasWorkOnDay(
  template: SessionTemplate,
  day: DayKey,
): boolean {
  const blocks = template.getDefinition()?.[day];
  return Array.isArray(blocks) && blocks.length > 0;
}

async function validateRequirementTemplates(
  requirement: PlanningSuggestionRequirement,
): Promise<
  | {
      code: string;
      message: string;
    }
  | null
> {
  const day = requirement.getDayOfWeek();

  if (!day) {
    return {
      code: CODES.TEMPLATE_DAY_INVALID,
      message: 'day_of_week is required',
    };
  }

  const mainTemplate =
    await requirement.getSessionTemplateObj();

  if (!mainTemplate) {
    return {
      code: CODES.TEMPLATE_NOT_FOUND,
      message: 'Session template not found',
    };
  }

  if (!mainTemplate.isCurrent()) {
    return {
      code: CODES.TEMPLATE_NOT_FOUND,
      message: 'Session template is no longer current',
    };
  }

  if (!hasWorkOnDay(mainTemplate, day)) {
    return {
      code: CODES.TEMPLATE_DAY_INVALID,
      message:
        `The selected session template contains no work block for ${day}`,
    };
  }

  if (!requirement.isGuard()) {
    return null;
  }

  const continuationTemplate =
    await requirement.getContinuationTemplateObj();

  if (!continuationTemplate) {
    return {
      code: CODES.CONTINUATION_TEMPLATE_NOT_FOUND,
      message:
        'Continuation template is required for a guard',
    };
  }

  if (!continuationTemplate.isCurrent()) {
    return {
      code: CODES.CONTINUATION_TEMPLATE_NOT_FOUND,
      message:
        'Continuation template is no longer current',
    };
  }

  const continuationDay = shiftDay(
    day,
    requirement.getContinuationDayOffset(),
  );

  if (
    !hasWorkOnDay(
      continuationTemplate,
      continuationDay,
    )
  ) {
    return {
      code: CODES.CONTINUATION_TEMPLATE_DAY_INVALID,
      message:
        `The continuation template contains no work block for ${continuationDay}`,
    };
  }

  return null;
}

router.get(
  '/config/:configGuid',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const config =
        await PlanningSuggestionConfig._load(
          req.params.configGuid,
          true,
        );

      if (!config) {
        return R.handleError(
          res,
          HttpStatus.NOT_FOUND,
          {
            code: CODES.CONFIG_NOT_FOUND,
            message:
              'Planning suggestion configuration not found',
          },
        );
      }

      const requirements =
        await PlanningSuggestionRequirement._listByConfig(
          config.getId()!,
          true,
        );

      return R.handleSuccess(res, {
        planning_suggestion_requirements: {
          count: requirements?.length ?? 0,
          items: requirements
            ? await Promise.all(
                requirements.map((requirement) =>
                  requirement.toJSON(),
                ),
              )
            : [],
        },
      });
    } catch (error: any) {
      return R.handleError(
        res,
        HttpStatus.INTERNAL_ERROR,
        {
          code: CODES.LISTING_FAILED,
          message: error.message,
        },
      );
    }
  },
);

router.get(
  '/:guid',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const guid =
        validatePlanningSuggestionRequirementGuid(
          req.params.guid,
        );

      const requirement =
        await PlanningSuggestionRequirement._load(
          guid,
          true,
        );

      if (!requirement) {
        return R.handleError(
          res,
          HttpStatus.NOT_FOUND,
          {
            code: CODES.NOT_FOUND,
            message:
              'Planning suggestion requirement not found',
          },
        );
      }

      return R.handleSuccess(res, {
        planning_suggestion_requirement:
          await requirement.toJSON(),
      });
    } catch (error: any) {
      return R.handleError(
        res,
        error.code
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.INTERNAL_ERROR,
        {
          code:
            error.code ?? CODES.LISTING_FAILED,
          message: error.message,
        },
      );
    }
  },
);

router.post(
  '/config/:configGuid',
  Ensure.post(),
  async (req: Request, res: Response) => {
    try {
      const config =
        await PlanningSuggestionConfig._load(
          req.params.configGuid,
          true,
        );

      if (!config) {
        return R.handleError(
          res,
          HttpStatus.NOT_FOUND,
          {
            code: CODES.CONFIG_NOT_FOUND,
            message:
              'Planning suggestion configuration not found',
          },
        );
      }

      const data =
        validatePlanningSuggestionRequirementCreation(
          req.body,
        );

      const mainTemplate =
        await SessionTemplate._load(
          data.session_template,
          true,
        );

      if (!mainTemplate) {
        return R.handleError(
          res,
          HttpStatus.NOT_FOUND,
          {
            code: CODES.TEMPLATE_NOT_FOUND,
            message: 'Session template not found',
          },
        );
      }

      let continuationTemplateId: number | null =
        null;

      if (data.service_type === 'GUARD') {
        const continuationTemplate =
          await SessionTemplate._load(
            data.continuation_template!,
            true,
          );

        if (!continuationTemplate) {
          return R.handleError(
            res,
            HttpStatus.NOT_FOUND,
            {
              code:
                CODES.CONTINUATION_TEMPLATE_NOT_FOUND,
              message:
                'Continuation template not found',
            },
          );
        }

        continuationTemplateId =
          continuationTemplate.getId()!;
      }

      const requirement =
        new PlanningSuggestionRequirement()
          .setConfig(config.getId()!)
          .setSessionTemplate(
            mainTemplate.getId()!,
          )
          .setServiceType(data.service_type)
          .setAllocationMode(
            data.allocation_mode,
          )
          .setContinuationTemplate(
            continuationTemplateId,
          )
          .setContinuationDayOffset(
            data.continuation_day_offset,
          )
          .setDayOfWeek(data.day_of_week)
          .setMinEmployees(data.min_employees)
          .setTargetEmployees(
            data.target_employees,
          )
          .setMaxEmployees(
            data.max_employees ?? null,
          )
          .setCreditedMinutes(
            data.credited_minutes ?? null,
          )
          .setPriority(data.priority)
          .setActive(data.active)
          .setEligibilityPolicy(data.eligibility_policy);

      const templateError =
        await validateRequirementTemplates(
          requirement,
        );

      if (templateError) {
        return R.handleError(
          res,
          HttpStatus.UNPROCESSABLE_ENTITY,
          templateError,
        );
      }

      await requirement.save();

      return R.handleCreated(res, {
        message:
          'Planning suggestion requirement created successfully',
        planning_suggestion_requirement:
          await requirement.toJSON(),
      });
    } catch (error: any) {
      return R.handleError(
        res,
        error.code
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.INTERNAL_ERROR,
        {
          code:
            error.code ?? CODES.CREATION_FAILED,
          message: error.message,
        },
      );
    }
  },
);

router.put(
  '/:guid',
  Ensure.put(),
  async (req: Request, res: Response) => {
    try {
      const guid =
        validatePlanningSuggestionRequirementGuid(
          req.params.guid,
        );

      const data =
        validatePlanningSuggestionRequirementUpdate(
          req.body,
        );

      const requirement =
        await PlanningSuggestionRequirement._load(
          guid,
          true,
        );

      if (!requirement) {
        return R.handleError(
          res,
          HttpStatus.NOT_FOUND,
          {
            code: CODES.NOT_FOUND,
            message:
              'Planning suggestion requirement not found',
          },
        );
      }

      if (data.session_template !== undefined) {
        const template =
          await SessionTemplate._load(
            data.session_template,
            true,
          );

        if (!template) {
          return R.handleError(
            res,
            HttpStatus.NOT_FOUND,
            {
              code: CODES.TEMPLATE_NOT_FOUND,
              message:
                'Session template not found',
            },
          );
        }

        requirement.setSessionTemplate(
          template.getId()!,
        );
      }

      if (data.service_type !== undefined) {
        requirement.setServiceType(
          data.service_type,
        );
      }

      if (
        data.allocation_mode !== undefined
      ) {
        requirement.setAllocationMode(
          data.allocation_mode,
        );
      }

      if (
        data.continuation_template !== undefined
      ) {
        if (
          data.continuation_template === null
        ) {
          requirement.setContinuationTemplate(
            null,
          );
        } else {
          const continuationTemplate =
            await SessionTemplate._load(
              data.continuation_template,
              true,
            );

          if (!continuationTemplate) {
            return R.handleError(
              res,
              HttpStatus.NOT_FOUND,
              {
                code:
                  CODES.CONTINUATION_TEMPLATE_NOT_FOUND,
                message:
                  'Continuation template not found',
              },
            );
          }

          requirement.setContinuationTemplate(
            continuationTemplate.getId()!,
          );
        }
      }

      if (
        data.continuation_day_offset !==
        undefined
      ) {
        requirement.setContinuationDayOffset(
          data.continuation_day_offset,
        );
      }

      if (data.day_of_week !== undefined) {
        requirement.setDayOfWeek(
          data.day_of_week,
        );
      }

      if (data.min_employees !== undefined) {
        requirement.setMinEmployees(
          data.min_employees,
        );
      }

      if (
        data.target_employees !== undefined
      ) {
        requirement.setTargetEmployees(
          data.target_employees,
        );
      }

      if (data.max_employees !== undefined) {
        requirement.setMaxEmployees(
          data.max_employees ?? null,
        );
      }

      if (data.credited_minutes !== undefined) {
        requirement.setCreditedMinutes(
          data.credited_minutes ?? null,
        );
      }

      if (data.priority !== undefined) {
        requirement.setPriority(
          data.priority,
        );
      }

      if (data.active !== undefined) {
        requirement.setActive(data.active);
      }

      if (data.eligibility_policy !== undefined) {
        requirement.setEligibilityPolicy(data.eligibility_policy);
      }

      const templateError =
        await validateRequirementTemplates(
          requirement,
        );

      if (templateError) {
        return R.handleError(
          res,
          HttpStatus.UNPROCESSABLE_ENTITY,
          templateError,
        );
      }

      await requirement.save();

      return R.handleSuccess(res, {
        message:
          'Planning suggestion requirement updated successfully',
        planning_suggestion_requirement:
          await requirement.toJSON(),
      });
    } catch (error: any) {
      return R.handleError(
        res,
        error.code
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.INTERNAL_ERROR,
        {
          code:
            error.code ?? CODES.UPDATE_FAILED,
          message: error.message,
        },
      );
    }
  },
);

router.delete(
  '/:guid',
  Ensure.delete(),
  async (req: Request, res: Response) => {
    try {
      const guid =
        validatePlanningSuggestionRequirementGuid(
          req.params.guid,
        );

      const requirement =
        await PlanningSuggestionRequirement._load(
          guid,
          true,
        );

      if (!requirement) {
        return R.handleError(
          res,
          HttpStatus.NOT_FOUND,
          {
            code: CODES.NOT_FOUND,
            message:
              'Planning suggestion requirement not found',
          },
        );
      }

      await requirement.softDelete();

      return R.handleSuccess(res, {
        message:
          'Planning suggestion requirement deleted successfully',
      });
    } catch (error: any) {
      return R.handleError(
        res,
        HttpStatus.INTERNAL_ERROR,
        {
          code:
            error.code ?? CODES.DELETION_FAILED,
          message: error.message,
        },
      );
    }
  },
);

export default router;
