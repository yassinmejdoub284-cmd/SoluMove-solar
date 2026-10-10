export function millimes(text){
 const s=String(text).replace(/\u00a0/g,' ').trim();
 // A single, explicit amount; do not sum invoices or infer zero from an empty list.
 const match=/^([0-9][0-9 ]*)(?:[.,]([0-9]{1,3}))?\s*(?:TND|DT|د\.ت)?$/i.exec(s);if(!match)throw new Error('unrecognized_balance');
 const n=Number(match[1].replace(/ /g,''))*1000+Number((match[2]??'').padEnd(3,'0'));if(!Number.isSafeInteger(n)||n>1e12)throw new Error('invalid_balance');return n;
}
export function allowedPortalRequest(url,method,{hosts,loginAction,captchaHosts}){
 let u;try{u=new URL(url)}catch{return false}
 if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443')return false;
 if(!hosts.includes(u.hostname)&&!captchaHosts.includes(u.hostname))return false;
 if(/(?:payer|paybill|checkout|delete|transaction|purchase)/i.test(u.pathname))return false;
 return ['GET','HEAD'].includes(method)||method==='POST'&&(u.href===loginAction||captchaHosts.includes(u.hostname));
}
export function extractBalance({referenceText,balanceText,completeText,reference,completePattern}){
 if(!/^\d{9}$/.test(reference)||String(referenceText).replace(/\s/g,'')!==reference||!(new RegExp(completePattern,'i')).test(completeText))throw new Error('incomplete_account_summary');
 const balanceMillimes=millimes(balanceText);return {reference,status:balanceMillimes===0?'paid':'unpaid',complete:true,balanceMillimes};
}
