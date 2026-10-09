# SoluMove Solar 0.4 — BI, opérations et collaboration

Cette extension vise le déploiement Vercel/Next.js existant. Aucune donnée réelle n’est créée par les tests ; les bases de recette sont temporaires. La migration 0006 est appliquée automatiquement par le registre Vercel, après les migrations existantes.

## Périmètre de la demande

| Demande | Mise en œuvre | Utilisation / limites |
|---|---|---|
| BI, tous les détails | CA HT net des avoirs, TVA, retenues, créances et impayés, balance âgée, stock valorisé, paie, marges par chantier, agences, scénarios de trésorerie, rapports détaillés de chaque module | Filtres période/agence/dépôt ; exports CSV et JSON ; seulement les données accessibles au rôle. La valorisation est au coût catalogue, sans moteur FIFO/CUMP. |
| Transfert de fiche client | Document daté, agence départ/destination, motif, historique, transfert atomique du client et éventuellement des dossiers opérationnels ouverts | Les factures, paiements et pièces historiques gardent leur agence d’émission. Les pièces jointes du client restent liées à son identifiant et suivent ses droits. Droits nécessaires sur le client, les agences et les dossiers déplacés. |
| BC client / BL | Commandes à lignes, conversion en BL ou facture, sorties de stock | Refus de sur-livraison ; contrôle de révision concurrente. Une commande ayant des livraisons devient immuable. |
| BC et BL inter-dépôts | BC approuvé, transfert lié, expédition puis réception | Plafond cumulé des expéditions ; départ/destination contrôlés ; stocks et séries atomiques. La réception du BL est complète ; les expéditions peuvent être réparties en plusieurs BL. |
| Bon de sortie | Dépôt, destinataire, chantier, motif, articles et séries, impression A4 | Validation atomique, refus du stock insuffisant et des doubles validations. |
| Avoir | Facture d’origine, lignes et TVA, plafond cumulé des avoirs, imputation | Diminue les échéances encore non payées sans toucher aux sommes déjà encaissées. Un remboursement ou une facture sans échéancier exige une régularisation distincte ; aucune sortie bancaire automatique. |
| Retenue à la source TEJ | Certificats émis/reçus, opérations officielles, calcul en millimes, IR/IS et TVA retenue, ajout/modification/annulation, XML validé XSD | TND uniquement ; taux et code à vérifier par la comptabilité. Corrections liées à l’original ; BI prend la correction effective et neutralise une annulation. Une seule modification et annulation par référence, sens et propriétaire. Export initial = ajouts ; rectificatif = corrections/annulations. Dépôt et acceptation TEJ externes ; le dépôt peut être enregistré avec accusé joint et référence. |
| Clés de voitures | Véhicule, détenteur, compteur, état/accessoires, mission, retour attendu, remise et restitution horodatées | Un seul détenteur actif protégé en base. Rafraîchissement toutes les 5 secondes lorsque le navigateur est visible et connecté. Pas de GPS ni de présence instantanée garantie. |
| Maintenance | Plans vidange, courroie, chaîne, freins, pneus, batterie, contrôle/assurance et autre ; périodicités constructeur ; interventions et coût | Validation d’une intervention met à jour le compteur et les prochaines dates/km. Les préconisations sont saisies selon le véhicule, pas inventées. |
| Inventaire | Comptage complet par dépôt, écarts et séries | Compare la situation courante et refuse une modification concurrente. Tout article encore présent doit être compté. |
| QR par pièce + lecteur sans fil | QR SOLU1/productId/serial, impression d’étiquettes, identifiants uniques, recherche de position, capture directe dans réception/inventaire/BL/sortie/transfert | Les QR créés ne créent pas de stock. Activer le suivi unitaire avant le premier stock. Chaque PC utilise son lecteur 2D USB/Bluetooth en mode clavier HID, suffixe Entrée ; appairage matériel manuel. La capture ajoute une unité et refuse les doublons. |
| Facturation électronique | Dossier El Fatoora lié à facture/avoir, XML TEIF technique, chaîne de preuves : préparation, signature, dépôt, acceptation/rejet | Le XML est un brouillon explicitement marqué. Pas de signature certifiée, connecteur TTN ni homologation dans cette version. Voir la section qualification ci-dessous. |
| PV / محضر جلسة | Date/lieu, président/secrétaire, participants/procurations, ordre du jour, débats, quorum, résolutions/votes/responsables/échéances | Impression et PDF via Chrome ; finalisation horodatée immuable ; joindre le PV signé. Une finalisation interne n’est pas une signature électronique. |
| Clair / sombre | Bascule persistante, préférence système initiale, écrans responsifs | Les impressions conservent un fond blanc. |
| Multi-accès | Lecture et autorisations séparées ajouter/modifier/archiver pour chaque module ; tous / agences assignées / dépôts assignés / union des deux | Les anciens rôles lecture/écriture restent compatibles. Les documents validés restent immuables même si le rôle permet la modification. Un catalogue commun (articles/fournisseurs/comptes/modèles) reste global lorsqu’il est autorisé. Un module sans dimension dépôt est affecté par l’agence ou le périmètre tous. |
| TVA | Vue de rapprochement collectée/achats/avoirs/retenues ; ajustements justifiés ; crédit antérieur ; clôture avec sources et révisions | La TVA achats provient des réceptions valorisées au BC. Ajouter les exclusions/non-déductibles et régularisations. Validation réservée à l’administrateur ; snapshot exportable et imprimable. Le dépôt de la déclaration reste externe ; son accusé peut être joint puis enregistré avec sa référence et sa date. |
| Cash-flow prévisionnel | Échéances non encaissées, prévisions entrées/sorties, probabilité, scénario prudent/central/optimiste, solde initial | Une prévision portant l’identifiant d’une échéance la remplace. Saisir les achats, salaires, taxes et entretiens à payer ; les BC seuls ne sont pas assimilés à des dettes exigibles. |
| Notifications employés | Boîte personnelle, non-lus, accusé de lecture, notifications de chat, annonces internes ciblées par l’admin | Aucun email/SMS/push externe ; notification visible seulement au destinataire, y compris pour l’admin. |
| Chat avec pièces jointes | Conversations de 2 à 50 membres salariés, messages, reprise idempotente, notifications, pièces jointes privées de 3 Mo | Polling toutes les 5 s ; pas WebSocket. Seuls les membres lisent les messages et pièces. L’auteur avec droit d’ajout peut joindre un fichier à son message. Configurer Vercel Blob privé et BLOB_READ_WRITE_TOKEN. |

## Configuration pratique

1. Sur Vercel, conserver `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` et `SOLAR_OWNER_EMAIL` côté serveur ; aucun secret dans GitHub ou dans NEXT_PUBLIC.
2. Relier un store Vercel Blob **privé** et son `BLOB_READ_WRITE_TOKEN` pour les pièces jointes. L’application refuse un téléchargement non autorisé ; les objets passent par la route authentifiée.
3. Activer le propriétaire puis créer les agences, dépôts, employés et véhicules. Créer rôles et comptes salariés par invitation.
4. Dans Paramètres société, renseigner nom/adresse et matricule fiscal ; pour TEJ, renseigner l’identifiant court (7 chiffres + lettre) et la catégorie PM/PP. Pour TEIF, le matricule complet peut rester dans le champ principal.
5. Pour le rôle, choisir la lecture puis les actions permises. Assigner agences et/ou dépôts au compte. Tester avec le compte salarié et un dossier hors périmètre avant la mise en service.
6. Choisir suivi unitaire sur les articles concernés avant leur premier mouvement. Générer les étiquettes ; enregistrer leurs identifiants dans une réception/inventaire puis valider. Scanner le QR pour retrouver la pièce ou remplir un document de stock.
7. Le tableau de bord fiscal est un rapprochement. Valider les règles/taux, les exclusions et crédits avec la comptabilité ; garder les justificatifs et accusés des dépôts.

## Référence TEJ et traitement exact

Source ministère : https://jibaya.tn/blog/plateforme-de-transfert-et-echange-des-donnees-fiscales-tej/

Cahier septembre 2026 : https://jibaya.tn/wp-content/uploads/2026/09/cahier%20des%20chargesRS_TEJ_09_26.pdf

Archive XSD : https://jibaya.tn/wp-content/uploads/2026/09/plateforme-TEJ-shemas-xsd.zip

Les trois XSD originaux sont conservés dans `lib/solar/fiscal`. Le schéma racine demande `DeclarationsRS VersionSchema="1.0"`, montants entiers en millimes et `TotalMontantTTC`. L’export respecte le XSD effectif, y compris quand un exemple PDF diverge. Les codes sont extraits du fichier officiel opérations.

**Défaut de syntaxe constaté dans la source téléchargée** : `TEJISOPaysDevises.xsd` contient deux `</xs:enumeration>` successifs entre les devises IDR et INR. Le fichier original reste inchangé. `validateTej` retire uniquement cette balise fermante dupliquée dans sa copie en mémoire. Aucune règle, code, pays ou devise n’est supprimé. Le résultat et l’en-tête de téléchargement signalent cette réparation. Les tests couvrent un XML complet, une annulation et le refus d’un total TTC absent. Cette validation locale n’est pas une acceptation TEJ ; faire confirmer la réparation et l’export par le destinataire avant le dépôt réel.

L’export ne garantit pas toutes les restrictions métier de la plateforme (régime, convention, taux légal, restrictions particulières supplémentaires). Les restrictions de contenu de la page 64 (accents latins, caractères/sequences listés, liens, script et contrôles) sont refusées dans les champs textuels exportés, sans réécrire automatiquement les données du contribuable. Les chaînes sont échappées XML et les DTD/entités refusées. Les paiements sont suivis au brut pour les allocations ; le BI déduit les retenues effectives pour le cash bancaire net. La comptabilisation de retenue doit être rapprochée par les journaux.

## Qualification El Fatoora

La page officielle `https://www.tradenet.com.tn/elfatoora.html` renvoyait 502/connexion refusée lors de la vérification dans cette session. Le fichier archivé 1.8.9 provient de https://github.com/BTBLABS/awesome-teif/blob/main/schemas/elfatoora-1.8.9.xsd ; il est conservé comme référence, sans être présenté comme le schéma actuellement en vigueur.

Ce XSD utilise des constructions XSD 1.1 (`xs:alternative`, `xs:assert`). Le validateur libxml2 utilisé pour TEJ n’est pas un validateur complet XSD 1.1. Les assertions ne sont pas supprimées pour donner une fausse validation. Les remises globales sont refusées dans le brouillon TEIF tant que leur codification n’est pas qualifiée.

Pour une émission opérationnelle : obtenir les XSD/codes TTN en vigueur et l’environnement de qualification ; qualifier les XML et calculs auprès du prestataire ; intégrer le certificat et la signature certifiée ; configurer un dépôt TTN sécurisé et ses accusés ; effectuer la recette puis la mise en service. Le dossier actuel permet d’archiver les preuves de ces étapes réalisées à l’extérieur. Enregistrer un justificatif n’en vérifie pas automatiquement l’authenticité cryptographique.

## Vérifications

`pnpm check` : types, logique financière antérieure, permissions, millimes, QR, retenues effectives, TEJ XSD et rejets, BI/avoirs/stock/prévisions.

`pnpm build:vercel` : compilation Next.js avec la route enterprise et traçage du Worker/WASM xmllint.

`pnpm test:vercel` : serveur de production Next.js, base libSQL temporaire et migrations réelles ; authentification/invitations/CSRF ; concurrence de clés ; entretien ; rollback stock ; plafonds BC/BL/transit ; transfert dossier ; export TEJ initial et rectificatif ; retenues/corrections/annulations ; clôture TVA ; plafonds et imputation d’avoir ; chat/idempotence/confidentialité ; permissions ajout/modification/archivage.

Les échanges TTN réels, lecteur physique, impression réelle, envoi Blob en production et déploiement de cette extension restent des recettes d’environnement. Le build historique Cloudflare n’est pas la cible de la validation enterprise Node/WASM.
