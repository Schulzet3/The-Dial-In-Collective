// Opt-in, credential-free acceptance against public roaster pages.
// The application handler runs with LOCAL admission/quota responses; only its
// existing DNS-pinned, bounded public HTTPS transports make network requests.
// No real account, Supabase request, quota claim, database write or deployment.
import https from 'node:https';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import {createPreviewHandler} from '../../netlify/functions/coffee-url-preview.mjs';
import {fetchPublicCoffeeHtml,fetchPublicCoffeeProductRetry,fetchPublicCoffeeJson,
 MAX_HTML_BYTES,MAX_PRODUCT_RETRY_BYTES} from '../../src/server/coffee-url-guard.mjs';
import {compactCoffeeProductHtml} from '../../src/server/coffee-product-prep.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {coffeeHtmlAttributes} from '../../src/server/coffee-product-scope.mjs';
import {rawElements,removeElements} from '../../supabase/functions/_shared/html-scan.mjs';

const SWEET_URL='https://sweetbloomcoffee.com/products/arbey-cordoba-26';
const ORIGINAL_URL=SWEET_URL+'?srsltid=AYCX9vKHwEAbPcEyS19XuoWD67cGIMJu47B764EfHZK_IkJ7c52nQlGl';
const targets=[
 {id:'sweet-bloom-arbey',url:ORIGINAL_URL,required:true,expected:{
  name:/arbey cordoba/i,roaster:/sweet bloom/i,variety:/^bourbon aj[ií]$/i,
  origin:/huila.*colombia/i,producer:/^arbey cordoba$/i,elevation_m:/1,?886\s*(?:m|masl)/i,
  process:/^washed$/i,tasting_notes:/mango.*bing cherry.*pineapple/i},
  recipe:{dose_g:18,yield_g:36,time_s_min:22,time_s_max:24},absent:['release_label']},
 {id:'sweet-bloom-arbey-canonical',url:SWEET_URL,required:true,expected:{
  variety:/^bourbon aj[ií]$/i,origin:/huila.*colombia/i,producer:/^arbey cordoba$/i,
  elevation_m:/1,?886\s*(?:m|masl)/i,tasting_notes:/mango.*bing cherry.*pineapple/i},
  recipe:{dose_g:18,yield_g:36,time_s_min:22,time_s_max:24},absent:['release_label']},
 {id:'sey-ruarai',url:'https://www.seycoffee.com/products/2026-ruarai-aa-separation-kenya',expected:{
  variety:/SL\s?28.*SL\s?34/i,origin:/Nyeri.*Kenya/i,producer:/\bRuarai\b/i,elevation_m:/1,?783\s*(?:m|masl)/i,
  release_label:/November\s*2025/i,process:/^Washed$/i},
  allowable_withheld_conflicts:['origin']},
 {id:'black-white-lica',url:'https://www.blackwhiteroasters.com/products/r-lica-torres-black-cherry-natural',expected:{
  variety:/^catua[ií]$/i,producer:/Lica Torres/i,origin:/Rivas.*Brunca.*Costa Rica/i,
  elevation_m:/1500\s*(?:m|masl)/i,process:/^Natural$/i,roast_level:/^Light$/i,
  tasting_notes:/cocktail cherry.*port wine.*white icing.*milk chocolate/i}},
 {id:'tim-wendelboe-echemo',url:'https://timwendelboe.no/products/echemo-certified-organic',expected:{
  variety:/Ethiopian heirloom.*Coche forest/i,producer:/Khalid Shifa/i,
  origin:/Goma.*Jimma.*Ethiopia/i,
  process:/^Washed$/i,release_label:/December\s*2025/i,tasting_notes:/floral.*white tea.*stone fruits/i}},
 {id:'onyx-geometry',url:'https://onyxcoffeelab.com/products/geometry',expected:{
  variety:/^Mixed$/i,origin:/Colombia.*Ethiopia/i,process:/^Washed$/i,
  roast_level:/^Light$/i,elevation_m:/1950\s*(?:m|masl)/i,
  tasting_notes:/Berries.*Stone Fruit.*Earl Grey.*Honeysuckle.*Round/i},
  expected_details:{drying_method:/^Raised-Bed Dried$/i,agtron:/^130$/},
  recipe:{dose_g:20,yield_g:47},recipe_absentfields:['time_s_min','time_s_max','temperature']},
 {id:'manhattan-samuel',url:'https://manhattancoffeeroasters.com/product/coffees/world-class/samuel-jr/',expected:{
  roaster:/Manhattan Coffee Roasters/i,
  variety:/Caturra.*Chiroso/i,producer:/Diego Bermudez/i,origin:/Cauca.*Colombia/i,
  elevation_m:/1960\s*(?:m|masl)/i,tasting_notes:/star anise.*dark fudge.*verbena/i},
  allowable_withheld_conflicts:['tasting_notes']},
 {id:'nomad-centroamericano',url:'https://nomadcoffee.es/products/centroamericano-natural-anaerobico',expected:{
  variety:/^Centroamericano$/i,origin:/Costa Rica/i,process:/^Anaerobic$/i,
  producer:/^Diego Robelo(?: y su familia)?$/i,elevation_m:/1200\s*[-–]\s*1400/i,release_label:/2026/},
  expected_details:{farm:/^Aquiares$/i}},
 {id:'circulor-source-conflict',url:'https://coffeacirculor.com/products/kenya-coffea-circulor-outo-isolated-sl34-aa-washed-wx',
  expected:{origin:/Kenya|Meru/i,process:/^Washed$/i},expected_conflicts:['variety'],
  source_note:'Observed page title/summary says SL34, while Genesis says Ruiru 11. Report current source drift explicitly.'},
 {id:'queen-city-homepage-negative',url:'https://queencitycollectivecoffee.com/',negative:true}
];
const argv=process.argv.slice(2);
let output=path.join(process.env.RUNNER_TEMP||tmpdir(),'dic-coffee-completeness');
let only=null;
for(let i=0;i<argv.length;i++){
 if(argv[i]==='--outdir'&&argv[i+1])output=path.resolve(argv[++i]);
 else if(argv[i]==='--only'&&argv[i+1])only=argv[++i];
 else throw new Error('Usage: node scripts/audit/coffee-completeness-live-probe.mjs [--outdir PATH] [--only TARGET_ID]');
}
// This is an opt-in acceptance suite with reviewed source expectations.
// Every sampled source and the negative control must pass; a changed or
// unavailable source is reported as a failure, never hidden by a green run.
const selected=(only?targets.filter(x=>x.id===only):targets).map(target=>({...target,required:true}));
if(!selected.length)throw new Error('Unknown target ID; arbitrary external targets are not accepted.');
await mkdir(output,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const fold=value=>String(value??'').normalize('NFC');
const publicUrl=raw=>{
 try{
  const url=new URL(raw);
  // Keep coffee purchase-variant identity, omit tracking/referral parameters.
  for(const key of [...url.searchParams.keys()])if(key!=='variant')url.searchParams.delete(key);
  return url.toString();
 }catch{return '';}
};
const sensitiveKey=/(?:password|secret|token|csrf|authorization|cookie|customer|session|email|phone|cart|checkout)/i;
const safeSummary=value=>({sha256:sha(JSON.stringify(value)),type:Array.isArray(value)?'array':value===null?'null':typeof value,
 count:Array.isArray(value)?value.length:undefined});
function fixtureDifference(original,replay){
 const sections=['ok','fields','available','roaster_recipe','roaster_details','conflicts','source_facts','source_facts_truncated',
  'roast_hint','roast_source','elevation_source','producer_source','process_source','variety_source'];
 const changed=sections.filter(key=>!isDeepStrictEqual(original?.[key],replay?.[key]));
 const factId=fact=>sha(JSON.stringify(fact));
 const before=original?.source_facts||[],after=replay?.source_facts||[];
 const remaining=new Map();for(const fact of after){const id=factId(fact);remaining.set(id,(remaining.get(id)||0)+1);}
 const missing=[];for(const fact of before){const id=factId(fact),count=remaining.get(id)||0;
  if(count)remaining.set(id,count-1);else missing.push(fact);}
 const labels=missing.slice(0,12).map(fact=>({
  section:sensitiveKey.test(String(fact.section||''))?'redacted':String(fact.section||'').slice(0,45),
  label:sensitiveKey.test(String(fact.label||''))?'redacted':String(fact.label||'').slice(0,65),
  field:fact.field||null,source_type:fact.source_type||null}));
 return {changed_sections:changed,canonical_fields_equal:isDeepStrictEqual(original?.fields,replay?.fields),
  conflicts_equal:isDeepStrictEqual(original?.conflicts,replay?.conflicts),
  recipes_equal:isDeepStrictEqual(original?.roaster_recipe,replay?.roaster_recipe),
  original_facts:before.length,fixture_facts:after.length,
  missing_exact_fact_count:missing.length,missing_fact_labels:labels,
  differing_fact_shapes:missing.slice(0,12).map(fact=>{const counterpart=after.find(x=>x.label===fact.label&&x.source_path===fact.source_path);return {
   label:fact.label,source_path:fact.source_path||null,
   original_keys:Object.keys(fact).sort(),replay_keys:counterpart?Object.keys(counterpart).sort():[],
   original_value_type:typeof fact.value,replay_value_type:typeof counterpart?.value,
   original_value_keys:fact.value&&typeof fact.value==='object'?Object.keys(fact.value).sort():null,
   replay_value_keys:counterpart?.value&&typeof counterpart.value==='object'?Object.keys(counterpart.value).sort():null,
   original_value_sha:sha(JSON.stringify(fact.value)),replay_value_sha:sha(JSON.stringify(counterpart?.value)),
   parsed_json_equal:(()=>{try{return isDeepStrictEqual(JSON.parse(fact.value),JSON.parse(counterpart?.value));}catch{return false;}})(),
   normalized_json_sha:(()=>{try{return sha(JSON.stringify(JSON.parse(fact.value)));}catch{return null;}})(),
   replay_normalized_json_sha:(()=>{try{return sha(JSON.stringify(JSON.parse(counterpart?.value)));}catch{return null;}})(),
   nested_offer_difference_paths:(()=>{try{
     const before=JSON.parse(fact.value)?.offers,after=JSON.parse(counterpart.value)?.offers;
     const paths=[],walk=(a,b,p,depth)=>{
       if(depth>5||paths.length>20||isDeepStrictEqual(a,b))return;
       if(a&&b&&typeof a==='object'&&typeof b==='object'){
         for(const k of new Set([...Object.keys(a),...Object.keys(b)]))
           walk(a[k],b[k],p+'/'+(/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(k)?k:'[nonstandard_key]'),depth+1);
       }else paths.push({path:p,before_present:a!==undefined,after_present:b!==undefined,
         before_type:typeof a,after_type:typeof b});
     };walk(before,after,'offers',0);return paths;
   }catch{return ['parse_error'];}})(),
   json_difference_keys:(()=>{try{
    const a=JSON.parse(fact.value),b=JSON.parse(counterpart.value);
    if(!a||!b||typeof a!=='object'||typeof b!=='object')return [];
    return [...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>!isDeepStrictEqual(a[k],b[k])).map(k=>({
      key:sensitiveKey.test(k)?'redacted_sensitive_key':k,
      before_present:Object.hasOwn(a,k),after_present:Object.hasOwn(b,k),
      before_type:typeof a[k],after_type:typeof b[k]
    })).slice(0,20);
   }catch{return ['parse_error'];}})()
   };}),
  prior_digest:safeSummary(original).sha256,fixture_digest:safeSummary(replay).sha256};
}

function publicCheckoutTemplate(value,sourceUrl){
 if(typeof value!=='string'||value.length>600||!sourceUrl)return false;
 try{
  const source=new URL(sourceUrl),url=new URL(value,source);
  if(source.protocol!=='https:'||url.protocol!=='https:'||url.hostname!==source.hostname||
   url.username||url.password||url.port||url.hash)return false;
  // Only a roaster-local public shopping cart template, not a private
  // customer checkout, bearer capability, email or session-bearing link.
  if(!/^\/cart\//i.test(url.pathname)||/[?&](?:token|secret|session|customer|email|checkout|auth|key)=/i.test(url.search))
   return false;
  return true;
 }catch{return false;}
}
function sanitizeJson(value,sourceUrl){
 return JSON.stringify(value,(key,item)=>{
  if(key==='checkoutPageURLTemplate'&&publicCheckoutTemplate(item,sourceUrl))return item;
  return sensitiveKey.test(key)?undefined:item;
 }).replace(/</g,'\\u003c').replace(/>/g,'\\u003e');
}
function fixtureHtml(html,sourceUrl){
 const compact=compactCoffeeProductHtml(html);
 if(!compact)return '';
 const chunks=[];let cursor=0;
 for(const block of rawElements(compact)){
  chunks.push(compact.slice(cursor,block.start));
  const type=block.attributes.match(/\btype\s*=\s*["'](application\/(?:ld\+)?json)["']/i)?.[1];
  if(type&&block.closed){
   const id=block.attributes.match(/\bid\s*=\s*["']([a-z0-9_-]{1,160})["']/i)?.[1];
   // Preserve only the static product-script discriminator. The parser uses
   // attribute identity to recognize a selected-product JSON block; dropping
   // it silently loses variant and conflicting source evidence.
   const productMarker=/product/i.test(JSON.stringify(coffeeHtmlAttributes(block.attributes)))?
    ' data-public-product-context="product"':'';
   try{chunks.push('<script type="'+type+'"'+(id?' id="'+id+'"':'')+productMarker+'>'+sanitizeJson(JSON.parse(block.body),sourceUrl)+'</script>');}
   catch{/* Invalid script data is not preserved as executable markup. */}
  }
  cursor=block.end;
 }
 chunks.push(compact.slice(cursor));
 // WooCommerce and Shopify can place the selected product title, variant
 // data, or specifications inside an add-to-cart form. Keep those children;
 // remove only the form shell and controls that cannot supply page facts.
 // The extractor already excludes selects, so country/grind options cannot
 // become evidence. Every capture still records exact extraction parity.
 return removeElements(chunks.join(''),['iframe','noscript','select','textarea'])
  .replace(/<\/?form\b[^<>]{0,8000}>/gi,' ')
  .replace(/<input\b[^<>]{0,4000}>/gi,'')
  .replace(/\s(?:on[a-z]+|nonce)\s*=\s*(?:"[^"]{0,8000}"|'[^']{0,8000}'|[^\s>]{1,1000})/gi,'')
  .replace(/\b(href|src)\s*=\s*(["'])\s*javascript:[^"']{0,8000}\2/gi,'$1="#"')
  .replace(/<meta\b[^<>]{0,2000}(?:csrf|token|session)[^<>]{0,2000}>/gi,'');
}

function fixtureStageDiagnostics(html,sourceUrl,original){
 const compact=compactCoffeeProductHtml(html);
 const chunks=[];let cursor=0;
 for(const block of rawElements(compact)){
  chunks.push(compact.slice(cursor,block.start));
  const type=block.attributes.match(/\btype\s*=\s*["'](application\/(?:ld\+)?json)["']/i)?.[1];
  if(type&&block.closed){
   const id=block.attributes.match(/\bid\s*=\s*["']([a-z0-9_-]{1,160})["']/i)?.[1];
   // Preserve only the static product-script discriminator. The parser uses
   // attribute identity to recognize a selected-product JSON block; dropping
   // it silently loses variant and conflicting source evidence.
   const productMarker=/product/i.test(JSON.stringify(coffeeHtmlAttributes(block.attributes)))?
    ' data-public-product-context="product"':'';
   try{chunks.push('<script type="'+type+'"'+(id?' id="'+id+'"':'')+productMarker+'>'+sanitizeJson(JSON.parse(block.body),sourceUrl)+'</script>');}
   catch{}
  }
  cursor=block.end;
 }
 chunks.push(compact.slice(cursor));
 const scripts=chunks.join('');
 const controls=removeElements(scripts,['iframe','noscript','select','textarea']);
 const formless=controls.replace(/<\/?form\b[^<>]{0,8000}>/gi,' ');
 const inputless=controls.replace(/<input\b[^<>]{0,4000}>/gi,'');
 const safeAttrs=s=>s
  .replace(/\s(?:on[a-z]+|nonce)\s*=\s*(?:"[^"]{0,8000}"|'[^']{0,8000}'|[^\s>]{1,1000})/gi,'')
  .replace(/\b(href|src)\s*=\s*(["'])\s*javascript:[^"']{0,8000}\2/gi,'$1="#"')
  .replace(/<meta\b[^<>]{0,2000}(?:csrf|token|session)[^<>]{0,2000}>/gi,'');
 const stages=[['json_script_rewrite_only',scripts],['drop_form_controls',controls],
  ['drop_form_shell',formless],['drop_inputs',inputless],['privacy_attr_guards',safeAttrs(controls)],
  ['privacy_form_shell',safeAttrs(formless)],['privacy_inputs',safeAttrs(inputless)]];
 return stages.map(([step,fixture])=>{
  const replay=extractPublicCoffeeFacts(fixture,{source_url:sourceUrl});
  return {step,parity:isDeepStrictEqual(original,replay),...fixtureDifference(original,replay)};
 });
}

function assess(target,result){
 const gaps=[],checked=[];
 if(target.negative){
  if(result?.ok)gaps.push({field:'product_identity',reason:'homepage_was_accepted_as_product'});
  else if(result?.reason!=='ambiguous_or_missing_product')gaps.push({field:'product_identity',reason:'negative_control_unverified',source_reason:result?.reason||'no_result'});
  return {checked:['homepage_not_product'],gaps};
 }
 if(!result?.ok)return {checked,gaps:[{field:'product',reason:result?.reason||'no_result'}],
  unverified_fields:[...Object.keys(target.expected||{}),...Object.keys(target.recipe||{}).map(key=>'espresso.'+key),
   ...Object.keys(target.expected_details||{}).map(key=>'details.'+key)]};
 for(const [field,pattern] of Object.entries(target.expected||{})){
  checked.push(field);
  const value=result?.fields?.[field];
  if(value==null||!String(value).trim()){
   const explicitlyWithheld=target.allowable_withheld_conflicts?.includes(field)&&result?.conflicts?.includes(field);
   if(!explicitlyWithheld)gaps.push({field,reason:result?.conflicts?.includes(field)?'conflicting_source_evidence':'missing_expected_source_field'});
   else checked.push('source_conflict_withheld.'+field);
  }
  else if(!pattern.test(fold(value)))gaps.push({field,reason:'source_expectation_mismatch',actual:value,expected_pattern:pattern.source});
 }
 for(const [field,value] of Object.entries(target.recipe||{})){
  checked.push('espresso.'+field);
  if(result?.roaster_recipe?.[field]!==value)gaps.push({field:'espresso.'+field,reason:'missing_or_incorrect_espresso_value',actual:result?.roaster_recipe?.[field]??null,expected:value});
 }
 for(const field of target.recipe_absentfields||[]){
  checked.push('absent.espresso.'+field);
  if(result?.roaster_recipe?.[field]!=null)gaps.push({field:'espresso.'+field,reason:'unsupported_espresso_value',actual:result.roaster_recipe[field]});
 }
 for(const [key,pattern] of Object.entries(target.expected_details||{})){
  const field='details.'+key,value=result?.roaster_details?.[key];
  checked.push(field);
  if(value==null||!String(value).trim())gaps.push({field,reason:'missing_expected_source_detail'});
  else if(!pattern.test(fold(value)))gaps.push({field,reason:'source_expectation_mismatch',actual:value,expected_pattern:pattern.source});
 }
 for(const field of target.absent||[]){
  checked.push('absent.'+field);
  if(result?.fields?.[field]!=null)gaps.push({field,reason:'unsupported_inference',actual:result.fields[field]});
 }
 for(const field of target.expected_conflicts||[]){
  checked.push('conflict.'+field);
  if(!result?.conflicts?.includes(field)||result?.fields?.[field])gaps.push({field,reason:'previously_observed_source_conflict_not_withheld',actual:result?.fields?.[field]??null});
 }
 return {checked,gaps};
}
async function probe(target){
 const started=performance.now(),requests=[],captures=[],pending=[];
 let budgetRefusal=false,handlerResult=null,httpStatus=null,apiStubCalls=0;
 const request=(options,callback)=>{
  if(requests.length>=9){budgetRefusal=true;throw new Error('public_request_budget_exhausted');}
  const begin=performance.now();
  const record={url:publicUrl('https://'+options.hostname+options.path),method:options.method,
   status:null,content_type:null,encoding:null,elapsed_ms:null,transport_error:null};
  requests.push(record);
  const outgoing=https.request(options,response=>{
   record.status=response.statusCode??null;
   record.content_type=String(response.headers['content-type']||'').slice(0,100);
   record.encoding=String(response.headers['content-encoding']||'').slice(0,30);
   response.once('end',()=>{record.elapsed_ms=Math.round(performance.now()-begin);});
   response.once('close',()=>{record.elapsed_ms=Math.round(performance.now()-begin);});
   callback(response);
  });
  outgoing.once('close',()=>{record.elapsed_ms=Math.round(performance.now()-begin);});
  outgoing.once('error',error=>{
   record.transport_error=/^[A-Z0-9_]{1,50}$/.test(error?.code||'')?error.code:'NETWORK_ERROR';
   record.elapsed_ms=Math.round(performance.now()-begin);
  });
  return outgoing;
 };
 const capture=async(kind,url,result)=>{
  const record={kind,url:publicUrl(result.source_url||url),ok:result.ok===true,reason:result.reason||null};
  if(result.ok&&typeof result.html==='string'){
   const sanitized=fixtureHtml(result.html,result.source_url||url);
   record.bytes=Buffer.byteLength(result.html);record.original_sha256=sha(result.html);
   record.fixture=target.id+'-'+captures.length+'.fixture.html';
   record.sanitized_sha256=sha(sanitized);record.sanitized_bytes=Buffer.byteLength(sanitized);
   const original=extractPublicCoffeeFacts(compactCoffeeProductHtml(result.html)||result.html,{source_url:result.source_url||url});
   const replay=extractPublicCoffeeFacts(sanitized,{source_url:result.source_url||url});
   record.sanitization_preserves_html_extraction=isDeepStrictEqual(original,replay);
   if(!record.sanitization_preserves_html_extraction){
    record.sanitization_difference=fixtureDifference(original,replay);
    record.sanitization_stages=fixtureStageDiagnostics(result.html,result.source_url||url,original);
   }
   await writeFile(path.join(output,record.fixture),sanitized,'utf8');
  }else if(result.ok&&typeof result.json==='string'){
   record.bytes=Buffer.byteLength(result.json);record.original_sha256=sha(result.json);
   try{
    const sanitized=sanitizeJson(JSON.parse(result.json),result.source_url||url);
    record.fixture=target.id+'-'+captures.length+'.fixture.json';
    record.sanitized_sha256=sha(sanitized);
    await writeFile(path.join(output,record.fixture),sanitized,'utf8');
   }catch{record.fixture_unavailable='invalid_json';}
  }
  captures.push(record);
 };
 const wrap=(kind,transport)=>async(url,options={})=>{
  const result=await transport(url,{...options,request});
  // Await fixture writes before returning the source to the application.
  // They do not change the returned bytes or the extraction result.
  pending.push(capture(kind,url,result));
  await pending.at(-1);
  return result;
 };
 const apiFetch=async(url,options={})=>{
  apiStubCalls++;
  const endpoint=new URL(url).pathname;
  let result;
  if(endpoint==='/auth/v1/user')result={id:'public-probe-local-stub'};
  else if(endpoint==='/rest/v1/rpc/dic_session_status')result={admitted:true,emailVerified:true};
  else if(endpoint==='/rest/v1/rpc/dic_preview_cached_verified')result={ok:false};
  else if(endpoint==='/rest/v1/rpc/dic_preview_preflight')result={allowed:true,ticket:'local-only-probe-ticket'};
  else if(endpoint==='/rest/v1/rpc/dic_preview_complete')result={charged:true};
  else throw new Error('Unexpected local backend stub endpoint: '+endpoint);
  const expectedMethod=endpoint==='/auth/v1/user'?'GET':'POST';
  if(options.method!==expectedMethod)throw new Error('Unexpected stub method');
  return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{
  const handler=createPreviewHandler({apiFetch,
   readHtml:wrap('html',fetchPublicCoffeeHtml),readLargeHtml:wrap('large_html_retry',fetchPublicCoffeeProductRetry),
   readJson:wrap('public_product_json',fetchPublicCoffeeJson),
   env:key=>key==='SUPABASE_URL'?'https://public-probe-local.supabase.co':key==='SUPABASE_PUBLISHABLE_KEY'?'sb_publishable_local_stub':undefined});
  const response=await handler(new Request('https://dic-probe.invalid/api/coffee-preview',{
   method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer local.probe.stub'},
   body:JSON.stringify({source_url:target.url})
  }));
  httpStatus=response.status;
  handlerResult=await response.json();
 }catch(error){handlerResult={ok:false,reason:'probe_exception',exception_type:error?.name||'Error'};}
 await Promise.all(pending);
 const assessment=assess(target,handlerResult);
 if(budgetRefusal)assessment.gaps.push({field:'transport',reason:'request_budget_exhausted'});
 if(captures.some(item=>item.sanitization_preserves_html_extraction===false))
  assessment.gaps.push({field:'source_fixture',reason:'sanitization_changed_extraction'});
 return {id:target.id,url:publicUrl(target.url),requested_tracking_alias:target.url!==publicUrl(target.url),
  required:target.required===true,negative:target.negative===true,source_note:target.source_note||null,
  status:handlerResult?.ok?'parsed':handlerResult?.reason||'no_result',handler_http_status:httpStatus,
  fields:handlerResult?.fields||{},conflicts:handlerResult?.conflicts||[],
  recipe:handlerResult?.roaster_recipe||null,details:handlerResult?.roaster_details||{},
  roast_hint:handlerResult?.roast_hint||null,
  elapsed_ms:Math.round(performance.now()-started),public_request_count:requests.length,
  local_backend_stub_calls:apiStubCalls,requests,captures,...assessment};
}
const startedAt=new Date().toISOString(),results=[];
for(let index=0;index<selected.length;index+=2){
 const batch=await Promise.all(selected.slice(index,index+2).map(probe));
 for(const result of batch){
  results.push(result);
  console.log('[DIC COMPLETENESS SOURCE] '+JSON.stringify({id:result.id,status:result.status,
   required:result.required,fields:result.fields,recipe:result.recipe,conflicts:result.conflicts,
   gaps:result.gaps,public_request_count:result.public_request_count,elapsed_ms:result.elapsed_ms}));
 }
}
const requiredFailures=results.filter(x=>x.required&&x.gaps.length);
let sourceSha=null,sourceWorktreeDirty=null;
try{
 sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
 sourceWorktreeDirty=Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim());
}
catch{/* The report explicitly records a missing Git source instead of guessing. */}
const result={version:1,started_at:startedAt,completed_at:new Date().toISOString(),
 source_sha:sourceSha,source_worktree_dirty:sourceWorktreeDirty,workflow_sha:process.env.GITHUB_SHA||null,
 scope:'Actual application extractor/public transport with local-only auth/quota stubs; public live source acceptance, not signed-member or deployed-app acceptance.',
 fixture_notice:'Sanitized anonymous public responses; no scripts executed. Original hashes identify fetched responses. Check sanitization_preserves_html_extraction before treating fixtures as equivalent.',
 initial_html_cap_bytes:MAX_HTML_BYTES,retry_html_cap_bytes:MAX_PRODUCT_RETRY_BYTES,
 concurrency:2,maximum_public_requests_per_target:9,
 summary:{targets:results.length,parsed:results.filter(x=>x.status==='parsed').length,
  required_targets:results.filter(x=>x.required).length,required_failures:requiredFailures.map(x=>x.id),
  observed_gaps:results.reduce((sum,x)=>sum+x.gaps.length,0),
  sources_with_gaps:results.filter(x=>x.gaps.length).map(x=>x.id),
  public_requests:results.reduce((sum,x)=>sum+x.public_request_count,0),
  real_backend_requests:0,member_quota_consumed:0,production_writes:0,deployments:0},results};
await writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2)+'\n','utf8');
console.log('[DIC COMPLETENESS SUMMARY] '+JSON.stringify(result.summary));
console.log('[DIC COMPLETENESS ARTIFACTS] '+output);
if(requiredFailures.length)process.exitCode=1;