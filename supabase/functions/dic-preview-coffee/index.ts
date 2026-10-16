// Read-only, authenticated official-roaster URL preview.
// No coffee facts are saved, no AI keys are used, and raw arbitrary hosts
// are never fetched. Supabase's Edge JWT verification must remain enabled.
import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {officialPreviewUrl,extractProductPreview} from './preview.mjs';

const allowOrigins=new Set([
 'https://app.dialincollective.com',
 'https://the-dial-in-collective.netlify.app',
 'http://localhost:5173',
 'http://localhost:8888'
]);
const respond=(body,status=200,origin='')=>new Response(JSON.stringify(body),{
 status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store',
  ...(allowOrigins.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}
});
async function readBoundedHtml(url){
 const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(10000),
  headers:{Accept:'text/html,application/xhtml+xml', 'User-Agent':'DialInCollective-OfficialURLPreview/1.0'}});
 if(response.status>=300&&response.status<400)return {ok:false,reason:'redirect_requires_review'};
 if(!response.ok)return {ok:false,reason:'source_unavailable'};
 const type=(response.headers.get('content-type')||'').toLowerCase();
 if(!type.includes('text/html')&&!type.includes('application/xhtml+xml'))return {ok:false,reason:'not_html'};
 const max=950000,reported=Number(response.headers.get('content-length')||0);
 if(reported>max)return {ok:false,reason:'page_too_large'};
 const reader=response.body?.getReader();if(!reader)return {ok:false,reason:'source_unavailable'};
 const chunks=[];const decoder=new TextDecoder();let size=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;
   size+=value?.byteLength||0;
   if(size>max){await reader.cancel();return {ok:false,reason:'page_too_large'};}
   chunks.push(decoder.decode(value,{stream:true}));}
  chunks.push(decoder.decode());return {ok:true,html:chunks.join('')};
 }finally{reader.releaseLock();}
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 if(origin&&!allowOrigins.has(origin))return respond({ok:false,reason:'origin_not_allowed'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{
  'Access-Control-Allow-Origin':allowOrigins.has(origin)?origin:'null',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type',
  'Access-Control-Max-Age':'3600','Vary':'Origin'
 }});
 if(req.method!=='POST')return respond({ok:false,reason:'method_not_allowed'},405,origin);
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!token)return respond({ok:false,reason:'sign_in_required'},401,origin);
 const base=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),
       service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!base||!anon||!service)return respond({ok:false,reason:'not_configured'},503,origin);
 try{
  const body=await req.json();const source_url=body?.source_url;
  if(typeof source_url!=='string'||source_url.length>4000)return respond({ok:false,reason:'invalid_url'},400,origin);
  let url;try{url=new URL(source_url);}catch{return respond({ok:false,reason:'invalid_url'},400,origin);}
  if(url.protocol!=='https:'||url.port||url.username||url.password||url.hash||
     !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(url.hostname))return respond({ok:false,reason:'invalid_url'},400,origin);
  const userClient=createClient(base,anon,{auth:{persistSession:false,autoRefreshToken:false},
   global:{headers:{Authorization:'Bearer '+token}}});
  const {data:identity,error:identityError}=await userClient.auth.getUser(token);
  if(identityError||!identity?.user?.id)return respond({ok:false,reason:'sign_in_required'},401,origin);
  const {data:status,error:statusError}=await userClient.rpc('dic_session_status');
  if(statusError||status?.admitted!==true)return respond({ok:false,reason:'admitted_member_required'},403,origin);
  const trusted=createClient(base,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const hostname=url.hostname.toLowerCase().replace(/^www\./,'');
  const {data:roaster,error:roasterError}=await trusted.rpc('dic_roaster_preview_target',{host:hostname});
  if(roasterError||!roaster?.official_domain||!roaster?.canonical_name)
   return respond({ok:false,reason:'unrecognized_official_roaster'},200,origin);
  const checked=officialPreviewUrl(source_url,roaster.official_domain);
  if(!checked)return respond({ok:false,reason:'unsupported_official_product_url'},200,origin);
  const {data:claim,error:claimError}=await trusted.rpc('dic_url_preview_claim',{account_id:identity.user.id});
  if(claimError||claim?.allowed!==true)return respond({ok:false,reason:claim?.reason||'preview_rate_limited'},429,origin);
  let page;try{page=await readBoundedHtml(checked);}catch{return respond({ok:false,reason:'source_fetch_failed'},200,origin);}
  if(!page.ok)return respond(page,200,origin);
  const preview=extractProductPreview(page.html,{source_url:checked,roaster:roaster.canonical_name});
  if(!preview.ok)return respond(preview,200,origin);
  // Catalog match is read-only. A URL may be reused for successive harvests:
  // backend matcher must demand compatible release and title for silent reuse.
  let match=null;
  const {data:lookup,error:lookupError}=await userClient.rpc('dic_find_coffee_matches',{
   payload:{...preview.fields,source_url:checked}
  });
  if(!lookupError)match=lookup;
  return respond({...preview,source_url:checked,match},200,origin);
 }catch{return respond({ok:false,reason:'preview_unavailable'},200,origin);}
});
