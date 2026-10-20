// Authenticated, bounded public HTTPS product metadata preview for any roaster.
// Unlike canonical verification, it NEVER creates/approves a public coffee.
// Existing Supabase publishing and trusted source rules are untouched.
import {safeCoffeeUrl,fetchPublicCoffeeHtml} from '../../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {extractEcwidProduct,ecwidProductRequest,sameEcwidTitle} from '../../src/server/coffee-ecwid-snapshot.mjs';
import {shopifyProductRequest,extractShopifyProduct,mergePublicProductPreview} from '../../src/server/coffee-shopify-ajax.mjs';
import {wooProductRequest,extractWooProduct} from '../../src/server/coffee-woocommerce-store.mjs';

const json=(value,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}
});
const envDefault=key=>globalThis.Netlify?.env?.get?.(key)??process.env[key];
async function readRequest(request){
 const max=4200;
 if(Number(request.headers.get('content-length')||0)>max)throw new Error('request_too_large');
 const reader=request.body?.getReader();if(!reader)throw new Error('missing_request');
 const decoder=new TextDecoder(),chunks=[];let size=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;if(size>max){await reader.cancel();throw new Error('request_too_large');}
   chunks.push(decoder.decode(value,{stream:true}));
  }
  chunks.push(decoder.decode());return JSON.parse(chunks.join(''));
 }finally{reader.releaseLock();}
}
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
 apiFetch=fetch,readHtml=fetchPublicCoffeeHtml,readJson,extract=extractPublicCoffeeFacts,env=envDefault
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
   source_url=(await readRequest(request))?.source_url;
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
   // A known public Ecwid store ID allows one small, product-specific
   // read instead of retrieving a 600KB+ Wix catalog shell.
   const knownEcwid=ecwidProductRequest(validated.toString());
   let finalUrl=validated.toString();
   let preview=knownEcwid?await extractEcwidProduct(finalUrl,'',{readJson,extract}):null;
   if(!preview?.ok){
    const page=await readHtml(validated.toString());
    if(!page?.ok){
     // Some Shopify pages exceed the HTML bound or refuse HTML, while their
     // public exact-handle product JSON may still be safely accessible.
     const fromPublic=shopifyProductRequest(finalUrl)?
      await extractShopifyProduct(finalUrl,{readJson,extract}):
      wooProductRequest(finalUrl)?await extractWooProduct(finalUrl,{readJson,extract}):null;
     if(!fromPublic?.ok)return json({ok:false,reason:page?.reason||'source_unavailable'});
     preview=fromPublic;
    }else{
    finalUrl=typeof page.source_url==='string'&&safeCoffeeUrl(page.source_url)?page.source_url:validated.toString();
    const embeddedEcwid=!knownEcwid?ecwidProductRequest(finalUrl,page.html):null;
    if(embeddedEcwid)
     preview=await extractEcwidProduct(finalUrl,page.html,{readJson,extract});
    if(!preview?.ok){
     preview=extract(page.html,{source_url:finalUrl});
     // For an identified Ecwid deep link, avoid treating the general shop
     // heading or an unrelated product card as the selected coffee.
     if(embeddedEcwid&&preview?.ok&&!sameEcwidTitle(preview.fields?.name,embeddedEcwid.expectedName))
      preview={ok:false,reason:'ambiguous_or_missing_product'};
    }
    if(!preview?.ok||!preview.fields?.tasting_notes){
     const fromPublic=shopifyProductRequest(finalUrl)?
      await extractShopifyProduct(finalUrl,{readJson,extract}):
      wooProductRequest(finalUrl)?await extractWooProduct(finalUrl,{readJson,extract}):null;
     preview=mergePublicProductPreview(preview,fromPublic);
    }
    }
   }
   if(!preview?.ok)return json({ok:false,reason:preview?.reason||'ambiguous_or_missing_product'});
   return json({...preview,source_url:validated.toString(),...(finalUrl!==validated.toString()?{resolved_url:finalUrl}:{}),verification:'unverified',
    note:'Suggestions from a public page; exact roaster and release need verification.'});
  }catch{return json({ok:false,reason:'preview_unavailable'},503);}
 };
}
export default createPreviewHandler();
export const config={
 path:'/api/coffee-preview',method:['POST'],
 rateLimit:{action:'rate_limit',windowSize:60,windowLimit:12,aggregateBy:['ip']}
};
