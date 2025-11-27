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
    const sanitizedFilename = path.basename(filename);

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

// import path from 'path';
// import crypto from 'crypto';
//
// import express, { Request, Response } from 'express';
// import { HttpStatus } from '@toke/shared';
//
// import { upload, uploadDir } from '../../utils/upload.js';
// import R from '../../tools/response.js';
// import Ensure from '../../middle/ensured-routes.js';
// import { shortLinks } from '../../utils/store/shortlink.store.js';
//
// const router = express.Router();
//
// // 🔗 Mémoire temporaire pour les liens courts
// // const shortLinks: Record<string, string> = {};
//
// // Génère un code court et stocke le chemin du fichier associé
// function generateShortCode(filePath: string): string {
//   const code = crypto.randomBytes(4).toString('hex'); // ex: "a3f9b2d1"
//   shortLinks[code] = filePath;
//   return code;
// }
//
// // 📤 Endpoint upload
// router.post(
//   '/attachments',
//   Ensure.post(),
//   upload.array('files', 10),
//   async (req: Request, res: Response) => {
//     try {
//       const files = req.files as Express.Multer.File[];
//
//       if (!files || files.length === 0) {
//         return R.handleError(res, HttpStatus.BAD_REQUEST, {
//           code: 'no_files_received',
//           message: 'No files received.',
//         });
//       }
//
//       const baseUrl = `${req.protocol}://${req.get('host')}`;
//       const attachments = files.map((file) => {
//         const shortCode = generateShortCode(path.join(uploadDir, file.filename));
//         return {
//           originalName: file.originalname,
//           mimeType: file.mimetype,
//           size: file.size,
//           shortUrl: `${baseUrl}/f/${shortCode}`,
//         };
//       });
//
//       return R.handleSuccess(res, {
//         attachments,
//       });
//     } catch (err: any) {
//       console.error('❌ Erreur upload:', err);
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: 'limit_unexpected_file',
//         message: err.message,
//       });
//       // return res.status(500).json({
//       //   success: false,
//       //   message: err.message,
//       // });
//     }
//   },
// );
//
// // 🧭 Endpoint pour servir directement le fichier
// router.get('/f/:code', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const { code } = req.params;
//     const filePath = shortLinks[code];
//
//     if (!filePath) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: 'file_not_found',
//         message: 'File not found: Invalid or expired link.',
//       });
//     }
//
//     // 🔥 Envoie directement le fichier au navigateur
//     return res.sendFile(path.resolve(filePath));
//   } catch (err: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: 'file_fetch_failed',
//       message: `Failed to fetch file: ${err.message}`,
//     });
//   }
// });
//
// export default router;
