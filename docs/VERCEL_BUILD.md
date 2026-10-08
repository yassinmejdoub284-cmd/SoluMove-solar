# Correction du build Vercel

Le build du commit initial utilisait Vinext et produisait `dist/server` pour Cloudflare. L'adaptateur Next.js de Vercel cherchait `.next/routes-manifest.json`, absent de cette sortie.

## Modification

- `vercel.json` sélectionne le framework Next.js, `pnpm run build:vercel` et `.next`.
- Le script dédié lance `next build --webpack`. Le script `build` existant sélectionne aussi ce chemin lorsque `VERCEL=1`.
- Les directives `use client` de l'espace de travail et du document imprimable précèdent les imports.
- Le build Vercel remplace le module propre au Worker par une frontière qui refuse explicitement les bindings D1/R2 indisponibles.
- Les en-têtes d'identité Sites fournis par un visiteur ne permettent pas de se connecter sur Vercel. L'accueil indique les services restant à configurer.

## Limite de cette correction

Cette livraison corrige uniquement la compilation et les manifestes de déploiement. Elle ne migre ni la base D1, ni le bucket R2, ni l'authentification Sites. L'ERP n'est donc pas encore exploitable sur Vercel. Aucun compte, base ou stockage de remplacement n'a été créé. Le fonctionnement Worker existant est conservé hors Vercel.

## Vérification locale

- Build Next.js 16.3.4 terminé avec vérification TypeScript.
- Présence et lecture JSON de `routes-manifest`, `build-manifest`, `prerender-manifest`, `pages-manifest` et `app-paths-manifest`.
- Serveur de production Next : accueil HTTP 200 ; les trois APIs refusent les en-têtes d'identité falsifiés avec HTTP 401.
- Deux suites de calculs métier existantes : PASS.

L'environnement local restreint ne fournit pas la métrique RSS de Node. Un préchargement local, non publié, a neutralisé cette métrique pour exécuter le build ; aucune logique de compilation, de typage ou de données n'a été remplacée.

Après le push, Vercel doit construire le nouveau commit sur `main`. Le statut READY du déploiement distant reste à vérifier dans Vercel ; la validation locale ne constitue pas une confirmation du déploiement distant.
