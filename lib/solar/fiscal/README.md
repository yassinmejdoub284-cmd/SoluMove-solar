# Schémas fiscaux conservés

TEJ : archive officielle septembre 2026 téléchargée sur Jibaya. Fichiers originaux conservés sans réécriture. `tej-schemas.json` embarque les mêmes contenus pour le déploiement serverless. `tej-operations.json` contient les valeurs d’énumération officielles utilisées dans le formulaire.

Le fichier ISO source comporte une balise fermante dupliquée avant INR. Seule cette erreur XML est réparée en mémoire lors de la validation ; voir `docs/ENTERPRISE_0.4.md` et `lib/solar/fiscal.ts`. Les exports restent soumis à acceptation de TEJ.

TEIF : archive 1.8.9 obtenue sur BTBLABS/awesome-teif, référence technique secondaire. XSD 1.1 conservé intégralement. Aucune qualification TTN ni conformité actuelle revendiquée ; le générateur livre un brouillon technique explicitement signalé.

Aucun identifiant de contribuable réel, certificat de signature ou secret n’est inclus dans ces fichiers.
