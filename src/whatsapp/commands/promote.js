import { getTargetJid } from '../helpers.js';

export default {
  name: 'promote',
  description: 'Donne les droits admin à un membre',
  adminOnly: true,
  groupOnly: true,
  run: async (ctx) => {
    if (!ctx.isBotAdmin) {
      await ctx.reply('⚠️ Je dois être admin du groupe pour promouvoir quelqu\'un.');
      return;
    }
    const target = getTargetJid(ctx);
    if (!target) {
      await ctx.reply('Mentionnez la personne (@membre) ou répondez à un de ses messages avec .promote');
      return;
    }
    await ctx.sock.groupParticipantsUpdate(ctx.from, [target], 'promote');
    await ctx.reply('⬆️ Membre promu admin.');
  },
};
