import { store } from './store.js';

export async function handleGroupParticipantsUpdate(sock, event) {
  const { id: groupJid, participants, action } = event;
  if (action !== 'add') return;
  if (!store.getWelcome(groupJid)) return;

  for (const participantJid of participants) {
    const name = '@' + participantJid.split('@')[0];
    await sock.sendMessage(groupJid, {
      text: `👋 Bienvenue ${name} dans le groupe !`,
      mentions: [participantJid],
    });
  }
}
