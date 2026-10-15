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

  public static async licensePayment(
    user: string,
    email: string,
    token: string,
    site = process.env.SITE_NAME,
  ): Promise<void> {
    try {
      this.initialize(process.env.EMAILJS_PUBLIC_KEY2, process.env.EMAILJS_PRIVATE_KEY2);

      const templateParams = {
        to_email: email,
        user_name: user,
        site_name: site,
        payment_link: `${process.env.EMAILJS_LINK}/${token}`,
      };

      console.log("📧 Tentative d'envoi email vers:", email);

      const response = await send(
        process.env.EMAILJS_SERVICE_ID2!,
        process.env.EMAILJS_TEMPLATE_ID2!,
        templateParams,
      );
      console.log('✅ Email envoyé avec succès:', response.text);
    } catch (error: any) {
      // Gestion spécifique des erreurs EmailJS
      if (error.status === 403) {
        throw new Error(
          'EmailJS server-side calls not enabled. Please enable in your EmailJS dashboard.',
        );
      }

      throw new Error(`Failed to send email: ${error.message || error.text}`);
    }
  }

  // Le template onboarding doit utiliser message et action_label (ne pas réutiliser
  // un template promettant "payer" pour une activation déjà réglée).
  public static async onboarding(
    name: string,
    email: string,
    url: string,
    phase: 'SUBSCRIPTION' | 'ACTIVATION_PENDING' | 'READY',
  ): Promise<void> {
    const messages = {
      SUBSCRIPTION: 'Consultez votre dossier Toké et poursuivez les étapes disponibles.',
      ACTIVATION_PENDING: 'Votre règlement est confirmé. L’équipe Toké prépare votre espace.',
      READY:
        'Votre espace Toké est prêt. Suivez le parcours de création de votre premier utilisateur.',
    };
    const service = process.env.EMAILJS_SERVICE_ID2;
    const template = process.env.EMAILJS_ONBOARDING_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY2;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY2;
    if (!service || !template || !publicKey || !privateKey)
      throw new Error('Onboarding email configuration missing');
    await send(
      service,
      template,
      {
        to_email: email,
        user_name: name,
        payment_link: url,
        action_link: url,
        message: messages[phase],
        action_label: phase === 'READY' ? 'Accéder à mon espace' : 'Consulter mon dossier',
      },
      { publicKey, privateKey },
    );
  }

  private static initialize(
    pub = process.env.EMAILJS_PUBLIC_KEY,
    priv = process.env.EMAILJS_PRIVATE_KEY,
  ) {
    let publicValue = pub;
    let privateValue = priv;
    if (!this.initialized) {
      // Vérification des variables d'environnement
      if (!publicValue || !privateValue) {
        throw new Error('EmailJS keys are missing in environment variables');
      }

      init({
        publicKey: publicValue,
        privateKey: privateValue,
      });
      this.initialized = true;
      console.log('✅ EmailJS initialized for server-side usage');
    }
  }
}
