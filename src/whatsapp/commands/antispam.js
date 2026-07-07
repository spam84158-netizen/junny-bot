import { store } from '../store.js';

export default {
  name: 'antispam',
  description: 'Active/désactive la détection anti-spam automatique (.antispam on / .antispam off)',
  adminOnly: true,
  groupOnly: true,
  run: async (ctx) => {
    const arg = ctx.args[0]?.toLowerCase();
    if (arg !== 'on' && arg !== 'off') {
      await ctx.reply('Utilisation : .antispam on  ou  .antispam off');
      return;
    }
    store.setAntispam(ctx.from, arg === 'on');
    await ctx.reply(`✅ Anti-spam ${arg === 'on' ? 'activé' : 'désactivé'}. (Seuil : 6 messages en 8 secondes)`);
  },
};
