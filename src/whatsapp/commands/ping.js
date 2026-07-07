export default {
  name: 'ping',
  description: 'Vérifie que le bot répond',
  run: async (ctx) => {
    const start = Date.now();
    await ctx.reply('🏓 Pong...');
    const ms = Date.now() - start;
    await ctx.reply(`Latence: ${ms}ms`);
  },
};
