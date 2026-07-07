import { readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = path.join(__dirname, 'commands');

/**
 * Charge tous les fichiers de src/whatsapp/commands/*.js
 * Chaque fichier doit "export default { name, description, adminOnly, run }"
 * Ajouter une commande = ajouter un fichier ici, rien d'autre à toucher.
 */
export async function loadCommands() {
  const files = readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.js'));
  const commands = new Map();
  for (const file of files) {
    const mod = await import(pathToFileURL(path.join(COMMANDS_DIR, file)).href);
    const cmd = mod.default;
    if (!cmd?.name || typeof cmd.run !== 'function') {
      console.warn(`[commands] Fichier ignoré (format invalide): ${file}`);
      continue;
    }
    commands.set(cmd.name, cmd);
  }
  console.log(`[commands] ${commands.size} commande(s) chargée(s): ${[...commands.keys()].join(', ')}`);
  return commands;
}
