/**
 * Connexion WhatsApp (Baileys)
 * ----------------------------
 * Connexion via code de jumelage
 */

import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';

import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';

import { handleMessage } from './messageHandler.js';
import { handleGroupParticipantsUpdate } from './groupEvents.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSION_DIR = path.join(__dirname, '../../data/session');

const logger = pino({ level: 'silent' });

let sock = null;
let pairingCodeListener = null;

export function setPairingCodeListener(fn) {
  pairingCodeListener = fn;
}

export async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: [
      'Junny Bot',
      'Chrome',
      '1.0.0'
    ]
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, pairingCode } = update;

    if (pairingCode && pairingCodeListener) {
      pairingCodeListener(pairingCode);
    }

    if (connection === 'open') {
      console.log('✅ WhatsApp connecté');
    }

    if (connection === 'close') {
      console.log('❌ Connexion fermée');

      setTimeout(() => {
        startWhatsApp();
      }, 5000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];

    if (!msg?.message) return;

    await handleMessage(sock, msg);
  });

  sock.ev.on(
    'group-participants.update',
    async (update) => {
      if (handleGroupParticipantsUpdate) {
        await handleGroupParticipantsUpdate(sock, update);
      }
    }
  );

  return sock;
}

export function getSocket() {
  return sock;
}
export async function requestPairingCode(number) {
  if (!sock) {
    throw new Error('WhatsApp socket non démarré');
  }

  const code = await sock.requestPairingCode(number);

  return code;
}
