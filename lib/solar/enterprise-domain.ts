import type {Entry} from './domain';
import type {WorkspaceData} from './client';
export const tunisToday=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Tunis'});
export function retentionAmounts(operations:any[]){
 let ht=0,vat=0,gross=0,ir=0,vatRS=0;
 const rows=operations.map(o=>{
  if(!Number.isSafeInteger(o.base)||o.base<0||![o.rate??0,o.vatRate??0,o.vatWithholdingRate??0].every(r=>Number.isFinite(r)&&r>=0&&r<=100&&Math.abs(Math.round(r*100)-r*100)<1e-7))throw new Error('invalid_tax');
  const calculatedTax=Math.round(o.base*(o.vatRate??0)/100);if(o.allocatedTax!==undefined&&(!Number.isSafeInteger(o.allocatedTax)||o.allocatedTax<0||Math.abs(o.allocatedTax-calculatedTax)>2))throw new Error('invalid_allocated_tax');
   const tax=o.allocatedTax??calculatedTax,ttc=o.base+tax,withheld=Math.round(ttc*(o.rate??0)/100),retainedVat=Math.round(tax*(o.vatWithholdingRate??0)/100),net=ttc-withheld-retainedVat;
  if(net<0||!Number.isSafeInteger(ttc))throw new Error('invalid_tax');
  ht+=o.base;vat+=tax;gross+=ttc;ir+=withheld;vatRS+=retainedVat;
  return {...o,tax,ttc,withheld,retainedVat,net};
 });
 if(![ht,vat,gross,ir,vatRS,gross-ir-vatRS].every(Number.isSafeInteger))throw new Error('invalid_tax');
 return {rows,subtotal:ht,tax:vat,total:gross,withheld:ir+vatRS,incomeWithheld:ir,vatWithheld:vatRS,net:gross-ir-vatRS};
}
// A correction replaces the initial certificate; cancellation neutralizes the whole reference.
export function effectiveWithholdings(records:Entry[]){
 const groups=new Map<string,Entry[]>();for(const r of records.filter(r=>r.kind==='withholdings'&&['validated','submitted'].includes(r.data.status))){const key=r.data.direction+'|'+r.data.reference;groups.set(key,[...(groups.get(key)??[]),r]);}
 return [...groups.values()].flatMap(rows=>rows.some(r=>r.data.operation==='cancel')?[]:[rows.find(r=>r.data.operation==='modify')??rows.find(r=>r.data.operation==='add')!]).filter(Boolean);
}
export function dashboardReport(data:WorkspaceData,filters:{from:string;to:string;agency?:string;warehouse?:string;opening?:number;scenario?:string}){
 const today=tunisToday(),all=data.records;
 const selected=(r:Entry)=> (!filters.agency||filters.agency==='all'||r.data.agencyId===filters.agency||r.data.destinationAgencyId===filters.agency)&&(!filters.warehouse||filters.warehouse==='all'||!['movements','receipts','deliveryNotes','exitNotes','inventories','transits','transferOrders'].includes(r.kind)||[r.data.warehouse,r.data.from,r.data.to,r.kind==='warehouses'?r.id:undefined].includes(filters.warehouse));
 const scoped=all.filter(selected),inPeriod=(r:Entry)=>(r.data.date??r.data.period??r.createdAt.slice(0,10))>=filters.from&&(r.data.date??r.data.period??r.createdAt.slice(0,10))<=filters.to;
 const invoices=scoped.filter(r=>r.kind==='invoices'&&r.data.status==='issued'&&inPeriod(r));
 const sign=(r:Entry)=>r.data.invoiceType==='creditNote'?-1:1;
 const sum=(rs:Entry[],key:string)=>rs.reduce((n,r)=>n+(r.data[key]??0),0);
 const sales=invoices.reduce((n,r)=>n+sign(r)*(r.data.subtotal-(r.data.discount??0)),0);
 const outputVat=invoices.reduce((n,r)=>n+sign(r)*(r.data.tax??0),0);
 const orderMap=new Map(all.filter(r=>r.kind==='orders').map(r=>[r.id,r]));
 const invoicedOrders=new Set(scoped.filter(r=>r.kind==='supplierInvoices'&&r.data.status==='issued').map(r=>r.data.orderId).filter(Boolean));
 const purchases=scoped.filter(r=>inPeriod(r)&&(r.kind==='supplierInvoices'&&r.data.status==='issued'||r.kind==='receipts'&&r.data.status==='posted'&&!invoicedOrders.has(r.data.orderId)));
 let purchaseHt=0,inputVat=0;for(const r of purchases){if(r.kind==='supplierInvoices'){purchaseHt+=r.data.subtotal;inputVat+=r.data.tax;continue;}for(const item of r.data.items){const source=orderMap.get(r.data.orderId)?.data.items?.find((i:any)=>i.productId===item.productId);const ht=Math.round(item.quantity*(source?.price??0));purchaseHt+=ht;inputVat+=Math.round(ht*(source?.tax??0)/100);}}
 const retentions=effectiveWithholdings(scoped);
 const paid=(id:string)=>data.allocations.filter(a=>a.installment_id===id).reduce((n,a)=>n+a.amount,0);
 const dues=scoped.filter(r=>r.kind==='installments'&&r.data.status!=='restructured').map(r=>({...r,remaining:Math.max(0,r.data.amount-paid(r.id))})).filter(r=>r.remaining>0);
 const ageing=[{label:'Non échues',min:-Infinity,max:-1},{label:'0–30 jours',min:0,max:30},{label:'31–60 jours',min:31,max:60},{label:'61–90 jours',min:61,max:90},{label:'Plus de 90 jours',min:91,max:Infinity}].map(b=>({...b,amount:dues.filter(r=>{const days=Math.floor((Date.parse(today)-Date.parse(r.data.dueDate))/86400000);return days>=b.min&&days<=b.max}).reduce((n,r)=>n+r.remaining,0)}));
 const payments=scoped.filter(r=>r.kind==='payments'&&r.data.status==='cleared'&&inPeriod(r));
 const netPayment=(r:Entry)=>r.data.amount-retentions.filter(c=>c.data.paymentId===r.id).reduce((n,c)=>n+(c.data.withheld??0),0);
 const incoming=payments.filter(r=>r.data.direction==='incoming').reduce((n,r)=>n+netPayment(r),0),outgoing=payments.filter(r=>r.data.direction==='outgoing').reduce((n,r)=>n+netPayment(r),0);
 const productMap=new Map(all.filter(r=>r.kind==='products').map(r=>[r.id,r]));
 const warehouseIds=new Set(all.filter(r=>r.kind==='warehouses'&&(!filters.agency||filters.agency==='all'||r.data.agencyId===filters.agency)&&(!filters.warehouse||filters.warehouse==='all'||r.id===filters.warehouse)).map(r=>r.id));
 const stock=data.stock.filter(s=>warehouseIds.has(s.warehouse));
 const stockValue=stock.reduce((n,s)=>n+Math.round(s.quantity/1000*(productMap.get(s.product_id)?.data.purchasePrice??0)),0);
 const payrollCost=sum(scoped.filter(r=>r.kind==='payroll'&&r.data.status==='validated'&&inPeriod(r)),'employerCost');
 const reportByAgency=all.filter(r=>r.kind==='agencies').filter(r=>!filters.agency||filters.agency==='all'||r.id===filters.agency).map(a=>({id:a.id,name:a.data.name,sales:invoices.filter(r=>r.data.agencyId===a.id).reduce((n,r)=>n+sign(r)*(r.data.subtotal-(r.data.discount??0)),0),receivables:dues.filter(r=>r.data.agencyId===a.id).reduce((n,r)=>n+r.remaining,0)}));
 const cash:any[]=[];let balance=filters.opening??0;
 const manual=scoped.filter(r=>r.kind==='cashForecast'&&r.data.status==='planned'&&r.data.scenario===(filters.scenario??'base'));
 const overridden=new Set(manual.map(r=>r.data.sourceId).filter(Boolean));
 for(const r of dues)if(!overridden.has(r.id))cash.push({id:r.id,name:r.data.name,date:r.data.dueDate<today?today:r.data.dueDate,incoming:r.remaining,outgoing:0,source:'Échéance client'});
 for(const r of manual){const n=Math.round(r.data.amount*(r.data.probability??100)/100);cash.push({id:r.id,name:r.data.name,date:r.data.dueDate<today?today:r.data.dueDate,incoming:r.data.direction==='incoming'?n:0,outgoing:r.data.direction==='outgoing'?n:0,source:'Prévision pondérée'});}
 cash.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));for(const r of cash){balance+=r.incoming-r.outgoing;r.balance=balance;}
 const byModule=Object.fromEntries([...new Set(scoped.map(r=>r.kind))].map(k=>[k,scoped.filter(r=>r.kind===k).length]));
 const projectMargins=scoped.filter(r=>r.kind==='projects').map(p=>{
  const revenue=invoices.filter(r=>r.data.projectId===p.id).reduce((n,r)=>n+sign(r)*(r.data.subtotal-(r.data.discount??0)),0);
  const materials=scoped.filter(r=>r.kind==='movements'&&r.data.direction==='stockOut'&&r.data.projectId===p.id&&!r.data.transferId&&inPeriod(r)).reduce((n,r)=>n+Math.round(r.data.quantity*(r.data.unitCost??0)),0);
  const other=sum(scoped.filter(r=>['expenses','attendance','vehicleCosts'].includes(r.kind)&&r.data.projectId===p.id&&['approved','paid','completed'].includes(r.data.status)&&inPeriod(r)), 'amount');
  const labour=sum(scoped.filter(r=>r.kind==='attendance'&&r.data.projectId===p.id&&r.data.status==='approved'&&inPeriod(r)),'cost');
  return {id:p.id,name:p.data.name,revenue,cost:materials+other+labour,margin:revenue-materials-other-labour};
 });
 return {generatedAt:new Date().toISOString(),filters,kpis:{sales,outputVat,inputVat,vatDue:outputVat-inputVat,purchaseHt,incoming,outgoing,netCash:incoming-outgoing,receivables:dues.reduce((n,r)=>n+r.remaining,0),overdue:dues.filter(r=>r.data.dueDate<today).reduce((n,r)=>n+r.remaining,0),stockValue,payrollCost,withholdingIssued:sum(retentions.filter(r=>r.data.direction==='issued'&&inPeriod(r)),'withheld'),withholdingReceived:sum(retentions.filter(r=>r.data.direction==='received'&&inPeriod(r)),'withheld')},ageing,reportByAgency,projectMargins,byModule,cash,dues,invoices,purchases,stock,retentions};
}

export function appendStockQR(items:any[],payload:string,products:Entry[]){
 const parts=payload.trim().split('|');if(parts.length!==3||parts[0]!=='SOLU1')throw new Error('invalid_qr');
 const serial=decodeURIComponent(parts[2]),product=products.find(r=>r.kind==='products'&&r.id===parts[1]);
 if(!product||product.data.tracking!=='serialTracking'||!serial||serial.length>200||/[\r\n\x00-\x1f]/.test(serial))throw new Error('invalid_qr');
 if(items.some(i=>String(i.serials??'').split(/\r?\n/).includes(serial)))throw new Error('duplicate_serial');
 const prior=items.find(i=>i.productId===product.id),serials=[...String(prior?.serials??'').split(/\r?\n/).filter(Boolean),serial];
 const row={...(prior??{}),productId:product.id,quantity:serials.length,serials:serials.join('\n'),price:prior?.price??((product.data.purchasePrice??0)/1000).toFixed(3),tax:prior?.tax??19};
 return prior?items.map(i=>i===prior?row:i):[...items,row];
}
