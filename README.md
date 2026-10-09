# SoluMove Solar — version 0.3.0

ERP photovoltaïque tunisien avec gestion commerciale, stock, RH et comptabilité générale. Français, arabe avec RTL et anglais. Cette version étend le code source fourni par le client ; elle n'est pas déployée sur son ancien Site.

## Build Vercel

Le fichier `vercel.json` choisit Next.js et `pnpm run build:vercel`, qui génère les manifestes attendus dans `.next`. Le build Worker/Vinext reste disponible avec `pnpm build` hors Vercel. `pnpm build` sur Vercel sélectionne également Next.js.

Sur Vercel, le backend utilise Turso/libSQL, Vercel Blob privé et Better Auth. La connexion affiche un formulaire d’activation protégé pour le propriétaire, puis un formulaire de connexion. Les identités envoyées dans des en-têtes publics sont ignorées. Configuration et activation : [docs/VERCEL_SETUP.md](docs/VERCEL_SETUP.md).

## Installation

Node.js 22 et pnpm 11.25.0. Pour Vercel : `pnpm build:vercel`, `pnpm start:vercel` et `pnpm test:vercel`. Pour le développement Next.js : `pnpm dev:vercel`. Pour la version Worker : Installer les dépendances avec `pnpm install --frozen-lockfile`, puis `pnpm build`. Les données utilisent Cloudflare D1 et les pièces jointes R2. Le développement est lancé avec `pnpm dev` ; la PWA reste installable dans Chrome/Edge.

L'authentification attend la passerelle Sites/ChatGPT. Les en-têtes `oai-authenticated-user-*` doivent provenir de cette passerelle de confiance, jamais d'un accès Worker public acceptant des en-têtes arbitraires. Les tests les injectent exclusivement dans un Worker temporaire local.

Appliquer dans l'ordre les migrations SQL de `drizzle/`. Les migrations 0000–0003 fournies sont conservées ; 0004 ajoute les opérations métier, les répartitions de règlements et leurs contrôles. Sur une installation existante, vérifier l'historique déjà appliqué et n'appliquer que les migrations manquantes. Ne pas régénérer ni rejouer les anciennes migrations.

Le fichier `.openai/hosting.json` conserve l'identifiant du Site d'origine. Il n'a pas été remplacé par un nouveau projet. Le Site correspondant n'était pas accessible dans le compte de cette session.

## Vérification

```bash
pnpm check
pnpm build
pnpm test:worker
```

Les tests Worker créent une base D1 et un stockage R2 temporaires, appliquent les migrations réelles et interrogent le code compilé. Les réponses PVGIS/SolarEdge utilisées dans les tests sont simulées ; elles ne prouvent pas une connexion à une installation réelle.

## Fonctions ajoutées

- Comptes salariés sur invitation dans Vercel (identité ChatGPT sur Sites), rôles lecture/écriture et agences autorisées.
- Commandes à lignes, réceptions partielles, BL, inventaires avec contrôle de concurrence et stock en transit.
- Règlements multi-factures/multi-échéances, rééchelonnement, suivi des impayés et rejet d'effets.
- Plan de comptes configurable, journaux, écritures équilibrées, grand livre, balance, liaisons avec ventes/achats/paie/règlements, extournes et clôtures.
- Profils d'impression bancaire en millimètres, tests de calibration et impression sur formule originale.
- Paie automatique sur profil daté approuvé, commissions, prorata, heures supplémentaires et droits aux congés.
- Modèles contractuels versionnés, génération de contrats/avenants et enregistrement du document signé avec empreinte SHA-256.
- Estimation PVGIS, dimensionnement batterie indicatif, relevés monitoring et connecteur SolarEdge.
- Alertes internes, import CSV/JSON contrôlé, sauvegarde/restauration avec pièces et historique, rentabilité par chantier.

## Guides

- `docs/DEMARRAGE.md` : parcours de configuration et utilisation.
- `docs/LIVRAISON_0.2.md` : résultats des tests et points restant à configurer.
- `docs/RECHERCHE_ET_PERIMETRE.md` : sources et limites exactes.
- `docs/CAHIER_DES_CHARGES.md` : exigences et cas de recette.
- `desktop/README.md` : installation PWA.

Les règles propres à la société, les contrats approuvés, la calibration physique par banque et les identifiants d'intégration restent nécessaires. La génération native Windows, les écritures hors ligne, les dépôts administratifs et les signatures électroniques certifiées ne sont pas inclus.
