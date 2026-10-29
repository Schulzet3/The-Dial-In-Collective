import {readBoundedJson} from '../../supabase/functions/_shared/request-budget.mjs';
// Authenticated, bounded public HTTPS product metadata preview for any roaster.
// Unlike canonical verification, it NEVER creates/approves a public coffee.
// Existing Supabase publishing and trusted source rules are untouched.
import {safeCoffeeUrl,fetchPublicCoffeeHtml,fetchPublicCoffeeProductRetry,isCoffeeProductDetailUrl} from '../../src/server/coffee-url-guard.mjs';
import {compactCoffeeProductHtml} from '../../src/server/coffee-product-prep.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {extractEcwidProduct,ecwidProductRequest,sameEcwidTitle} from '../../src/server/coffee-ecwid-snapshot.mjs';
import {shopifyProductRequest,extractShopifyProduct,mergePublicProductPreview} from '../../src/server/coffee-shopify-ajax.mjs';
import {extractSelectedCoffeeRoastVariantsFromHtml} from '../../src/server/coffee-roast-variants.mjs';
import {wooProductRequest,extractWooProduct} from '../../src/server/coffee-woocommerce-store.mjs';

const json=(value,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}
});
const envDefault=key=>globalThis.Netlify?.env?.get?.(key)??process.env[key];
// Only a complete approved catalog can skip a fresh retrieval. An older
// record with even one missing supported field must not hide new evidence.
const productFields=['name','roaster','release_label','origin','process','roast_level','elevation_m','variety','producer','tasting_notes'];
const completePreview=preview=>preview?.ok&&productFields.every(key=>
 typeof preview.fields?.[key]==='string'&&preview.fields[key].trim())&&!preview.conflicts?.length;
const catalogFallback=(preview,reason)=>({...preview,cached:true,refresh_reason:reason,
 note:'Reused approved catalog details because current webpage details could not be checked. Confirm your intended release; this is not independent source verification.'});
async function restCall(fetcher,base,key,token,path,method='GET',body='{}'){
 const response=await fetcher(base+path,{
  method,signal:AbortSignal.timeout(6500),
  headers:{'apikey':key,'Authorization':'Bearer '+token,
   ...(method==='POST'?{'Content-Type':'application/json'}:{})},
  ...(method==='POST'?{body}:{})
 });
 if(!response.ok)return null;
 return response.json();
}
export function createPreviewHandler({
 apiFetch=fetch,readHtml=fetchPublicCoffeeHtml,readLargeHtml=fetchPublicCoffeeProductRetry,readJson,extract=extractPublicCoffeeFacts,env=envDefault
}={}){
 // Public-only short-lived warm cache within an isolated function instance; never identity or token data.
 const publicCache=new Map(),TTL_MS=15*60_000,MAX_ENTRIES=40;
 const transient=new Set(['source_unavailable','source_fetch_failed','preview_unavailable']);
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
  let source_url,refreshSource=false;
  try{
   const input=await readBoundedJson(request);
   source_url=input?.source_url;refreshSource=input?.refresh_source===true;
  }catch(error){return json({ok:false,reason:error.code==='request_timeout'?'request_timeout':'invalid_url'},error.code==='request_timeout'?408:400);}
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
   const keyUrl=validated.toString();
   const warm=publicCache.get(keyUrl);
   if(warm&&warm.expiresAt<=Date.now())publicCache.delete(keyUrl);
   const reuseCached=async cached=>{
    const reuse=await restCall(apiFetch,base,key,auth[1],'/rest/v1/rpc/dic_preview_preflight','POST',JSON.stringify({p_cached:true}));
    if(reuse?.allowed!==true)return json({ok:false,reason:reuse?.reason||'preview_unavailable'},['preview_cooldown','daily_preview_limit'].includes(reuse?.reason)?429:503);
    return json({...cached,cached:true});
   };
   // A recent public read may contain fields missing from the older catalog.
   // Always revalidate admission/cooldown, but never replace it with sparse
   // catalog facts or imply that its newly extracted values were approved.
   if(!refreshSource&&warm?.expiresAt>Date.now())return await reuseCached(warm.preview);
   let catalog=null;
   try{catalog=await restCall(apiFetch,base,key,auth[1],'/rest/v1/rpc/dic_preview_cached_verified','POST',JSON.stringify({p_source_url:keyUrl}));}
   catch{/* Optional cache transport failure must not prevent a guarded source read. */}
   const validCatalog=catalog?.ok&&(!catalog.source_url||catalog.source_url===keyUrl)&&
    ['name','roaster'].every(key=>typeof catalog.fields?.[key]==='string'&&catalog.fields[key].trim());
   const approved=validCatalog?{...catalog,source:'approved_catalog',catalog_approved:true,source_verified:false,verification:'unverified',note:'Reused approved catalog details, not independently verified roaster evidence. Confirm your intended release.'}:null;
   // A member may explicitly check today's product page after seeing saved
   // catalog facts. This uses the ordinary guarded retrieval claim; it never
   // bypasses admission, cooldown, quota, URL checks or the source deadline.
   if(!refreshSource&&completePreview(approved))return await reuseCached(approved);
   // Enforce one shared cooldown; non-transient extraction results charge quota once.
   const claim=await restCall(apiFetch,base,key,auth[1],'/rest/v1/rpc/dic_preview_preflight','POST',JSON.stringify({p_cached:false}));
   if(claim?.allowed!==true||typeof claim.ticket!=='string'){
    // Exhausted retrieval quota does not remove the already-approved free
    // catalog path. Its separate cache preflight must still allow cooldown.
    if(approved&&claim?.reason==='daily_preview_limit')return await reuseCached(catalogFallback(approved,claim.reason));
    return json({ok:false,reason:claim?.reason||'preview_unavailable'},['preview_cooldown','daily_preview_limit'].includes(claim?.reason)?429:503);
   }
   const finish=async (payload,status=200)=>{
    const fallback=!payload?.ok&&approved?catalogFallback(approved,payload?.reason||'preview_unavailable'):null;
    if(!payload?.ok&&transient.has(payload?.reason))return json(fallback||payload,fallback?200:status);
    const spent=await restCall(apiFetch,base,key,auth[1],'/rest/v1/rpc/dic_preview_complete','POST',JSON.stringify({p_ticket:claim.ticket}));
    if(spent?.charged!==true)return json({ok:false,reason:'preview_unavailable'},503);
    if(payload?.ok){
     if(publicCache.size>=MAX_ENTRIES)publicCache.delete(publicCache.keys().next().value);
     publicCache.set(keyUrl,{preview:payload,expiresAt:Date.now()+TTL_MS});
    }
    return json(fallback||payload,fallback?200:status);
   };
   // A known public Ecwid store ID allows one small, product-specific
   // read instead of retrieving a 600KB+ Wix catalog shell.
   const deadlineAt=Date.now()+15_000;
   const sources={readJson,extract,deadlineAt};
   const publicProduct=async url=>{
    if(shopifyProductRequest(url)){
     const shopify=await extractShopifyProduct(url,sources);
     if(shopify?.ok)return shopify;
    }
    if(wooProductRequest(url))return extractWooProduct(url,sources);
    return null;
   };
   const knownEcwid=ecwidProductRequest(validated.toString());
   let finalUrl=validated.toString();
   let preview=knownEcwid?await extractEcwidProduct(finalUrl,'',sources):null;
   if(!preview?.ok){
    // One bounded size retry for eligible product-detail URLs only.
    // The same 15-second budget spans the initial read, safe redirects
    // and the optional larger retry; normal requests retain the 11s cap.
    let page;
    try{page=await readHtml(validated.toString(),{deadlineAt});}
    catch{page={ok:false,reason:'source_fetch_failed'};}
    if(page?.reason==='page_too_large'&&
       isCoffeeProductDetailUrl(validated.toString())&&
       isCoffeeProductDetailUrl(page.source_url||validated.toString())){
     try{page=await readLargeHtml(page.source_url||validated.toString(),{deadlineAt});}
     catch{page={ok:false,reason:'source_fetch_failed'};}
    }
    if(!page?.ok){
     // Some Shopify pages exceed the HTML bound or refuse HTML, while their
     // public exact-handle product JSON may still be safely accessible.
     const fromPublic=await publicProduct(finalUrl);
     if(!fromPublic?.ok)return await finish({ok:false,reason:page?.reason||'source_unavailable'});
     preview=fromPublic;
    }else{
    finalUrl=typeof page.source_url==='string'&&safeCoffeeUrl(page.source_url)?page.source_url:validated.toString();
    const embeddedEcwid=!knownEcwid?ecwidProductRequest(finalUrl,page.html):null;
    if(embeddedEcwid)
     preview=await extractEcwidProduct(finalUrl,page.html,sources);
    if(!preview?.ok){
     const compact=compactCoffeeProductHtml(page.html);
     preview=extract(compact||page.html,{source_url:finalUrl});
     // Do not turn a cleaning limitation into a false negative.
     if(!preview?.ok&&compact&&compact!==page.html)
      preview=extract(page.html,{source_url:finalUrl});
     // For an identified Ecwid deep link, avoid treating the general shop
     // heading or an unrelated product card as the selected coffee.
     if(embeddedEcwid&&preview?.ok&&!sameEcwidTitle(preview.fields?.name,embeddedEcwid.expectedName))
      preview={ok:false,reason:'ambiguous_or_missing_product'};
    }
    // Public exact-product endpoints can supply recipes and supplementary
    // details even when HTML already has all autofill fields. One bounded
    // read also exposes contradictions; a field count is not completeness.
    // Retain the shared deadline and exact-product checks, without merging
    // older catalog facts into a potentially different current release.
    if(Date.now()<deadlineAt){
     const fromPublic=await publicProduct(finalUrl);
     preview=mergePublicProductPreview(preview,fromPublic);
    }
    // A live selected-product page can independently prove purchasable roast
    // choices when its optional Shopify .js request fails or times out.
    if(preview?.ok&&!(preview.roast_variants?.length>1)){
     const roastChoices=extractSelectedCoffeeRoastVariantsFromHtml(page.html);
     if(roastChoices.length>1)preview=mergePublicProductPreview(preview,{
      ok:true,source_url:finalUrl,fields:{name:preview.fields.name,roaster:preview.fields.roaster},
      roast_variants:roastChoices
     });
    }
    }
   }
   if(!preview?.ok)return await finish({ok:false,reason:preview?.reason||'ambiguous_or_missing_product'});
   return await finish({...preview,source_url:validated.toString(),...(finalUrl!==validated.toString()?{resolved_url:finalUrl}:{}),verification:'unverified',
    note:'Suggestions from a public page; exact roaster and release need verification.'});
  }catch{return json({ok:false,reason:'preview_unavailable'},503);}
 };
}
export default createPreviewHandler();
export const config={
 path:'/api/coffee-preview',method:['POST'],
 rateLimit:{action:'rate_limit',windowSize:60,windowLimit:12,aggregateBy:['ip']}
};
