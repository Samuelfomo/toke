import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes.js';
import R from '@toke/api/dist/tools/response.js';
import { HttpStatus, UsersValidationUtils } from '@toke/shared';

import { TenantConfig } from '../tools/tenant.config.js';
import { ScheduleSuggestionService } from '../services/schedule.suggestion.service.js';

const router = Router();

const CODES = {
  INVALID_GUID: 'SUGGESTION_INVALID_GUID',
  GENERATE_FAILED: 'SUGGESTION_GENERATE_FAILED',
  LIST_FAILED: 'SUGGESTION_LIST_FAILED',
  LOAD_FAILED: 'SUGGESTION_LOAD_FAILED',
  PATCH_FAILED: 'SUGGESTION_PATCH_FAILED',
  APPROVE_FAILED: 'SUGGESTION_APPROVE_FAILED',
  REJECT_FAILED: 'SUGGESTION_REJECT_FAILED',
  DELETE_FAILED: 'SUGGESTION_DELETE_FAILED',
} as const;

function validateGuid(res: Response, guid: string): boolean {
  if (!UsersValidationUtils.validateGuid(guid)) {
    R.handleError(res, HttpStatus.BAD_REQUEST, {
      code: CODES.INVALID_GUID,
      message: 'Invalid GUID format.',
    });
    return false;
  }
  return true;
}

// ── POST /:manager/generate ───────────────────────────────────────────────────

router.post(
  '/:manager/generate',
  TenantConfig.authenticate,
  Ensure.post(),
  async (req: Request, res: Response) => {
    try {
      const { manager } = req.params;
      if (!validateGuid(res, manager as string)) return;

      const client = (req as any).client.reference;
      const response = await ScheduleSuggestionService.generate(
        client,
        manager as string,
        req.body,
      );

      return res.status(response.status).json(response.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: CODES.GENERATE_FAILED,
        message: error.message,
      });
    }
  },
);

// ── GET /:manager/list ────────────────────────────────────────────────────────

router.get(
  '/:manager/list',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { manager } = req.params;
      if (!validateGuid(res, manager as string)) return;

      const client = (req as any).client.reference;
      const response = await ScheduleSuggestionService.list(client, manager as string);

      return res.status(response.status).json(response.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: CODES.LIST_FAILED,
        message: error.message,
      });
    }
  },
);

// ── GET /:guid ────────────────────────────────────────────────────────────────

router.get(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { guid } = req.params;
      if (!validateGuid(res, guid as string)) return;

      const client = (req as any).client.reference;
      const response = await ScheduleSuggestionService.load(client, guid as string);

      return res.status(response.status).json(response.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: CODES.LOAD_FAILED,
        message: error.message,
      });
    }
  },
);

// ── PATCH /:guid/item/:itemGuid ───────────────────────────────────────────────

router.patch(
  '/:guid/item/:itemGuid',
  TenantConfig.authenticate,
  Ensure.patch(),
  async (req: Request, res: Response) => {
    try {
      const { guid, itemGuid } = req.params;
      if (!validateGuid(res, guid as string) || !validateGuid(res, itemGuid as string)) return;

      const client = (req as any).client.reference;
      const response = await ScheduleSuggestionService.patchItem(
        client,
        guid as string,
        itemGuid as string,
        req.body,
      );

      return res.status(response.status).json(response.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: CODES.PATCH_FAILED,
        message: error.message,
      });
    }
  },
);

// ── POST /:guid/approve ───────────────────────────────────────────────────────

router.post(
  '/:guid/approve',
  TenantConfig.authenticate,
  Ensure.post(),
  async (req: Request, res: Response) => {
    try {
      const { guid } = req.params;
      if (!validateGuid(res, guid as string)) return;

      const client = (req as any).client.reference;
      const response = await ScheduleSuggestionService.approve(client, guid as string);

      return res.status(response.status).json(response.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: CODES.APPROVE_FAILED,
        message: error.message,
      });
    }
  },
);

// ── POST /:guid/reject ────────────────────────────────────────────────────────

router.post(
  '/:guid/reject',
  TenantConfig.authenticate,
  Ensure.post(),
  async (req: Request, res: Response) => {
    try {
      const { guid } = req.params;
      if (!validateGuid(res, guid as string)) return;

      const client = (req as any).client.reference;
      const response = await ScheduleSuggestionService.reject(client, guid as string);

      return res.status(response.status).json(response.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: CODES.REJECT_FAILED,
        message: error.message,
      });
    }
  },
);

// ── DELETE /:guid ─────────────────────────────────────────────────────────────

router.delete(
  '/:guid/item/:itemGuid',
  TenantConfig.authenticate,
  Ensure.delete(),
  async (req: Request, res: Response) => {
    try {
      const { guid, itemGuid } = req.params;
      if (!validateGuid(res, guid as string) || !validateGuid(res, itemGuid as string)) return;

      const client = (req as any).client.reference;
      const response = await ScheduleSuggestionService.removeItem(
        client,
        guid as string,
        itemGuid as string,
      );

      return res.status(response.status).json(response.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: CODES.DELETE_FAILED,
        message: error.message,
      });
    }
  },
);

router.delete(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.delete(),
  async (req: Request, res: Response) => {
    try {
      const { guid } = req.params;
      if (!validateGuid(res, guid as string)) return;

      const client = (req as any).client.reference;
      const response = await ScheduleSuggestionService.remove(client, guid as string);

      return res.status(response.status).json(response.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: CODES.DELETE_FAILED,
        message: error.message,
      });
    }
  },
);

export default router;
