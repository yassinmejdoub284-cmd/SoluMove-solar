import type {Entry} from './domain';

export type Vec3={x:number;y:number;z:number};
export type PlanLayer='roof'|'panels'|'supports'|'obstacles'|'dc'|'ac'|'earth';
export type PlanMesh={id:string;layer:PlanLayer;color:string;vertices:Vec3[];faces:number[][];label:string};
export type PlanWire={id:string;layer:PlanLayer;color:string;points:Vec3[];label:string;section:number;length:number};
export type PlanModel={meshes:PlanMesh[];wires:PlanWire[];width:number;length:number;height:number;roofHeight:number;tilt:number;assumedHeight:boolean;assumedClearance:boolean;bounds:{min:Vec3;max:Vec3}};
const boxFaces=[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
const point=(x:number,y:number,z:number):Vec3=>({x,y,z});
const finite=(value:unknown,fallback:number,min:number,max:number)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max?value:fallback;
export function planModel(entry:Entry):PlanModel{
 const s=entry.data.snapshot??entry.data.studySnapshot;if(!s)throw new Error('plan_not_generated');
 const width=finite(s.roofWidth,0,.1,1000),length=finite(s.roofLength,0,.1,1000);if(!width||!length)throw new Error('invalid_plan_geometry');
 const roofHeight=finite(s.roofHeight??entry.data.roofHeight,3,0,200),clearance=finite(s.panelClearance??entry.data.panelClearance,.2,.05,3),tilt=finite(s.tilt??entry.data.tilt,0,0,80),rise=Math.tan(tilt*Math.PI/180);
 const meshes:PlanMesh[]=[],wires:PlanWire[]=[];
 const box=(id:string,layer:PlanLayer,color:string,x:number,y:number,w:number,l:number,bottom:(y:number)=>number,top:(y:number)=>number,label:string)=>meshes.push({id,layer,color,label,vertices:[point(x,y,bottom(y)),point(x+w,y,bottom(y)),point(x+w,y+l,bottom(y+l)),point(x,y+l,bottom(y+l)),point(x,y,top(y)),point(x+w,y,top(y)),point(x+w,y+l,top(y+l)),point(x,y+l,top(y+l))],faces:boxFaces});
 box('roof','roof','#cbd5e1',0,0,width,length,()=>Math.max(0,roofHeight-.22),()=>roofHeight,'Toiture');
 // Facades provide elevation context; all cable points keep their measured Z.
 if(roofHeight>.22)box('building','roof','#94a3b8',0,0,width,length,()=>0,()=>roofHeight-.22,'Bâtiment');
 for(const p of s.panels??[]){const z=(y:number)=>roofHeight+clearance+(y-p.y)*rise;
  box('panel-'+p.number,'panels','#2563eb',p.x,p.y,p.width,p.length,y=>z(y),y=>z(y)+.04,`PV ${p.number}`);
 }
 for(const [i,r] of (s.rails??[]).entries()){
  const panel=(s.panels??[]).find((p:{y:number;length:number})=>r.y>=p.y-1e-6&&r.y<=p.y+p.length+1e-6),z=roofHeight+clearance+(r.y-(panel?.y??r.y))*rise;
  box('rail-'+i,'supports',s.support==='steel'?'#64748b':'#a5b4c4',r.x,r.y-.025,r.length,.05,()=>z-.06,()=>z,'Rail '+(i+1));
  for(let j=0;j<r.anchors;j++){const x=r.x+j*r.length/Math.max(1,r.anchors-1);
   box(`anchor-${i}-${j}`,'supports','#7c8da3',x-.02,r.y-.02,.04,.04,()=>roofHeight,()=>Math.max(roofHeight,z-.06),`Ancrage ${i+1}.${j+1}`);
  }
 }
 for(const [i,o] of (s.obstacles??[]).entries()){const h=finite(o.height??s.obstacleHeight??entry.data.obstacleHeight,1,.05,30);box('obstacle-'+i,'obstacles','#d97706',o.x,o.y,o.width,o.length,()=>roofHeight,()=>roofHeight+h,'Obstacle '+(i+1));}
 for(const [i,r] of (s.routes??[]).entries()){const layer=r.kind==='dc'?'dc':r.kind==='earth'?'earth':'ac';wires.push({id:'wire-'+i,layer,color:layer==='dc'?'#ef4444':layer==='earth'?'#22c55e':'#f97316',points:r.points,label:r.name,section:r.section,length:r.length});}
 const all=[...meshes.flatMap(m=>m.vertices),...wires.flatMap(w=>w.points)];if(all.some(p=>![p.x,p.y,p.z].every(Number.isFinite)))throw new Error('invalid_plan_geometry');
 const bounds={min:point(Math.min(...all.map(p=>p.x)),Math.min(...all.map(p=>p.y)),Math.min(...all.map(p=>p.z))),max:point(Math.max(...all.map(p=>p.x)),Math.max(...all.map(p=>p.y)),Math.max(...all.map(p=>p.z)))};
 return {meshes,wires,width,length,bounds,height:Math.max(roofHeight,...all.map(p=>p.z)),roofHeight,tilt,assumedHeight:s.roofHeight===undefined&&entry.data.roofHeight===undefined,assumedClearance:s.panelClearance===undefined&&entry.data.panelClearance===undefined};
}
export type PlanCamera={yaw:number;pitch:number;zoom:number};
export const defaultPlanCamera:PlanCamera={yaw:-35,pitch:38,zoom:1};
export function planProjector(model:PlanModel,camera:PlanCamera){
 const yaw=camera.yaw*Math.PI/180,pitch=camera.pitch*Math.PI/180,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const raw=(p:Vec3)=>({x:p.x*cy+p.y*sy,y:(-p.x*sy+p.y*cy)*sp-p.z*cp,depth:(-p.x*sy+p.y*cy)*cp+p.z*sp});
 const {min,max}=model.bounds,corners=[min.x,max.x].flatMap(x=>[min.y,max.y].flatMap(y=>[min.z,max.z].map(z=>raw({x,y,z}))));
 const left=Math.min(...corners.map(p=>p.x)),right=Math.max(...corners.map(p=>p.x)),top=Math.min(...corners.map(p=>p.y)),bottom=Math.max(...corners.map(p=>p.y));
 const scale=Math.min(720/Math.max(right-left,.1),440/Math.max(bottom-top,.1))*camera.zoom;
 return (p:Vec3)=>{const v=raw(p);return {x:400+(v.x-(left+right)/2)*scale,y:260+(v.y-(top+bottom)/2)*scale,depth:v.depth};};
}
export function projectPoint(p:Vec3,model:PlanModel,camera:PlanCamera){return planProjector(model,camera)(p);}
// OBJ is in metres and Z-up, with named objects and material colours in MTL.
export function planOBJ(entry:Entry){
 const model=planModel(entry),safe=String(entry.data.name??'SoluMove').replace(/[\r\n]/g,' '),out=[`# ${safe}`, '# SoluMove Solar | metres | Z-up | preliminary design','mtllib solar-plan.mtl'];let vertex=1;
 for(const mesh of model.meshes){out.push('o '+mesh.id,'usemtl '+mesh.layer);for(const p of mesh.vertices)out.push(`v ${p.x} ${p.y} ${p.z}`);for(const face of mesh.faces)out.push('f '+face.map(i=>i+vertex).join(' '));vertex+=mesh.vertices.length;}
 for(const wire of model.wires){out.push('o '+wire.id,'usemtl '+wire.layer);for(const p of wire.points)out.push(`v ${p.x} ${p.y} ${p.z}`);out.push('l '+wire.points.map((_,i)=>vertex+i).join(' '));vertex+=wire.points.length;}
 return out.join('\n')+'\n';
}
export const planMTL=()=>`# SoluMove Solar\n${Object.entries({roof:[.7,.76,.84],panels:[.08,.24,.65],supports:[.55,.63,.7],obstacles:[.85,.45,.03],dc:[.94,.27,.27],ac:[.97,.45,.09],earth:[.13,.77,.37]}).map(([name,rgb])=>`newmtl ${name}\nKd ${rgb.join(' ')}\nKa 0.15 0.15 0.15\nd 1\n`).join('\n')}`;
