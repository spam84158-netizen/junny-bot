/**
 * Connexion WhatsApp (Baileys)
 * ----------------------------
 * - Se connecte via CODE DE JUMELAGE (pas de QR code à scanner).
 * - Sauvegarde la session dans ./session pour ne pas avoir à se
 *   reconnecter à chaque redémarrage (IMPORTANT sur Render/Railway :
 *   sans disque persistant, ce dossier est effacé à chaque redéploiement
 *   et il faudra refaire le jumelage — voir README pour activer un disque).
 * - Se reconnecte automatiquement si la connexion tombe, SAUF si
 *   l'utilisateur s'est déconnecté volontairement (logout).
 */
import baileysPkg from '@whiskeysockets/baileys';
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = baileysPkg;
import { Boom } from '@hapi/boom';
import pino from 'pino';
import path from 'path';
import { handleMessage } from './messageHandler.js';
import { handleGroupParticipantsUpdate } from './groupEvents.js';
import { config } from '../config.js';

const SESSION_DIR = path.join(process.cwd(), 'session');
const logger = pino({ level: 'silent' }); // mettez 'info' pour du debug détaillé

let sock = null;
let pairingRequestedFor = null;
let onPairingCode = null; // callback appelé quand un code est généré

export function setPairingCodeListener(fn) {
  onPairingCode = fn;
}

export async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false, // on utilise le code de jumelage, pas le QR
    browser: [config.botName, 'Chrome', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      console.log(`[WhatsApp] Connexion fermée (code ${statusCode}). Reconnexion : ${!loggedOut}`);
      if (!loggedOut) {
        // Reconnexion automatique — c'est ce qui évite le "ça se déconnecte
        // après 2-3 secondes" : on ne laisse jamais le process s'arrêter
        // tout seul sur une coupure réseau temporaire.
        setTimeout(() => startWhatsApp(), 3000);
      } else {
        console.log('[WhatsApp] Déconnecté définitivement (logout). Il faut se rejumeler.');
      }
    } else if (connection === 'open') {
      console.log('[WhatsApp] Connecté avec succès ✅');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    try {
      await handleMessage(sock, m);
    } catch (err) {
      console.error('[WhatsApp] Erreur dans le traitement du message:', err);
      // On logue l'erreur mais on NE PLANTE PAS le process — un bug dans
      // une commande ne doit jamais faire tomber toute la connexion.
    }
  });

  sock.ev.on('group-participants.update', async (event) => {
    try {
      await handleGroupParticipantsUpdate(sock, event);
    } catch (err) {
      console.error('[WhatsApp] Erreur welcome:', err);
    }
  });

  return sock;
}

/**
 * Demande un code de jumelage à 6 chiffres pour le numéro donné.
 * Ne fonctionne que si le compte n'est pas déjà jumelé.
 */
export async function requestPairingCode(phoneNumber) {
  if (!sock) throw new Error("Le socket WhatsApp n'est pas encore initialisé.");
  const cleaned = phoneNumber.replace(/\D/g, '');
  const code = await sock.requestPairingCode(cleaned);
  pairingRequestedFor = cleaned;
  if (onPairingCode) onPairingCode(cleaned, code);
  return code;
}

export function getSocket() {
  return sock;
}
