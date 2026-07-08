/**
 * Pont Telegram — sert UNIQUEMENT à récupérer le code de jumelage
 * WhatsApp à distance, sans avoir besoin d'ouvrir une page web sur
 * le serveur.
 *
 * Utilisation : envoyez votre numéro WhatsApp (avec l'indicatif, sans
 * le +) au bot Telegram. Il répond avec le code à 6 chiffres à saisir
 * dans WhatsApp (Paramètres > Appareils liés > Lier un appareil >
 * Lier avec le numéro de téléphone).
 */
import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config.js';
import { requestPairingCode, resetSession, getStatus } from '../whatsapp/socket.js';

export function startTelegramBridge() {
  if (!config.telegramToken) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN manquant — pont Telegram désactivé.');
    return;
  }

  const bot = new TelegramBot(config.telegramToken, { polling: true });
  console.log('[Telegram] Pont de jumelage démarré.');

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    // Sécurité : si un chat autorisé est configuré, on ignore tout le
    // reste. Sinon (premier lancement) on affiche l'ID pour que vous
    // puissiez le copier dans .env.
    if (config.telegramAllowedChatId && String(chatId) !== String(config.telegramAllowedChatId)) {
      console.log(`[Telegram] Message ignoré d'un chat non autorisé (ID: ${chatId})`);
      return;
    }
    if (!config.telegramAllowedChatId) {
      console.log(`[Telegram] Aucun TELEGRAM_ALLOWED_CHAT_ID défini. Votre chat ID est : ${chatId}`);
    }

    const text = (msg.text || '').trim();

    if (/^status$/i.test(text)) {
      const s = getStatus();
      await bot.sendMessage(chatId,
        `📊 Statut :\n` +
        `• Socket initialisé : ${s.initialized ? 'oui' : 'non'}\n` +
        `• Compte lié (registered) : ${s.registered ? 'oui ✅' : 'non'}\n` +
        `• Prêt pour un nouveau code : ${s.readyForPairing ? 'oui' : 'non'}`
      );
      return;
    }

    if (/^reset$/i.test(text)) {
      await bot.sendMessage(chatId, '🔄 Réinitialisation de la session en cours...');
      try {
        await resetSession();
        await bot.sendMessage(chatId, '✅ Session effacée et connexion relancée à zéro. Renvoyez votre numéro pour obtenir un nouveau code.\n\n⚠️ Si un jumelage avait déjà abouti avant, allez aussi retirer l\'entrée du bot dans WhatsApp > Paramètres > Appareils liés sur votre téléphone.');
      } catch (err) {
        console.error('[Telegram] Erreur reset:', err);
        await bot.sendMessage(chatId, `❌ Le reset a échoué : ${err.message}`);
      }
      return;
    }

    const phoneNumber = text.replace(/\D/g, '');

    if (!phoneNumber || phoneNumber.length < 8) {
      await bot.sendMessage(chatId, "Envoyez votre numéro WhatsApp complet avec l'indicatif, sans le +.\nExemple : 2250160775890\n\nAutres commandes : \"status\" (voir l'état de la connexion), \"reset\" (repartir de zéro si ça bloque).");
      return;
    }

    try {
      await bot.sendMessage(chatId, '⏳ Génération du code de jumelage...');
      const code = await requestPairingCode(phoneNumber);
      await bot.sendMessage(chatId, `✅ Code : *${code}*\n\nDans WhatsApp : Paramètres > Appareils liés > Lier un appareil > Lier avec le numéro de téléphone.`, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('[Telegram] Erreur pairing:', err);
      await bot.sendMessage(chatId, `❌ ${err.message || "Impossible de générer le code."}`);
    }
  });

  return bot;
}
