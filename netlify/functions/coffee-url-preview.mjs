// Authenticated, bounded public HTTPS product metadata preview for any roaster.
// Unlike canonical verification, it NEVER creates/approves a public coffee.
// Existing Supabase publishing and trusted source rules are untouched.
import {safeCoffeeUrl,fetchPublicCoffeeHtml} from '../../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';

const json=(value,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}
});
const envDefault=key=>globalThis.Netlify?.env?.get?.(key)??process.env[key];
async function restCall(fetcher,base,key,token,path,method='GET'){
 const response=await fetcher(base+path,{
  method,signal:AbortSignal.timeout(6500),
  headers:{'apikey':key,'Authorization':'Bearer '+token,
   ...(method==='POST'?{'Content-Type':'application/json'}:{})},
  ...(method==='POST'?{body:'{}'}:{})
 });
 if(!response.ok)return null;
 return response.json();
}
export function createPreviewHandler({
 apiFetch=fetch,readHtml=fetchPublicCoffeeHtml,extract=extractPublicCoffeeFacts,env=envDefault
}={}){
 return async request=>{
  if(request.method!=='POST')return json({ok:false,reason:'method_not_allowed'},405);
  const origin=request.headers.get('origin');
  if(origin){
   let expected;try{expected=new URL(request.url).origin;}catch{return json({ok:false,reason:'invalid_request'},400);}
   if(origin!==expected)return json({ok:false,reason:'origin_not_allowed'},403);
  }
  if(!/application\/json/i.test(request.headers.get('content-type')||''))
   return json({ok:false,reason:'invalid_request'},415);
  const auth=(request.headers.get('authorization')||'').match(/^Bearer ([A-Za-z0-9._~-]+)$/);
  if(!auth)return json({ok:false,reason:'sign_in_required'},401);
  const base=env('SUPABASE_URL'),key=env('SUPABASE_PUBLISHABLE_KEY');
  if(typeof base!=='string'||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)||
     typeof key!=='string'||!key.startsWith('sb_publishable_'))
   return json({ok:false,reason:'preview_unavailable'},503);
  let source_url;
  try{
   if(Number(request.headers.get('content-length')||0)>4200)return json({ok:false,reason:'invalid_url'},400);
   const raw=await request.text();
   if(raw.length>4200)return json({ok:false,reason:'invalid_url'},400);
   source_url=JSON.parse(raw)?.source_url;
  }catch{return json({ok:false,reason:'invalid_url'},400);}
  const validated=safeCoffeeUrl(source_url);
  if(!validated)return json({ok:false,reason:'invalid_url'},400);
  try{
   // Tokens stay between the Collective web origin and Supabase; they are
   // NEVER forwarded to the third-party page's outbound HTTP request.
   const user=await restCall(apiFetch,base,key,auth[1],'/auth/v1/user');
   if(!user?.id)return json({ok:false,reason:'sign_in_required'},401);
   const status=await restCall(apiFetch,base,key,auth[1],'/rest/v1/rpc/dic_session_status','POST');
   if(status?.admitted!==true||status?.emailVerified!==true)
    return json({ok:false,reason:'admitted_member_required'},403);
   const claim=await restCall(apiFetch,base,key,auth[1],'/rest/v1/rpc/dic_claim_universal_preview','POST');
   if(claim?.allowed!==true)
    return json({ok:false,reason:claim?.reason||'preview_unavailable'},claim?.reason==='preview_cooldown'||claim?.reason==='daily_preview_limit'?429:503);
   const page=await readHtml(validated.toString());
   if(!page?.ok)return json({ok:false,reason:page?.reason||'source_unavailable'});
   const preview=extract(page.html,{source_url:validated.toString()});
   if(!preview?.ok)return json({ok:false,reason:preview?.reason||'ambiguous_or_missing_product'});
   return json({...preview,source_url:validated.toString(),verification:'unverified',
    note:'Suggestions from a public page; exact roaster and release need verification.'});
  }catch{return json({ok:false,reason:'preview_unavailable'},503);}
 };
}
export default createPreviewHandler();
export const config={
 path:'/api/coffee-preview',method:['POST'],
 rateLimit:{action:'rate_limit',windowSize:60,windowLimit:12,aggregateBy:['ip']}
};
