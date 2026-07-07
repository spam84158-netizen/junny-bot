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
import { requestPairingCode } from '../whatsapp/socket.js';

// Garde-fou : empêche deux demandes de pairing simultanées (par ex.
// si un message est livré deux fois, ou si une deuxième instance du
// bot tourne par erreur en parallèle).
let pairingInProgress = false;

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
    const phoneNumber = text.replace(/\D/g, '');

    if (!phoneNumber || phoneNumber.length < 8) {
      await bot.sendMessage(chatId, "Envoyez votre numéro WhatsApp complet avec l'indicatif, sans le +.\nExemple : 2250160775890");
      return;
    }

    if (pairingInProgress) {
      console.log('[Telegram] Demande de pairing ignorée : une autre est déjà en cours.');
      await bot.sendMessage(chatId, '⏳ Un code est déjà en cours de génération, patientez quelques secondes puis réessayez.');
      return;
    }

    pairingInProgress = true;

    try {
      await bot.sendMessage(chatId, '⏳ Génération du code de jumelage...');
      const code = await requestPairingCode(phoneNumber);
      await bot.sendMessage(chatId, `✅ Code : *${code}*\n\nDans WhatsApp : Paramètres > Appareils liés > Lier un appareil > Lier avec le numéro de téléphone.`, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('[Telegram] Erreur pairing:', err);
      await bot.sendMessage(chatId, "❌ Impossible de générer le code (le bot est peut-être déjà connecté, ou le numéro est invalide).");
    } finally {
      pairingInProgress = false;
    }
  });

  return bot;
}
