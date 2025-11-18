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

// import fs from 'fs';
// import path from 'path';
//
// import multer from 'multer';
// // 📂 Dossier cible
// const uploadDir = path.resolve('uploads/attachments');
//
// // ✅ Crée le dossier si besoin
// function ensureUploadDir() {
//   if (!fs.existsSync(uploadDir)) {
//     fs.mkdirSync(uploadDir, { recursive: true });
//     console.log(`📁 Dossier créé : ${uploadDir}`);
//   }
// }
//
// // ⚙️ Configuration du stockage
// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => {
//     try {
//       ensureUploadDir();
//       cb(null, uploadDir);
//     } catch (err) {
//       cb(err as Error, uploadDir);
//     }
//   },
//   filename: (_req, file, cb) => {
//     const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
//     cb(null, uniqueName);
//   },
// });
//
// export const upload = multer({
//   storage,
//   limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo max
// });
//
// export { uploadDir };
