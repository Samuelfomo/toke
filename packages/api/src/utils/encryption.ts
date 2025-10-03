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
  static encrypt(data: string | object): string {
    if (!data) return '';

    // Si objet → convertir en string JSON
    const text = typeof data === 'string' ? data : JSON.stringify(data);

    // Vérifier si déjà chiffré
    if (this.isEncrypted(text)) return text;

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

  // Déchiffre et parse en objet (optionnel)
  static decryptToObject(encrypted: string): any {
    const decrypted = this.decrypt(encrypted);
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted; // ce n'était pas un objet
    }
  }

  // Vérifie si c'est déjà chiffré (hex:hex)
  private static isEncrypted(value: string): boolean {
    return /^[0-9a-f]+:[0-9a-f]+$/i.test(value);
  }
}
