import {byKey} from './modules';
import {toMillimes} from './domain';
export function parseCsv(source:string){
 source=source.replace(/^\uFEFF/,'');
 const delimiter=source.split(/\r?\n/,1)[0].includes(';')?';':',';
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
 for(let i=0;i<source.length;i++){
  const c=source[i];
  if(quoted){if(c==='"'){if(source[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(closed&&c!==delimiter&&c!=='\n'&&c!=='\r')throw new Error('invalid_csv');
  if(c==='"'){if(cell.length||closed)throw new Error('invalid_csv');quoted=true;}
  else if(c===delimiter){row.push(cell);cell='';closed=false;}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&source[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v!==''))rows.push(row);row=[];cell='';closed=false;}
  else cell+=c;
 }
 if(quoted)throw new Error('invalid_csv');row.push(cell);if(row.some(v=>v!==''))rows.push(row);
 if(rows.length<2)throw new Error('invalid_csv');const [rawHeaders,...data]=rows,headers=rawHeaders.map(h=>h.trim());
 if(headers.some(h=>!h)||new Set(headers).size!==headers.length)throw new Error('invalid_csv');
 return data.map(row=>{if(row.length!==headers.length)throw new Error('invalid_csv');return Object.fromEntries(headers.map((h,i)=>[h,row[i].trim()]));});
}
export function importCsv(kind:string,source:string){const mod=byKey[kind];if(!mod)throw new Error('invalid_module');return parseCsv(source).map(row=>{const data:Record<string,any>={};for(const [key,value] of Object.entries(row)){const f=mod.fields.find(f=>f.key===key||f.label.includes(key));const k=f?.key??key;if(!value)continue;if(k==='status')data.status=value;else if(!f)throw new Error('unknown_import_column:'+key);else data[k]=f.type==='money'?toMillimes(value):f.type==='number'?Number(value.replace(',','.')):value;}return data;});}
