# Junny — Bot WhatsApp de modération

10 commandes : ping, menu, kick, promote, demote, mute, welcome, antispam,
sticker, vv. Code en clair, aucune obfuscation, tout est lisible dans
`src/`.

## Déployer sur votre panel Pterodactyl

1. **Uploader les fichiers**
   Dans l'onglet **Files** de votre serveur Pterodactyl : uploadez ce zip
   entier, puis clic droit dessus → **Unarchive** (ou décompressez avant
   et uploadez le contenu du dossier directement à la racine).

2. **Vérifier le Startup Command**
   Onglet **Startup** de Pterodactyl → mettez :
   ```
   node src/index.js
   ```
   (si votre egg utilise une variable comme `STARTUP_CMD` ou lance
   `npm start` automatiquement, laissez tel quel — `npm start` fait
   exactement la même chose ici, c'est configuré dans `package.json`).

3. **Installer les dépendances**
   Onglet **Console** → tapez :
   ```
   npm install
   ```
   Attendez que ça se termine (peut prendre 1-2 minutes, `sharp` compile
   un binaire natif).

4. **Vérifier le fichier `.env`**
   Il est déjà rempli avec vos infos (nom du bot, préfixe, votre numéro,
   token Telegram). Si votre panel a un onglet "Variables"/"Startup
   Variables" séparé, ignorez-le — ce bot lit directement le fichier
   `.env` présent dans les fichiers, pas besoin de dupliquer ailleurs.

5. **Démarrer**
   Bouton **Start**. Dans la console vous devriez voir :
   ```
   === Junny — démarrage ===
   [commands] 10 commande(s) chargée(s): ping, menu, kick, promote, demote, mute, welcome, antispam, vv, sticker
   [Telegram] Pont de jumelage démarré.
   ```

6. **Récupérer le code de jumelage**
   Ouvrez Telegram, allez sur votre bot (celui créé avec @BotFather),
   envoyez-lui votre numéro WhatsApp (ex: `2250160775890`, sans le +).
   Il vous répond avec un code à 6 chiffres.

   Dans WhatsApp sur votre téléphone : **Paramètres → Appareils liés →
   Lier un appareil → Lier avec le numéro de téléphone** → entrez le
   code reçu.

   *Premier lancement uniquement* : si `TELEGRAM_ALLOWED_CHAT_ID` est
   vide dans `.env`, la console affichera votre chat ID Telegram dès
   votre premier message au bot — copiez-le dans `.env`
   (`TELEGRAM_ALLOWED_CHAT_ID=...`) et redémarrez, pour que seul vous
   puissiez déclencher un jumelage.

## Pourquoi ça ne devrait plus "se déconnecter après 2-3 secondes"
Le code réagit à `connection.update` et relance automatiquement la
connexion sur toute coupure temporaire (sauf déconnexion volontaire /
logout). Les erreurs dans une commande sont aussi capturées une par une
— un bug dans `.sticker` par exemple ne peut plus faire tomber tout le
bot.

## Tester progressivement (comme convenu)
Commencez par `.ping` et `.menu` dans un DM avec le bot pour confirmer
que la connexion tient. Ajoutez ensuite le bot à un petit groupe test
(pas un groupe important) pour essayer `.kick`, `.promote`, `.mute`,
`.welcome on`, `.antispam on`. Une fois que tout est stable, on ajoute
la suite.

## Notes pour la suite (si vous voulez grossir le bot)
- Le stockage des réglages (`data/settings.json`) est un simple fichier
  JSON — largement suffisant pour l'usage actuel, à migrer vers une
  vraie base si vous gérez un jour des centaines de groupes.
- `.sticker` ne gère que les images pour l'instant (pas les vidéos en
  sticker animé, ça demande ffmpeg — dites-moi si vous voulez que
  je l'ajoute).
- Ajouter une commande = ajouter un fichier dans
  `src/whatsapp/commands/`, rien d'autre à toucher.
