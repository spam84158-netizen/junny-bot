/**
 * Trouve le JID de la personne visée par une commande de modération :
 * soit via une mention (@numéro), soit en répondant à un de ses messages.
 */
export function getTargetJid(ctx) {
  const contextInfo = ctx.msg.message?.extendedTextMessage?.contextInfo;
  const mentioned = contextInfo?.mentionedJid?.[0];
  const quoted = contextInfo?.participant;
  return mentioned || quoted || null;
}
