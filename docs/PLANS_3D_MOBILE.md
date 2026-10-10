# Plans 2D / 3D et écrans mobiles

## Accès et exemples

Technique & chantiers → Plans techniques & CAO (`/#module=technicalPlans`). Les fiches s’affichent en cartes avec aperçu, client, puissance, panneaux et statut. Recherche et filtre de statut restent accessibles sur téléphone.

Trois exemples prêts à explorer sont disponibles sans chargement : villa à Tunis (6 kWc, aluminium), atelier à Sousse (25 kWc, acier) et hangar à Sfax (15 kWc, aluminium). Toutes les identités, installations et valeurs sont fictives. « Ajouter les 3 exemples » est réservé à l’administrateur : il ajoute des clients, sites, chantiers, dossiers BT et plans liés à l’espace courant, même si celui-ci contient déjà des données. L’opération est idempotente et n’écrase rien ; elle ne crée ni facture, ni mouvement de stock, ni pièce d’approbation. Les dossiers restent incomplets et les plans des avant-projets.

## Maquette et exports

La même géométrie alimente les vues 2D et 3D : toiture rectangulaire, hauteur depuis le sol, panneaux inclinés, rails, pieds/ancrages indicatifs, obstacles et circuits DC/AC/terre. Pour un nouveau plan, renseigner la hauteur de toiture, la garde sous le bord bas des panneaux et la hauteur des obstacles. Le Z des trajets câble est l’altitude depuis le sol, en mètres, dans le même repère. Les anciens plans restent lisibles avec des hauteurs indicatives explicitement signalées.

- Glisser pour tourner ; pincer ou utiliser les boutons pour zoomer.
- Vue de dessus, élévation, perspective, remise à zéro et affichage agrandi.
- Calques toiture/panneaux/supports/obstacles/DC/AC/terre activables séparément.
- Toucher un élément pour voir son identification ; circuits avec section et longueur.
- Clavier : flèches pour orienter, `+`/`-` pour zoomer, `Home` pour réinitialiser.
- DXF 2D en millimètres pour AutoCAD, avec Z conservé sur les trajets câble.
- OBJ 3D en mètres, axe Z vertical. Conserver le fichier `solar-plan.mtl` à côté du fichier OBJ pour les couleurs ; les circuits sont des lignes 3D.

Les fichiers enregistrés exigent une session et les droits de lecture sur le plan. Les exemples de la galerie s’exportent localement. Les exports sont privés et ne sont pas mis en cache publiquement.

La structure géométrique est un avant-projet ; les sections des rails et des ancrages sont illustratives. Les calculs de vent/charges/assemblages, les ombrages horaires, les toitures non rectangulaires ou multiples et une maquette BIM ne sont pas inclus. L’accord STEG et la revue ingénieur gardent leur contrôle documentaire existant : un exemple ne vaut jamais une approbation.

## Téléphone et tablette

Les tableaux de fiches deviennent des cartes avec libellés sur les écrans étroits, paginées par 25 fiches. La bibliothèque des plans affiche 12 cartes par page. Les commandes ont des cibles tactiles agrandies et les champs évitent le zoom automatique iOS. Les formulaires utilisent le plein écran sur téléphone, avec leur pied d’actions fixe et un corps défilant. Le détail du plan est élargi sur tablette ; le menu, les filtres et les vues restent utilisables en français, arabe et anglais, avec mode clair/sombre.

## Vérification

`pnpm check` contrôle la géométrie réelle des panneaux inclinés, les Z des câbles, les indices OBJ, les références des exemples et le cadrage initial. `pnpm test:vercel` contrôle l’ajout concurrent/idempotent sur un espace existant, la conservation du stock et des fiches, les exports privés et les refus salarié/CSRF. Le rendu serveur FR/AR/EN et les aperçus SVG sont aussi contrôlés localement.

Contrôle navigateur optionnel avec Playwright et Chromium installés : `SOLAR_PLAN_UI_CHECK=1 pnpm test:vercel`. Il couvre les largeurs 320/390/768/1024, la sélection, le zoom, les vues 2D/3D, le mode agrandi et les débordements de page. Aucun test navigateur ne doit être déclaré réussi lorsque Chromium n’est pas disponible.
