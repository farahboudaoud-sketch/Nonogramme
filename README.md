# Nonogramme 絵

Nonogramme (aussi appelé picross ou hanjie) pour Android dans l'esthétique de la série : fond bleu nuit, encre blanc cassé, accents bordeaux.

## Installer l'application sur le téléphone

1. Sur ton téléphone, ouvre la page **Releases** de ce dépôt (colonne de droite sur GitHub, ou `…/nonogramme/releases`).
2. Dans la dernière version, touche le fichier `nonogramme-1.0.X.apk` pour le télécharger.
3. Ouvre le fichier téléchargé. Android demande d'autoriser l'installation depuis cette source : accepte, puis touche **Installer**.
4. Si Google Play Protect affiche un avertissement (« application inconnue »), choisis **Installer quand même**. C'est normal pour une appli qui ne vient pas du Play Store.

Les mises à jour s'installent par-dessus l'ancienne version sans perdre la partie en cours ni les records.

## Le jeu

- **Règles** : les nombres de chaque ligne et colonne donnent les longueurs des blocs de cases noires, dans l'ordre, séparés par au moins une case vide. Noircir les bonnes cases révèle l'image.
- **5 niveaux** : Facile 5×5, Moyen 10×10, Difficile 15×15, Expert 15×20, Maître 20×25. Chaque grille est générée au hasard (motifs symétriques ou organiques) et vérifiée à solution unique ; Facile et Moyen se résolvent ligne par ligne, Maître demande des raisonnements par l'absurde.
- **Niveau personnalisé** : de 5 à 30 cases de large et de haut.
- **Outils** noircir / croix, remplissage en glissant le doigt le long d'une ligne ou d'une colonne, indices d'une ligne terminée estompés.
- **Indices progressifs** expliqués, tirés uniquement de ce qui est visible sur la grille (avec, en dernier recours, un raisonnement par l'absurde qui montre où il aboutit), vérifier, annuler, effacer, chrono, records, mode clair / sombre, zoom au pincement, sauvegarde automatique. Fonctionne hors connexion.

## Structure

- `src/` : sources de l'appli. `core.js` (noyau commun à la série : accueil, niveaux, zoom, indices, records, thème), `template.html`, les fichiers du jeu, `app.json` (nom, kanji). `python3 src/build.py` assemble `www/index.html` (APK, polices incluses) et `preview.html` (version web).
- `assets/` : icône et écran de démarrage (sources des images générées dans `android/`).
- `android/` : projet Android généré par Capacitor, signé avec une clé fixe pour que les mises à jour s'installent par-dessus.
- `.github/workflows/build-apk.yml` : compile l'APK et le publie dans les Releases à chaque modification sur `main` (ou à la demande depuis l'onglet **Actions**).

## Modifier l'appli

Modifier les fichiers de `src/`, lancer `python3 src/build.py`, puis tester dans un navigateur : servir le dossier `www/` (par exemple `python3 -m http.server` dans `www/`) et ouvrir la page en mode mobile.
