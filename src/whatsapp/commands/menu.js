import { config } from '../../config.js';

export default {
  name: 'menu',
  description: 'Affiche la liste des commandes',
  run: async (ctx) => {
    const p = config.prefix;
    const menu = `
╭─❖ *${config.botName}* ❖─╮

*Général*
${p}ping — vérifie que le bot répond
${p}menu — ce message

*Modération (admin uniquement)*
${p}kick @membre — exclure un membre
${p}promote @membre — passer admin
${p}demote @membre — retirer admin
${p}mute — verrouiller le groupe (admins seuls)
${p}welcome on/off — message de bienvenue
${p}antispam on/off — anti-spam automatique

*Médias*
${p}sticker — répondre à une image/vidéo pour la convertir en sticker
${p}vv — répondre à un message "vue unique" pour le révéler

╰──────────────╯
`.trim();
    await ctx.reply(menu);
  },
};
