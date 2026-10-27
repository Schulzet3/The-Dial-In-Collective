// Opt-in, credential-free acceptance against public roaster pages.
// Exact merged-source public acceptance recheck after concurrent integration.
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
import {fixtureCoffeeHtml as fixtureHtml,sanitizePublicJson as sanitizeJson} from './coffee-fixture-sanitize.mjs';

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
  release_label:/November\s*2025/i,process:/^Washed$/i}},
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
  elevation_m:/1960\s*(?:m|masl)/i,tasting_notes:/star anise.*dark fudge.*verbena/i}},
 {id:'nomad-centroamericano',url:'https://nomadcoffee.es/products/centroamericano-natural-anaerobico',expected:{
  variety:/^Centroamericano$/i,origin:/Costa Rica/i,process:/^Anaerobic$/i,
  producer:/^Diego Robelo(?: y su familia)?$/i,elevation_m:/1200\s*[-–]\s*1400/i,release_label:/2026/},
  expected_details:{farm:/^Aquiares$/i}},
 {id:'circulor-source-conflict',url:'https://coffeacirculor.com/products/kenya-coffea-circulor-outo-isolated-sl34-aa-washed-wx',
  expected:{origin:/Kenya|Meru/i,process:/^Washed$/i},expected_conflicts:['variety'],
  source_note:'Observed page title/summary says SL34, while Genesis says Ruiru 11. Report current source drift explicitly.'},
 {id:'queen-city-homepage-negative',url:'https://queencitycollectivecoffee.com/',negative:true}
 // Four additional optional, URL-bound original-source probes; not frozen603.
 {id:'owner-stumptown-nano-challa',url:'https://www.stumptowncoffee.com/products/ethiopia-nano-challa?variant=40006909722792',expected:{name:/Nano Challa/i,tasting_notes:/peach.*citrus.*orange blossom/i},source_note:'Selected tasting notes only; the espresso brew guide is generic and 2010 washing station history is not current process proof.'},
 {id:'owner-blue-bottle-hayes-valley',url:'https://bluebottlecoffee.com/us/eng/product/hayes-valley-espresso?a_oID=hayes-valley-espresso',expected:{name:/Hayes Valley Espresso/i,roast_level:/^Dark$/i,process:/^Washed$/i,tasting_notes:/Baking Chocolate.*Orange Zest.*Brown Sugar/i},source_note:'Non-Shopify product page; record HTTP/HTML limitations and no invented origin or espresso grams.'},
 {id:'owner-counter-culture-sipacapa',url:'https://counterculturecoffee.com/collections/coffee/products/sipacapa-1',expected:{name:/Sipacapa/i,origin:/San Marcos.*Guatemala/i,roast_level:/^Light$/i,process:/^Washed$/i,tasting_notes:/apple.*simple syrup.*cocoa/i,variety:/Caturra.*Bourbon/i,elevation_m:/1,?640.*2,?150/i},source_note:'Exact current selected harvest facts; exclude cart/store menus.'},
 {id:'owner-peets-linda-vista',url:'https://www.peets.com/products/guatemala-linda-vista',expected:{name:/Guatemala Linda Vista/i,roast_level:/^Dark$/i,tasting_notes:/Dark Chocolate.*Caramel.*Cardamom/i},source_note:'86/100 roast indicator is not an Agtron score; do not use generic menu.'},
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
  if(value==null||!String(value).trim())gaps.push({field,reason:result?.conflicts?.includes(field)?'conflicting_source_evidence':'missing_expected_source_field'});
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
   const sanitized=fixtureHtml(result.html,{source_url:result.source_url||url});
   record.bytes=Buffer.byteLength(result.html);record.original_sha256=sha(result.html);
   record.fixture=target.id+'-'+captures.length+'.fixture.html';
   record.sanitized_sha256=sha(sanitized);record.sanitized_bytes=Buffer.byteLength(sanitized);
   const original=extractPublicCoffeeFacts(compactCoffeeProductHtml(result.html)||result.html,{source_url:result.source_url||url});
   const replay=extractPublicCoffeeFacts(sanitized,{source_url:result.source_url||url});
   record.sanitization_preserves_html_extraction=isDeepStrictEqual(original,replay);
   if(!record.sanitization_preserves_html_extraction){
    // Fail closed while retaining only public, bounded differences needed
    // to repair capture parity; never hide a divergent source fact.
    const keys=[...new Set([...Object.keys(original||{}),...Object.keys(replay||{})])];
    record.parity_differences=keys.filter(key=>!isDeepStrictEqual(original?.[key],replay?.[key]));
    record.parity_field_differences=[...new Set([...Object.keys(original?.fields||{}),...Object.keys(replay?.fields||{})])]
     .filter(key=>!isDeepStrictEqual(original?.fields?.[key],replay?.fields?.[key]));
    record.parity_conflicts_original=original?.conflicts||[];
    record.parity_conflicts_replay=replay?.conflicts||[];
    record.parity_source_fact_counts=[original?.source_facts?.length??0,replay?.source_facts?.length??0];
    const factTag=f=>JSON.stringify(f);
    const afterBag=new Map();
    for(const fact of replay?.source_facts||[]){
     const tag=factTag(fact);afterBag.set(tag,(afterBag.get(tag)||0)+1);
    }
    // Diagnostics describe structure only. Do not copy values from the
    // pre-redaction output into retained logs, even when source parity fails.
    record.parity_missing_source_fact_examples=(original?.source_facts||[]).filter(fact=>{
     const tag=factTag(fact),count=afterBag.get(tag)||0;
     if(!count)return true;
     afterBag.set(tag,count-1);return false;
    }).slice(0,12).map(fact=>({
     field:fact.field||null,source_type:fact.source_type||null,
     property_keys:Object.keys(fact).sort(),value_type:typeof fact.value,
     value_utf8_bytes:Buffer.byteLength(String(fact.value??''))
    }));
    const factKey=f=>[f.field||'',f.label||'',f.source_type||'',f.section||''].join('|');
    record.parity_changed_product_attributes=[];
    for(const [factIndex,a] of (original?.source_facts||[]).filter(f=>f.source_type==='product_json').entries()){
     const b=(replay?.source_facts||[]).find(f=>factKey(f)===factKey(a));
     if(!b||String(a.value)===String(b.value))continue;
     try{const old=JSON.parse(a.value),updated=JSON.parse(b.value);
      const lost=Object.keys(old).filter(key=>!Object.hasOwn(updated,key));
      const changed=Object.keys(old).filter(key=>Object.hasOwn(updated,key)&&JSON.stringify(old[key])!==JSON.stringify(updated[key]));
      if(record.parity_changed_product_attributes.length<12)record.parity_changed_product_attributes.push({fact_index:factIndex,lost,changed});
      if(changed.includes('offers')&&record.parity_offer_key_differences===undefined){
       const one=Array.isArray(old.offers)?old.offers[0]:old.offers;
       const two=Array.isArray(updated.offers)?updated.offers[0]:updated.offers;
       if(one&&two&&typeof one==='object'&&typeof two==='object'){
        const all=[...new Set([...Object.keys(one),...Object.keys(two)])];
        record.parity_offer_key_differences=all.filter(key=>!isDeepStrictEqual(one[key],two[key])).map(key=>({key,oldType:typeof one[key],newType:typeof two[key],oldPresent:Object.hasOwn(one,key),newPresent:Object.hasOwn(two,key)}));
       }
      }

     }catch{}
    }


   }
   await writeFile(path.join(output,record.fixture),sanitized,'utf8');
  }else if(result.ok&&typeof result.json==='string'){
   record.bytes=Buffer.byteLength(result.json);record.original_sha256=sha(result.json);
   try{
    const sanitized=sanitizeJson(JSON.parse(result.json),{source_url:result.source_url||url});
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
  const parityFailures=result.captures.filter(item=>item.sanitization_preserves_html_extraction===false).map(item=>({
   kind:item.kind,original_sha256:item.original_sha256,sanitized_sha256:item.sanitized_sha256,
   parity_differences:item.parity_differences,parity_field_differences:item.parity_field_differences,
   parity_conflicts_original:item.parity_conflicts_original,parity_conflicts_replay:item.parity_conflicts_replay,
   parity_source_fact_counts:item.parity_source_fact_counts,
   parity_missing_source_fact_examples:item.parity_missing_source_fact_examples,
   parity_changed_product_attributes:item.parity_changed_product_attributes,
   parity_offer_key_differences:item.parity_offer_key_differences
  }));
  if(parityFailures.length)console.log('[DIC FIXTURE PARITY] '+JSON.stringify({id:result.id,captures:parityFailures}));
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
// Issue #33 exact-source audit trigger: full sanitized NOMAD variant parity must hold.

// Exact merged-source public acceptance trigger for Issue #33; parser and original assertions unchanged.
