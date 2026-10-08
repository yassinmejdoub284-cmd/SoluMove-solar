# SoluMove Solar — cahier des charges métier

Version de travail du 8 octobre 2026. Société tunisienne de vente, installation et maintenance photovoltaïque. FR / AR avec RTL / EN. La comptabilité générale est ajoutée : plan de comptes, journaux, écritures équilibrées, grand livre, balance, extournes et clôtures ; les états fiscaux réglementaires restent à spécifier. Le suivi commercial, des règlements, des coûts et de la trésorerie opérationnelle reste nécessaire.

Ce document définit le périmètre cible. Il ne signifie pas que toutes les fonctions ci-dessous sont livrées. Pour l'état exact de la première version et ses limites, lire RECHERCHE_ET_PERIMETRE.md.

## 1. Organisation et droits

- Société, raison sociale, identifiants fiscaux, contacts, logo, coordonnées bancaires, cachet et modèles documentaires.
- Agences de vente, dépôts, emplacements, parcs de véhicules ; un véhicule et un dépôt peuvent relever d'agences différentes selon l'organisation réelle.
- Numérotation par type, exercice et agence ; prévention des doublons, identifiants immuables et distinction brouillon/document émis.
- Utilisateurs, rôles direction/commercial/magasinier/technicien/RH/caissier/responsable parc, permissions par agence et module, délégation/remplacement.
- Informations salariales et bancaires accessibles uniquement aux personnes habilitées ; trace des lectures sensibles, validations et modifications.
- Équipe pouvant travailler sur plusieurs agences ; vue consolidée et filtres agence/dépôt/parc/projet/période.
- Circuit de validation selon montants : remise, crédit, achat, sortie de stock, dépense, paie, mission et annulation.
- Sauvegardes avec pièces jointes, restauration testée, export, conservation, verrouillage et journal d'audit.

## 2. Relation client et commercial

- Prospect, origine, commercial affecté, relance, rendez-vous, opportunité, motif de perte, doublons téléphone/email/identifiant fiscal.
- Particulier/professionnel/industrie/collectivité/revendeur ; plusieurs contacts et adresses, personne physique et morale.
- Acheteur, payeur, propriétaire du toit et abonné STEG distincts ; preuve d'autorisation du propriétaire.
- Fiches sites multiples par client : GPS/adresse, consommation, factures historiques, abonnement, puissance souscrite et état toiture.
- Catalogue matériel et services, marques, unités, références fournisseur, fiches techniques, compatibilités, garanties et prix par agence/client.
- Kits avec nomenclature versionnée ; substituts autorisés, options batterie, secours, monitoring et prestations.
- Devis révisés et variantes : matériel seul, installation complète, extension, maintenance, pompage, résidentiel et industriel.
- Tarifs, remises ligne/globale, transport, main-d'œuvre, timbre et taxes configurées avec période ; marges et autorisations de remise.
- Validité du devis, conditions, acomptes, financement, dates indicatives, signature/acceptation, avenants.
- Commande client, livraison partielle, bon de livraison, preuve de réception, facture finale/avoir et remboursement liés aux documents d'origine.

## 3. Étude et chantier solaire

- Visite technique avec photos, mesures, orientation, inclinaison, ombrage, structure/toiture, accessibilité et risques.
- Hypothèses de production traçables : localisation, source météo, pertes, autoconsommation et tarif avec date de validité.
- Dimensionnement électrique : modules, strings, MPPT, onduleur, protections, câbles, terre, batteries ; validation par technicien qualifié.
- Différencier simulation commerciale, étude approuvée et configuration effectivement installée.
- Projet avec responsable, étapes, dates, budget, tâches, dépendances, intervenants, sous-traitants et matériel réservé.
- Planification équipe/véhicule/outillage ; préparation chantier, sorties et retours matériel, livraison et photos avant/après.
- Travaux additionnels, retard client/fournisseur/météo, arrêt sécurité, incident, réserve et changement de configuration.
- Essais, mise en service, réception avec réserves, levée des réserves, dossier de fin de chantier et garanties.
- Dossiers STEG/ANME par régime : liste documentaire versionnée, pièces manquantes, dépôt, refus, complément, accord et échéances.
- Subvention/financement : demande, statut, montant attendu/accordé/reçu, bénéficiaire et justificatifs ; aucune promesse automatique d'éligibilité.

## 4. Encaissements et facilités de paiement

- Vente au comptant, acompte, échéances mensuelles ou calendrier libre, financement externe et paiement mixte.
- Distinguer montant facturé, échéance, moyen de paiement reçu et argent réellement confirmé ; une traite reçue n'est pas un encaissement confirmé.
- Calendrier avec total exact en millimes, dernier jour du mois, arrondis contrôlés, date de premier paiement et échéances de valeur différente.
- Paiement partiel, un paiement couvrant plusieurs échéances/factures, tiers payeur, surplus crédit client et remboursement.
- Replanification autorisée avec motif et historique ; report, échéance remplacée, annulation de vente après acompte et avoir.
- Impayés, ancienneté des créances, relances, promesse de paiement, litige et blocage commercial configurable.
- Espèces, virement, carte, chèque, traite, financement ; reçus et preuve d'encaissement.
- Chèques : banque, compte, numéro, bénéficiaire, montant/chiffres/lettres, dates, plafond, validité, référence de vérification si disponible.
- Traites : tiré, tireur, bénéficiaire, domiciliation, échéance, acceptation et aval si applicable.
- Portefeuille effets : reçu, en portefeuille, remis banque, confirmé, rejeté, retourné, remplacé ; frais et motif de rejet.
- Impression sur formule bancaire originale selon profil calibré ; décalage X/Y, police, taille, test papier, orientation et contrôle de non-réimpression.
- Caisses par agence, comptes bancaires, ouverture/fermeture caisse, remise espèces et transfert entre caisses avec validation ; suivi opérationnel sans écritures comptables générales.
- Règlements fournisseur, salaires, avances, notes de frais et prêts employés ; rattachement aux obligations correspondantes.

## 5. Achats, stock et dépôts

- Demande d'achat, comparaison offres, commande fournisseur, devise/import/frais annexes, acompte et dates prévues.
- Réception totale/partielle, surplus, manque, qualité, bon réception, facture fournisseur et retour.
- Dépôts et emplacements, stock réel/réservé/disponible/en transit/en quarantaine, seuils et réapprovisionnement.
- Lots/séries, dates garantie, documents constructeur, localisation et historique installé/retourné/réparé.
- Entrée, sortie, retour chantier/client, transfert, perte/casse/vol, correction d'inventaire avec motif et validation.
- Transfert demandé → préparé → expédié → reçu, livraison partielle et écart ; distinguer destination physique et agence commerciale.
- Réservations par projet et échéance, expiration/libération, allocation des composants kit et substitution.
- Kit stocké assemblé ou kit virtuel prélevé en composants : règle explicite empêchant un double comptage.
- Inventaire tournant/complet, gel ou photographie de référence, comptage indépendant, écart et approbation.
- Code-barres/QR, unités et conditionnements, traçabilité FIFO/pondérée selon règle de valorisation opérationnelle retenue.
- Protection concurrente : deux agences ne peuvent consommer la même dernière pièce ; stock négatif désactivé par défaut.

## 6. Personnel, paie et contrats

- Identité, coordonnées, CNSS, banque, agence, poste, responsable, type contrat, entrée/sortie et documents.
- Présence, pointage, absence, retard, horaires, heures supplémentaires, travail chantier et validation.
- Congés : types, droits, acquisition, report, solde, chevauchement, approbation et justificatifs.
- Salaire contractuel, primes, indemnités, commission commerciale, retenues, avance/prêt et calendrier de remboursement.
- Paie par période : entrée/sortie en cours de mois, prorata, absences, overtime, brut, bases de cotisation, charges et net.
- Règles tunisiennes versionnées par date, conventions applicables, CNSS/IRPP/CSS et justificatifs officiels après validation professionnelle.
- Bulletin multilingue imprimable, validation, verrouillage, correction traçable, virement et certificat salarial.
- Contrat salarié/client/fournisseur/sous-traitant/maintenance, clauses versionnées, avenant, renouvellement, échéance, signatures et pièces.
- Sortie salarié : solde, documents, restitution véhicule/outillage, transfert des responsabilités et révocation d'accès.

## 7. Parcs, véhicules et logistique

- Plusieurs parcs ; véhicules propres/loués, plaque, châssis, catégorie, charge utile, agence, parc et conducteur habituel.
- Affectation permanente ou mission, réservation créneau ou plusieurs jours, équipe, projet, trajet et marchandises.
- Interdire chevauchement véhicule et conducteur ; empêcher usage véhicule en panne/maintenance ou non habilité.
- Ordre de mission, état départ/retour, photos, kilométrage, carburant, péage, amende et justificatifs.
- Assurance, visite technique, vignette, permis/habilitation conducteur, échéance et alertes anticipées.
- Entretien par date/kilométrage, panne, immobilisation, réparation, pièces, garage et historique.
- Carburant par litre/prix/kilométrage, cartes, consommation anormale et coût par véhicule/projet/agence.
- Accidents, sinistre, franchise, indemnisation, véhicule de remplacement, location et restitution.
- Réaffectation entre parcs/agences, vente/réforme du véhicule, dossiers et fermeture des missions.

## 8. SAV et maintenance

- Ticket lié client/site/projet/série : panne, priorité, photos, diagnostic, garantie et délai contractuel.
- Intervention planifiée, technicien/véhicule/pièces, rapport, signature, facturation hors garantie.
- Retour/RMA fabricant, prêt matériel, substitution avec nouvelle série et dates garantie propres.
- Contrat maintenance, visites récurrentes, nettoyage, contrôle, pièces et renouvellement.
- Monitoring API multi-marques : autorisation, identifiants protégés, état communication, production, alertes, seuils et qualité des données.
- Incident réseau et absence télémétrie distingués d'une panne réelle ; aucune garantie de performance sur données manquantes.

## 9. Documents, rapports et usage

- FR/AR/EN par utilisateur et document ; RTL réel, monnaie TND à trois décimales et dates Tunis.
- Recherche, filtres persistants, listes simples, actions contextualisées, raccourcis, téléphone et écran desktop.
- Recherche client par téléphone, référence devis/facture, numéro de série et plaque ; prévention doublons.
- Impressions devis/facture/avoir/BL/reçu/contrat/bulletin/mission/inventaire/traite/chèque avec numérotation, pagination et pièces.
- Tableaux de bord consolidés et par agence : pipeline, ventes, impayés, trésorerie, stock, retards chantier, SAV, paie et véhicules.
- Rentabilité opérationnelle projet : vente moins matériel, main-d'œuvre, transport, sous-traitance, frais et reprises ; règles d'affectation explicites.
- Alertes internes puis email/SMS/WhatsApp uniquement avec connecteurs autorisés et politique d'envoi.
- Export CSV/XLSX/PDF, import avec prévisualisation/validation/doublons et annulation, sauvegarde/restauration contrôlée.
- Web et PWA desktop ; exécutable natif et écriture hors ligne nécessitent protocole de synchronisation, conflits et sécurité dédiés.

## 10. Critères de recette prioritaires

| Cas | Résultat attendu |
|---|---|
| Même dernière pièce demandée simultanément par deux agences | Une seule sortie confirmée, autre demande refusée sans modification partielle. |
| Transfert avec séries déjà ailleurs ou quantité insuffisante | Aucune sortie ni entrée partielle ; erreur actionnable. |
| Paiement partiel puis rejet/annulation | Solde exact et motif conservé ; historique intact. |
| Appui répété sur Enregistrer ou réessai après perte réseau | Une seule transaction ; un contenu différent avec même identifiant est refusé. |
| Échéancier sur 31 janvier ou année bissextile | Dates valides et somme en millimes égale au solde à répartir. |
| Document validé modifié | Circuit d'avenant/correction ; aucune modification silencieuse. |
| Conducteur ou véhicule affecté deux fois | Conflit détecté avant confirmation. |
| Inventaire pendant mouvements concurrents | Règle de gel/photographie explicite et écart justifiable. |
| Paie avec embauche mi-mois ou congé non payé | Calcul selon règle applicable et référence conservée. |
| Chèque remis mais non confirmé | Solde client non considéré encaissé définitivement. |
| Même utilisateur sans droit RH ou autre agence | Données sensibles et actions bloquées côté serveur. |
| Perte réseau pendant enregistrement | Pas de succès fictif ; réessai contrôlé et état visible. |
| Formulaire et impression en arabe | Lecture droite à gauche sans inversion des références et montants. |
| Restauration après incident | Transactions et pièces retrouvées, audit et droits cohérents. |

## 11. Recette de la version 0.2 et suites

1. Recette avec données anonymisées et validation des circuits de la société.
2. Configurer le partage, les rôles et les agences ; vérifier les refus côté serveur.
3. Réceptionner une commande en deux fois ; contrôler BL, inventaire et transit.
4. Répartir un règlement, rééchelonner puis annuler ; rapprocher dettes et comptabilité.
5. Adapter plan de comptes/mappings, extourner et clôturer ; vérifier grand livre et balance.
6. Valider les règles de paie avec des bulletins de référence de la société.
7. Finaliser et approuver les contrats ; calibrer les formules bancaires sur l'imprimante réelle.
8. Configurer PVGIS/SolarEdge, tester une installation et ses alertes.
9. Importer des données puis restaurer une sauvegarde dans un espace vide de recette.
10. Définir séparément les déclarations officielles, autres intégrations et éventuelle distribution native.

Le périmètre sera ajusté selon la taille de la société, ses banques, ses contrats et les régimes photovoltaïques qu'elle traite. Aucun document ne peut garantir tous les cas possibles ; la recette, les invariants et l'audit permettent de traiter les cas nouveaux sans perdre la cohérence des données.
