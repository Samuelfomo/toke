import admin from '../utils/firebase.config.js';

interface FCMMessage {
  title: string;
  body: string;
  data?: { [key: string]: string };
}
/*
title: "Mise à jour",
  body: "Notification envoyée à tous vos appareils"
 */

export class FCMService {
  static async sendToTokens(tokens: string[], message: FCMMessage) {
    if (!tokens || tokens.length === 0) return;

    const multicastMessage = {
      tokens,
      notification: { title: message.title, body: message.body },
      data: message.data || {},
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(multicastMessage);
      console.log('Notifs envoyées:', response.successCount);
      console.log('Échecs:', response.failureCount);
      return response;
    } catch (err) {
      console.error('Erreur FCM multicast:', err);
      throw err;
    }
  }

  static async sendToToken(
    token: string,
    message: FCMMessage = {
      title: `Test notification`,
      body: `Notification envoyée votre appareil depuis l'equipe toke`,
    },
  ) {
    const payload = {
      token,
      notification: { title: message.title, body: message.body },
      data: message.data || {},
    };

    try {
      return await admin.messaging().send(payload);
    } catch (err) {
      console.error('Erreur FCM:', err);
      throw err;
    }
  }
}
