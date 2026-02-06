export default class GenerateOtp {
  /**
   * Génère un OTP sécurisé
   * @returns OTP de size(default = 2) chiffres
   */
  static generateOTP(size: number = 3): string {
    if (size < 3) {
      throw new Error('La taille minimale de OTP doit être de 3');
    }

    const digits = '0123456789';

    const generateDigitGroup = (groupSize: number, canStartWithZero: boolean = true): string => {
      let result = '';
      for (let i = 0; i < groupSize; i++) {
        if (i === 0 && !canStartWithZero) {
          result += digits[Math.floor(Math.random() * 9) + 1]; // 1-9
        } else {
          result += digits[Math.floor(Math.random() * 10)]; // 0-9
        }
      }
      return result;
    };

    // CALCUL CORRIGÉ DES TAILLES
    let num1Size, num2Size;

    if (size % 2 === 0) {
      // Taille paire : num2 est toujours pair
      if (size === 4) {
        num1Size = 1;
        num2Size = 2; // Format: 1-2-1 = 4
      } else if (size === 6) {
        num1Size = 2;
        num2Size = 2; // Format: 2-2-2 = 6
      } else if (size === 8) {
        num1Size = 3;
        num2Size = 2; // Format: 3-2-3 = 8
      } else {
        num2Size = 2; // Toujours 2 pour tailles paires
        num1Size = (size - num2Size) / 2;
      }
    } else {
      // Taille impaire : num2 est toujours 1
      if (size === 3) {
        num1Size = 1;
        num2Size = 1; // Format: 1-1-1 = 3
      } else if (size === 5) {
        num1Size = 2;
        num2Size = 1; // Format: 2-1-2 = 5
      } else if (size === 7) {
        num1Size = 3;
        num2Size = 1; // Format: 3-1-3 = 7
      } else {
        num2Size = 1; // Toujours 1 pour tailles impaires
        num1Size = (size - num2Size) / 2;
      }
    }

    let otp = '';
    let attempts = 0;
    const maxAttempts = 100;

    do {
      const num1 = generateDigitGroup(num1Size, false); // num1 ne commence jamais par 0
      const num2 = generateDigitGroup(num2Size, true); // num2 peut commencer par 0

      const formats = ['XYX', 'XXY', 'YXX'];
      const selectedFormat = formats[Math.floor(Math.random() * formats.length)];

      switch (selectedFormat) {
        case 'XYX':
          otp = num1 + num2 + num1;
          break;
        case 'XXY':
          otp = num1 + num1 + num2;
          break;
        case 'YXX':
          otp = num2 + num1 + num1;
          break;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('Impossible de générer un OTP valide après plusieurs tentatives');
      }
    } while (otp.startsWith('0') || otp.length !== size);

    return otp;
  }
}
