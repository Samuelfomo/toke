import fs from 'fs';
import path from 'path';

import multer from 'multer';

// 📂 Base du dossier
const BASE_UPLOAD_DIR = path.resolve('uploads/attachments');

// 🔧 Fonction pour créer un dossier
function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    try {
      // 🔥 On récupère bien le tenant via le middleware Ensure
      const tenantRef = req.tenant.config.reference;
      if (!tenantRef) return cb(new Error('Tenant reference missing'), '');

      // 📁 Chemin dynamique par tenant
      const dir = path.join(BASE_UPLOAD_DIR, tenantRef);

      // Création si nécessaire
      ensureDir(dir);

      cb(null, dir);
    } catch (err: any) {
      cb(err, '');
    }
  },

  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo
});

export { BASE_UPLOAD_DIR };
