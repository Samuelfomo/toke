import Ensure from '@toke/api/dist/middle/ensured-routes.js';
import { Request, Response, Router } from 'express';
import R from '@toke/api/dist/tools/response.js';
import { HttpStatus, MEMOS_CODES, MEMOS_ERRORS, MemosValidationUtils } from '@toke/shared';
import multer from 'multer';
import FormData from 'form-data';

import { TenantConfig } from '../tools/tenant.config.js';
import { UserService } from '../services/user.service.js';

const router = Router();
const upload = multer();

router.get('/', TenantConfig.authenticate, Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    console.log(url);
    if (!url) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.AUTHOR_USER_REQUIRED,
        message: MEMOS_ERRORS.AUTHOR_USER_REQUIRED,
      });
    }

    const client = (req as any).client.reference;

    const response = await UserService.loadFiles(client, String(url));

    // if (result.status !== HttpStatus.SUCCESS) {
    //   return R.handleError(res, result.status, result.response);
    // }
    // return R.handleSuccess(res, result.response);

    // 🔥 TRANSFERT DES HEADERS
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');

    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
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
      console.error('❌ UPLOAD PROXY ERROR:', error.message);
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
      if (!MemosValidationUtils.validateGuid(guid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: MEMOS_CODES.INVALID_GUID,
          message: MEMOS_ERRORS.GUID_INVALID,
        });
      }
      const response = await UserService.sendReply(client, guid, req.body);
      if (response.status !== HttpStatus.SUCCESS) {
        return R.handleError(res, response.status, response.data);
      }

      return R.handleSuccess(res, response.data);
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
      if (!MemosValidationUtils.validateGuid(guid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: MEMOS_CODES.INVALID_GUID,
          message: MEMOS_ERRORS.GUID_INVALID,
        });
      }

      const response = await UserService.validateMemo(client, guid, req.body);
      if (response.status !== HttpStatus.SUCCESS) {
        return R.handleError(res, response.status, response.data);
      }

      return R.handleSuccess(res, response.data);
      // return res.status(response.status).json(response.data);
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
      if (!MemosValidationUtils.validateGuid(guid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: MEMOS_CODES.INVALID_GUID,
          message: MEMOS_ERRORS.GUID_INVALID,
        });
      }

      const response = await UserService.rejetMemo(client, guid, req.body);
      if (response.status !== HttpStatus.SUCCESS) {
        return R.handleError(res, response.status, response.data);
      }

      return R.handleSuccess(res, response.data);
      // return res.status(response.status).json(response.data);
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'validation_failed',
        message: error.message,
      });
    }
  },
);

export default router;
