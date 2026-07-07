import 'dotenv/config';

export const config = {
  botName: process.env.BOT_NAME || 'Junny',
  prefix: process.env.PREFIX || '.',
  ownerNumber: (process.env.OWNER_NUMBER || '').replace(/\D/g, ''),
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramAllowedChatId: process.env.TELEGRAM_ALLOWED_CHAT_ID || '',
};

if (!config.ownerNumber) {
  console.warn('[config] OWNER_NUMBER manquant dans .env — les commandes admin ne fonctionneront pas correctement.');
}
