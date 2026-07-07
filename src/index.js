import { startWhatsApp } from './whatsapp/socket.js';
import { startTelegramBridge } from './telegram/pairBot.js';
import { config } from './config.js';

console.log(`\n=== ${config.botName} — démarrage ===\n`);

// On empêche un crash isolé de tuer tout le process — c'est ce qui
// évite les déconnexions surprises après quelques secondes.
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

await startWhatsApp();
startTelegramBridge();
