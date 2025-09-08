import crypto from 'crypto';

const algorithm = 'aes-256-cbc';

if (!process.env.DB_ENCRYPTION_KEY) {
  throw new Error('DB_ENCRYPTION_KEY manquant dans .env !');
}

const key = Buffer.from(process.env.DB_ENCRYPTION_KEY, 'hex');
// const key = Buffer.from(
//   process.env.DB_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
//   'hex',
// );

export class DatabaseEncryption {
  static encrypt(text: string): string {
    if (!text) return text;

    // Vérifier si déjà chiffré
    if (text.includes(':')) return text;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  static decrypt(encrypted: string): string {
    if (!encrypted || !encrypted.includes(':')) return encrypted;

    const [ivHex, encryptedData] = encrypted.split(':');
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(ivHex, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
