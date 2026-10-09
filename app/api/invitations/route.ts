import { access, assertAdmin, failure } from '@/lib/solar/server';
import { checkOrigin, createInvitation } from '@/lib/vercel/activation';
export async function POST(request: Request) {
  try {
    const ctx=await access(); assertAdmin(ctx); checkOrigin(request);
    const raw=await request.text(); if(raw.length>2000)throw new Error('request_too_large');
    const {recordId}=JSON.parse(raw); if(typeof recordId!=='string')throw new Error('not_found');
    const {token}=await createInvitation(ctx.owner,recordId);
    // Fragment keeps the invitation secret out of HTTP URLs, referrers and logs.
    return Response.json({url:`${new URL(request.url).origin}/sign-in#invite=${token}`},{headers:{'Cache-Control':'no-store'}});
  } catch(e){return failure(e);}
}
