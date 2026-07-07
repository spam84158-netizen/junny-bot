/**
 * Stockage simple des réglages par groupe (welcome on/off, antispam on/off).
 * Un fichier JSON suffit pour ce volume de données — pas besoin d'une
 * vraie base de données pour 10 commandes. À remplacer par une DB si le
 * bot grossit beaucoup (voir note dans le README).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'settings.json');

function load() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(FILE)) return { groups: {} };
  try {
    return JSON.parse(readFileSync(FILE, 'utf-8'));
  } catch {
    return { groups: {} };
  }
}

let db = load();

function save() {
  writeFileSync(FILE, JSON.stringify(db, null, 2));
}

function groupEntry(jid) {
  if (!db.groups[jid]) db.groups[jid] = { welcome: false, antispam: false };
  return db.groups[jid];
}

export const store = {
  getWelcome: (jid) => groupEntry(jid).welcome,
  setWelcome: (jid, val) => { groupEntry(jid).welcome = val; save(); },
  getAntispam: (jid) => groupEntry(jid).antispam,
  setAntispam: (jid, val) => { groupEntry(jid).antispam = val; save(); },
};
