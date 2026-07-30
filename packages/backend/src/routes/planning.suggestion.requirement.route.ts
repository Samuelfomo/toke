import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes.js';

import { TenantConfig } from '../tools/tenant.config.js';
import {
  handleBffRouteError,
  relayTenantApiResponse,
  tenantReference,
} from '../tools/bff.proxy.response.js';
import { PlanningSuggestionRequirementService } from '../services/planning.suggestion.requirement.service.js';

const router = Router();

router.get(
  '/config/:configGuid',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await PlanningSuggestionRequirementService.listByConfig(
        tenantReference(req),
        req.params.configGuid as string,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_REQUIREMENT_LIST_FAILED');
    }
  },
);

router.get(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await PlanningSuggestionRequirementService.get(
        tenantReference(req),
        req.params.guid as string,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_REQUIREMENT_GET_FAILED');
    }
  },
);

router.post(
  '/config/:configGuid',
  TenantConfig.authenticate,
  Ensure.post(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await PlanningSuggestionRequirementService.create(
        tenantReference(req),
        req.params.configGuid as string,
        req.body,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_REQUIREMENT_CREATE_FAILED');
    }
  },
);

router.put(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.put(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await PlanningSuggestionRequirementService.update(
        tenantReference(req),
        req.params.guid as string,
        req.body,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_REQUIREMENT_UPDATE_FAILED');
    }
  },
);

router.delete(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.delete(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await PlanningSuggestionRequirementService.delete(
        tenantReference(req),
        req.params.guid as string,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_REQUIREMENT_DELETE_FAILED');
    }
  },
);

export default router;
