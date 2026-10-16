// Server-only, allowlisted official product verification.
// The browser cannot supply verification evidence or write canonical records.
// Supabase JWT gateway verification must stay ENABLED.
import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {extractOfficialEvidence,officialProductUrl} from './evidence.mjs';

const allowOrigins=new Set([
 'https://app.dialincollective.com',
 'https://the-dial-in-collective.netlify.app',
 'http://localhost:5173',
 'http://localhost:8888',
]);
const json=(data,status=200,origin='')=>new Response(JSON.stringify(data),{
 status,headers:{
  'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store',
  ...(allowOrigins.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})
 }
});
async function readSmallHtml(url){
 const reply=await fetch(url,{
  redirect:'manual',
  signal:AbortSignal.timeout(10000),
  headers:{'Accept':'text/html,application/xhtml+xml','User-Agent':'DialInCollective-OfficialProductVerifier/1.0'}
 });
 if(reply.status>=300&&reply.status<400)return {ok:false,reason:'redirect_requires_review'};
 if(!reply.ok)return {ok:false,reason:'source_unavailable'};
 const type=(reply.headers.get('content-type')||'').toLowerCase();
 if(!type.includes('text/html')&&!type.includes('application/xhtml+xml'))return {ok:false,reason:'not_html'};
 const announced=Number(reply.headers.get('content-length')||0);
 if(announced>950000)return {ok:false,reason:'page_too_large'};
 const reader=reply.body?.getReader();
 if(!reader)return {ok:false,reason:'source_unavailable'};
 const decoder=new TextDecoder(),fragments=[];let bytes=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   bytes+=value?.byteLength||0;
   if(bytes>950000){await reader.cancel();return {ok:false,reason:'page_too_large'};}
   fragments.push(decoder.decode(value,{stream:true}));
  }
  fragments.push(decoder.decode());
  return {ok:true,html:fragments.join('')};
 }finally{reader.releaseLock();}
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 if(origin&&!allowOrigins.has(origin))return json({ok:false,reason:'origin_not_allowed'},403,'');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{
  'Access-Control-Allow-Origin':allowOrigins.has(origin)?origin:'null',
  'Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Access-Control-Max-Age':'3600','Vary':'Origin'
 }});
 if(req.method!=='POST')return json({ok:false,reason:'method_not_allowed'},405,origin);
 const auth=req.headers.get('authorization')||'';
 const token=auth.startsWith('Bearer ')?auth.slice(7):'';
 if(!token)return json({ok:false,reason:'sign_in_required'},401,origin);
 const base=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),
       secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!base||!anon||!secret)return json({ok:false,reason:'verification_not_configured'},503,origin);
 try{
  const payload=await req.json();
  const sid=payload?.submission_id;
  if(typeof sid!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sid))
   return json({ok:false,reason:'invalid_submission'},400,origin);
  const userClient=createClient(base,anon,{auth:{persistSession:false,autoRefreshToken:false},
   global:{headers:{Authorization:'Bearer '+token}}});
  const {data:userResult,error:userError}=await userClient.auth.getUser(token);
  if(userError||!userResult?.user?.id)return json({ok:false,reason:'sign_in_required'},401,origin);
  const privileged=createClient(base,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:row,error:readError}=await privileged.from('coffee_submissions')
   .select('id,owner_id,status,canonical_coffee_id').eq('id',sid).maybeSingle();
  if(readError)return json({ok:false,reason:'verification_unavailable'},503,origin);
  if(!row||row.owner_id!==userResult.user.id)return json({ok:false,reason:'submission_not_accessible'},403,origin);
  if(row.status==='approved'||row.status==='merged')
   return json({ok:true,status:'verified',coffee_id:row.canonical_coffee_id},200,origin);
  if(!['pending','conflict'].includes(row.status))return json({ok:false,status:'pending',reason:'not_eligible'},200,origin);
  const {data:target,error:targetError}=await privileged.rpc('dic_source_check_target',{submission_id:sid});
  if(targetError||!target?.official_host)return json({ok:false,status:'pending',reason:'no_verified_roaster_source'},200,origin);
  const link=officialProductUrl(target.source_url,target.official_host);
  if(!link)return json({ok:false,status:'pending',reason:'untrusted_source_url'},200,origin);
  const {data:claim,error:claimError}=await privileged.rpc('dic_source_claim',{submission_id:sid});
  if(claimError||claim?.allowed!==true)return json({ok:false,status:'pending',reason:claim?.reason||'rate_limited'},200,origin);
  let page;
  try{page=await readSmallHtml(link);}catch{return json({ok:false,status:'pending',reason:'source_fetch_failed'},200,origin);}
  if(!page.ok)return json({ok:false,status:'pending',reason:page.reason},200,origin);
  const inspected=extractOfficialEvidence(page.html,{...target,source_url:link});
  if(!inspected.ok)return json({ok:false,status:'pending',reason:inspected.reason},200,origin);
  const evidence={
   ...inspected,checked_url:link,
   // Supabase checks the exact current submission URL and roaster domain again.
   official_page_confirmed:true
  };
  const {data:promoted,error:promoteError}=await privileged.rpc('dic_trusted_source_verify',
   {submission_id:sid,evidence});
  if(promoteError)return json({ok:false,status:'pending',reason:'verification_requires_review'},200,origin);
  if(!promoted?.ok)return json({ok:false,status:'pending',reason:promoted?.code||'needs_confirmation'},200,origin);
  return json({ok:true,status:'verified',coffee_id:promoted.coffee_id,canonical_name:promoted.canonical_name},200,origin);
 }catch{
  return json({ok:false,status:'pending',reason:'verification_failed'},200,origin);
 }
});
