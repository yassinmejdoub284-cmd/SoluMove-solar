# Recherche et périmètre — 0.2.0, 8 octobre 2026

La demande actuelle ajoute la comptabilité générale et les workflows avancés au code fourni. Le fichier LIVRAISON_0.2.md décrit la validation technique ; DEMARRAGE.md explique la configuration.

## Sources primaires utilisées pour les intégrations et le profil initial

- CNSS : https://www.cnss.tn/ — régime RSNA et paramètres de cotisations à vérifier pour chaque société.
- Loi de finances 2025 : https://www.finances.gov.tn/sites/default/files/2024-12/LF2025.pdf — articles 17 et 36, cotisation perte d'emploi et barème IRPP.
- Loi de finances 2026 : https://www.finances.gov.tn/sites/default/files/2026-01/115725.pdf — article 87, dispositions de contribution sociale.
- JRC/PVGIS, API non interactive : https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en — paramètres de l'estimation photovoltaïque. Endpoint utilisé : https://re.jrc.ec.europa.eu/api/v5_3/PVcalc .
- SolarEdge Monitoring API : https://knowledge-center.solaredge.com/sites/kc/files/se_monitoring_api.pdf — endpoint `/site/{siteId}/overview`, énergie en Wh et horodatage du fournisseur.

Ces sources ne remplacent pas les données propres à l'entreprise. Le profil tunisien initial reste brouillon, les conventions et taux non universels doivent être renseignés et validés. Aucun test technique ne certifie une conformité fiscale ou juridique.

## Périmètre livré et limites

| Domaine | Code livré | Configuration ou extension nécessaire |
|---|---|---|
| Salariés et agences | Comptes e-mail ChatGPT, rôles par module, filtres serveur, pièces protégées | Partage du Site ; sélecteur si plusieurs espaces par salarié |
| Achats et logistique | Lignes, réceptions partielles et refus des excédents, BL, inventaires contrôlés, transit expédié/reçu | Scan matériel, FIFO, retours/quarantaine spécialisés non inclus |
| Paiements et impayés | Allocations multiples, rééchelonnement exact, annulations et rejets, dossiers de recouvrement | Rapprochement bancaire, remboursements et affectation opérationnelle des avoirs à une dette à traiter explicitement ; envois de relance non automatisés |
| Comptabilité générale | Comptes, journaux, débit/crédit, comptabilisation des sources, grand livre, balance, extournes et périodes fermées | Plan/mappings de société ; états fiscaux, bilan réglementaire, lettrage avancé et exports officiels non inclus |
| Banque | Éditeur mm par banque/instrument, tests, impression sur formule originale | Mesures et calibration réelle banque/imprimante ; pas de vérification TuniChèque/API bancaire |
| Paie | CNSS/perte emploi/IRPP/CSS paramétrés, prorata, overtime, commissions, coût employeur, profil figé | Régime et convention ; régularisation annuelle variable, exemptions et déclarations officielles non inclus |
| Congés | Acquisition paramétrée, report, solde, dépassement/chevauchement refusés | Calendrier ouvrable/fériés et règles interannuelles spécialisées |
| Contrats | 24 bases FR/AR/EN, modèles approuvables/versionnés, contrat et avenant, preuve documentaire hashée | Clauses définitives propres à la société ; pas de signature certifiée externe |
| Solaire | PVGIS connecté dans le code, production mensuelle/annuelle, hypothèses, batterie indicative, maquette 3D rectangulaire et exports DXF/OBJ | Validation technique ; toitures multiples, ombrages horaires, calcul certifié et dépôt STEG/ANME non inclus |
| Monitoring | Relevés, import, SolarEdge, seuil d'alerte et ticket SAV | Clé/site réels ; autres marques et collecte planifiée non inclus |
| Alertes | Impayés, dates, stock, communication/production | Calcul à la consultation ; cron, e-mail/SMS/WhatsApp non inclus |
| Import et reprise | CSV/JSON validé puis atomique, sauvegarde avec fichiers/audit, restauration vide testée | Volumes au-delà des limites interactives : procédure D1/R2 administrée |
| Rentabilité | CA HT, matériel, frais, temps, véhicule, SAV et encaissements | Saisie unique des coûts ; provisions et allocation analytique détaillée non inclus |
| Bureau/hors ligne | PWA ; instantané de lecture par utilisateur | .exe signé et écritures synchronisées hors ligne non inclus |

Le Site d'origine n'était pas accessible dans cette session. Aucune version en ligne n'a été remplacée, aucun partage externe n'a été effectué. Les APIs de production et l'impression physique n'ont pas été testées avec les identifiants ou appareils du client. La vérification a porté sur compilation, types, calculs et opérations Worker/D1/R2 temporaires ; aucune recette visuelle sur navigateur n'est attestée.
