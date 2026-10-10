// Test-only deterministic gateway. Never imported by the application or bridge.
const realFetch=globalThis.fetch;
globalThis.fetch=async function(input,init){
 const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 if(new URL(url).hostname!=='steg-test.example')return realFetch(input,init);
 const b=JSON.parse(init.body);
 const result=b.action==='resumeAccountStatus'&&b.captchaAnswer==='1234'
  ?{reference:b.reference,status:'paid',complete:true,balanceMillimes:0,observedAt:new Date().toISOString(),evidenceReference:'TEST-FIXTURE-NOT-STEG-EVIDENCE'}
  :{reference:b.reference,status:'captcha_required',sessionId:'test-provider-session',expiresAt:new Date(Date.now()+300000).toISOString(),challenge:{kind:'image',image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZioAAAAASUVORK5CYII=',prompt:'Fixture CAPTCHA 1234'}};
 return new Response(JSON.stringify(result),{headers:{'Content-Type':'application/json'}});
};
