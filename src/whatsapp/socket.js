/**
 * Connexion WhatsApp (Baileys)
 * ----------------------------
 * Connexion via code de jumelage
 */

import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys';

import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { handleMessage } from './messageHandler.js';
import { handleGroupParticipantsUpdate } from './groupEvents.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSION_DIR = path.join(__dirname, '../../data/session');

const logger = pino({
  level: 'silent'
});

let sock = null;

export async function startWhatsApp() {
  // FIX 1 : si le dossier de session n'existe pas, useMultiFileAuthState
  // ne peut pas écrire les creds -> la session n'était jamais sauvegardée.
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  const { state, saveCreds } =
    await useMultiFileAuthState(SESSION_DIR);

  const { version } =
    await fetchLatestBaileysVersion();

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

  sock.ev.on(
    'creds.update',
    saveCreds
  );

  sock.ev.on(
    'connection.update',
    async (update) => {
      const {
        connection,
        lastDisconnect
      } = update;

      if (connection === 'open') {
        console.log(
          '✅ WhatsApp connecté'
        );
      }

      if (connection === 'close') {
        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        console.log(
          '❌ WhatsApp déconnecté (code',
          statusCode,
          ')'
        );

        // Si la session a été explicitement déconnectée (logged out),
        // reconnecter en boucle ne sert à rien : il faut un nouveau
        // pairing. On arrête la boucle dans ce cas précis.
        if (statusCode === DisconnectReason.loggedOut) {
          console.log(
            '⚠️ Session déconnectée définitivement. Supprimez data/session et relancez un pairing.'
          );
          return;
        }

        setTimeout(() => {
          startWhatsApp();
        }, 5000);
      }
    }
  );

  sock.ev.on(
    'messages.upsert',
    async ({ messages }) => {
      const msg = messages[0];

      if (!msg?.message) return;

      await handleMessage(
        sock,
        msg
      );
    }
  );

  sock.ev.on(
    'group-participants.update',
    async (update) => {
      if (handleGroupParticipantsUpdate) {
        await handleGroupParticipantsUpdate(
          sock,
          update
        );
      }
    }
  );

  return sock;
}


export async function requestPairingCode(number) {
  if (!sock) {
    throw new Error(
      'WhatsApp non démarré'
    );
  }

  // FIX 2a : si la session est déjà enregistrée, redemander un code
  // n'a pas de sens et peut produire un code invalide.
  if (sock.authState?.creds?.registered) {
    throw new Error(
      'Session déjà enregistrée, code de jumelage inutile'
    );
  }

  const phone = String(number)
    .replace(/\D/g, '');

  if (!phone) {
    throw new Error(
      'Numéro invalide'
    );
  }

  // FIX 2b : attendre que le socket WebSocket interne soit réellement
  // ouvert avant de demander le code, sinon Baileys génère un code
  // invalide ou l'appel échoue silencieusement.
  await waitForSocketOpen();

  const code =
    await sock.requestPairingCode(phone);

  console.log(
    '🔑 Code WhatsApp :',
    code
  );

  return code;
}

function waitForSocketOpen(timeoutMs = 5000) {
  return new Promise((resolve) => {
    // Si déjà ouvert (readyState 1 = OPEN), on continue immédiatement.
    if (sock?.ws?.socket?.readyState === 1) {
      resolve();
      return;
    }

    const timeout = setTimeout(resolve, timeoutMs);

    const onOpen = () => {
      clearTimeout(timeout);
      resolve();
    };

    sock.ws.on('open', onOpen);
  });
}


export function getSocket() {
  return sock;
}
