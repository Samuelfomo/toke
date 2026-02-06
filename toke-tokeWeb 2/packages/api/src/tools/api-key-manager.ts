import crypto from 'crypto';

export class ApiKeyManager {
  private static readonly validityHours = 24;

  /**
   * Génère un UUID signé avec une signature HMAC
   * @param secret - Clé secrète pour la signature
   * @param key
   * @returns UUID signé au format: token.signature
   */
  public static generate(secret: string, key: string): string {
    try {
      const timestamp: string = Math.floor(Date.now() / 1000).toString();
      const code = key + timestamp;

      // secret en base64
      const secretBytes = Buffer.from(secret, 'base64');

      // sortie en base64 (pas hex)

      return crypto.createHmac('sha256', secretBytes).update(code).digest('base64');
    } catch (error: any) {
      return `${error.message}`;
    }
  }

  /**
   * Vérifie qu'un UUID signé a été généré avec la bonne clé secrète
   * @param signature - UUID signé au format signature
   * @param token
   * @param validity
   * @param secret - Clé secrète pour vérifier la signature
   * @returns true si la signature est valide
   */
  public static verify(
    signature: string,
    token: string,
    validity: string,
    secret: string,
  ): boolean {
    try {
      const timestamp = parseInt(validity, 10);
      const now = Math.floor(Date.now() / 1000);
      // Vérification de la validité temporelle
      if (timestamp > now) {
        return false;
      }

      const maxAgeSec = this.validityHours * 60 * 60;
      if (now - timestamp > maxAgeSec) {
        return false;
      }

      // Vérifier que la signature ne contient que des caractères hexadécimaux
      if (!/^[A-Za-z0-9+/=]+$/.test(signature)) {
        return false;
      }

      const dataToSign = token + validity;

      // Recalculer la signature avec la clé secrète
      const expectedSignature = crypto
        .createHmac('sha256', Buffer.from(secret, 'base64'))
        .update(dataToSign)
        .digest('base64');

      if (signature.length !== expectedSignature.length) return false;
      // ou if (!/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;

      // Comparer les signatures de manière sécurisée
      // Maintenant nous sommes sûrs que les deux buffers ont la même taille
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'base64'),
        Buffer.from(expectedSignature, 'base64'),
      );
    } catch (error: any) {
      console.error('❌ Erreur lors de la vérification de signature:', error.message);
      return false;
    }
  }
}
