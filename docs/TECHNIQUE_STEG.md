# Parcours technique photovoltaïque et dossier STEG

## Parcours dans le logiciel

1. Ouvrir le client, saisir sa puissance souhaitée et créer son site/projet depuis cette fiche. Les fiches liées se rouvrent directement dans le détail du client, sans rechercher à nouveau dans un tableau.
2. Saisir la référence STEG à neuf chiffres, le raccordement existant, la puissance souscrite **kVA**, l'adresse, le GPS, le district et joindre le consentement de consultation avec sa validité.
3. Enregistrer le connecteur STEG dans son formulaire dédié. L'identifiant et le mot de passe sont chiffrés côté serveur ; le détail public ne contient qu'un identifiant masqué. Une passerelle navigateur externe est nécessaire : voir [sa configuration](../services/steg-bridge/README.md).
4. Depuis le projet, lancer la vérification. Le client résout le CAPTCHA dans la fenêtre du logiciel. Tant que le résultat complet et daté du compte n'est pas obtenu, aucune vérification « payé » n'est créée. Une preuve manuelle jointe peut également être validée comme telle, avec son auteur et sa durée de validité.
5. « Préparer dossier BT / MT / HT » exige une vérification valide, un solde nul et la même révision du site. Le type de dossier dépend du **réseau existant**, pas d'un seuil kWc arbitraire. Le pack remplit huit rubriques depuis client, site, projet, société, étude et plan ; les informations absentes restent explicitement à compléter. Après modification du site, vérifier à nouveau le compte puis relancer cette préparation pour actualiser le dossier non approuvé. Le passage à prêt/soumis recontrôle la vérification liée.
6. Joindre les pièces du bordereau avec les sélecteurs de documents, la qualification installateur, la revue juridique et les signatures nécessaires. Le passage à « prêt » ou « soumis » contrôle les pièces attendues. Les formulaires officiels restent liés dans le pack : celui-ci ne prétend pas remplacer intégralement leurs pages ni leurs signatures.
7. Préparer l'avant-projet CAO avec un relevé coté joint, les caractéristiques constructeur et les tracés mesurés des câbles. La décision STEG réelle, jointe et référencée, déclenche la génération des plans déjà renseignés. Les autres plans restent à compléter.
8. Joindre la note signée de l'ingénieur, enregistrer la validation et réserver les quantités de câbles dans le dépôt. Une modification du projet ou du dossier rend la réservation d'un ancien calcul invalide.

## Livrables et limites de calcul

| Livrable | Ce que cette version produit |
|---|---|
| Étude énergétique | Résultats mensuels importés avec rapport, météo/période, énergie, productible et PR calculés. P50/P90 saisis uniquement avec justification des incertitudes. Le connecteur PVGIS existant reste disponible. |
| Implantation | Calepinage d'une surface rectangulaire mesurée, obstacles, chaînes, rails, ancrages indicatifs et trajets câble. Visualisation 2D et export DXF en mm pour AutoCAD. |
| Unifilaire | Schéma de principe généré depuis les chaînes et groupes MPPT, onduleur, circuits, réseau et terre. Les calibres et protections ne sont pas inventés. |
| Note câbles | Longueurs 3D issues des points x/y/z saisis, quantité par conducteurs et marge, section, Iz corrigé fourni et chute de tension DC/AC. |
| Dossier | Demande à signer, identification, mémoire énergétique, implantation/chaînes, câbles, cadre juridique et bordereau d'annexes. Impression navigateur/PDF. |

Le calcul contrôle Voc à froid, Vmp à chaud, courants MPPT, limite de court-circuit à 1,25 Isc STC, nombre de chaînes, ratio Pdc/Pac et capacité de toiture. Les conditions de référence -10 °C / +85 °C sont imposées. Pour BT, la puissance apparente ne peut dépasser la souscription, 6 kVA monophasé ou 200 kVA triphasé ; une étude STEG est signalée au-delà de 20 kVA. Les chutes supérieures à 3 % sont refusées pour les circuits BT. En AC, cos φ et réactance sont pris en compte ; les valeurs par défaut sont indiquées dans le résultat. Pour un circuit triphasé, saisir la tension entre phases.

La structure reste un avant-projet : vent, charges, profils, fixations, étanchéité et compatibilité constructeur nécessitent une note structure. Les passages de 0,90 m et l'espacement solaire de référence font l'objet d'avertissements. Le calcul ne simule pas des ombrages horaires, des toitures multiples en 3D, des BESS, des optimiseurs, ni une coordination complète de protections/court-circuit. Aucun moteur PVsyst ni AutoCAD DWG natif n'est inclus. Le référentiel BT n'est pas présenté comme une certification MT/HT. En MT, HTA désigne la moyenne tension ; un projet HT exige une étude et des accords spécifiques.

## Câbles et stock

Un article câble doit être en mètres et suivi en quantité. Créer une bobine avec lot unique et longueur réellement mesurée, puis l'affecter **au stock déjà reçu**. Cette action ne double pas le stock. Une coupe sort longueur utile + perte du dépôt et réduit la bobine dans la même transaction. Un retour crée une chute distincte, qui ne rallonge jamais la bobine originale. Le transfert déplace la bobine et tout son stock restant entre les deux dépôts. Les sorties génériques qui réduiraient le stock sous la longueur encore affectée aux bobines sont bloquées.

Chaque bobine/chute porte un QR `solumove:cable:<id>`. Un lecteur sans fil en mode clavier HID peut le saisir dans la recherche globale ; Entrée ouvre directement la fiche. Les lecteurs Bluetooth/USB utilisant ce mode sont compatibles sans pilote applicatif spécifique.

## Fournisseurs, retenue et comptabilité

Le comptable configure explicitement l'assujettissement, les taux IR/IS et TVA, le code TEJ et son fondement pour chaque fournisseur. L'émission de la facture fige cette politique et l'identité fiscale. Le paiement, y compris partiel, répartit HT/TVA/timbre entre les lignes, calcule la retenue hors timbre et affiche brut imputé, net décaissé et certificat automatique. Les taux restent ceux de la politique approuvée ; ils ne sont pas déduits d'un nom de fournisseur. Les arrondis sont en millimes par règlement/ligne.

Un règlement soldé est immuable, les dépassements et doublons sont refusés. Son annulation rouvre le solde et neutralise le certificat non déposé ; un certificat déjà soumis nécessite une rectification. La comptabilisation sépare fournisseur, trésorerie et retenue à reverser. Configurer le compte de retenue dans les liaisons comptables existantes ; une nouvelle initialisation propose 442. Les achats facturés ne sont pas recomptés dans la BI lorsqu'une réception de la même commande a déjà été comptabilisée.

## Références consultées le 10 octobre 2026

- [STEG — Référentiel technique des installations PV](https://www.steg.com.tn/system/files/pdf/Referentiel_technique_des_installations_PV.pdf), copie identique à celle transmise via La Presse : exigences techniques BT, notamment puissance apparente, chaînes, câbles et documents.
- [STEG — Documents utiles et dossiers types](https://www.steg.com.tn/fr/page/documents-utiles) : dossier BT et dossier HTA, dont les liens figurent dans le logiciel.
- [Ministère de l'Industrie — Cadre réglementaire ENR](https://www.energiemines.gov.tn/fr/cadre-reglementaire/) : références légales, décrets et arrêtés, à contrôler selon le régime de production.
- [Bootcamp — Logiciels d'étude photovoltaïque](https://bootcamp.tn/logiciels-etude-photovoltaique/) : organisation autour de simulation, implantation, unifilaire et note de calcul ; méthode et non source d'approbation STEG.
- [PVOS Pro](https://pvospro.com/) : la page publique présente étude PV, calepinage 3D, chiffrage/marge, devis/facture, stock/achats et dossier technique dans une affaire unique, avec homologations et pièces PROSOL/ANME. Cette présentation inspire la continuité entre fiches ; ses annonces de conformité ou d'automatisation ne sont pas utilisées comme preuves juridiques ni comme API d'intégration.

## Validation

`pnpm check` couvre calculs, conservation des montants, chiffrement, réponses fournisseur et génération documentaire. `pnpm test:vercel` utilise Next.js compilé et une base libSQL neuve avec les migrations réelles ; la passerelle et les pièces sont des fixtures explicitement fictives. Il vérifie CAPTCHA, rejeu, modification du site, préparation/approbation contrôlée, réservations/coupes/chutes/transferts, retenues partielles, TEJ XSD, annulation, écritures et permissions. La connexion à une session STEG réelle reste à tester sur la passerelle configurée.
