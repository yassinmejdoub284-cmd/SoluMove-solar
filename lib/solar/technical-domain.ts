import type {Entry} from './domain';
export const STEG_SOURCE='https://www.steg.com.tn/fr/page/documents-utiles';
export const BT_TEMPLATE='https://www.steg.com.tn/system/files/pdf/Dossier_type_raccordement_IPV_au_r%C3%A9seau_BT.pdf';
export const MT_TEMPLATE='https://www.steg.com.tn/system/files/pdf/Dossier_type_raccoredement_IPV_au_r%C3%A9seau_HTA.pdf';
export function stegNetwork(capacity:number,connection:string,subscribed:number,inverterKva?:number){
 if(!Number.isFinite(capacity)||capacity<=0||!Number.isFinite(subscribed)||subscribed<=0)throw new Error('subscribed_power_required');
 if(!['singlePhase','threePhase','mediumVoltage','highVoltage'].includes(connection))throw new Error('grid_connection_required');
 const voltage=connection==='highVoltage'?'HT':connection==='mediumVoltage'?'MT':'BT';
 const warnings:string[]=[];
 if(inverterKva!==undefined&&(!Number.isFinite(inverterKva)||inverterKva<=0))throw new Error('apparent_power_required');
 if(!inverterKva)warnings.push('puissance_apparente_a_confirmer');
 if((inverterKva??0)>200&&voltage==='BT')warnings.push('raccordement_bt_a_reexaminer_par_steg');
 if((inverterKva??0)>subscribed)warnings.push('augmentation_puissance');
 if(connection==='singlePhase'&&(inverterKva??0)>6)warnings.push('passage_triphase_ou_etude');
 if(voltage==='BT'&&(inverterKva??0)>20)warnings.push('etude_impact_steg');
 if(voltage==='HT')warnings.push('etude_raccordement_ht_specifique');
 if(voltage==='MT')warnings.push('etude_raccordement_hta');
 return {voltage,warnings,template:voltage==='BT'?BT_TEMPLATE:voltage==='MT'?MT_TEMPLATE:STEG_SOURCE,source:STEG_SOURCE,authorityDecisionRequired:true};
}
export function stegChecklist(voltage:string){
 const common=['Identité / registre de commerce et mandat','Contrat STEG et dernière facture payée','Plan de situation et coordonnées GPS','Étude énergétique PVsyst ou équivalent','Attestation de conformité structure par bureau de contrôle','Schéma unifilaire avec longueurs, sections, protections et terre','Plan implantation et disposition des chaînes','Schémas coffrets DC et AC','Fiches modules / onduleurs et homologations','Fiches câbles, connecteurs, protections et chemins de câbles'];
 return voltage!=='BT'?[...common,`Étude détaillée et point de livraison ${voltage==='HT'?'HT':'HTA'}`,`Transformateur, protections ${voltage==='HT'?'HT':'HTA'} et réglages`,'Plans génie civil et équipements électriques','Accords et contrat applicables au régime'] :common;
}
const requiredNumber=(d:any,key:string,min=0,max=1e6)=>{const n=d[key];if(!Number.isFinite(n)||n<min||n>max)throw new Error('technical_parameter:'+key);return n;};
const integer=(d:any,key:string,min=1,max=2000)=>{const n=requiredNumber(d,key,min,max);if(!Number.isInteger(n))throw new Error('technical_parameter:'+key);return n;};
type Point={x:number;y:number;z:number};
export function routePoints(path:string):Point[]{
 const rows=String(path??'').trim().split(/\r?\n/);if(rows.length<2||rows.length>100)throw new Error('invalid_cable_path');
 return rows.map(row=>{const parts=row.split(',').map(v=>v.trim());if(parts.length<2||parts.length>3||parts.some(v=>!v))throw new Error('invalid_cable_path');const [x,y,z=0]=parts.map(Number);if(![x,y,z].every(n=>Number.isFinite(n)&&Math.abs(n)<=10000))throw new Error('invalid_cable_path');return {x,y,z};});
}
export function cableRoute(r:any){
 if(!['dc','ac1','ac3','earth'].includes(r.kind))throw new Error('invalid_cable_type');
 const points=routePoints(r.path);let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y,points[i].z-points[i-1].z);
 if(!length)throw new Error('invalid_cable_path');
 const section=requiredNumber(r,'section',0.1,1000),conductors=integer(r,'conductors',1,20),waste=requiredNumber(r,'waste',0,100);
 const current=requiredNumber(r,'current',0,10000),ampacity=requiredNumber(r,'ampacity',0.1,10000);
 if(current>ampacity)throw new Error('cable_ampacity_exceeded');
 let drop=0,dropPercent=0;
 if(r.kind!=='earth'){
  const voltage=requiredNumber(r,'voltage',1,40000),rho=requiredNumber(r,'resistivity',0.001,0.2),limit=requiredNumber(r,'dropLimit',0.01,20);
  const cosPhi=r.cosPhi??0.8,reactance=r.reactance??0.00008;if(!Number.isFinite(cosPhi)||cosPhi<0.1||cosPhi>1||!Number.isFinite(reactance)||reactance<0||reactance>0.01)throw new Error('invalid_cable_reactance');drop=r.kind==='dc'?2*rho*length*current/section:(r.kind==='ac3'?Math.sqrt(3):2)*length*current*(rho/section*cosPhi+reactance*Math.sqrt(1-cosPhi*cosPhi));dropPercent=100*drop/voltage;
  if(dropPercent>limit)throw new Error('cable_voltage_drop_exceeded');
 }
 const meters=Math.ceil(length*conductors*(1+waste/100)*1000)/1000;
 return {name:r.name,kind:r.kind,productId:r.productId,points,length,conductors,section,meters,drop,dropPercent,calculation:'Iz corrigé saisi. AC : cos phi 0,8 et réactance 0,00008 ohm/m si non renseignés. Court-circuit et protections à vérifier.'};
}
export function technicalDesign(d:any){
 const capacity=requiredNumber(d,'capacity',0.1,100000),moduleW=requiredNumber(d,'moduleW',1,2000),count=Math.ceil(capacity*1000/moduleW);
 if(count>2000)throw new Error('design_split_required');
 const roofWidth=requiredNumber(d,'roofWidth',0.1,1000),roofLength=requiredNumber(d,'roofLength',0.1,1000),edge=requiredNumber(d,'edge',0,20),width=requiredNumber(d,'moduleWidth',0.1,5),moduleLength=requiredNumber(d,'moduleLength',0.1,5),columns=integer(d,'columns',1,200),gap=requiredNumber(d,'gap',0,2),rowGap=requiredNumber(d,'rowGap',0,20),tilt=requiredNumber(d,'tilt',0,80),anchorSpacing=requiredNumber(d,'anchorSpacing',0.1,5);
 if(!['aluminum','steel'].includes(d.support))throw new Error('support_material_required');
 const length=moduleLength*Math.cos(tilt*Math.PI/180),rows=Math.ceil(count/columns);
 if(edge*2+Math.min(count,columns)*width+(Math.min(count,columns)-1)*gap>roofWidth+1e-9||edge*2+rows*length+(rows-1)*rowGap>roofLength+1e-9)throw new Error('roof_capacity_exceeded');
 const obstacles=String(d.obstacles??'').trim()?String(d.obstacles).trim().split(/\r?\n/).map(row=>{const v=row.split(',').map(Number);if(v.length!==4||v.some(n=>!Number.isFinite(n))||v[2]<=0||v[3]<=0)throw new Error('invalid_obstacle');return {x:v[0],y:v[1],width:v[2],length:v[3]};}):[];
 if(obstacles.length>100)throw new Error('invalid_obstacle');
 const panels=Array.from({length:count},(_,i)=>({number:i+1,x:edge+(i%columns)*(width+gap),y:edge+Math.floor(i/columns)*(length+rowGap),width,length}));
 if(panels.some(p=>obstacles.some(o=>p.x<o.x+o.width&&p.x+p.width>o.x&&p.y<o.y+o.length&&p.y+p.length>o.y)))throw new Error('panel_obstacle_overlap');
 const voc=requiredNumber(d,'voc',1,200),vmp=requiredNumber(d,'vmp',1,200),isc=requiredNumber(d,'isc',0.1,100),imp=requiredNumber(d,'imp',0.1,100),betaVoc=requiredNumber(d,'betaVoc',-2,0),betaVmp=requiredNumber(d,'betaVmp',-2,0),alpha=requiredNumber(d,'alphaIsc',0,2),tmin=requiredNumber(d,'tmin',-50,30),tmax=requiredNumber(d,'tmax',30,100),udc=requiredNumber(d,'udcMax',1,2000),mpptMin=requiredNumber(d,'mpptMin',1,2000),mpptMax=requiredNumber(d,'mpptMax',1,2000),mppts=integer(d,'mpptCount',1,1000),inputs=integer(d,'stringsPerMppt',1,20),current=requiredNumber(d,'mpptCurrent',0.1,1000),short=requiredNumber(d,'mpptIsc',0.1,1000),ac=requiredNumber(d,'inverterKw',0.1);
 if(tmin>-10||tmax<85)throw new Error('reference_temperature_not_met');
 if(vmp>=voc||imp>isc||mpptMin>=mpptMax||mpptMax>udc)throw new Error('invalid_equipment_characteristics');
 const coldVoc=voc*(1+betaVoc/100*(tmin-25)),coldVmp=vmp*(1+betaVmp/100*(tmin-25)),hotVmp=vmp*(1+betaVmp/100*(tmax-25)),hotIsc=isc*(1+alpha/100*(tmax-25)),hotImp=imp*(1+alpha/100*(tmax-25));
 const minSeries=Math.ceil(mpptMin/hotVmp),maxSeries=Math.min(Math.floor(udc/coldVoc),Math.floor(mpptMax/coldVmp));
 const parallel=Math.min(inputs,Math.floor(current/hotImp),Math.floor(short/Math.max(hotIsc,1.25*isc)));
 if(hotVmp<=0||minSeries<1||minSeries>maxSeries||parallel<1)throw new Error('inverter_string_incompatible');
 const strings=Math.ceil(count/maxSeries),base=Math.floor(count/strings),remainder=count%strings;
 if(base<minSeries)throw new Error('inverter_string_incompatible');
 const series=Array.from({length:strings},(_,i)=>base+(i<remainder?1:0));
 // Different string lengths are assigned to separate MPPT groups.
 const groups=[...new Set(series)].map(n=>({modules:n,strings:series.filter(s=>s===n).length}));
 if(groups.reduce((n,g)=>n+Math.ceil(g.strings/parallel),0)>mppts)throw new Error('mppt_capacity_exceeded');
 const actualKwc=count*moduleW/1000,ratio=actualKwc/ac;if(ratio<0.9||ratio>1.3)throw new Error('inverter_power_ratio');
 if(!Array.isArray(d.routes)||!d.routes.length||d.routes.length>100)throw new Error('cable_routes_required');
 const routes:ReturnType<typeof cableRoute>[]=d.routes.map(cableRoute);if(!routes.some(r=>r.kind==='dc')||!routes.some(r=>r.kind==='ac1'||r.kind==='ac3')||!routes.some(r=>r.kind==='earth'))throw new Error('dc_ac_earth_required');
 const shadingGap=moduleLength*Math.sin(tilt*Math.PI/180)/Math.tan(26*Math.PI/180);
 const rails=Array.from({length:rows},(_,row)=>{const n=Math.min(columns,count-row*columns),x=edge,y=edge+row*(length+rowGap),railLength=n*width+(n-1)*gap;return [0.25,0.75].map(offset=>({x,y:y+length*offset,length:railLength,anchors:Math.ceil(railLength/anchorSpacing)+1}));}).flat();
 const bom=new Map<string,number>();for(const r of routes)bom.set(r.productId,(bom.get(r.productId)??0)+r.meters);
 return {version:1,units:'m',capacity,actualKwc,count,rows,roofWidth,roofLength,panels,obstacles,rails,series,groups,minSeries,maxSeries,parallel,coldVoc,hotVmp,hotIsc,ratio,routes,bom:[...bom].map(([productId,meters])=>({productId,meters:Math.round(meters*1000)/1000})),support:d.support,shadingGap,railMeters:rails.reduce((n,r)=>n+r.length,0),anchors:rails.reduce((n,r)=>n+r.anchors,0),warnings:['AVANT-PROJET : vent, charges, ancrages, étanchéité, entraxes fabricant, ombrage, protections et terre à valider par ingénieur.','Les trajets câble sont les points mesurés saisis ; aucune longueur chantier inventée.',...(rowGap<shadingGap?['Espacement inférieur au recul solaire de référence : joindre une étude d’ombrage.']:[]),'Passages de 0,90 m sur au moins deux côtés de chaque rangée à valider sur le plan.',...(routes.some(r=>r.dropPercent>1)?['Chute de tension au-dessus de la recommandation de 1 % : optimisation à examiner.']:[])]};
}
export function technicalDXF(entry:Entry){
 const s=entry.data.snapshot??entry.data.studySnapshot;if(!s)throw new Error('plan_not_generated');
 const out:string[]=[];const add=(...pairs:(string|number)[])=>out.push(...pairs.map(String));
 const clean=(v:unknown)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,' ').slice(0,220);
 const line=(layer:string,x1:number,y1:number,x2:number,y2:number,z1=0,z2=0)=>add(0,'LINE',8,layer,10,x1*1000,20,y1*1000,30,z1*1000,11,x2*1000,21,y2*1000,31,z2*1000);
 const rect=(layer:string,x:number,y:number,w:number,h:number)=>{line(layer,x,y,x+w,y);line(layer,x+w,y,x+w,y+h);line(layer,x+w,y+h,x,y+h);line(layer,x,y+h,x,y);};
 const label=(x:number,y:number,v:string)=>add(0,'TEXT',8,'NOTES',10,x*1000,20,y*1000,30,0,40,80,1,clean(v));
 add(0,'SECTION',2,'HEADER',9,'$ACADVER',1,'AC1009',9,'$INSUNITS',70,4,0,'ENDSEC',0,'SECTION',2,'TABLES',0,'TABLE',2,'LAYER',70,9);
 for(const [name,color] of [['ROOF',7],['MODULES',3],['ALUMINUM',4],['STEEL',5],['OBSTACLES',1],['DC',1],['AC',5],['EARTH',3],['NOTES',7]] as const)add(0,'LAYER',2,name,70,0,62,color,6,'CONTINUOUS');
 add(0,'ENDTAB',0,'ENDSEC',0,'SECTION',2,'ENTITIES');
 rect('ROOF',0,0,s.roofWidth,s.roofLength);for(const p of s.panels){rect('MODULES',p.x,p.y,p.width,p.length);label(p.x+0.05,p.y+0.1,'PV '+p.number);}for(const o of s.obstacles)rect('OBSTACLES',o.x,o.y,o.width,o.length);
 for(const r of s.rails){const layer=s.support==='aluminum'?'ALUMINUM':'STEEL';line(layer,r.x,r.y,r.x+r.length,r.y);for(let i=0;i<r.anchors;i++){const x=r.x+i*r.length/(r.anchors-1);add(0,'CIRCLE',8,layer,10,x*1000,20,r.y*1000,30,0,40,25);}}
 for(const r of s.routes){for(let i=1;i<r.points.length;i++)line(r.kind==='dc'?'DC':r.kind==='earth'?'EARTH':'AC',r.points[i-1].x,r.points[i-1].y,r.points[i].x,r.points[i].y,r.points[i-1].z,r.points[i].z);label(r.points[0].x,r.points[0].y-0.15,`${r.name} ${r.section}mm2 ${r.length.toFixed(2)}m x${r.conductors}`);}
 let panel=0;for(const [i,n] of s.series.entries()){const cells=s.panels.slice(panel,panel+n);for(let j=1;j<cells.length;j++)line('DC',cells[j-1].x+cells[j-1].width/2,cells[j-1].y+cells[j-1].length/2,cells[j].x+cells[j].width/2,cells[j].y+cells[j].length/2);label(cells[0].x,cells[0].y+0.25,`STRING ${i+1}: ${n} MODULES - SCHEMATIC`);panel+=n;}
 label(0,-0.4,`${entry.data.name} | ${s.actualKwc}kWp | MM | ${entry.data.status==='reviewed'?'REVIEWED':'PRELIMINARY - ENGINEER REVIEW REQUIRED'}`);label(0,-0.7,'Structural dimensions and wiring schematic require site and manufacturer verification.');add(0,'ENDSEC',0,'EOF');return out.join('\n')+'\n';
}
export function recordRelations(entry:Entry,records:Entry[]){
 const direct=new Set<string>();for(const v of Object.values(entry.data))if(typeof v==='string')direct.add(v);
 const projectIds=new Set(entry.kind==='clients'?records.filter(r=>r.kind==='projects'&&r.data.clientId===entry.id).map(r=>r.id):entry.kind==='projects'?[entry.id]:entry.data.projectId?[entry.data.projectId]:[]);
 const contains=(v:any,id:string):boolean=>v===id||Array.isArray(v)&&v.some(x=>contains(x,id))||v&&typeof v==='object'&&Object.values(v).some(x=>contains(x,id));
 return records.filter(r=>r.id!==entry.id&&(direct.has(r.id)||contains(r.data,entry.id)||r.data.projectId&&projectIds.has(r.data.projectId)));
}
