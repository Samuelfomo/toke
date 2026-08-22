import Ensure from '@toke/api/dist/middle/ensured-routes.js';
import { Request, Response, Router } from 'express';
import R from '@toke/api/dist/tools/response.js';
import {
  HttpStatus,
  MEMOS_CODES,
  MEMOS_ERRORS,
  MemosValidationUtils,
  USERS_CODES,
  USERS_ERRORS,
} from '@toke/shared';
import multer from 'multer';
import FormData from 'form-data';

import { TenantConfig } from '../tools/tenant.config.js';
import { UserService } from '../services/user.service.js';
import { MemoSocketBridgeService } from '../services/memo.socket.bridge.service.js';

const router = Router();
const upload = multer();

router.get('/', TenantConfig.authenticate, Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'url_is_required',
        message: 'File URL is required',
      });
    }

    const client = (req as any).client.reference;

    const response = await UserService.loadFiles(client, String(url));

    // 🔥 TRANSFERT DES HEADERS
    res.setHeader(
      'Content-Type',
      String(response.headers['content-type'] || 'application/octet-stream'),
    );

    if (response.headers['content-length']) {
      res.setHeader('Content-Length', String(response.headers['content-length']));
    }

    // 🔥 STREAM DIRECT
    response.data.pipe(res);
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'file_proxy_failed',
      message: error.message,
    });
  }
});

/**
 * 📤 UPLOAD MULTIPLE FILES (proxy)
 */
router.post(
  '/attachments',
  TenantConfig.authenticate,
  Ensure.post(),
  upload.array('files', 10),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      const client = (req as any).client.reference;

      if (!files || files.length === 0) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'no_files_received',
          message: 'No files received',
        });
      }

      // 🔁 reconstruction FormData pour l’API finale
      const form = new FormData();
      files.forEach((file) => {
        form.append('files', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      });

      const response = await UserService.uploadAttachments(client, form);

      return res.status(response.status).json(response.data);
      // return R.handleCreated(res, response.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'upload_proxy_failed',
        message: error.message,
      });
    }
  },
);

/**
 * 💬 SEND REPLY
 */
router.post(
  '/memo',
  TenantConfig.authenticate,
  Ensure.post(),
  async (req: Request, res: Response) => {
    try {
      const client = (req as any).client.reference;
      const response = await UserService.sendMemoCreation(client, req.body);
      if (response.status !== HttpStatus.CREATED) {
        return R.handleError(res, response.status, response.data.data.error);
      }

      return R.handleSuccess(res, response.data.data);
      // return res.status(response.status).json(response.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'reply_failed',
        message: error.message,
      });
    }
  },
);

/**
 * 💬 SEND REPLY
 */
router.patch(
  '/reply/:guid',
  TenantConfig.authenticate,
  Ensure.patch(),
  async (req: Request, res: Response) => {
    try {
      const client = (req as any).client.reference;
      const { guid } = req.params;
      if (!guid) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'guid_required',
          message: 'Memo GUID required.',
        });
      }
      if (!MemosValidationUtils.validateGuid(guid as string)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: MEMOS_CODES.INVALID_GUID,
          message: MEMOS_ERRORS.GUID_INVALID,
        });
      }
      const response = await UserService.sendReply(client, guid as string, req.body);
      if (response.status !== HttpStatus.SUCCESS) {
        return R.handleError(res, response.status, response.data.data.error);
      }

      return R.handleSuccess(res, response.data.data);
      // return res.status(response.status).json(response.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'reply_failed',
        message: error.message,
      });
    }
  },
);

/**
 * ✅❌ VALIDATE MEMO
 */
router.patch(
  '/validate/:guid',
  TenantConfig.authenticate,
  Ensure.patch(),
  async (req: Request, res: Response) => {
    try {
      const client = (req as any).client.reference;
      const { guid } = req.params;
      if (!guid) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'guid_required',
          message: 'Memo GUID required.',
        });
      }
      if (!MemosValidationUtils.validateGuid(guid as string)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: MEMOS_CODES.INVALID_GUID,
          message: MEMOS_ERRORS.GUID_INVALID,
        });
      }

      const response = await UserService.validateMemo(client, guid as string, req.body);
      if (response.status !== HttpStatus.SUCCESS) {
        return R.handleError(res, response.status, response.data.data.error);
      }

      return R.handleSuccess(res, response.data.data);
      // return res.status(response.status).json(response.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'validation_failed',
        message: error.message,
      });
    }
  },
);

/**
 * ✅❌ VALIDATE MEMO
 */
router.patch(
  '/revoke/:guid',
  TenantConfig.authenticate,
  Ensure.patch(),
  async (req: Request, res: Response) => {
    try {
      const client = (req as any).client.reference;
      const { guid } = req.params;
      if (!guid) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'guid_required',
          message: 'Memo GUID required.',
        });
      }
      if (!MemosValidationUtils.validateGuid(guid as string)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: MEMOS_CODES.INVALID_GUID,
          message: MEMOS_ERRORS.GUID_INVALID,
        });
      }

      const response = await UserService.revokeMemo(client, guid as string, req.body);
      if (response.status !== HttpStatus.SUCCESS) {
        return R.handleError(res, response.status, response.data.data.error);
      }

      return R.handleSuccess(res, response.data.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'validation_failed',
        message: error.message,
      });
    }
  },
);

router.patch(
  '/rejet/:guid',
  TenantConfig.authenticate,
  Ensure.patch(),
  async (req: Request, res: Response) => {
    try {
      const client = (req as any).client.reference;
      const { guid } = req.params;
      if (!guid) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'guid_required',
          message: 'Memo GUID required.',
        });
      }
      if (!MemosValidationUtils.validateGuid(guid as string)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: MEMOS_CODES.INVALID_GUID,
          message: MEMOS_ERRORS.GUID_INVALID,
        });
      }

      const response = await UserService.rejetMemo(client, guid as string, req.body);
      if (response.status !== HttpStatus.SUCCESS) {
        return R.handleError(res, response.status, response.data.data.error);
      }

      return R.handleSuccess(res, response.data.data);
      // return res.status(response.status).json(response.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'validation_failed',
        message: error.message,
      });
    }
  },
);

router.get(
  '/list',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const client = (req as any).client.reference;
      const { supervisor } = req.query;
      if (!supervisor) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'guid_required',
          message: 'User GUID required.',
        });
      }
      if (typeof supervisor !== 'string' || !MemosValidationUtils.validateGuid(supervisor)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.INVALID_GUID,
          message: USERS_ERRORS.GUID_INVALID,
        });
      }

      const response = await UserService.listByManager(client, supervisor);
      if (response.status !== HttpStatus.SUCCESS) {
        return R.handleError(res, response.status, response.data.data.error);
      }

      return R.handleSuccess(res, response.data.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'validation_failed',
        message: error.message,
      });
    }
  },
);

router.get(
  '/summary',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const client = (req as any).client.reference;
      const { supervisor } = req.query;
      if (!supervisor) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'guid_required',
          message: 'User GUID required.',
        });
      }
      if (typeof supervisor !== 'string' || !MemosValidationUtils.validateGuid(supervisor)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.INVALID_GUID,
          message: USERS_ERRORS.GUID_INVALID,
        });
      }

      const response = await UserService.getSummary(client, supervisor);
      if (response.status !== HttpStatus.SUCCESS) {
        return R.handleError(res, response.status, response.data.data.error);
      }

      return R.handleSuccess(res, response.data.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'validation_failed',
        message: error.message,
      });
    }
  },
);

/**
 * 🔌 Ticket BFF pour le canal temps réel des mémos.
 *
 * Le navigateur reçoit uniquement un ticket BFF. Le ticket Socket.IO de l'API
 * tenant reste côté serveur et sera utilisé par MemoSocketBridgeService.
 */
router.post(
  '/realtime-ticket',
  TenantConfig.authenticate,
  Ensure.post(),
  async (req: Request, res: Response) => {
    try {
      const reference = (req as any).client.reference;
      const userGuid = String(req.body?.user_guid || '');

      if (!userGuid || !MemosValidationUtils.validateGuid(userGuid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.INVALID_GUID,
          message: USERS_ERRORS.GUID_INVALID,
        });
      }

      const realtime = await MemoSocketBridgeService.createBridgeTicket(reference, userGuid);

      return R.handleSuccess(res, realtime);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'memo_realtime_ticket_failed',
        message: error.message,
      });
    }
  },
);

router.get(
  '/:guid',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const client = (req as any).client.reference;
      const { guid } = req.params;
      if (!guid) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'guid_required',
          message: 'Memo GUID required.',
        });
      }
      if (typeof guid !== 'string' || !MemosValidationUtils.validateGuid(guid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: MEMOS_CODES.INVALID_GUID,
          message: MEMOS_ERRORS.GUID_INVALID,
        });
      }

      const response = await UserService.getMemo(client, guid);
      if (response.status !== HttpStatus.SUCCESS) {
        return R.handleError(res, response.status, response.data.data.error);
      }

      return R.handleSuccess(res, response.data.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'validation_failed',
        message: error.message,
      });
    }
  },
);

export default router;
