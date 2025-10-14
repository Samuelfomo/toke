import fs from 'fs';
import path from 'path';

import multer from 'multer';
// 📂 Dossier cible
const uploadDir = path.resolve('uploads/attachments');

// ✅ Crée le dossier si besoin
function ensureUploadDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`📁 Dossier créé : ${uploadDir}`);
  }
}

// ⚙️ Configuration du stockage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      ensureUploadDir();
      cb(null, uploadDir);
    } catch (err) {
      cb(err as Error, uploadDir);
    }
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo max
});

export { uploadDir };
