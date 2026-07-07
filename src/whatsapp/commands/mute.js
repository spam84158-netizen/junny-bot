export default {
  name: 'mute',
  description: 'Verrouille le groupe (seuls les admins peuvent écrire) — relancez .mute pour déverrouiller',
  adminOnly: true,
  groupOnly: true,
  run: async (ctx) => {
    if (!ctx.isBotAdmin) {
      await ctx.reply('⚠️ Je dois être admin du groupe pour changer ce réglage.');
      return;
    }
    const currentlyLocked = ctx.groupMeta.announce; // true = déjà verrouillé
    await ctx.sock.groupSettingUpdate(ctx.from, currentlyLocked ? 'not_announcement' : 'announcement');
    await ctx.reply(currentlyLocked ? '🔓 Groupe déverrouillé, tout le monde peut écrire.' : '🔒 Groupe verrouillé, seuls les admins peuvent écrire.');
  },
};
