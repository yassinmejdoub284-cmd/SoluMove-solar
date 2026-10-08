# Livraison SoluMove Solar 0.2.0

Code dérivé de l'archive SoluMove-Solar-Source.zip, enrichi selon la nouvelle demande du 8 octobre 2026. L'original est conservé. L'application possède 50 modules FR/AR/EN et une interface RTL en arabe.

## Livré dans le code

| Demande | Réalisation |
|---|---|
| Comptabilité générale | Comptes et journaux, lignes débit/crédit en millimes, contrôle d'équilibre et comptes actifs, grand livre/balance, comptabilisation des factures/avoirs/réceptions/paie/règlements, extournes et périodes fermées. |
| Salariés, rôles, agences | Comptes liés à l'e-mail ChatGPT ; permissions par module ; filtres serveur sur les fiches et pièces. |
| Achats, BL, stock | Articles de commande, réceptions partielles sans dépassement, mouvements uniques, BL, inventaires avec garde de quantité, expédition/réception en transit entre agences. |
| Paiements et impayés | Répartition multi-factures et multi-échéances, idempotence, plafonds, rééchelonnement exact, conservation des dettes après annulation, rejet d'effets et dossiers de recouvrement. |
| Impression bancaire | Profils propres à la banque/instrument, positions et offsets mm, format papier, test quadrillé, validation du profil avant impression réelle. |
| Paie, congés, commissions | Profil réglementaire daté et approuvé, barème progressif, cotisations paramétrées, prorata/absence/overtime, primes et retenues, commissions approuvées puis payées, droits acquis et contrôles de congés. |
| Contrats et signatures | 24 bases éditables, approbation/version figée, variables, génération depuis dossier, lien d'avenant, pièce signée, horodatage et empreinte SHA-256. |
| Études et monitoring | Appel serveur PVGIS 5.3 et hypothèses conservées, batterie indicative, relevés manuels/importés et SolarEdge, alertes et ticket SAV idempotent. |
| Exploitation | Alertes internes, import CSV/JSON avec aperçu et transaction, sauvegarde fiches/pièces/historique, empreintes de pièces, restauration vide avec remappage, rapport de rentabilité. |

La documentation complète de configuration et les limites sont dans DEMARRAGE.md et RECHERCHE_ET_PERIMETRE.md. Les bases contractuelles et le profil de paie initial sont livrés en brouillon pour recevoir les règles de la société ; ils ne sont pas présentés comme approuvés juridiquement ou comptablement.

## Validation technique

- TypeScript : compilation des types sans erreur.
- Build Worker/Vinext : réussi pour l'accueil, les trois APIs et les pages d'impression.
- `scripts/domain-check.ts` : arrondis, échéanciers, fin de mois, plafonds bancaires, paie et couverture des trois langues.
- `scripts/business-domain-check.ts` : IRPP progressif de référence, embauche mi-mois, absence, overtime, commissions, cohérence brut/net/coût, droits aux congés, marge, batterie, CSV multiligne/quotes et limites papier.
- `scripts/api-check.mjs` : régression du Worker avec authentification, isolation, allocations, annulation, transferts atomiques/idempotents, réservations, séries, conversion devis, véhicules et révisions.
- `scripts/business-check.mjs` : migrations réelles, réception 3+7 sur commande 10, refus de 8 supplémentaires, BL/inventaire/transit, réception par un salarié d'agence destination, écritures/reversal/clôture, paiement 151 TND sur deux factures, rééchelonnement et retour à 202 TND de dette après annulation, paie/commission/congé, permissions et pièces interdites, contrat signé/hash, profils bancaires, import, monitoring et ticket, rejet de traite, concurrence comptabilisation/annulation et sauvegarde/restauration avec allocations encore actives.
- Intégrations : réponses PVGIS/SolarEdge simulées, contrôle des unités et conservation des hypothèses. Aucune clé réelle du client n'a été utilisée.
- Reprise : restauration dans un second espace, stocks, journaux, pièce signée, empreinte, compte devenu inactif, événements et allocations retrouvés ; refus d'un espace non vide et d'une pièce altérée.
- Les quatre migrations SQL originales 0000–0003 sont conservées octet pour octet ; ajout de 0004 uniquement, avec journal et snapshot Drizzle.

Les lignes « solar request failure » dans les tests correspondent aux refus volontairement provoqués (dépassement, droit manquant, conflit, période fermée, fichier altéré). Le résultat final attendu de chaque suite est PASS.

Aucune recette visuelle de navigateur, calibration sur imprimante physique, paie comparée aux bulletins réels ou connexion à une installation réelle n'est attestée. Ces contrôles de recette restent nécessaires avant exploitation. Le Site hébergé d'origine était introuvable dans le compte de cette session ; aucun déploiement n'a été réalisé.

## Contenu de l'archive

Sources React/TypeScript et Worker, composants UI, migrations et métadonnées, fichiers publics/PWA, lockfile de dépendances, scripts de compilation/tests et guides. Les dépendances installées, résultats de build, bases locales et secrets ne sont pas inclus.

Pour obtenir les commandes d'installation et de test, ouvrir README.md à la racine. Pour l'hébergement, conserver l'authentification via la passerelle de confiance et contrôler le Site cible avant toute migration ou publication.
