export const REGULATORY_SOURCE='https://www.energiemines.gov.tn/fr/cadre-reglementaire/';
export const STEG_LEGAL_REFERENCES=[
 {title:'Loi n°2015-12 du 11 mai 2015 — production d’électricité à partir des énergies renouvelables',url:REGULATORY_SOURCE},
 {title:'Loi n°2019-47 du 30 mai 2019 — articles 7 et 8',url:REGULATORY_SOURCE},
 {title:'Décret n°2016-1123 du 24 août 2016, modifié par le décret n°2020-105 du 25 février 2020',url:REGULATORY_SOURCE},
 {title:'Arrêtés du 9 février 2017 — raccordement et contrats types BT et HT/MT',url:REGULATORY_SOURCE},
 {title:'Arrêté du 8 décembre 2023 — transport par les sociétés d’autoproduction et achat des excédents',url:REGULATORY_SOURCE},
 {title:'Arrêtés du 9 octobre 2024 — contrat type de vente et prix pour le régime d’autorisation',url:REGULATORY_SOURCE}
];
export function legalChecklist(network:string,regime:string){
 const common=['Identité et capacité juridique du demandeur ; propriété ou mandat du site','Droit d’occupation, urbanisme et autorisations applicables au site','Régime de production confirmé et validation des textes applicables par le responsable','Demande de raccordement, étude et avis STEG','Équipements agréés et dossiers techniques signés','Convention / contrat STEG applicable ; réception et mise en service documentées'];
 if(network!=='BT')common.push('Études préliminaire et détaillée de raccordement MT/HT ; conformité au cahier HT/MT','Étude de protection, poste de livraison, comptage, téléconduite et raccordement validés par STEG');
 if(network==='HT')common.push('Exigences propres au réseau HT et au point de raccordement confirmées par STEG ; aucun modèle HTA utilisé comme formulaire HT');
 if(regime==='remoteSelfConsumption')common.push('Sites producteurs / consommateurs identifiés ; contrat de transport et achat des excédents ; modalités de comptage');
 if(regime==='authorization')common.push('Autorisation de production délivrée ; contrat type de vente applicable ; tarifs et conditions en vigueur');
 if(regime==='concession')common.push('Concession et obligations contractuelles ; études et autorisations du projet validées');
 if(!regime)common.push('RÉGIME JURIDIQUE À CONFIRMER avant dépôt');return common;
}
