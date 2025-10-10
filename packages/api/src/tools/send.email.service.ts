import { init, send } from '@emailjs/nodejs';

export default class EmailSender {
  private static initialized = false;

  public static async sender(code: string, email: string): Promise<void> {
    try {
      this.initialize();

      const templateParams = {
        to_email: email,
        otp: code,
      };

      console.log("📧 Tentative d'envoi email vers:", email);

      const response = await send(
        process.env.EMAILJS_SERVICE_ID!,
        process.env.EMAILJS_TEMPLATE_ID!,
        templateParams,
      );

      console.log('✅ Email envoyé avec succès:', response.text);
    } catch (error: any) {
      console.error('❌ Erreur envoi email:', error);

      // Gestion spécifique des erreurs EmailJS
      if (error.status === 403) {
        throw new Error(
          'EmailJS server-side calls not enabled. Please enable in your EmailJS dashboard.',
        );
      }

      throw new Error(`Failed to send email: ${error.message || error.text}`);
    }
  }

  private static initialize() {
    if (!this.initialized) {
      // Vérification des variables d'environnement
      if (!process.env.EMAILJS_PUBLIC_KEY || !process.env.EMAILJS_PRIVATE_KEY) {
        throw new Error('EmailJS keys are missing in environment variables');
      }

      init({
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY,
      });
      this.initialized = true;
      console.log('✅ EmailJS initialized for server-side usage');
    }
  }
}
