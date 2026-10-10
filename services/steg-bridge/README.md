# Passerelle navigateur STEG — intégration à configurer

Service séparé de Next.js, à exécuter sur un hôte qui conserve un processus Chromium. Le service n'est pas une API officielle STEG et n'a pas été validé contre une session STEG réelle. Le portail public n'a pas permis de vérifier ses sélecteurs pendant cette livraison. Ne renseigner aucun sélecteur supposé.

Le client autorise la consultation et résout personnellement son CAPTCHA dans une vue interactive intégrée à SoluMove. Aucun mécanisme de résolution automatique du CAPTCHA n'est inclus. L'affichage reproduit la session navigateur autorisée, pas une iframe du portail STEG. Les cookies vivent uniquement en mémoire, huit minutes au maximum. La vérification ne réussit que si la référence du compte correspond exactement et que le solde **total** du compte est identifié ; une dernière facture payée ne suffit pas.

## Installation sur l'hôte de la passerelle

```bash
cd services/steg-bridge
npm install
npx playwright install --with-deps chromium
npm test
npm start
```

Exposer le port local 4330 derrière un reverse proxy HTTPS. Limiter cet accès au logiciel et à ses sessions client. Ne pas utiliser une fonction Next.js serverless pour conserver les sessions Chromium.

## Variables à définir

| Variable | Valeur attendue |
|---|---|
| `STEG_GATEWAY_TOKEN` | Secret aléatoire d'au moins 32 caractères, partagé avec le serveur SoluMove |
| `BRIDGE_PUBLIC_URL` | Origine HTTPS de cette passerelle, par exemple `https://steg.votre-domaine.tn` |
| `APP_ORIGIN` | Origine exacte du logiciel autorisée à intégrer la vue CAPTCHA |
| `PORT` | Port local, 4330 par défaut |
| `STEG_LOGIN_URL` | Page HTTPS officielle ; valeur initiale `https://espace.steg.com.tn/fr/espace/login.php` |
| `STEG_LOGIN_ACTION` | URL **observée** de soumission du formulaire officiel, seule requête POST STEG autorisée |
| `STEG_USERNAME_SELECTOR` | Sélecteur unique du champ identifiant, vérifié sur le portail |
| `STEG_PASSWORD_SELECTOR` | Sélecteur unique du champ mot de passe, vérifié sur le portail |
| `STEG_SUBMIT_SELECTOR` | Sélecteur du bouton de connexion, vérifié sur le portail |
| `STEG_REFERENCE_SELECTOR` | Élément visible unique contenant la référence du compte consulté |
| `STEG_BALANCE_SELECTOR` | Élément visible unique contenant le solde total en TND |
| `STEG_COMPLETE_SELECTOR` | Élément prouvant que le solde couvre tout le compte |
| `STEG_COMPLETE_PATTERN` | Expression régulière correspondant au libellé complet effectivement observé |
| `CAPTCHA_HOSTS` | Hôtes CAPTCHA effectivement nécessaires, séparés par des virgules |

Sur le serveur SoluMove : `STEG_GATEWAY_URL=https://steg.votre-domaine.tn/account-status`, `STEG_GATEWAY_HOST=steg.votre-domaine.tn`, le même `STEG_GATEWAY_TOKEN`, et `STEG_CONNECTOR_SECRET` aléatoire d'au moins 32 caractères. Sans ce dernier, le coffre utilise `BETTER_AUTH_SECRET`. Conserver la clé du coffre ; sa modification nécessite la ressaisie des identifiants STEG. Ne jamais utiliser de variable `NEXT_PUBLIC_` pour ces secrets.

Le coffre chiffre les identifiants par AES-GCM, avec un contexte propre au propriétaire et au connecteur. Les sauvegardes métiers excluent les secrets et les sessions ; après une restauration sur une nouvelle base, réenregistrer les connexions STEG. Les échanges HTTPS contiennent les identifiants nécessaires à la connexion : ne pas journaliser leurs corps. Les URL de vue de session donnent accès à des données client jusqu'à expiration ; ne pas les transmettre à des tiers.

## Recette réelle nécessaire

Vérifier les sélecteurs avec des comptes de test autorisés : compte soldé, compte impayé, plusieurs factures, identifiant erroné, CAPTCHA, expiration et changement de référence. Contrôler qu'aucun bouton de paiement, modification ou suppression n'est utilisable. Si le portail exige une requête POST de consultation distincte, adapter explicitement la politique après observation de cette seule requête ; le service actuel la refuse.

Le test `policy-check.mjs` vérifie les contrôles de consultation. `scripts/vercel-check.mjs` utilise une passerelle simulée et des métadonnées documentaires fictives ; ces tests ne constituent pas une preuve de connexion réelle ni d'approbation administrative.
