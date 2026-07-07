import { config } from '../config.js';
import { loadCommands } from './commandLoader.js';
import { store } from './store.js';

let commandsCache = null;

// Suivi anti-spam en mémoire : { "groupJid:senderJid": [timestamps] }
const messageTimestamps = new Map();
const SPAM_WINDOW_MS = 8000;
const SPAM_THRESHOLD = 6;

async function checkAntispam(sock, from, senderJid, msgKey) {
  if (!store.getAntispam(from)) return false;
  const key = `${from}:${senderJid}`;
  const now = Date.now();
  const timestamps = (messageTimestamps.get(key) || []).filter(t => now - t < SPAM_WINDOW_MS);
  timestamps.push(now);
  messageTimestamps.set(key, timestamps);

  if (timestamps.length > SPAM_THRESHOLD) {
    messageTimestamps.set(key, []); // reset après action
    try { await sock.sendMessage(from, { delete: msgKey }); } catch { /* pas grave si suppression échoue */ }
    await sock.sendMessage(from, { text: `🚫 Spam détecté, message supprimé.`, mentions: [senderJid] });
    return true;
  }
  return false;
}

function extractText(msg) {
  const m = msg.message;
  if (!m) return '';
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ''
  );
}

function isOwnerJid(jid, senderNumber) {
  return senderNumber === config.ownerNumber;
}

export async function handleMessage(sock, { messages, type }) {
  if (type !== 'notify') return;
  const msg = messages[0];
  if (!msg?.message || msg.key.fromMe) return;

  if (!commandsCache) commandsCache = await loadCommands();

  const from = msg.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const senderJid = isGroup ? msg.key.participant : from;
  const senderNumber = senderJid?.split('@')[0]?.split(':')[0];
  const text = extractText(msg).trim();

  if (isGroup) {
    const spammed = await checkAntispam(sock, from, senderJid, msg.key);
    if (spammed) return;
  }

  if (!text.startsWith(config.prefix)) return;

  const withoutPrefix = text.slice(config.prefix.length).trim();
  const [cmdName, ...args] = withoutPrefix.split(/\s+/);
  const command = commandsCache.get(cmdName.toLowerCase());
  if (!command) return;

  // --- contexte partagé, passé à chaque commande ---
  const ctx = {
    sock, msg, from, isGroup, senderJid, senderNumber, args, text,
    isOwner: isOwnerJid(from, senderNumber),
    reply: (content) => sock.sendMessage(from, typeof content === 'string' ? { text: content } : content, { quoted: msg }),
  };

  if (isGroup) {
    const meta = await sock.groupMetadata(from);
    ctx.groupMeta = meta;
    const participant = meta.participants.find(p => p.id === senderJid);
    ctx.isSenderAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
    const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const botParticipant = meta.participants.find(p => p.id.startsWith(sock.user.id.split(':')[0]));
    ctx.isBotAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';
  }

  if (command.adminOnly && !ctx.isOwner && !ctx.isSenderAdmin) {
    await ctx.reply('⛔ Cette commande est réservée aux admins du groupe (ou au créateur du bot).');
    return;
  }
  if (command.groupOnly && !isGroup) {
    await ctx.reply('⚠️ Cette commande ne fonctionne que dans un groupe.');
    return;
  }

  try {
    await command.run(ctx);
  } catch (err) {
    console.error(`[command:${cmdName}] Erreur:`, err);
    await ctx.reply("❌ Une erreur est survenue en exécutant cette commande. Elle n'a pas fait planter le bot, vous pouvez continuer normalement.");
  }
}
