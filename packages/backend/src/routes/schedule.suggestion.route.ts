import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes.js';

import { TenantConfig } from '../tools/tenant.config.js';
import {
  handleBffRouteError,
  relayTenantApiResponse,
  tenantReference,
} from '../tools/bff.proxy.response.js';
import { ScheduleSuggestionService } from '../services/schedule.suggestion.service.js';

const router = Router();

router.post(
  '/:manager/generate',
  TenantConfig.authenticate,
  Ensure.post(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await ScheduleSuggestionService.generate(
        tenantReference(req),
        req.params.manager as string,
        req.body,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_SUGGESTION_GENERATE_FAILED');
    }
  },
);

router.get(
  '/:manager/list',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await ScheduleSuggestionService.list(
        tenantReference(req),
        req.params.manager as string,
        req.query,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_SUGGESTION_LIST_FAILED');
    }
  },
);

router.get(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await ScheduleSuggestionService.get(
        tenantReference(req),
        req.params.guid as string,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_SUGGESTION_GET_FAILED');
    }
  },
);

router.patch(
  '/:guid/item/:itemGuid',
  TenantConfig.authenticate,
  Ensure.patch(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await ScheduleSuggestionService.patchItem(
        tenantReference(req),
        req.params.guid as string,
        req.params.itemGuid as string,
        req.body,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_SUGGESTION_ITEM_PATCH_FAILED');
    }
  },
);

router.post(
  '/:guid/approve',
  TenantConfig.authenticate,
  Ensure.post(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await ScheduleSuggestionService.approve(
        tenantReference(req),
        req.params.guid as string,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_SUGGESTION_APPROVE_FAILED');
    }
  },
);

router.post(
  '/:guid/reject',
  TenantConfig.authenticate,
  Ensure.post(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await ScheduleSuggestionService.reject(
        tenantReference(req),
        req.params.guid as string,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_SUGGESTION_REJECT_FAILED');
    }
  },
);

router.delete(
  '/:guid/item/:itemGuid',
  TenantConfig.authenticate,
  Ensure.delete(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await ScheduleSuggestionService.deleteItem(
        tenantReference(req),
        req.params.guid as string,
        req.params.itemGuid as string,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_SUGGESTION_ITEM_DELETE_FAILED');
    }
  },
);

router.delete(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.delete(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await ScheduleSuggestionService.delete(
        tenantReference(req),
        req.params.guid as string,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_SUGGESTION_DELETE_FAILED');
    }
  },
);

export default router;
