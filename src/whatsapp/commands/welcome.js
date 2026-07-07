import { store } from '../store.js';

export default {
  name: 'welcome',
  description: 'Active/désactive le message de bienvenue (.welcome on / .welcome off)',
  adminOnly: true,
  groupOnly: true,
  run: async (ctx) => {
    const arg = ctx.args[0]?.toLowerCase();
    if (arg !== 'on' && arg !== 'off') {
      await ctx.reply('Utilisation : .welcome on  ou  .welcome off');
      return;
    }
    store.setWelcome(ctx.from, arg === 'on');
    await ctx.reply(`✅ Message de bienvenue ${arg === 'on' ? 'activé' : 'désactivé'}.`);
  },
};
