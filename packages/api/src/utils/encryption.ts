import crypto from 'crypto';

const algorithm = 'aes-256-cbc';

if (!process.env.DB_ENCRYPTION_KEY) {
  throw new Error('DB_ENCRYPTION_KEY manquant dans .env !');
}

const defaultKey = Buffer.from(process.env.DB_ENCRYPTION_KEY, 'hex');
// const key = Buffer.from(
//   process.env.DB_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
//   'hex',
// );

export class DatabaseEncryption {
  /**
   * Chiffre une donnée (string ou objet)
   * @param data Donnée à chiffrer
   * @param customKey Clé optionnelle en hex
   */
  static encrypt(data: string | object, customKey?: string): string {
    if (!data) return '';
 
    // Si objet → convertir en string JSON
    const text = typeof data === 'string' ? data : JSON.stringify(data);

    // const key = customKey ? Buffer.from(customKey, 'hex') : defaultKey;

    const key = this.normalizeKey(customKey);

    // Vérifier si déjà chiffré
    if (this.isEncrypted(text)) return text;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Déchiffre une donnée
   * @param encrypted Texte chiffré
   * @param customKey Clé optionnelle en hex
   */
  static decrypt(encrypted: string, customKey?: string): string {
    if (!encrypted || !encrypted.includes(':')) return encrypted;

    const key = this.normalizeKey(customKey);

    // const key = customKey ? Buffer.from(customKey, 'hex') : defaultKey;
    const [ivHex, encryptedData] = encrypted.split(':');
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(ivHex, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Déchiffre et parse en objet (optionnel)
  static decryptToObject(encrypted: string, customKey?: string): any {
    const decrypted = this.decrypt(encrypted, customKey);
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted; // ce n'était pas un objet
    }
  }

  /**
   * Adapte la clé fournie à une clé AES-256 (32 octets)
   * sans la transformer par hash — compatible avec mobile
   */
  private static normalizeKey(customKey?: string): Buffer {
    if (!customKey) return defaultKey;

    // Si déjà hexadécimale de 64 caractères → ok
    if (/^[0-9a-f]{64}$/i.test(customKey)) {
      return Buffer.from(customKey, 'hex');
    }

    // Sinon, convertir le texte en bytes et le “padder” à 32 octets
    const keyBuffer = Buffer.alloc(32);
    const inputBuffer = Buffer.from(customKey);

    // Copier la clé dans le buffer (jusqu’à 32 octets)
    inputBuffer.copy(keyBuffer);

    return keyBuffer;
  }

  // Vérifie si c'est déjà chiffré (hex:hex)
  private static isEncrypted(value: string): boolean {
    return /^[0-9a-f]+:[0-9a-f]+$/i.test(value);
  }
}
