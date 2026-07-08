/**
 * Connexion WhatsApp (Baileys)
 * ----------------------------
 * - Se connecte via CODE DE JUMELAGE (pas de QR code à scanner).
 * - Sauvegarde la session dans ./session pour ne pas avoir à se
 *   reconnecter à chaque redémarrage (le disque Pterodactyl est
 *   normalement persistant, donc pas de souci).
 * - Se reconnecte automatiquement si la connexion tombe, SAUF si
 *   l'utilisateur s'est déconnecté volontairement (logout).
 * - Un "numéro de génération" empêche deux sockets de tourner en même
 *   temps (ex: un ancien timer de reconnexion qui se déclenche juste
 *   après un reset manuel) — c'est une cause fréquente du message
 *   WhatsApp "appareil déjà lié" quand deux connexions se battent avec
 *   les mêmes identifiants.
 */
import baileysPkg from '@whiskeysockets/baileys';
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, Browsers } = baileysPkg;
import { Boom } from '@hapi/boom';
import pino from 'pino';
import path from 'path';
import { rm } from 'fs/promises';
import { handleMessage } from './messageHandler.js';
import { handleGroupParticipantsUpdate } from './groupEvents.js';

const SESSION_DIR = path.join(process.cwd(), 'session');
const logger = pino({ level: 'silent' }); // mettez 'info' pour du debug détaillé

let sock = null;
let readyForPairing = false;
let currentGeneration = 0;

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function startWhatsApp() {
  const myGen = ++currentGeneration;
  readyForPairing = false;

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const newSock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false, // on utilise le code de jumelage, pas le QR
    // IMPORTANT : le format du "fingerprint" du navigateur doit être un
    // profil reconnu ('Name (OS)') pour que WhatsApp accepte le code de
    // jumelage. Un nom personnalisé libre fait que le code est généré
    // mais silencieusement ignoré par WhatsApp.
    browser: Browsers.macOS('Chrome'),
  });
  sock = newSock;

  newSock.ev.on('creds.update', saveCreds);

  newSock.ev.on('connection.update', async (update) => {
    if (myGen !== currentGeneration) return; // ce socket a été remplacé, on l'ignore
    const { connection, lastDisconnect, qr } = update;

    if ((qr || connection === 'connecting') && !readyForPairing) {
      readyForPairing = true;
      console.log('[WhatsApp] Socket prêt — un code de jumelage peut maintenant être demandé.');
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      console.log(`[WhatsApp] Connexion fermée (code ${statusCode}). Reconnexion : ${!loggedOut}`);
      if (!loggedOut) {
        setTimeout(() => {
          if (myGen === currentGeneration) startWhatsApp();
        }, 3000);
      } else {
        console.log('[WhatsApp] Déconnecté définitivement (logout). Il faut se rejumeler (envoyer "reset" sur Telegram).');
      }
    } else if (connection === 'open') {
      console.log('[WhatsApp] Connecté avec succès ✅');
    }
  });

  newSock.ev.on('messages.upsert', async (m) => {
    if (myGen !== currentGeneration) return;
    try {
      await handleMessage(newSock, m);
    } catch (err) {
      console.error('[WhatsApp] Erreur dans le traitement du message:', err);
    }
  });

  newSock.ev.on('group-participants.update', async (event) => {
    if (myGen !== currentGeneration) return;
    try {
      await handleGroupParticipantsUpdate(newSock, event);
    } catch (err) {
      console.error('[WhatsApp] Erreur welcome:', err);
    }
  });

  return newSock;
}

/**
 * Demande un code de jumelage à 6 chiffres pour le numéro donné.
 * Attend que le socket soit réellement prêt avant de faire la demande.
 */
export async function requestPairingCode(phoneNumber) {
  if (!sock) throw new Error("Le socket WhatsApp n'est pas encore initialisé.");
  if (sock.authState.creds.registered) {
    throw new Error('Ce bot est déjà lié à un compte WhatsApp. Envoyez "reset" pour repartir de zéro avant de redemander un code.');
  }

  const maxWaitMs = 15000;
  const start = Date.now();
  while (!readyForPairing && Date.now() - start < maxWaitMs) {
    await wait(300);
  }
  if (!readyForPairing) {
    throw new Error('Le socket WhatsApp ne devient pas prêt (timeout 15s). Envoyez "reset" puis réessayez.');
  }

  const cleaned = phoneNumber.replace(/\D/g, '');
  const code = await sock.requestPairingCode(cleaned);
  console.log(`[WhatsApp] Code de jumelage généré pour ${cleaned} : ${code}`);
  return code;
}

/**
 * Efface complètement la session locale et relance une connexion neuve.
 * Utilisable directement depuis Telegram en envoyant "reset".
 * Important : ça ne retire PAS l'appareil côté téléphone si un jumelage
 * a déjà abouti une fois. Dans ce cas, allez aussi dans WhatsApp >
 * Paramètres > Appareils liés et retirez manuellement toute entrée liée
 * à ce bot avant de rejumeler — sinon WhatsApp peut continuer à
 * répondre "déjà lié".
 */
export async function resetSession() {
  currentGeneration++; // invalide l'ancien socket et ses timers de reco
  readyForPairing = false;
  try { sock?.end?.(new Error('reset demandé par l\'utilisateur')); } catch { /* ignore */ }
  sock = null;
  await rm(SESSION_DIR, { recursive: true, force: true });
  console.log('[WhatsApp] Session locale effacée. Reconnexion propre en cours...');
  await startWhatsApp();
}

export function getStatus() {
  return {
    initialized: !!sock,
    registered: sock?.authState?.creds?.registered || false,
    readyForPairing,
  };
}

export function getSocket() {
  return sock;
}
