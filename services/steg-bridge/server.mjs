import http from 'node:http';
import {randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {allowedPortalRequest,extractBalance} from './policy.mjs';
import {sessionView} from './view.mjs';
const required=key=>{if(!process.env[key])throw Error('Missing configuration: '+key);return process.env[key]};
const token=required('STEG_GATEWAY_TOKEN'),publicURL=new URL(required('BRIDGE_PUBLIC_URL')),appOrigin=new URL(required('APP_ORIGIN')).origin;
if(token.length<32||publicURL.protocol!=='https:')throw Error('HTTPS and a strong bridge token are required');
const loginURL=process.env.STEG_LOGIN_URL??'https://espace.steg.com.tn/fr/espace/login.php',loginAction=required('STEG_LOGIN_ACTION');
const hosts=['espace.steg.com.tn','www.steg.com.tn'],captchaHosts=(process.env.CAPTCHA_HOSTS??'www.google.com,www.gstatic.com,www.recaptcha.net,challenges.cloudflare.com,newassets.hcaptcha.com,hcaptcha.com').split(',').map(s=>s.trim()).filter(Boolean);
for(const url of [loginURL,loginAction])if(!hosts.includes(new URL(url).hostname)||new URL(url).protocol!=='https:')throw Error('STEG URL must be an approved official HTTPS host');
const referenceSelector=required('STEG_REFERENCE_SELECTOR'),balanceSelector=required('STEG_BALANCE_SELECTOR'),completeSelector=required('STEG_COMPLETE_SELECTOR'),completePattern=required('STEG_COMPLETE_PATTERN');new RegExp(completePattern);
const sessions=new Map(),ttl=8*60000,browser=await chromium.launch({headless:true});
const send=(res,status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});res.end(typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body))};
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>12000)throw Error('request_too_large')}return JSON.parse(raw);}
async function close(id){const s=sessions.get(id);if(s){sessions.delete(id);await s.context.close().catch(()=>{});}}
const gc=setInterval(()=>{for(const [id,s] of sessions)if(s.expires<=Date.now())void close(id)},15000);gc.unref();
function authorized(req){const input=Buffer.from(req.headers.authorization??''),expected=Buffer.from('Bearer '+token);return input.length===expected.length&&timingSafeEqual(input,expected)}
function session(id){const s=sessions.get(id);if(!s||s.expires<=Date.now())throw Error('expired_session');return s;}
function challenge(s){return {reference:s.reference,status:'captcha_required',sessionId:s.id,expiresAt:new Date(s.expires).toISOString(),challenge:{kind:'interactive',url:new URL('/session/'+s.viewToken,publicURL).href,prompt:'Résolvez le CAPTCHA dans votre session STEG, puis reprenez la vérification.'}}}
async function result(s){
 const page=s.page;if(!hosts.includes(new URL(page.url()).hostname))return null;
 try{const read=async selector=>{const locator=page.locator(selector);if(await locator.count()!==1||!await locator.isVisible())throw Error('incomplete');return (await locator.innerText({timeout:1200})).trim()};const data=extractBalance({referenceText:await read(referenceSelector),balanceText:await read(balanceSelector),completeText:await read(completeSelector),reference:s.reference,completePattern});const screenshot=await page.screenshot();return {...data,observedAt:new Date().toISOString(),evidenceReference:'steg-session-sha256:'+createHash('sha256').update(screenshot).digest('hex')};}catch{return null;}
}
const server=http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://bridge.local');
 if(req.method==='POST'&&u.pathname==='/account-status'){
  if(!authorized(req))return send(res,401,{error:'unauthorized'});const b=await body(req);if(!/^\d{9}$/.test(b.reference??'')||!b.consentId)return send(res,400,{error:'invalid_reference'});
  let s;
  if(b.action==='accountStatus'){
   if(sessions.size>=20)return send(res,429,{error:'session_limit'});if(!b.credentials?.login||!b.credentials?.password)return send(res,400,{error:'credentials_required'});
   const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:false,serviceWorkers:'block'});
   await context.route('**/*',route=>allowedPortalRequest(route.request().url(),route.request().method(),{hosts,loginAction,captchaHosts})?route.continue():route.abort());
   context.on('page',page=>{if(context.pages().length>1)void page.close()});const page=await context.newPage();page.setDefaultTimeout(12000);page.on('dialog',d=>void d.dismiss());
   const id=randomBytes(24).toString('hex');s={id,viewToken:randomBytes(32).toString('hex'),reference:b.reference,expires:Date.now()+ttl,context,page,locked:false};sessions.set(id,s);
   try{await page.goto(loginURL,{waitUntil:'domcontentloaded',timeout:20000});await page.locator(required('STEG_USERNAME_SELECTOR')).fill(b.credentials.login);await page.locator(required('STEG_PASSWORD_SELECTOR')).fill(b.credentials.password);await page.locator(required('STEG_SUBMIT_SELECTOR')).click();}catch{await close(id);return send(res,503,{error:'portal_login_unavailable'});}
  }else if(b.action==='resumeAccountStatus'){s=session(b.sessionId);if(s.reference!==b.reference)return send(res,400,{error:'invalid_reference'});}else return send(res,400,{error:'invalid_action'});
  if(s.locked)return send(res,409,{error:'session_busy'});s.locked=true;try{const data=await result(s);if(data){await close(s.id);return send(res,200,data);}return send(res,200,challenge(s));}finally{s.locked=false;}
 }
 const match=/^\/session\/([a-f0-9]{64})(?:\/(screen|control))?$/.exec(u.pathname);if(!match)return send(res,404,{error:'not_found'});
 const s=[...sessions.values()].find(s=>s.viewToken===match[1]);if(!s||s.expires<=Date.now())return send(res,410,{error:'expired_session'});
 if(req.method==='GET'&&!match[2]){const nonce=randomBytes(18).toString('base64');res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; img-src blob:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors ${appOrigin}`);return send(res,200,sessionView(s.viewToken,nonce),'text/html; charset=utf-8');}
 if(s.locked)return send(res,409,{error:'session_busy'});s.locked=true;try{
  if(req.method==='GET'&&match[2]==='screen')return send(res,200,await s.page.screenshot({type:'jpeg',quality:80}),'image/jpeg');
  if(req.method==='POST'&&match[2]==='control'){
   if(req.headers.origin!==publicURL.origin)return send(res,403,{error:'invalid_origin'});const b=await body(req);
   if(['down','up','move'].includes(b.type)){if(!Number.isFinite(b.x)||!Number.isFinite(b.y)||b.x<0||b.x>1280||b.y<0||b.y>900)return send(res,400,{error:'invalid_coordinates'});await s.page.mouse.move(b.x,b.y);if(b.type==='down')await s.page.mouse.down();if(b.type==='up')await s.page.mouse.up();}
   else if(b.type==='text'&&typeof b.text==='string'&&b.text.length<=500)await s.page.keyboard.insertText(b.text);
   else if(b.type==='key'&&['Tab','Enter','Backspace','ArrowLeft','ArrowRight'].includes(b.key))await s.page.keyboard.press(b.key);
   else if(b.type==='scroll'&&Number.isFinite(b.dy)&&Math.abs(b.dy)<=900)await s.page.mouse.wheel(0,b.dy);
   else return send(res,400,{error:'invalid_action'});return send(res,200,{ok:true});
  }
 }finally{s.locked=false;}return send(res,405,{error:'method_not_allowed'});
}catch{if(!res.headersSent)send(res,400,{error:'bridge_request_rejected'});else res.end();}});
server.listen(Number(process.env.PORT??4330),'127.0.0.1',()=>console.log('STEG bridge ready on the configured local port.'));
async function stop(){clearInterval(gc);server.close();for(const id of sessions.keys())await close(id);await browser.close();process.exit(0)}process.on('SIGTERM',()=>void stop());process.on('SIGINT',()=>void stop());
