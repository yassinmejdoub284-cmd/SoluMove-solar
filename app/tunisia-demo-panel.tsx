'use client';
import {Database, Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {text, type Lang} from '@/lib/solar/modules';
import type {WorkspaceData} from '@/lib/solar/client';

export default function TunisiaDemoPanel({data,lang,busy,online,load,compact=false}:{data:WorkspaceData;lang:Lang;busy:boolean;online:boolean;load:()=>Promise<unknown>;compact?:boolean}) {
  const loaded=data.records.some(r=>r.kind==='demoDataset'||r.data.sampleDataset==='tn-simulation-2025-2026-v1');
  if(!loaded&&(!data.access?.admin||compact&&data.records.length>0))return null;
  const safe=data.records.every(r=>r.demo===1);
  return <section className="panel"><div className="panel-head"><h2><Database size={18}/> {text(['Simulation Tunisie · 2025–2026','محاكاة تونس · 2025–2026','Tunisia simulation · 2025–2026'],lang)}</h2></div><div className="settings-copy">
    <p>{text(['Du 1er janvier 2025 au 9 octobre 2026. Identités, factures et opérations fictives ; montants en TND réalistes et indicatifs.','من 1 جانفي 2025 إلى 9 أكتوبر 2026. هويات وفواتير وعمليات وهمية بمبالغ تقديرية بالدينار.','January 1, 2025 through October 9, 2026. Fictional identities, invoices and operations; realistic indicative TND amounts.'],lang)}</p>
    {loaded?<p><strong>{text(['Historique chargé','تم تحميل السجل','History loaded'],lang)}</strong> · {data.records.filter(r=>r.data.sampleDataset==='tn-simulation-2025-2026-v1').length.toLocaleString()} {text(['fiches visibles','بطاقات ظاهرة','visible records'],lang)}</p>:<>
      <p className="small-note">{text(['3 agences, 3 dépôts, 48 clients, 147 projets, paie, stock avec séries, comptabilité, TVA, retenues, parc et BI. Octobre est partiel. Aucune donnée existante remplacée.','3 وكالات و3 مستودعات و48 حريفًا و147 مشروعًا وأجور ومخزون ومحاسبة وجباية وأسطول وBI. أكتوبر جزئي، دون استبدال بيانات موجودة.','3 branches, 3 warehouses, 48 customers, 147 projects, payroll, serialized stock, accounting, VAT, withholding, fleet and BI. October is partial. Existing data is preserved.'],lang)}</p>
      {!safe&&<p>{text(['Disponible dans un espace vide ou contenant uniquement des exemples, pour préserver vos données réelles.','متاحة في فضاء فارغ أو يحتوي أمثلة فقط للحفاظ على بياناتك الحقيقية.','Available in an empty or sample-only workspace to preserve real data.'],lang)}</p>}
      <Button disabled={busy||!online||!safe} onClick={()=>void load()}>{busy?<Loader2 size={16} className="animate-spin"/>:<Database size={16}/>} {text(busy?['Chargement de l’historique…','جارٍ تحميل السجل…','Loading history…']:['Charger les données tunisiennes','تحميل البيانات التونسية','Load Tunisian data'],lang)}</Button>
    </>}
    {!compact&&<p className="small-note">{text(['Ces données servent à explorer les modules et rapports. Les comptes salariés simulés sont inactifs ; les documents fiscaux et contrats ne constituent pas des déclarations ou signatures réelles.','للتحقق من الوحدات والتقارير. حسابات الموظفين الوهمية غير مفعلة، والوثائق ليست تصريحات أو توقيعات حقيقية.','Use these records to explore modules and reports. Sample employee accounts are inactive; tax documents and contracts are not real filings or signatures.'],lang)}</p>}
  </div></section>;
}
