import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes.js';

import { TenantConfig } from '../tools/tenant.config.js';
import { handleBffRouteError, relayTenantApiResponse, tenantReference, } from '../tools/bff.proxy.response.js';
import { PlanningSuggestionConfigService } from '../services/planning.suggestion.config.service.js';

const router = Router();

router.get(
  '/',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await PlanningSuggestionConfigService.list(tenantReference(req));
      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_CONFIG_LIST_FAILED');
    }
  },
);

// Cette route doit rester avant /:guid.
router.get(
  '/active',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await PlanningSuggestionConfigService.getActive(tenantReference(req));
      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_CONFIG_ACTIVE_FAILED');
    }
  },
);

router.get(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await PlanningSuggestionConfigService.get(
        tenantReference(req),
        req.params.guid as string,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_CONFIG_GET_FAILED');
    }
  },
);

router.post(
  '/:manager',
  TenantConfig.authenticate,
  Ensure.post(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await PlanningSuggestionConfigService.create(
        tenantReference(req),
        req.params.manager as string,
        req.body,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_CONFIG_CREATE_FAILED');
    }
  },
);

router.put(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.put(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await PlanningSuggestionConfigService.update(
        tenantReference(req),
        req.params.guid as string,
        req.body,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_CONFIG_UPDATE_FAILED');
    }
  },
);

router.patch(
  '/:guid/activate',
  TenantConfig.authenticate,
  Ensure.patch(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await PlanningSuggestionConfigService.activate(
        tenantReference(req),
        req.params.guid as string,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_CONFIG_ACTIVATE_FAILED');
    }
  },
);

router.patch(
  '/:guid/deactivate',
  TenantConfig.authenticate,
  Ensure.patch(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await PlanningSuggestionConfigService.deactivate(
        tenantReference(req),
        req.params.guid as string,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_CONFIG_DEACTIVATE_FAILED');
    }
  },
);

router.delete(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.delete(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await PlanningSuggestionConfigService.delete(
        tenantReference(req),
        req.params.guid as string,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_CONFIG_DELETE_FAILED');
    }
  },
);

export default router;
