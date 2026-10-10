import {retentionAmounts} from './enterprise-domain';
export function supplierSettlement(invoice:any,amount:number,previous:any[],policy:any){
 if(!Number.isSafeInteger(amount)||amount<=0)throw new Error('invalid_amount');
 const lines=invoice.items.map((r:any,i:number)=>{const base=Math.round(r.quantity*r.price),tax=Math.round(base*(r.tax??0)/100);return {line:i,base,tax,gross:base+tax,rate:r.tax??0};});
 lines.push({line:lines.length,base:invoice.stamp??0,tax:0,gross:invoice.stamp??0,rate:0,stamp:true});
 const old=lines.map((_:any,i:number)=>previous.reduce((a:any,p:any)=>{const row=p.taxAllocation?.find((r:any)=>r.line===i);return {gross:a.gross+(row?.gross??0),base:a.base+(row?.base??0)};},{gross:0,base:0}));
 const remaining=lines.map((r:any,i:number)=>r.gross-old[i].gross),total=remaining.reduce((n:number,v:number)=>n+v,0);
 if(remaining.some((n:number)=>n<0)||amount>total)throw new Error('supplier_overpayment');
 const allocated=remaining.map((v:number)=>Math.floor(v*amount/total));let rest=amount-allocated.reduce((n:number,v:number)=>n+v,0);
 for(const {i} of remaining.map((v:number,i:number)=>({i,fraction:v*amount/total-allocated[i]})).sort((a:any,b:any)=>b.fraction-a.fraction||a.i-b.i)){if(!rest)break;if(allocated[i]<remaining[i]){allocated[i]++;rest--;}}
 if(rest)throw new Error('invalid_allocation');
 const allocation=lines.map((r:any,i:number)=>{const base=r.gross?Math.round(r.base*(old[i].gross+allocated[i])/r.gross)-old[i].base:0;return {line:i,gross:allocated[i],base,tax:allocated[i]-base,stamp:!!r.stamp};});
 const operations=allocation.filter((r:any)=>!r.stamp&&r.gross>0).map((r:any)=>({code:policy.rsCode,invoiceYear:invoice.date.slice(0,4),cnpc:'0',charge:'0',base:r.base,vatRate:lines[r.line].rate,allocatedTax:r.tax,rate:policy.rsRate??0,vatWithholdingRate:policy.rsVatRate??0,sourceLine:r.line}));
 const retention=policy.rsEnabled==='yes'?retentionAmounts(operations):{withheld:0};
 return {taxAllocation:allocation,operations,withheld:retention.withheld,netAmount:amount-retention.withheld,stampPaid:allocation.filter((r:any)=>r.stamp).reduce((n:number,r:any)=>n+r.gross,0)};
}
