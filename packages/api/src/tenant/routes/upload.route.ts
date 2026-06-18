import path from 'path';

import express, { Request, Response } from 'express';
import { HttpStatus } from '@toke/shared';

import { BASE_UPLOAD_DIR, upload } from '../../utils/upload.js';
import R from '../../tools/response.js';
import Ensure from '../../middle/ensured-routes.js';

const router = express.Router();

// 📤 Endpoint upload - retourne les liens courts
router.post(
  '/attachments',
  Ensure.post(),
  upload.array('files', 10),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      // const tenantRef = req.tenant.config.reference;

      if (!files || files.length === 0) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'no_files_received',
          message: 'No files received.',
        });
      }

      const baseUrl = `https://${req.get('host')}`;
      // const baseUrl = `${req.protocol}://${req.get('host')}`;
      const attachments = files.map((file) => ({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `${baseUrl}/upload/f/${file.filename}`, // ✨ Lien direct basé sur le nom du fichier
        // url: `${baseUrl}/upload/f/${tenantRef}/${file.filename}`,
      }));

      return R.handleSuccess(res, {
        attachments,
      });
    } catch (err: any) {
      console.error('❌ Erreur upload:', err);
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'upload_failed',
        message: err.message,
      });
    }
  },
);

// 🧭 Endpoint pour servir le fichier
router.get('/f/:filename', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;

    // 🔒 Sécurité : empêche les tentatives de directory traversal
    const sanitizedFilename = path.basename(filename as string);

    const tenantRef = req.tenant.config.reference;
    const filePath = path.join(BASE_UPLOAD_DIR, tenantRef, sanitizedFilename);

    // 📥 Envoie le fichier
    return res.sendFile(path.resolve(filePath), (err) => {
      if (err) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: 'file_not_found',
          message: 'File not found.',
        });
      }
    });
  } catch (err: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'file_fetch_failed',
      message: `Failed to fetch file: ${err.message}`,
    });
  }
});

export default router;
