# Historique tunisien de démonstration

Toutes les identités et opérations sont fictives. Les villes sont tunisiennes ; les montants sont des hypothèses commerciales plausibles en TND, pas les données réelles de SoluMove ni des prix de marché certifiés. Les téléphones sont masqués, les e-mails utilisent `.example`, les identifiants fiscaux et RIB sont inutilisables en exploitation. Aucun compte connecté, invitation, message externe, chèque payable, pièce signée ou déclaration acceptée n’est créé.

Le générateur déterministe couvre du **1er janvier 2025 au 9 octobre 2026** : 2025 complet, neuf mois complets de 2026 et octobre partiel. Les dates futures représentent uniquement des échéances, contrats/configurations ou prévisions. Les paies d’octobre sont des brouillons proratisés au 9 octobre et ne donnent lieu à aucun paiement.

## Chargement dans l’application

Connectez-vous comme propriétaire, puis ouvrez **Paramètres → Simulation Tunisie · 2025–2026 → Charger les données tunisiennes**. Le bouton est aussi visible sur l’accueil d’un espace vide.

Le chargement est réservé à l’administrateur et à un espace vide ou contenant uniquement des exemples. Une transaction insère l’historique, ses écritures et ses états dérivés ; une erreur annule tout. Un second clic retourne le chargement existant. Aucun enregistrement ni paramètre de société existant n’est remplacé. Les fiches portent toutes `demo=1`, un identifiant de jeu commun et les badges d’exemple habituels. Les comptes salariés simulés restent **inactifs**.

Cette préparation du code ne remplit pas automatiquement une base distante. Le clic dans l’application charge les données dans votre espace ; aucun accès au tableau de bord Vercel n’est nécessaire.

## Contenu

| Domaine | Données |
|---|---|
| Organisation | 3 agences et 3 dépôts : Tunis/Ariana, Sousse, Sfax ; 3 parcs, 8 salariés, 4 rôles et 4 comptes inactifs |
| Commercial et solaire | 48 clients et sites, 147 projets, visites, études, devis et bons de commande ; dossiers techniques, contrats et avenant |
| Facturation et crédit | 147 factures de vente, 8 avoirs, 294 échéances ; acomptes, soldes, paiements partiels, encours, relances et chèques non encaissés ; virement réparti sur deux factures |
| Approvisionnement | 67 commandes fournisseur et 133 réceptions ; fractionnement des réceptions et une commande encore partiellement reçue |
| Stock | 12 articles, séries individuelles pour panneaux/onduleurs/batteries/outils, 147 BL clients, 63 inventaires, 63 bons de sortie et 64 transferts dont un en transit ; une réservation active |
| RH | 168 paies mensuelles validées de simulation et 8 estimations d’octobre ; pointages sélectionnés, congés, commissions et avance |
| Finance et fiscalité | Plan comptable de simulation, journaux équilibrés, règlements fiscaux/sociaux illustratifs, 21 situations TVA en brouillon, retenues fictives et prévisions de trésorerie ; dossier El Fatoora en brouillon |
| Parc | 4 véhicules, missions et carburant, remises/retours de clés, un détenteur actuel, vidanges et plans d’entretien |
| Pilotage et communication | Rapports BI calculés depuis les opérations, monitoring énergétique simulé, 22 PV en brouillon, notifications personnelles et conversation fictive |

Le total est de **7 754 fiches**, plus un marqueur technique de chargement. Les détails et quantités de stock, allocations de paiement, séries et événements sont dérivés par les véritables contraintes et déclencheurs de la base.

L’application lit les fiches par pages de 200, chargées au plus quatre à la fois. Elle assemble tout l’historique avant de l’afficher ou de le mettre en cache. Si des fiches changent entre deux pages, elle recommence la lecture ; une erreur ne remplace pas l’historique précédent par un résultat partiel. Les lectures concurrentes du même écran sont regroupées. Les anciens clients de l’API peuvent utiliser `GET /api/workspace?page=0`, puis suivre `pagination.hasMore` et `pagination.version` ; seule la première page contient les états auxiliaires complets filtrés selon les permissions.

## Hypothèses et limites

- Le catalogue illustre des panneaux de 550 W, onduleurs hybrides, batteries, câbles, structures et protections. Coûts et tarifs sont estimés ; la TVA de 19 % est une hypothèse uniforme de simulation. Aucune exonération, subvention, homologation ou condition PROSOL réelle n’est affirmée.
- Les études utilisent un productible supposé de 1 700–1 800 kWh/kWc/an et un tarif illustratif de 0,350 TND/kWh. Les données de monitoring sont manuelles et fictives : aucune mesure ou réponse PVGIS/SolarEdge n’est prétendue.
- La paie utilise le moteur de l’application. Les bases CNSS 9,18 % salarié / 16,57 % employeur sont documentées sur le site CNSS ; le scénario ajoute séparément 0,5 % pour chaque partie et utilise le barème IRPP 2025. Les taux AT, CSS, TFP, FOPROLOS, droits à congé, majorations et traitement des indemnités sont des paramètres de démonstration à vérifier pour le régime réel concerné. La politique interne « validée » désigne une simulation calculable, pas une validation réglementaire.
- Les certificats RS ont une structure contrôlable par XSD, mais leur bénéficiaire et matricule sont fictifs. Le code bloque leur marquage comme dépôt réel, ainsi que les preuves de soumission/acceptation El Fatoora sur une fiche de démonstration. Il ne soumet rien à TEJ ou TTN.
- Les chèques et gabarits bancaires sont fictifs et non calibrés. Les contrats et PV ne contiennent aucune signature réelle.
- Les rapports annuels filtrent les flux selon les dates. Encours et stock restent des positions courantes au moment de consultation, conformément au fonctionnement du module BI.
- Ce jeu volumineux dépasse les limites de la sauvegarde/restauration JSON actuelle (3,4 Mo et 5 000 fiches). Le générateur et son marqueur permettent de le recréer dans un espace de simulation vide ; utilisez les exports CSV par module pour l’analyse. Ne le chargez pas dans un espace destiné à une exploitation comptable réelle.

Références consultées pour le contexte de paie : [CNSS — salariés non agricoles](https://www.cnss.tn/fr/web/employeur/emp_asset_services/-/asset_publisher/sYQ8/content/emp_secteur-non_agr2_assiette) ; [Ministère des Finances — loi de finances 2025](https://www.finances.gov.tn/fr/document/loi-des-finances-pour-lannee-2025ar). Ces références ne certifient pas les paramètres ni les identités de ce jeu.

## Vérification locale

`pnpm test:tunisia` contrôle la reproduction du jeu, tous les liens et lignes imbriqués, la conservation facture/avoir/échéances, les écritures équilibrées, le plafond temporel, un export TEJ/XSD, les migrations et contraintes SQL, les stocks et séries, les paiements répartis et le rollback. Le test API démarre un serveur Next de production avec une base temporaire : chargement concurrent/idempotent, préservation des paramètres, refus d’un espace avec données opérationnelles, accès administrateur, prévention des doubles écritures et protection des documents fictifs.
