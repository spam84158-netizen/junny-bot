import { getTargetJid } from '../helpers.js';

export default {
  name: 'kick',
  description: 'Exclut un membre du groupe',
  adminOnly: true,
  groupOnly: true,
  run: async (ctx) => {
    if (!ctx.isBotAdmin) {
      await ctx.reply("⚠️ Je dois être admin du groupe pour pouvoir exclure quelqu'un.");
      return;
    }
    const target = getTargetJid(ctx);
    if (!target) {
      await ctx.reply('Mentionnez la personne (@membre) ou répondez à un de ses messages avec .kick');
      return;
    }
    await ctx.sock.groupParticipantsUpdate(ctx.from, [target], 'remove');
    await ctx.reply('✅ Membre exclu.');
  },
};
