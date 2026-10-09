# SoluMove Solar sur Vercel

La version 0.3 remplace la page d’attente par la connexion et l’ERP. Le code métier existant utilise Turso/libSQL via un adaptateur de requêtes préparées et de transactions. Les triggers SQL restent actifs. Les pièces jointes passent par Vercel Blob privé, avec vérification des permissions avant chaque lecture.

## Paramètres Production

| Variable | Valeur |
|---|---|
| `TURSO_DATABASE_URL` | URL libsql de la base connectée |
| `TURSO_AUTH_TOKEN` | Token géré par l’intégration Turso |
| `BETTER_AUTH_SECRET` | Secret aléatoire privé, au moins 32 caractères |
| `BETTER_AUTH_URL` | URL HTTPS canonique du site |
| `SOLAR_OWNER_EMAIL` | Adresse e-mail du propriétaire |
| `BLOB_READ_WRITE_TOKEN` | Token du store Blob **privé** connecté au projet |
| `SOLAREDGE_API_KEY` | Facultatif, clé pour le monitoring SolarEdge |

Configurer les variables avant le déploiement. Elles restent côté serveur ; ne jamais utiliser un préfixe `NEXT_PUBLIC_` pour ces secrets. Un environnement Preview exige sa propre configuration d’authentification ; ne pas partager la base Production avec des previews non fiables.

## Première activation

1. Ouvrir `/sign-in` après le déploiement.
2. Renseigner l’adresse `SOLAR_OWNER_EMAIL`, la clé d’activation (valeur de `BETTER_AUTH_SECRET` configurée dans Vercel) et choisir un mot de passe de 12 à 128 caractères. Ne partager aucune de ces valeurs dans le chat ni dans GitHub.
3. Cliquer sur **Activer mon compte**. Le mot de passe est haché par Better Auth. L’activation se ferme dès que ce compte existe.

La clé d’activation est vérifiée côté serveur en temps constant et n’est jamais renvoyée au navigateur. Les tentatives sont limitées dans la base commune aux instances. La clé ne sert pas de mot de passe de connexion.

Les tables et triggers sont initialisés depuis les migrations SQL originales et la migration d’authentification embarquée. Une transaction verrouillée applique les migrations et leur registre ensemble, une seule fois. Une base contenant déjà un schéma sans ce registre est refusée ; aucun nettoyage ni remplacement automatique de données existantes n’est effectué. Cette version n’importe pas les données d’une ancienne base Cloudflare.

## Salariés

Créer un rôle, les agences, puis une fiche dans **Comptes salariés** avec une adresse correcte et un statut actif. Ouvrir la fiche et cliquer sur **Créer un lien d’activation**. Transmettre ce lien privé au salarié : il choisit son mot de passe, puis se connecte. Le lien expire après 7 jours et n’est utilisable qu’une fois. Il n’est pas envoyé automatiquement par e-mail.

Les comptes invités n’obtiennent pas de rôle administrateur ni d’espace personnel. Leurs droits et agences sont vérifiés sur chaque appel API ; suspendre la fiche supprime immédiatement l’accès métier même si une session existe encore. La création de comptes par `/api/auth/sign-up/*` est fermée au public.

## Stockage et limites

Créer un store Blob **Private**, dans la région de la base, et le connecter au projet avec un token lecture/écriture. Les documents ne sont servis qu’après connexion et contrôle de rôle/agence, avec `Cache-Control: private, no-store`.

Le téléversement via fonction Vercel est limité à **3 Mo par fichier**. Les sauvegardes intégrées incluent les pièces jointes, avec une limite de **3,4 Mo de JSON** et **2 Mo de pièces jointes brutes**. La restauration est limitée à **3,4 Mo** et exige un espace vide. Ces limites évitent de dépasser les limites de payload des fonctions. Au-delà, exporter les pièces jointes séparément ou prévoir un flux de transfert direct avec reprise.

## Build et vérification

`vercel.json` choisit Next.js et `.next`. `pnpm build:vercel` lance `next build --webpack`. Les clients Turso et Better Auth sont initialisés à la demande, pas pendant le build. Node est fixé à la version majeure 22.

```sh
pnpm install --frozen-lockfile
pnpm build:vercel
pnpm test:vercel
```

Le test Vercel lance le serveur Next de production et une base libSQL locale temporaire : migrations, activation, sessions signées, refus d’identités falsifiées, transactions paiements/stock, comptabilité, invitations, rôles et révocation. Il n’utilise aucun identifiant Production. Le stockage Blob réel et la connexion du propriétaire doivent être vérifiés sur le déploiement avec les ressources configurées. Les tests métier PVGIS/SolarEdge simulés ne prouvent pas une connexion à une installation réelle.
