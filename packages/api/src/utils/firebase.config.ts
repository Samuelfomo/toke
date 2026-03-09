import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import admin from 'firebase-admin';

// Recréer __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const jsonPath = `${__dirname}/prive/tokenotification-firebase-adminsdk-fbsvc-6b764c3800.json`;

const serviceAccount = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

export default admin;
