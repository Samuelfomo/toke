export default class TokenManager {
  static async tokenGenerator(length: number = 6): Promise<string> {
    try {
      if (length < 4) {
        console.error(`❌ La longueur doit être au moins de 4 caractères.`);
        return '';
      }

      const randomDigits = (count: number): string => {
        let result = '';
        for (let i = 0; i < count; i++) {
          result += Math.floor(Math.random() * 10).toString();
        }
        return result;
      };

      const randomUppercase = (count: number): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < count; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      // Calcul de la répartition des chiffres
      const digitCount = length - 2; // total des chiffres à générer
      const before = Math.floor(digitCount / 2);
      const after = digitCount - before;

      // Construction du token
      const token = `${randomDigits(before)}${randomUppercase(2)}${randomDigits(after)}`;

      console.log(`🔑 Token généré (${length}) : ${token}`);
      return token;
    } catch (error: any) {
      console.error(`❌ Erreur lors de la génération du token :`, error.message);
      return '';
    }
  }
}
