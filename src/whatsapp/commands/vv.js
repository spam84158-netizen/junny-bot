import baileysPkg from '@whiskeysockets/baileys';
const { downloadContentFromMessage } = baileysPkg;

function extractViewOnceContent(quotedMsg) {
  if (!quotedMsg) return null;
  const vo = quotedMsg.viewOnceMessage?.message || quotedMsg.viewOnceMessageV2?.message || quotedMsg.viewOnceMessageV2Extension?.message;
  const source = vo || quotedMsg;
  if (source.imageMessage) return { type: 'image', content: source.imageMessage };
  if (source.videoMessage) return { type: 'video', content: source.videoMessage };
  return null;
}

export default {
  name: 'vv',
  description: 'Répondez à un message "vue unique" avec .vv pour le révéler à nouveau',
  run: async (ctx) => {
    const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const found = extractViewOnceContent(quoted);
    if (!found) {
      await ctx.reply("Répondez à un message photo/vidéo en \"vue unique\" avec .vv pour le révéler.");
      return;
    }
    const stream = await downloadContentFromMessage(found.content, found.type);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    if (found.type === 'image') {
      await ctx.sock.sendMessage(ctx.from, { image: buffer, caption: '👁️ Révélé' });
    } else {
      await ctx.sock.sendMessage(ctx.from, { video: buffer, caption: '👁️ Révélé' });
    }
  },
};
