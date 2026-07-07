import baileysPkg from '@whiskeysockets/baileys';
const { downloadContentFromMessage } = baileysPkg;
import sharp from 'sharp';

export default {
  name: 'sticker',
  description: 'Répondez à une image avec .sticker pour la convertir en sticker',
  run: async (ctx) => {
    const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMsg = quoted?.imageMessage || ctx.msg.message?.imageMessage;
    if (!imageMsg) {
      await ctx.reply('Envoyez ou répondez à une image avec .sticker');
      return;
    }
    const stream = await downloadContentFromMessage(imageMsg, 'image');
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const webp = await sharp(buffer)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp()
      .toBuffer();

    await ctx.sock.sendMessage(ctx.from, { sticker: webp });
  },
};
