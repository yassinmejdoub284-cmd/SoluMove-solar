# Navigation et agenda

## Trouver un module et garder le contexte

Le menu regroupe les modules en sept activités : quotidien, clients et ventes, technique et chantiers, achats et dépôts, finance et pilotage, salariés et véhicules, administration. Il masque les modules non autorisés pour le compte connecté.

- « Rechercher un module » retrouve un écran en français, arabe ou anglais. La recherche globale retrouve aussi les modules et les fiches.
- « Tous les modules » présente les activités et leurs écrans.
- L’étoile conserve les modules favoris sur ce navigateur, par compte.
- Le fil d’Ariane, le bouton Retour et l’historique du navigateur permettent de revenir à l’écran ou à la fiche précédente.
- Les liens vers les fiches utilisent l’identifiant exact de l’enregistrement. Le fragment de l’URL conserve le module et la fiche lors d’un rechargement. Les droits sont vérifiés sur les données renvoyées par le serveur.
- Une fiche salarié ou chantier ouvre directement son planning filtré.

## Agenda général et agenda salarié

L’administrateur voit l’agenda général et peut filtrer par salarié, agence et chantier. Les vues Jour, Semaine, Mois, Équipe et Liste couvrent les rendez-vous, interventions, missions, congés, échéances SAV et échéances de dossiers accessibles. La liste des tâches reste disponible même si leur échéance tombe en dehors de la période affichée.

Les heures suivent **Africa/Tunis**. Les congés approuvés occupent les disponibilités ; les demandes de congé ne créent pas de conflit. Les créneaux sont signalés comme superposés sans interdire leur enregistrement : l’administrateur arbitre le planning. Les créneaux annulés ou terminés et les simples échéances ne bloquent pas les disponibilités.

Les tâches ont un responsable, un chantier/client, une date limite, un début et une durée facultatifs, une priorité, une checklist et des dépendances. La clôture exige une checklist terminée et des tâches préalables terminées. Les cycles de dépendances sont refusés.

Les rendez-vous acceptent plusieurs salariés et une répétition quotidienne, hebdomadaire ou mensuelle, avec intervalle et fin de répétition obligatoire (maximum un an). Une édition concerne toute la série ; « Annuler cette occurrence » ne retire que la date choisie. Les rendez-vous peuvent durer au maximum 31 jours. Les heures et les durées sont contrôlées côté serveur, y compris depuis les formulaires génériques.

## Configurer les comptes salariés

1. Créer les fiches salariés et leurs agences dans « Salariés & véhicules ».
2. Dans « Comptes salariés », renseigner **Employé** pour lier chaque compte à sa fiche salarié.
3. Dans son rôle, ajouter « Agenda & planning » en lecture et les modules nécessaires : « Tâches des salariés », « Rendez-vous & réunions », « Planning interventions ».
4. Choisir la portée **Mes affectations** (`self`) pour limiter les tables et les fiches aux affectations personnelles. Régler séparément Ajouter, Modifier et Supprimer. Donner la lecture des agences/chantiers/clients utiles au travail du salarié si ces références doivent être sélectionnées.

L’agenda d’un compte salarié reste personnel même s’il modifie les paramètres de l’URL. L’API ne renvoie pas les événements ni les tâches d’un autre salarié. Elle peut fournir le nom de sa propre fiche salarié sans ouvrir les informations RH complètes. Un rendez-vous collectif apparaît aux participants autorisés ; l’administrateur gère ses affectations multiples. Un salarié peut créer ou modifier ses propres affectations selon son rôle, sans s’affecter à la place d’un collègue.

Un compte non lié à une fiche salarié reçoit une indication de configuration. L’administrateur dispose du planning général et peut sélectionner n’importe quel salarié.

## Notifications, rappels et export

La création ou une modification importante d’une affectation crée une notification interne pour le compte actif lié au salarié (ou pour son adresse email renseignée dans la fiche). Il s’agit d’une notification dans le logiciel ; aucun email ou message externe n’est envoyé.

L’écran actualise les disponibilités et les rappels chaque minute lorsqu’il est ouvert et visible. Le rappel avant l’événement est réglable de 0 à 10 080 minutes. Aucun service de rappel en arrière-plan n’est installé.

L’export ICS contient uniquement le périmètre autorisé et la période sélectionnée, avec heures tunisiennes et alarmes. Il peut être importé dans un calendrier compatible ; il ne constitue pas une synchronisation bidirectionnelle.

## Validation

`pnpm check` couvre les règles de recurrence, exceptions, conflits, congés, horaires, export ICS UTF-8 et permissions. `pnpm test:vercel` vérifie aussi les API authentifiées avec une base locale jetable. `SOLAR_UI_CHECK=1 pnpm test:vercel` ajoute les parcours bureau/mobile avec Playwright si celui-ci est disponible dans l’environnement de développement.

Aucune migration de données supplémentaire ni nouvelle variable d’environnement n’est nécessaire. Les modules utilisent les tables et l’authentification existantes.
