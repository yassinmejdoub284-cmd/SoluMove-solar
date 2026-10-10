import type {Entry} from './domain';
export const calendarKinds=new Set(['planning','tasks','agendaEvents']);
export const agendaSourceKinds=new Set([...calendarKinds,'visits','missions','leave','tickets','dossiers']);
export const DAY=86400000;
export const dayNumber=(date:string)=>Date.parse(date+'T00:00:00Z');
export const dateOf=(n:number)=>new Date(n).toISOString().slice(0,10);
export const addDays=(date:string,n:number)=>dateOf(dayNumber(date)+n*DAY);
export const tunisDate=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Tunis'});
export function validDate(v:unknown):v is string{return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(dayNumber(v))&&dateOf(dayNumber(v))===v;}
const minute=(v:string)=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(v??''))throw new Error('invalid_agenda_time');const [h,m]=v.split(':').map(Number);return h*60+m;};
export function assignees(d:Entry['data']):string[]{return [...new Set<string>([d.employeeId,...(d.participants??[]).map((r:{employeeId:string})=>r.employeeId)].filter(Boolean))];}
export function validateAgenda(d:Entry['data'],kind:string){
 if(!calendarKinds.has(kind))return;
 if(d.reminderMinutes!==undefined&&!Number.isInteger(d.reminderMinutes))throw new Error('invalid_agenda_reminder');
 if(d.time)minute(d.time);if(d.endTime)minute(d.endTime);
 if(kind==='tasks'){if(d.date&&d.date>d.dueDate)throw new Error('invalid_agenda_range');if(d.time&&(!d.date||!d.hours))throw new Error('agenda_duration_required');if(d.status==='done'&&(d.checklist??[]).some((r:{done:string})=>r.done!=='yes'))throw new Error('task_checklist_incomplete');return;}
 if(kind==='planning'){if(d.time&&!d.hours||!d.time&&d.hours)throw new Error('agenda_duration_required');if(d.hours>168)throw new Error('invalid_agenda_duration');return;}
 d.endDate=d.endDate??d.date;d.allDay=d.allDay??'no';d.repeat=d.repeat??'none';d.repeatInterval=d.repeatInterval??1;
 if(d.endDate<d.date||dayNumber(d.endDate)-dayNumber(d.date)>31*DAY)throw new Error('invalid_agenda_range');
 if(d.allDay!=='yes'&&(!d.time||!d.endTime||dayNumber(d.endDate)+minute(d.endTime)*60000<=dayNumber(d.date)+minute(d.time)*60000))throw new Error('invalid_agenda_range');
 if(d.repeat!=='none'){if(!d.repeatUntil||d.repeatUntil<d.date||dayNumber(d.repeatUntil)-dayNumber(d.date)>366*DAY||!Number.isInteger(d.repeatInterval))throw new Error('invalid_agenda_recurrence');}
 const excluded=String(d.excludedDates??'').trim().split(/\r?\n/).filter(Boolean);if(excluded.length>366||excluded.some(v=>!validDate(v)||v<d.date||v>(d.repeatUntil??d.endDate)))throw new Error('invalid_agenda_exceptions');
 if(new Set((d.participants??[]).map((r:{employeeId:string})=>r.employeeId)).size!==(d.participants??[]).length)throw new Error('duplicate_participant');
}
export type AgendaItem={id:string;recordId:string;kind:string;name:string;date:string;endDate:string;start:number;end:number;allDay:boolean;deadline:boolean;employeeIds:string[];projectId?:string;clientId?:string;agencyId?:string;status:string;priority:string;location?:string;recurring:boolean;reminderMinutes:number;completed:boolean;blocksAvailability:boolean};
export function agendaItems(records:Entry[],from:string,to:string):AgendaItem[]{
 if(!validDate(from)||!validDate(to)||to<from||dayNumber(to)-dayNumber(from)>92*DAY)throw new Error('invalid_agenda_period');
 const result:AgendaItem[]=[];
 for(const e of records){if(!agendaSourceKinds.has(e.kind))continue;const d=e.data;if([d.time,d.endTime,d.returnTime].some(v=>v&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)))continue;
  const date=e.kind==='leave'?d.startDate:e.kind==='tasks'?d.date??d.dueDate:e.kind==='tickets'?d.dueDate:e.kind==='dossiers'?d.nextDate:d.date;if(!validDate(date))continue;
  const finish=e.kind==='leave'?d.endDate:e.kind==='agendaEvents'?d.endDate??date:date;if(!validDate(finish))continue;
  const deadline=['tasks','tickets','dossiers'].includes(e.kind)&&!d.time,allDay=!d.time||e.kind==='leave'||d.allDay==='yes';
  const completed=['done','completed','cancelled','rejected','postponed','closed','resolved','refused','commissioned'].includes(d.status);
  // Requested absences do not reserve availability; approved leave does.
  const reserveLeave=e.kind!=='leave'||d.status==='approved';
  const recurring=e.kind==='agendaEvents'&&d.repeat&&d.repeat!=='none';const until=recurring&&validDate(d.repeatUntil)?d.repeatUntil:date;
  const excluded=new Set(String(d.excludedDates??'').split(/\r?\n/));
  for(let i=0;i<367;i++){
   let occurrence=date;
   if(i&&recurring){const step=(d.repeatInterval??1)*i;if(d.repeat==='monthly'){const dt=new Date(dayNumber(date)),target=new Date(Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth()+step,1)),last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(Math.min(dt.getUTCDate(),last));occurrence=dateOf(target.getTime());}else occurrence=addDays(date,step*(d.repeat==='weekly'?7:1));}
   if(occurrence>until||occurrence>to)break;
   const endDate=addDays(occurrence,(dayNumber(finish)-dayNumber(date))/DAY);
   if(endDate>=from&&!excluded.has(occurrence)){
    const start=dayNumber(occurrence)+(allDay?0:minute(d.time)*60000);
    const end=allDay?dayNumber(addDays(endDate,1)):e.kind==='agendaEvents'?dayNumber(endDate)+minute(d.endTime)*60000:e.kind==='missions'&&d.returnTime?dayNumber(occurrence)+minute(d.returnTime)*60000:start+(d.hours??1)*3600000;
    result.push({id:e.id+':'+occurrence,recordId:e.id,kind:e.kind,name:d.name,date:occurrence,endDate:dateOf(Math.max(start,end-1)),start,end,allDay,deadline,employeeIds:assignees(d),projectId:d.projectId,clientId:d.clientId,agencyId:d.agencyId,status:d.status,priority:d.priority??'normal',location:d.location??d.destination,recurring:!!recurring,reminderMinutes:d.reminderMinutes??0,completed,blocksAvailability:reserveLeave});
   }
   if(!recurring)break;
  }
 }
 return result.sort((a,b)=>a.start-b.start||a.name.localeCompare(b.name));
}
export function agendaConflicts(items:AgendaItem[]){const active=items.filter(e=>!e.completed&&e.blocksAvailability!==false&&!e.deadline&&e.employeeIds.length).sort((a,b)=>a.start-b.start),out:{a:string;b:string;employeeId:string}[]=[];
 for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){const a=active[i],b=active[j];if(b.start>=a.end&&b.start>=a.start)break;if(a.start<b.end&&b.start<a.end)for(const employeeId of a.employeeIds)if(b.employeeIds.includes(employeeId))out.push({a:a.id,b:b.id,employeeId});}
 return out;
}
export function agendaICS(items:AgendaItem[]){
 const escape=(v:string)=>String(v).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/[,;]/g,'\\$&');
 const local=(n:number)=>new Date(n).toISOString().slice(0,19).replace(/[-:]/g,'');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SoluMove Solar//Agenda//FR','CALSCALE:GREGORIAN','BEGIN:VTIMEZONE','TZID:Africa/Tunis','BEGIN:STANDARD','DTSTART:19700101T000000','TZOFFSETFROM:+0100','TZOFFSETTO:+0100','TZNAME:CET','END:STANDARD','END:VTIMEZONE'];
 for(const e of items){lines.push('BEGIN:VEVENT',`UID:${escape(e.id)}@solumove`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z/,'Z')}`,`SUMMARY:${escape(e.name)}`,`DTSTART${e.allDay?';VALUE=DATE:':';TZID=Africa/Tunis:'}${e.allDay?e.date.replace(/-/g,''):local(e.start)}`,`DTEND${e.allDay?';VALUE=DATE:':';TZID=Africa/Tunis:'}${e.allDay?dateOf(e.end).replace(/-/g,''):local(e.end)}`,`STATUS:${e.status==='cancelled'?'CANCELLED':'CONFIRMED'}`);if(e.location)lines.push('LOCATION:'+escape(e.location));if(e.reminderMinutes>0&&!e.completed)lines.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+escape(e.name),'TRIGGER:-PT'+e.reminderMinutes+'M','END:VALARM');lines.push('END:VEVENT');}
 lines.push('END:VCALENDAR');
 // Fold by UTF-8 octets (RFC 5545), including Arabic names.
 return lines.flatMap(line=>{const folded:string[]=[];let row='',bytes=0;for(const char of line){const n=new TextEncoder().encode(char).length;if(bytes+n>75){folded.push(row);row=' ';bytes=1;}row+=char;bytes+=n;}folded.push(row);return folded;}).join('\r\n')+'\r\n';
}
