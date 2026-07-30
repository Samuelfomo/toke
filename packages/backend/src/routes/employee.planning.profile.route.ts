import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes.js';

import { TenantConfig } from '../tools/tenant.config.js';
import {
  handleBffRouteError,
  relayTenantApiResponse,
  tenantReference,
} from '../tools/bff.proxy.response.js';
import { EmployeePlanningProfileService } from '../services/employee.planning.profile.service.js';

const router = Router();

router.get(
  '/',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await EmployeePlanningProfileService.list(tenantReference(req));
      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_PROFILE_LIST_FAILED');
    }
  },
);

router.get(
  '/user/:userGuid',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await EmployeePlanningProfileService.getByUser(
        tenantReference(req),
        req.params.userGuid as string,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_PROFILE_GET_BY_USER_FAILED');
    }
  },
);

router.get(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await EmployeePlanningProfileService.get(
        tenantReference(req),
        req.params.guid as string,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_PROFILE_GET_FAILED');
    }
  },
);

router.post(
  '/',
  TenantConfig.authenticate,
  Ensure.post(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await EmployeePlanningProfileService.create(tenantReference(req), req.body);

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_PROFILE_CREATE_FAILED');
    }
  },
);

router.put(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.put(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await EmployeePlanningProfileService.update(
        tenantReference(req),
        req.params.guid as string,
        req.body,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_PROFILE_UPDATE_FAILED');
    }
  },
);

router.delete(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.delete(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await EmployeePlanningProfileService.delete(
        tenantReference(req),
        req.params.guid as string,
      );

      relayTenantApiResponse(res, result);
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PLANNING_PROFILE_DELETE_FAILED');
    }
  },
);

export default router;
