'use client';
import {useMemo,useRef,useState} from 'react';
import {Download,RotateCcw,ZoomIn,ZoomOut,Maximize2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {text,type Lang} from '@/lib/solar/modules';
import type {Entry} from '@/lib/solar/domain';
import {planModel,planProjector,defaultPlanCamera,planOBJ,planMTL,type PlanLayer,type PlanCamera} from '@/lib/solar/plan-3d';
import {technicalDXF} from '@/lib/solar/technical-domain';
const tr=(lang:Lang,fr:string,ar:string,en:string)=>text([fr,ar,en],lang);
const layers:PlanLayer[]=['roof','panels','supports','obstacles','dc','ac','earth'];
const names:Record<PlanLayer,[string,string,string]>={roof:['Toiture','السطح','Roof'],panels:['Panneaux','الألواح','Modules'],supports:['Supports','الدعامات','Mounting'],obstacles:['Obstacles','العوائق','Obstacles'],dc:['DC','DC','DC'],ac:['AC','AC','AC'],earth:['Terre','التأريض','Earth']};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
function download(name:string,content:string,type:string){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export default function PlanViewer({entry,lang,local=false,compact=false}:{entry:Entry;lang:Lang;local?:boolean;compact?:boolean}){
 const model=useMemo(()=>planModel(entry),[entry]),snapshot=entry.data.snapshot??entry.data.studySnapshot;
 const [mode,setMode]=useState<'3d'|'2d'>('3d'),[camera,setCamera]=useState<PlanCamera>(defaultPlanCamera),[visible,setVisible]=useState<PlanLayer[]>(layers),[selected,setSelected]=useState(''),[expanded,setExpanded]=useState(false);
 const pointers=useRef(new Map<number,{x:number;y:number}>()),moved=useRef(false),pointerSelection=useRef('');
 const view=useMemo(()=>mode==='2d'?{...camera,pitch:90,yaw:0}:camera,[mode,camera]);
 const elements=useMemo(()=>{
  const project=planProjector(model,view);
  const faces=model.meshes.filter(m=>visible.includes(m.layer)).flatMap(mesh=>mesh.faces.map((face,i)=>{
   const points=face.map(v=>project(mesh.vertices[v]));
   const area=(points[1].x-points[0].x)*(points[2].y-points[0].y)-(points[1].y-points[0].y)*(points[2].x-points[0].x);
   if(area<=0)return null;
   return {key:mesh.id+'-'+i,id:mesh.id,label:mesh.label,background:mesh.layer==='roof',type:'face',points:points.map(p=>`${p.x},${p.y}`).join(' '),depth:points.reduce((n,p)=>n+p.depth,0)/points.length,color:mesh.color,opacity:i===1?1:.72};
  })).filter(v=>v!==null);
  const wires=model.wires.filter(w=>visible.includes(w.layer)).flatMap(w=>w.points.slice(1).map((p,i)=>{
   const points=[project(w.points[i]),project(p)];return {key:w.id+'-'+i,id:w.id,label:`${w.label} · ${w.section} mm² · ${w.length.toFixed(2)} m`,background:false,type:'wire',points:points.map(p=>`${p.x},${p.y}`).join(' '),depth:(points[0].depth+points[1].depth)/2+.005,color:w.color,opacity:1};
  }));
  return [...faces,...wires].sort((a,b)=>Number(b.background)-Number(a.background)||a.depth-b.depth);
 },[model,visible,view]);
 const zoom=(factor:number)=>setCamera(v=>({...v,zoom:clamp(v.zoom*factor,.4,3)}));
 const exportFile=(format:'dxf'|'obj'|'mtl')=>{if(!local){const a=document.createElement('a');a.href=`/api/technical?id=${encodeURIComponent(entry.id)}&format=${format}`;a.download=`solar-plan.${format}`;a.click();return;}download(format==='mtl'?'solar-plan.mtl':`solar-plan.${format}`,format==='dxf'?technicalDXF(entry):format==='obj'?planOBJ(entry):planMTL(),format==='dxf'?'application/dxf':'text/plain');};
 const select=(id:string)=>{if(!moved.current)setSelected(id);};
 const content=<div className={'plan-viewer '+(compact?'compact':'')}>
  <div className="plan-viewer-toolbar"><div className="plan-mode" role="group" aria-label={tr(lang,'Affichage du plan','عرض المخطط','Drawing view')}><button aria-pressed={mode==='3d'} onClick={()=>setMode('3d')}>3D</button><button aria-pressed={mode==='2d'} onClick={()=>setMode('2d')}>2D</button></div><span className="plan-units">{snapshot.actualKwc} kWc · {snapshot.count} {tr(lang,'panneaux','لوح','modules')}</span><div className="plan-camera-buttons"><Button variant="ghost" size="icon" aria-label={tr(lang,'Dézoomer','تصغير','Zoom out')} onClick={()=>zoom(.85)}><ZoomOut size={18}/></Button><Button variant="ghost" size="icon" aria-label={tr(lang,'Zoomer','تكبير','Zoom in')} onClick={()=>zoom(1.15)}><ZoomIn size={18}/></Button><Button variant="ghost" size="icon" aria-label={tr(lang,'Réinitialiser la vue','إعادة العرض','Reset view')} onClick={()=>{setCamera(defaultPlanCamera);setSelected('')}}><RotateCcw size={18}/></Button>{!expanded&&<Button variant="ghost" size="icon" aria-label={tr(lang,'Agrandir le plan','تكبير المخطط','Expand drawing')} onClick={()=>setExpanded(true)}><Maximize2 size={18}/></Button>}</div></div>
  <svg className="plan-viewport" viewBox="0 0 800 560" role="img" aria-label={tr(lang,`Maquette ${mode.toUpperCase()} de ${entry.data.name}`,`مخطط ${mode} ${entry.data.name}`,`${mode.toUpperCase()} model of ${entry.data.name}`)} tabIndex={0}
   onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home'].includes(e.key))e.preventDefault();if(e.key==='Home')setCamera(defaultPlanCamera);if(e.key==='+')zoom(1.15);if(e.key==='-')zoom(.85);if(e.key.startsWith('Arrow'))setCamera(v=>({...v,yaw:v.yaw+(e.key==='ArrowLeft'?-10:e.key==='ArrowRight'?10:0),pitch:clamp(v.pitch+(e.key==='ArrowUp'?5:e.key==='ArrowDown'?-5:0),5,85)}));}}
   onPointerDown={e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);if(pointers.current.size===0){moved.current=false;pointerSelection.current=(e.target as Element).closest('[data-plan-object]')?.getAttribute('data-plan-object')??'';}pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});}}
   onPointerMove={e=>{const previous=pointers.current.get(e.pointerId);if(!previous)return;const dx=e.clientX-previous.x,dy=e.clientY-previous.y;if(Math.abs(dx)+Math.abs(dy)>2)moved.current=true;
    if(pointers.current.size===2){const other=[...pointers.current.entries()].find(([id])=>id!==e.pointerId)![1],before=Math.hypot(previous.x-other.x,previous.y-other.y),after=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(before>0)zoom(after/before);}
    else if(mode==='3d')setCamera(v=>({...v,yaw:(v.yaw+dx*.45)%360,pitch:clamp(v.pitch+dy*.3,5,85)}));pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});}}
   onPointerUp={e=>{if(pointers.current.size===1&&!moved.current)setSelected(pointerSelection.current);pointers.current.delete(e.pointerId);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
   onPointerCancel={()=>{pointers.current.clear();moved.current=true;}}
  ><title>{entry.data.name}</title><desc>{tr(lang,'Glisser pour tourner. Pincer ou utiliser + et − pour zoomer. Flèches du clavier pour orienter.','اسحب للدوران واضغط بإصبعين أو + و− للتكبير.','Drag to rotate. Pinch or use + and − to zoom. Arrow keys rotate the view.')}</desc>
   {elements.map(e=>e.type==='wire'?<polyline data-plan-object={e.id} key={e.key} points={e.points} fill="none" stroke={e.color} strokeWidth={selected===e.id?7:3} strokeLinecap="round" onClick={()=>select(e.id)}><title>{e.label}</title></polyline>:<polygon data-plan-object={e.id} key={e.key} points={e.points} fill={e.color} fillOpacity={e.opacity} stroke={selected===e.id?'#facc15':'#334155'} strokeWidth={selected===e.id?2:.45} onClick={()=>select(e.id)}><title>{e.label}</title></polygon>)}
   <text x="24" y="530" className="plan-scale">{model.width} × {model.length} m · {tr(lang,'toiture','السطح','roof')} {model.roofHeight} m · {model.tilt}°</text>
  </svg>
  <p className="plan-touch-hint">{tr(lang,'Glisser pour tourner · Pincer pour zoomer · Toucher un élément pour l’identifier','اسحب للدوران · بإصبعين للتكبير · المس عنصرًا للتعرّف عليه','Drag to rotate · Pinch to zoom · Tap an element to identify it')}</p>
  {selected&&<p className="plan-selection" role="status">{model.meshes.find(m=>m.id===selected)?.label??model.wires.find(w=>w.id===selected)?.label} {model.wires.find(w=>w.id===selected)&&`· ${model.wires.find(w=>w.id===selected)!.section} mm² · ${model.wires.find(w=>w.id===selected)!.length.toFixed(2)} m`}<button aria-label={tr(lang,'Effacer la sélection','مسح التحديد','Clear selection')} onClick={()=>setSelected('')}>×</button></p>}
  <div className="plan-layers" role="group" aria-label={tr(lang,'Calques visibles','الطبقات الظاهرة','Visible layers')}>{layers.map(layer=><button key={layer} aria-pressed={visible.includes(layer)} onClick={()=>setVisible(old=>old.includes(layer)?old.filter(l=>l!==layer):[...old,layer])}>{text(names[layer],lang)}</button>)}</div>
  {!compact&&<><div className="plan-camera-presets"><Button variant="outline" onClick={()=>{setMode('3d');setCamera(defaultPlanCamera)}}>{tr(lang,'Perspective','منظور','Perspective')}</Button><Button variant="outline" onClick={()=>{setMode('3d');setCamera({yaw:0,pitch:5,zoom:1})}}>{tr(lang,'Élévation','واجهة','Elevation')}</Button><Button variant="outline" onClick={()=>{setMode('2d');setCamera(defaultPlanCamera)}}>{tr(lang,'Vue de dessus','من الأعلى','Top view')}</Button></div><div className="plan-downloads"><Button variant="outline" onClick={()=>exportFile('dxf')}><Download size={16}/>DXF · 2D</Button><Button variant="outline" onClick={()=>exportFile('obj')}><Download size={16}/>OBJ · 3D</Button><Button variant="outline" onClick={()=>exportFile('mtl')}>MTL · {tr(lang,'couleurs','الألوان','colours')}</Button></div><p className="small-note">{tr(lang,'OBJ en mètres, axe Z vertical. Garder solar-plan.mtl avec le fichier OBJ pour les couleurs. Sections des rails et ancrages indicatives ; contrôle ingénieur requis.','OBJ بالمتر ومحور Z عمودي. احتفظ بملف MTL للألوان. الهيكل أولي ويتطلب مصادقة مهندس.','OBJ uses metres and Z-up. Keep solar-plan.mtl beside the OBJ for colours. Rail and anchor sections are indicative; engineering review is required.')}{(model.assumedHeight||model.assumedClearance)&&' '+tr(lang,'Hauteur ou garde au sol indicative : compléter le relevé 3D.','ارتفاع تقديري: أكمل الرفع ثلاثي الأبعاد.','Elevation or clearance is assumed: complete the 3D survey.')}</p></>}
 </div>;
 return <>{!expanded&&content}<Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="plan-fullscreen" dir={lang==='ar'?'rtl':'ltr'}><DialogHeader><DialogTitle>{entry.data.name}</DialogTitle><DialogDescription>{tr(lang,'Implantation, supports et circuits mesurés','تركيب ودعامات ومسارات مقاسة','Layout, mounting and measured circuits')}</DialogDescription></DialogHeader>{expanded&&content}</DialogContent></Dialog></>;
}
