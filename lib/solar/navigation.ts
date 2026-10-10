import {modules,type Module} from './modules';
type Labels=[string,string,string];
export const navigationSections:{key:string;title:Labels;description:Labels;icon:string}[]=[
 {key:'daily',title:['Mon quotidien','عملي اليومي','My workday'],description:['Agenda, tâches et échanges avec l’équipe.','الأجندة والمهام والتواصل مع الفريق.','Calendar, tasks and team conversations.'],icon:'CalendarDays'},
 {key:'sales',title:['Clients & ventes','العملاء والمبيعات','Clients & sales'],description:['Du premier contact au contrat client.','من أول اتصال إلى عقد العميل.','From first contact to customer contract.'],icon:'ContactRound'},
 {key:'technical',title:['Technique & chantiers','التقنية والمشاريع','Engineering & projects'],description:['Études, STEG, plans, installation et maintenance.','الدراسات والستاغ والمخططات والتركيب والصيانة.','Studies, STEG, drawings, installation and maintenance.'],icon:'Sun'},
 {key:'stock',title:['Achats & dépôts','المشتريات والمخازن','Purchasing & stock'],description:['Commandes, réceptions, câbles, transferts et inventaires.','الطلبات والاستلام والكابلات والتحويلات والجرد.','Orders, receipts, cables, transfers and inventory.'],icon:'Boxes'},
 {key:'finance',title:['Finance & pilotage','المالية والإدارة','Finance & insights'],description:['Factures, paiements, comptabilité, fiscalité et BI.','الفواتير والدفع والمحاسبة والجباية والتحليل.','Invoices, payments, accounting, tax and BI.'],icon:'Wallet'},
 {key:'people',title:['Salariés & véhicules','الموظفون والسيارات','People & vehicles'],description:['Paie, congés, missions, clés et entretien.','الأجور والعطل والمهمات والمفاتيح والصيانة.','Payroll, leave, missions, keys and maintenance.'],icon:'Users'},
 {key:'admin',title:['Administration','الإدارة','Administration'],description:['Agences, comptes et droits d’accès.','الوكالات والحسابات وصلاحيات الوصول.','Branches, accounts and access permissions.'],icon:'ShieldCheck'}
];
const explicit:Record<string,string>={agenda:'daily',tasks:'daily',planning:'daily',agendaEvents:'daily',notifications:'daily',conversations:'daily',messages:'daily',agencies:'admin',supplierInvoices:'stock',sites:'technical',contractTemplates:'sales'};
export function sectionOf(m:Module){return explicit[m.key]??({0:'sales',1:'technical',2:'finance',3:'stock',4:'people',5:'people',6:'finance',7:'admin',8:'finance',9:'finance',10:'daily',11:'daily'} as Record<number,string>)[m.group]??'admin';}
export function visibleNavigation(read?:string[]){return modules.filter(m=>m.key!=='messages'&&(!read||read.includes(m.key)||m.key==='agenda'&&['planning','tasks','agendaEvents'].some(k=>read.includes(k))));}
export function moduleMatches(m:Module,query:string){return [m.key,...m.title,...m.singular,...(navigationSections.find(s=>s.key===sectionOf(m))?.title??[])].join(' ').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().includes(query.trim().normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase());}

export function workspaceHash(key:string,id?:string,context:{employeeId?:string;projectId?:string}={}){const params=new URLSearchParams({module:key});if(id)params.set("record",id);for(const [name,value] of Object.entries(context))if(value)params.set(name,value);return "#"+params;}
