# Démarrage — version 0.2

## Société et salariés

1. Connecter le propriétaire à l'application via ChatGPT et renseigner la société dans Paramètres.
2. Créer les agences, dépôts et parcs, puis les employés, clients, fournisseurs et articles.
3. Créer un rôle avec des permissions par module : lecture ou lecture/écriture.
4. Créer le compte salarié avec l'adresse exacte de connexion ChatGPT, son rôle et les agences autorisées. Le rôle n'accorde jamais l'administration des comptes ou des rôles.
5. Sur l'hébergement, autoriser ce salarié à ouvrir le Site selon la politique de partage de la société. L'enregistrement ERP ne constitue pas une invitation au Site.
6. Le salarié ayant un seul espace partagé et aucun espace propre est dirigé automatiquement vers cet espace. Pour des appartenances multiples, l'API accepte `x-solar-workspace` ; le sélecteur d'espaces n'est pas fourni dans cette version. Ne créer qu'une appartenance par salarié tant que ce parcours n'est pas ajouté.

Les clients, fournisseurs et produits sont des référentiels partagés entre agences. Les employés et documents opérationnels sont filtrés par agence. Un salarié doit avoir les permissions sur tous les modules nécessaires à son opération : une réception requiert par exemple commandes, réceptions, mouvements, articles et dépôts. Les autorisations sont contrôlées côté serveur et lors de l'accès aux pièces jointes.

## Achats et stock

1. Saisir les articles, quantités, coûts et TVA sur la commande, puis la passer à Commandée. Le montant est recalculé côté serveur.
2. Créer une réception brouillon liée à cette commande et à un dépôt. Saisir uniquement les quantités réellement reçues et les séries physiques, puis Valider la réception.
3. La commande devient Partielle ou Reçue. Une réception excessive ou une deuxième validation est refusée.
4. Un BL validé sort le matériel du dépôt. Libérer les réservations correspondantes avant la sortie.
5. Pour un transfert différé, créer Stock en transit, Expédier puis Confirmer la réception à destination. Entre ces actions, les articles sont hors des deux dépôts. Le réceptionnaire autorisé dans l’agence de destination peut confirmer la réception sans accès au dépôt de départ.
6. Pour un inventaire, saisir tous les articles ayant un solde non nul dans le dépôt, y compris ceux comptés à zéro. Pour les articles suivis en série, lister les séries présentes. La validation génère les écarts et refuse une photographie de stock modifiée pendant l'opération.

## Commercial, paiements et impayés

Créer un devis, le faire accepter puis générer une facture. Contrôler TVA, remise et timbre avant Émise. Un échéancier peut ensuite être créé ; l'acompte correspond à un encaissement réel.

Dans Paiements, « Un règlement pour plusieurs factures » répartit un paiement effectivement encaissé sur les factures sélectionnées, puis sur leurs échéances les plus anciennes. Un chèque seulement remis reste un paiement en attente dans le formulaire normal. Un paiement peut aussi comporter des lignes d'affectation explicites à plusieurs échéances. La somme affectée ne dépasse pas le total reçu ni les dettes.

Depuis une facture, Rééchelonner le solde exige un motif, une première date et un nombre de mensualités. Les anciennes échéances conservent les montants déjà payés et l'historique ; les nouvelles portent exactement le reste. L'annulation d'un règlement rétablit les montants correspondants, même après rééchelonnement. Si le règlement était comptabilisé, sa contrepassation doit pouvoir être inscrite dans une période ouverte.

Le module Recouvrement contient les dossiers, relances documentées, promesses, litiges, frais et prochaine action. Son tableau inclut aussi les factures émises sans échéancier. Il n'envoie pas automatiquement de messages externes.

## Comptabilité

Depuis Plan de comptes, Initialiser les comptes et journaux crée une base à adapter. Contrôler les codes et les Liaisons comptables avec le comptable de la société. Les comptes proposés ne constituent pas un plan légal complet certifié.

Une écriture brouillon comporte au moins deux lignes. La validation exige des comptes actifs et une égalité exacte débit/crédit en millimes. Les documents émis/validés ont une action Comptabiliser : facture/avoir, règlement client/fournisseur/salaire, réception fournisseur et bulletin automatique validé. Les autres opérations et ajustements utilisent les écritures manuelles. Une réception est utilisée ici comme pièce d'achat ; rapprocher la facture fournisseur et la TVA avant validation comptable.

Une source est comptabilisée une seule fois. Corriger une écriture validée par Extourner, puis une nouvelle écriture. Créer les périodes ; leur clôture est refusée en présence de brouillons et bloque toute écriture datée dans la période. Grand livre et balance se filtrent par date/agence et s'exportent en JSON.

## Paie et congés

Dans Paramètres de paie, Préparer les modèles crée un profil tunisien RSNA **brouillon**. Compléter dates, sources, cotisations, CSS, accident du travail, TFP/FOPROLOS, horaires, majorations et convention applicable. Valider seulement après contrôle. Un profil validé est figé ; les dates des profils validés ne se chevauchent pas.

Dans Paie, choisir le salarié actif, le mois et les primes/indemnités/avances/autres retenues. Les présences approuvées apportent les heures supplémentaires ; les commissions approuvées du mois sont ajoutées. Le calcul conserve le profil et ses taux. Contrôler le bulletin, puis Valider. Les commissions intégrées deviennent payées. Il existe un seul bulletin actif par salarié/mois ; archiver un bulletin calculé non validé pour le recalculer.

Le régime fourni annualise le mois courant sur douze mois ; toutes les indemnités saisies sont sociales et imposables dans ce moteur de base. Les particularités de convention, remboursements exonérés, régularisation fiscale annuelle de revenus variables et déclarations officielles nécessitent une adaptation validée. Les droits aux congés appliquent les paramètres datés et le report initial. Les jours ouvrables demandés sont saisis par l'utilisateur ; la proratisation d'absence non payée utilise les dates calendaires. Fractionner les demandes à cheval sur deux années.

## Contrats et impression bancaire

Préparer les modèles contractuels fournit huit familles en trois langues, en brouillon. Compléter les clauses définitives propres à la société, attribuer une version puis Approuver. Un modèle approuvé est figé ; créer une nouvelle version pour le modifier. Générer un contrat depuis le dossier, puis un avenant depuis le contrat initial. Variables : `{{reference}}`, `{{client}}`, `{{amount}}`, `{{date}}`, `{{project}}`, `{{employee}}`.

Joindre le document effectivement signé au contrat. Enregistrer la signature en choisissant cette pièce et le nom du signataire. Son empreinte SHA-256 et la date sont conservées ; le contrat signé devient non modifiable. Il s'agit d'un enregistrement de preuve documentaire, pas d'une signature électronique certifiée.

Créer un profil de Calibration bancaire par banque et instrument. Renseigner format papier, positions et largeur des champs en mm, taille de police et décalages. Lier le profil à l'effet de même banque/instrument. Dans Imprimer, ouvrir le mode bancaire et Test calibration. Tester sur papier blanc à 100 %, sans marges ni en-tête du navigateur, puis sur la formule originale autorisée. Après ajustement, marquer le profil Calibré. La formule reste celle délivrée par la banque.

## Solaire, alertes et sauvegarde

Renseigner coordonnées, puissance, inclinaison, azimut PVGIS, pertes et hypothèses dans l'étude ; Calculer avec PVGIS interroge le service JRC côté serveur. Les estimations annuelles/mensuelles et hypothèses sont conservées. Batterie/autonomie restent un dimensionnement indicatif.

Les relevés monitoring sont saisis, importés en CSV/JSON ou récupérés via SolarEdge. Pour SolarEdge : secret serveur `SOLAREDGE_API_KEY` et identifiant numérique du site dans Projet. Actualiser depuis Monitoring. Aucune clé n'est saisie dans le navigateur. Production faible ou communication perdue permet de créer un ticket SAV une seule fois par relevé.

Les alertes internes (impayés, échéances, stock faible, monitoring) sont recalculées à la consultation. Les imports dans Paramètres exigent une validation préalable et un module compatible. CSV : colonnes techniques ou libellés, montants en TND ; JSON : montants en millimes. Liens : identifiant ou nom exact unique.

Télécharger la sauvegarde conserve les fiches actives/archivées, pièces et historique. Restauration sur un espace réellement vide uniquement : les identifiants et références sont remappés, stocks et allocations reconstruits. Limites du format interactif : 5 000 fiches, 500 pièces, 12 MiB de pièces dans une sauvegarde, 20 MiB de requête, 20 000 événements. Pour des volumes supérieurs, prévoir une sauvegarde D1/R2 administrée.

La rentabilité rapproche CA HT, mouvements de matériel au coût enregistré, temps affecté, dépenses, véhicule et SAV. Saisir un coût une seule fois dans sa catégorie pour éviter un double comptage. Les montants encaissés sont TTC et affichés séparément.
