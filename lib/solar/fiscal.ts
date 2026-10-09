import schemas from './fiscal/tej-schemas.json' with {type:'json'};
import codes from './fiscal/tej-operations.json' with {type:'json'};
import {retentionAmounts} from './enterprise-domain';
export const xmlEscape=(value:unknown)=>String(value??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
const tag=(name:string,value:unknown)=>`<${name}>${xmlEscape(value)}</${name}>`;
const date=(v:string)=>v.split('-').reverse().join('/');
export const tejCodes=codes;
export function checkTejText(value:unknown,key:string){
 const v=String(value??'');
 // TEJ September 2026, page 64: field content restrictions. Never silently rewrite taxpayer data.
 if(/[\u0000-\u001f\u00c0-\u024f;*&<>]/.test(v)||/--|\/\*|\*\/|'\s*(?:OR|AND)\b|https?:\/\/|www\.|javascript:|data:|<script/i.test(v))throw new Error('tej_text_forbidden:'+key);
}
export function checkTaxpayer(d:any){
 for(const key of ['reference','beneficiaryName','address','email','phone','identifier'])checkTejText(d[key],key);
 if(d.identifierType==='MatriculeFiscal'&&!/^\d{7}[A-Z]$/.test(d.identifier))throw new Error('invalid_tax_identifier');
 if(d.identifierType==='CIN'&&!/^\d{8}$/.test(d.identifier))throw new Error('invalid_tax_identifier');
 if(['CIN','Passeport','CarteSejour'].includes(d.identifierType)&&(!d.birthDate||d.category!=='PP'))throw new Error('beneficiary_birth_required');
 if(['Passeport','CarteSejour','AutreIdentifiantFiscal'].includes(d.identifierType)&&!/^([A-Z]{2})$/.test(d.country??''))throw new Error('beneficiary_country_required');
 for(const op of d.operations){if(!codes.some(c=>c.code===op.code)||!/^20\d{2}$/.test(op.invoiceYear))throw new Error('invalid_tej_operation');}
 return retentionAmounts(d.operations);
}
export function tejXML(company:any,period:string,act:string,certificates:any[]){
 company={...company,taxId:company.tejTaxId||company.taxId};
 if(!/^\d{7}[A-Z]$/.test(company.taxId??''))throw new Error('company_tax_id_required');
 if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(period)||!['0','1'].includes(act)||!certificates.length)throw new Error('invalid_period');
 const blocks:Record<string,string[]>={add:[],modify:[],cancel:[]};
 for(const d of certificates){
  checkTejText(d.reference,'reference');
  if(d.date.slice(0,7)!==period)throw new Error('payment_period_mismatch');
  if(d.operation==='cancel'){if(act!=='1')throw new Error('rectification_required');blocks.cancel.push(`<Certificat>${tag('Ref_certif_chez_declarant',d.reference)}</Certificat>`);continue;}
  if(d.operation==='modify'&&act!=='1')throw new Error('rectification_required');
  const a=checkTaxpayer(d),typeMap:Record<string,string>={MatriculeFiscal:'1',CIN:'2',Passeport:'3',CarteSejour:'4',AutreIdentifiantFiscal:'5'};
  let identifier=tag('TypeIdentifiant',typeMap[d.identifierType])+tag('Identifiant',d.identifier);
  if(['CIN','Passeport','CarteSejour'].includes(d.identifierType))identifier+=tag('DateNaissance',date(d.birthDate));
  if(['Passeport','CarteSejour','AutreIdentifiantFiscal'].includes(d.identifierType))identifier+=tag('Pays',d.country);
  identifier+=tag('CategorieContribuable',d.category);
  const beneficiary=`<Beneficiaire><IdTaxpayer><${d.identifierType}>${identifier}</${d.identifierType}></IdTaxpayer>${tag('Resident',d.resident)}${tag('NometprenonOuRaisonsociale',d.beneficiaryName)}${tag('Adresse',d.address)}<InfosContact>${tag('AdresseMail',d.email)}${tag('NumTel',d.phone)}</InfosContact></Beneficiaire>`;
  const ops=a.rows.map(o=>`<Operation IdTypeOperation="${xmlEscape(o.code)}">${tag('AnneeFacturation',o.invoiceYear)}${tag('CNPC',o.cnpc)}${tag('P_Charge',o.charge)}${tag('MontantHT',o.base)}${tag('TauxRS',o.rate??0)}${tag('TauxTVA',o.vatRate??0)}${tag('MontantTVA',o.tax)}${tag('MontantTTC',o.ttc)}${tag('MontantRS',o.withheld)}${o.retainedVat?`<TaxeAdditionnelle Code="RSTVA${o.vatWithholdingRate}" Taux="${o.vatWithholdingRate}">${o.retainedVat}</TaxeAdditionnelle>`:''}${tag('MontantNetServi',o.net)}</Operation>`).join('');
  const taxes=new Map<string,number>();for(const o of a.rows)if(o.retainedVat)taxes.set('RSTVA'+o.vatWithholdingRate,(taxes.get('RSTVA'+o.vatWithholdingRate)??0)+o.retainedVat);
  const totals=tag('TotalMontantHT',a.subtotal)+tag('TotalMontantTVA',a.tax)+tag('TotalMontantTTC',a.total)+tag('TotalMontantRS',a.incomeWithheld)+(taxes.size?`<TotalTaxes>${[...taxes].map(([Code,Montant])=>`<TotalTaxeAdditionnelle Code="${Code}" Montant="${Montant}"/>`).join('')}</TotalTaxes>`:'')+tag('TotalMontantNetServi',a.net);
  blocks[d.operation??'add'].push(`<Certificat>${beneficiary}${tag('DatePayement',date(d.date))}${tag('Ref_certif_chez_declarant',d.reference)}<ListeOperations>${ops}</ListeOperations><TotalPayement>${totals}</TotalPayement></Certificat>`);
 }
 const names={add:'AjouterCertificats',modify:'ModifierCertificats',cancel:'AnnulerCertificats'};
 const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<DeclarationsRS VersionSchema="1.0"><Declarant>${tag('TypeIdentifiant','1')}${tag('Identifiant',company.taxId)}${tag('CategorieContribuable',company.category??'PM')}</Declarant><ReferenceDeclaration>${tag('ActeDepot',act)}${tag('AnneeDepot',period.slice(0,4))}${tag('MoisDepot',period.slice(5))}</ReferenceDeclaration>${Object.entries(names).map(([k,name])=>blocks[k].length?`<${name}>${blocks[k].join('')}</${name}>`:'').join('')}</DeclarationsRS>`;
 return {xml,filename:`${company.taxId}-${period}-${act}.xml`};
}
export async function validateTej(xml:string){
 if(xml.length>1500000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('unsafe_xml');
 const {validateXML}=await import('xmllint-wasm');
 const result=await validateXML({xml:[{fileName:'declaration.xml',contents:xml}],schema:[schemas.find(s=>s.fileName==='TEJDeclarationRS_v1.0.xsd')!],preload:schemas.filter(s=>s.fileName!=='TEJDeclarationRS_v1.0.xsd').map(s=>({...s,contents:s.fileName==='TEJISOPaysDevises.xsd'?s.contents.replace(/(<\/xs:enumeration>\s*)<\/xs:enumeration>(\s*<xs:enumeration value="INR">)/,'$1$2'):s.contents})),maxMemoryPages:1024});
 if(!result.valid)throw new Error('tej_xsd_invalid: '+result.errors.slice(0,3).map(e=>e.message).join(' | '));
 return {valid:true,schema:'TEJDeclarationRS_v1.0',release:'2026-09',validation:'XSD',sourceRepair:'Duplicate closing tag before INR removed in validation copy only; original preserved',acceptedByAuthority:false};
}
