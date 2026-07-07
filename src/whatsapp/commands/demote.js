import { getTargetJid } from '../helpers.js';

export default {
  name: 'demote',
  description: "Retire les droits admin d'un membre",
  adminOnly: true,
  groupOnly: true,
  run: async (ctx) => {
    if (!ctx.isBotAdmin) {
      await ctx.reply('⚠️ Je dois être admin du groupe pour rétrograder quelqu\'un.');
      return;
    }
    const target = getTargetJid(ctx);
    if (!target) {
      await ctx.reply('Mentionnez la personne (@membre) ou répondez à un de ses messages avec .demote');
      return;
    }
    await ctx.sock.groupParticipantsUpdate(ctx.from, [target], 'demote');
    await ctx.reply('⬇️ Droits admin retirés.');
  },
};
