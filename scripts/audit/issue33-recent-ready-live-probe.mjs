#!/usr/bin/env node
// Issue #33: exact-current, public-only end-to-end extraction acceptance.
// Explicit ten URL allowlist, no credentials, database, production, external
// image downloads, member quota, auto-save or archived oracle modification.
// The real production preview handler calls its DNS-pinned HTTPS transports;
// ONLY auth/session/quota RPCs are locally simulated with disposable responses.
// Unlike source-quote fixtures, every result here uses CURRENT raw page bytes.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createPreviewHandler} from '../../netlify/functions/coffee-url-preview.mjs';
import {safeCoffeeUrl,fetchPublicCoffeeHtml,fetchPublicCoffeeProductRetry,fetchPublicCoffeeJson} from '../../src/server/coffee-url-guard.mjs';
import {compactCoffeeProductHtml} from '../../src/server/coffee-product-prep.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedDirectProductCredits} from '../../src/server/coffee-direct-product-prose.mjs';
import {productCoffeeProse} from '../../src/server/coffee-product-prose.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractShopifyAjaxData,shopifyProductRequest} from '../../src/server/coffee-shopify-ajax.mjs';
import {coffeeRoastVariantPreview,coffeeUrlPreviewMarkup} from '../../site/cloud/coffee-url-autofill.js';

export const CURRENT_READY_CASES=Object.freeze([
 {id:'leap-current-decaf-prose',url:'https://leapcoffeeroasters.com/products/decaf-coffee'},
 {id:'ixxa-current-ki-saya',url:'https://www.ixxacoffee.com/products/organic-ki-saya-tenejapa-microlot'},
 {id:'ketch-tier3-current-mexico',url:'https://www.ketchcoffee.com/products/tier-3-mexico-san-isidro-zoquiapan'},
 {id:'ketch-tier2-locked-honduras',url:'https://www.ketchcoffee.com/products/tier-2-legacy-farms-honduras-natural-process'},
 {id:'44north-current-mexico',url:'https://44northcoffee.com/products/mexico-chiapas'},
 {id:'44north-decaf-rotating-program',url:'https://44northcoffee.com/products/honduras-decaf'},
 {id:'south17-dark-raine-single-roast',url:'https://south17roasters.com/products/dark-raine'},
 {id:'friedrichs-rise-shine-title-roast',url:'https://friedrichscoffee.com/product/rise-and-shine'},
 {id:'koffee-kult-perla-negra-release',url:'https://www.koffeekult.com/products/costa-rica-perla-negra-peaberry'},
 {id:'nativo-tranquilo-current-sugar-decaf',url:'https://www.nativocoffeeroasters.com/products/tranquilo-decaf'}
]);
const sha=value=>createHash('sha256').update(value).digest('hex');
const clip=(v,n=250)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
const norm=value=>clip(value,600).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const blank=value=>value==null||String(value).trim()==='';
const variantsOf=preview=>new Map((preview?.roast_variants||[]).map(v=>[v.id,v]));
const checkedFields=['name','roaster','origin','roast_level','process','producer',
 'variety','elevation_m','tasting_notes','decaffeination_method','release_label'];
const fieldsOf=preview=>Object.fromEntries(checkedFields.filter(k=>preview?.fields?.[k]!=null).map(k=>[k,clip(preview.fields[k])]));

// Explicit expectations only for data literally present on the corresponding
// CURRENT official product pages. Unknown or changed current data is not guessed.
export function assessReadyPreview(id,preview,{realHtmlReceived=true,renderedHtml=''}={}){
 const checks=[];
 const check=(label,passed,expected='',actual='')=>{
  checks.push({label,passed:passed===true,...(!passed?{expected:clip(expected,140),actual:clip(actual,200)}:{})});
 };
 check('source:full_html_retrieved',realHtmlReceived,'real current HTML','not fetched');
 check('extractor:ok',preview?.ok===true,'true',String(preview?.reason||preview?.ok));
 if(!preview?.ok)return {checks,failed:checks.filter(x=>!x.passed),passed:checks.filter(x=>x.passed).length};
 const f=preview.fields||{},v=variantsOf(preview);
 check('preview:rendered',typeof renderedHtml==='string'&&renderedHtml.length>50,'Add Coffee markup','empty');
 if(id==='south17-dark-raine-single-roast'){
  check('south17:exact_selected',/^Dark Raine$/i.test(f.name||''),'Dark Raine',f.name);
  check('south17:actual_single_dark_roast',f.roast_level==='Dark','Dark',f.roast_level);
  check('south17:no_false_roast_conflict',!(preview.conflicts||[]).includes('roast_level'),
   'no conflicting direct roast',JSON.stringify(preview.conflicts||[]));
 }
 if(id==='friedrichs-rise-shine-title-roast'){
  check('friedrichs:exact_coffee',/^Rise and Shine\b/i.test(f.name||''),
   'Rise and Shine – Medium',f.name);
  check('friedrichs:current_title_medium',f.roast_level==='Medium','Medium',f.roast_level);
  check('friedrichs:no_false_roast_conflict',!(preview.conflicts||[]).includes('roast_level'),
   'no conflicting roast',JSON.stringify(preview.conflicts||[]));
 }
 if(id==='koffee-kult-perla-negra-release'){
  check('koffee-kult:exact_coffee',/Costa Rica Perla Negra Peaberry/i.test(f.name||''),
   'Costa Rica Perla Negra Peaberry',f.name);
  check('koffee-kult:current_release_banner',/limited release/i.test(f.release_label||''),
   'literal selected LIMITED RELEASE',f.release_label);
  check('koffee-kult:costa_rica',/Costa Rica/i.test(f.origin||''),
   'Costa Rica',f.origin);
  check('koffee-kult:release_not_conflicted',!(preview.conflicts||[]).includes('release_label'),
   'no conflicting release',JSON.stringify(preview.conflicts||[]));
 }
 if(id==='nativo-tranquilo-current-sugar-decaf'){
  check('nativo:exact_selected_coffee',/^Tranquilo\b/i.test(f.name||''),
   'TRANQUILO, Decaffeinated, 12 oz',f.name);
  check('nativo:current_sugar_decaffeination',f.decaffeination_method==='Sugar Process',
   'Sugar Process',f.decaffeination_method);
  check('nativo:no_false_green_processing',blank(f.process),'unknown, not Natural',f.process);
  check('nativo:direct_selected_method_proof',
   (preview.source_facts||[]).some(x=>x.field==='decaffeination_method'&&
    /Tranquilo is decaffeinated using the natural Sugar Cane Process/i.test(x.value||'')),
   'exact selected-product current decaf statement','missing');
  check('nativo:published_tasting',/sugar cane.*chocolate.*creamy/i.test(f.tasting_notes||''),
   'Sugar Cane, Chocolate, Creamy',f.tasting_notes);
  check('nativo:no_method_conflict',!(preview.conflicts||[]).includes('decaffeination_method'),
   'no direct current method contradiction',JSON.stringify(preview.conflicts||[]));
 }
 if(id==='leap-current-decaf-prose'){
  check('leap:exact_coffee',/^Decaf Coffee$/i.test(f.name||''),'Decaf Coffee',f.name);
  check('leap:water_process',f.decaffeination_method==='Water Process','Water Process',f.decaffeination_method);
  check('leap:no_invented_primary_process',blank(f.process),'blank',f.process);
  check('leap:direct_current_method_source_fact',
   (preview.source_facts||[]).some(x=>x.field==='decaffeination_method'&&/swiss[\s-]*water/i.test(x.value||'')),
   'current selected direct Swiss Water prose','missing');
 }
 if(id==='ixxa-current-ki-saya'){
  check('ixxa:exact_coffee',/Ki.Saya.*Tenejapa/i.test(f.name||''),'Ki-Saya Tenejapa',f.name);
  check('ixxa:paired_locality_region',norm(f.origin).includes('tenejapa')&&norm(f.origin).includes('chiapas'),
   'Tenejapa, Chiapas',f.origin);
  check('ixxa:exact_tasting_notes',/chocolate.*creamy caramel.*honey.*hazelnut/i.test(f.tasting_notes||''),
   'chocolate creamy caramel honey hazelnut',f.tasting_notes);
 }
 if(id==='44north-decaf-rotating-program'){
  check('44north-decaf:exact_selected_coffee',/Decaf.*Honduras COMSA/i.test(f.name||''),
   'Decaf Honduras COMSA',f.name);
  check('44north-decaf:exact_selected_roast',f.roast_level==='Medium','Medium',f.roast_level);
  check('44north-decaf:no_false_roast_conflict',!(preview.conflicts||[]).includes('roast_level'),
   'no roast conflict from rotating catalog copy',JSON.stringify(preview.conflicts||[]));
  check('44north-decaf:water_decaffeination',f.decaffeination_method==='Water Process',
   'Water Process',f.decaffeination_method);
  check('44north-decaf:no_invented_primary_processing',blank(f.process),'blank',f.process);
  check('44north-decaf:exact_honduras_origin',/Honduras/i.test(f.origin||'')&&!/Mexico/i.test(f.origin||''),
   'current selected Honduras',f.origin);
  check('44north-decaf:current_warm_peach_notes',/warm peach/i.test(f.tasting_notes||''),
   'published warm peach tasting notes',f.tasting_notes);
  check('44north-decaf:no_unoffered_roast_picker',v.size===0,
   'no purchase-roast choice',Array.from(v.keys()).join(','));
 }
 if(id==='44north-current-mexico'){
  check('44north:exact_coffee',/Mexico Triunfo Verde/i.test(f.name||''),'Mexico Triunfo Verde',f.name);
  check('44north:published_region',/el triunfo reserve.*la paz.*chiapas.*mexico/i.test(f.origin||''),
   'El Triunfo Reserve, La Paz, Chiapas, Mexico',f.origin);
  check('44north:current_flavor',/sweet candied lemon.*dried blueberry/i.test(f.tasting_notes||''),
   'sweet candied lemon, dried blueberry',f.tasting_notes);
  check('44north:published_roast',f.roast_level==='Medium','Medium',f.roast_level);
 }
 if(id.startsWith('ketch-')){
  check('ketch:two_roast_purchase_variants',v.size===2&&v.has('light')&&v.has('medium-dark'),
   'Light and Medium-Dark',Array.from(v.keys()).join(','));
  check('ketch:no_purchase_option_conflict',!(preview.conflicts||[]).includes('roast_level'),
   'selected offered roast options are not a conflict',JSON.stringify(preview.conflicts||[]));
  check('ketch:roast_not_assumed',blank(f.roast_level),'blank',f.roast_level);
  check('ketch:global_notes_not_assumed',blank(f.tasting_notes),'blank',f.tasting_notes);
  check('ketch:global_espresso_not_assumed',preview.roaster_recipe==null,'blank',JSON.stringify(preview.roaster_recipe));
  check('ketch:review_requires_selection',/Which roast did you buy\?/i.test(renderedHtml),'roast purchase picker',
   'picker missing');
  const light=v.get('light'),dark=v.get('medium-dark');
  if(id==='ketch-tier3-current-mexico'){
   check('ketch3:current_mexico_identity',/Mexico San Isidro Zoquiapan/i.test(f.name||''),
    'Mexico San Isidro Zoquiapan',f.name);
   check('ketch3:current_mexico_geography',!/Honduras/i.test(f.origin||'')&&/Mexico/i.test(f.origin||f.name||''),
    'Mexico only; never another product Honduras',f.origin);
   check('ketch3:no_stale_legacy_variety',!/Lempira|Parainema/i.test(f.variety||''),
    'no Legacy Farms Honduras variety',f.variety);
   check('ketch3:light_notes',norm(light?.fields?.tasting_notes)==='chocolate, red apple, mild nuttiness',
    'Chocolate, red apple, mild nuttiness',light?.fields?.tasting_notes);
   check('ketch3:dark_notes',norm(dark?.fields?.tasting_notes)==='chocolate, caramel',
    'Chocolate, caramel',dark?.fields?.tasting_notes);
   check('ketch3:light_ratio',light?.roaster_recipe?.ratio===3,'1:3',light?.roaster_recipe?.ratio);
   check('ketch3:dark_ratio',dark?.roaster_recipe?.ratio===2,'1:2',dark?.roaster_recipe?.ratio);
  }else{
   check('ketch2:locked_identity',/Legacy Farms Honduras Natural Process/i.test(f.name||''),
    'Legacy Farms Honduras Natural',f.name);
   check('ketch2:locked_origin',/Cerro Bueno.*Honduras/i.test(f.origin||''),
    'Cerro Bueno, Honduras',f.origin);
   check('ketch2:locked_variety',norm(f.variety)==='lempira','Lempira',f.variety);
   check('ketch2:locked_process',norm(f.process)==='natural','Natural',f.process);
   check('ketch2:light_notes',norm(light?.fields?.tasting_notes)==='floral, blackberry',
    'Floral, blackberry',light?.fields?.tasting_notes);
   check('ketch2:dark_notes',norm(dark?.fields?.tasting_notes)==='blackberry, caramelized sugar',
    'Blackberry, caramelized sugar',dark?.fields?.tasting_notes);
   check('ketch2:light_ratio',light?.roaster_recipe?.ratio===3,'1:3',light?.roaster_recipe?.ratio);
   check('ketch2:light_dose_yield',light?.roaster_recipe?.dose_g===18&&light?.roaster_recipe?.yield_g===54,
    '18g/54g',JSON.stringify(light?.roaster_recipe));
   check('ketch2:light_temp',light?.roaster_recipe?.temperature_reference==='203–205°F',
    '203–205°F',light?.roaster_recipe?.temperature_reference);
   check('ketch2:dark_ratio',dark?.roaster_recipe?.ratio===2,'1:2',dark?.roaster_recipe?.ratio);
   check('ketch2:dark_temp',dark?.roaster_recipe?.temperature_reference==='200–202°F',
    '200–202°F',dark?.roaster_recipe?.temperature_reference);
   check('ketch2:dark_dose_unknown',dark?.roaster_recipe?.dose_g==null,
    'unknown',dark?.roaster_recipe?.dose_g);
   check('ketch2:light_sensory',light?.sensory?.sweetness==='6'&&light?.sensory?.acidity==='3'&&light?.sensory?.body==='7',
    'sweetness 6, acidity 3, body 7',JSON.stringify(light?.sensory));
   check('ketch2:dark_sensory',dark?.sensory?.sweetness==='5-7'&&dark?.sensory?.acidity==='2'&&dark?.sensory?.body==='7',
    'sweetness 5-7, acidity 2, body 7',JSON.stringify(dark?.sensory));
  }
  // The review must apply only the chosen roast's notes; both profile
  // rows can exist, but there is still just one green-coffee identity.
  if(light&&dark){
   const chosen=coffeeRoastVariantPreview(preview,'light');
   check('ketch:selection_maps_own_roast',chosen?.fields?.roast_level==='Light'&&
    chosen.fields.tasting_notes===light.fields.tasting_notes,
    'light fields from selected variant',JSON.stringify(fieldsOf(chosen)));
  }
 }
 return {checks,failed:checks.filter(x=>!x.passed),passed:checks.filter(x=>x.passed).length};
}

async function probeOne(target){
 const events=[],apiCalls=[],capture={html:null,htmlSourceUrl:null,jsonBytes:0,jsonSha256:null,endpoint:null};
 const readHtml=async(url,opts)=>{
  const result=await fetchPublicCoffeeHtml(url,opts);
  events.push({kind:'guarded_html',ok:result?.ok===true,reason:result?.reason||null,
   final_url:result?.source_url||null,bytes:result?.ok?Buffer.byteLength(result.html):null});
  if(result?.ok){capture.html=result.html;capture.htmlSourceUrl=result.source_url||url;}
  return result;
 };
 const readLargeHtml=async(url,opts)=>{
  const result=await fetchPublicCoffeeProductRetry(url,opts);
  events.push({kind:'guarded_product_2mb_retry',ok:result?.ok===true,reason:result?.reason||null,
   final_url:result?.source_url||null,bytes:result?.ok?Buffer.byteLength(result.html):null});
  if(result?.ok){capture.html=result.html;capture.htmlSourceUrl=result.source_url||url;}
  return result;
 };
 const readJson=async(url,opts)=>{
  const result=await fetchPublicCoffeeJson(url,opts);
  events.push({kind:'guarded_public_product_json',ok:result?.ok===true,reason:result?.reason||null,
   final_url:result?.source_url||null,bytes:result?.ok?Buffer.byteLength(result.json):null});
  if(result?.ok){
   capture.jsonBytes=Buffer.byteLength(result.json);capture.jsonSha256=sha(result.json);
   // This is the identical already-fetched public JSON; no second request.
   const request=shopifyProductRequest(target.url);
   if(request&&url===request.url){
    try{
     const endpoint=extractShopifyAjaxData(JSON.parse(result.json),request);
     capture.endpoint={
      conflicts:endpoint?.conflicts||[],
      roast_tag_ambiguity_only:endpoint?.roast_tag_ambiguity_only===true,
      roast_options:endpoint?.conflict_options?.roast_level?.slice(0,8).map(o=>clip(o.value))||[],
      roast_source:endpoint?.roast_source||null,
      current_specs:endpoint?.current_product_spec_fields||[]
     };
    }catch{/* Diagnostics only; app handler separately validates JSON. */}
   }
  }
  return result;
 };
 const apiFetch=async(uri,opts={})=>{
  // These are intentionally LOCAL responses. No production account, quota
  // receipt, test user or database is ever accessed or modified.
  const path=new URL(uri).pathname,body=opts.body?JSON.parse(opts.body):{};
  apiCalls.push({path,cached:body.p_cached??null});
  const json=path==='/auth/v1/user'?{id:'disposable-test-only'}:
   path==='/rest/v1/rpc/dic_session_status'?{admitted:true,emailVerified:true}:
   path==='/rest/v1/rpc/dic_preview_cached_verified'?{ok:false}:
   path==='/rest/v1/rpc/dic_preview_preflight'?{allowed:true,ticket:'00000000-0000-4000-8000-000000000123'}:
   path==='/rest/v1/rpc/dic_preview_complete'?{charged:true}:null;
  if(!json)throw Error('unexpected_local_api_call');
  return {ok:true,status:200,json:async()=>json};
 };
 const handler=createPreviewHandler({
  apiFetch,readHtml,readLargeHtml,readJson,
  env:key=>({SUPABASE_URL:'https://fixture.supabase.co',
   SUPABASE_PUBLISHABLE_KEY:'sb_publishable_only_disposable_fixture'}[key])
 });
 const start=Date.now();
 let status=null,preview=null,errorClass=null;
 try{
  if(!safeCoffeeUrl(target.url))throw Error('static_url_not_safe');
  const response=await handler(new Request('https://app.dialincollective.com/api/coffee-preview',{
   method:'POST',
   headers:{Origin:'https://app.dialincollective.com','Content-Type':'application/json',
    Authorization:'Bearer fixture.jwt-not-real'},
   body:JSON.stringify({source_url:target.url,refresh_source:true})
  }));
  status=response.status;preview=await response.json();
 }catch(error){errorClass=String(error?.name||'Error');}
 const rawHtml=capture.html;
 let nativo_source_diagnostics=null;
 // Narrow, read-only public HTML trace ONLY after Nativo's first guarded
 // official current page failed to expose its printed named decaf method.
 // No passwords, member data, private source or full HTML in stdout/artifact.
 if(target.id==='nativo-tranquilo-current-sugar-decaf'&&rawHtml){
  const page=compactCoffeeProductHtml(rawHtml)||rawHtml;
  const scope=productMarkup(page);
  const tidy=value=>String(value??'').replace(/<[^<>]{0,1000}>/g,' ')
    .replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim().slice(0,6001);
  const h1=markup=>[...markup.matchAll(/<h1\b[^<>]{0,1500}>([\s\S]{0,500}?)<\/h1\s*>/gi)]
    .map(x=>clip(tidy(x[1]),90)).slice(0,12);
  const blockDiagnostics=markup=>{
   const blocks=productCoffeeProse(markup,tidy);
   return {block_count:blocks.length,
    selected_h1:blocks.filter(x=>x.tag==='h1').map(x=>clip(x.text,90)).slice(0,10),
    named_method_blocks:blocks.filter(x=>/tranquilo.{0,35}decaffeinated|sugar\s*cane\s+process/i.test(x.text))
     .slice(0,10).map(x=>({tag:x.tag,section:clip(x.section,75),
      educational:x.educational,chars:x.text.length,prefix:clip(x.text,340)}))};
  };
  const direct=markup=>selectedDirectProductCredits(markup,{name:'TRANQUILO, Decaffeinated, 12 oz',clean:tidy,optionHtml:page});
  nativo_source_diagnostics={
   compact_html_size:page.length,product_scope_size:scope.length,
   compact_html_selected_phrase:/Tranquilo is decaffeinated/i.test(page),
   product_scope_selected_phrase:/Tranquilo is decaffeinated/i.test(scope),
   raw_h1:h1(page),scoped_h1:h1(scope),
   raw_blocks:blockDiagnostics(page),scoped_blocks:blockDiagnostics(scope),
   direct_on_compact:Object.keys(direct(page)),
   direct_on_scoped:Object.keys(direct(scope))
  };
 }
 let rawResult=null,matchingH1=0,visibleOldCaption=false;
 if(rawHtml){
  const compact=compactCoffeeProductHtml(rawHtml);
  rawResult=extractPublicCoffeeFacts(compact||rawHtml,{source_url:capture.htmlSourceUrl});
  const hs=[...rawHtml.matchAll(/<h1\b[^>]*>([\s\S]{0,400}?)<\/h1\s*>/gi)]
   .map(m=>norm(m[1].replace(/<[^<>]{0,300}>/g,' ')));
  matchingH1=hs.filter(h=>h===norm(preview?.fields?.name)).length;
  visibleOldCaption=/legacy farms honduras/i.test(rawHtml)&&target.id==='ketch-tier3-current-mexico';
 }
 const rendered=preview?.ok?coffeeUrlPreviewMarkup(preview):'';
 const audit=assessReadyPreview(target.id,preview,{realHtmlReceived:!!rawHtml,renderedHtml:rendered});
 // Do not allow Shopify merging to conceal a source HTML contradiction.
 // The selected current HTML source must itself not invent the seasonal
 // catalog program as a second roast claim.
 if(target.id==='44north-decaf-rotating-program'&&rawResult?.conflicts?.includes('roast_level'))
  audit.failed.push({label:'44north-decaf:raw_html_no_false_roast_conflict',passed:false,
   expected:'no current selected roast conflict',actual:JSON.stringify(rawResult.conflicts)});
 if(status!==200)audit.failed.push({label:'handler:http_status',passed:false,expected:'200',actual:String(status)});
 if(errorClass)audit.failed.push({label:'handler:exception',passed:false,expected:'none',actual:errorClass});
 const summary={
  id:target.id,requested_url:target.url,elapsed_ms:Date.now()-start,
  actual_https_reads:events,actual_https_html_sha256:rawHtml?sha(rawHtml):null,
  actual_https_json_sha256:capture.jsonSha256,live_html_bytes:rawHtml?Buffer.byteLength(rawHtml):0,
  html_compact_parser_ok:rawResult?.ok===true,
  html_compact_conflicts:rawResult?.conflicts||[],
  html_compact_roast_options:rawResult?.conflict_options?.roast_level?.slice(0,8).map(o=>clip(o.value))||[],
  endpoint_roast_evidence:capture.endpoint,
  merged_roast_options:preview?.conflict_options?.roast_level?.slice(0,8).map(o=>clip(o.value))||[],
  html_compact_parser_name:clip(rawResult?.fields?.name),html_compact_parser_fields:fieldsOf(rawResult),
  response_http_status:status,response_ok:preview?.ok===true,response_reason:clip(preview?.reason),
  full_preview_fields:fieldsOf(preview),
  conflicts:preview?.conflicts||[],
  source_fact_count:preview?.source_facts?.length??0,
  exact_title_h1_count:matchingH1,
  repeated_identical_h1_live_evidence:matchingH1>1,
  selected_product_has_stale_legacy_caption:visibleOldCaption,
  ...(nativo_source_diagnostics?{nativo_source_diagnostics}:{}),
  roast_variants:(preview?.roast_variants||[]).map(v=>({id:v.id,fields:fieldsOf(v),
   sensory:v.sensory||null,roaster_recipe:v.roaster_recipe||null})),
  ui_rendered:rendered.length>50,ui_roast_picker:/Which roast did you buy\?/i.test(rendered),
  checked:audit.checks.length,passed:audit.checks.filter(x=>x.passed).length,
  failures:audit.failed,verdict:audit.failed.length?'FAIL_OR_UNVERIFIED':'PASS',
  local_rpc_call_count:apiCalls.length,
  real_supabase_reads:0,real_supabase_writes:0,production_requests:0,
  real_member_authentication:false
 };
 console.log('[DIC33 READY LIVE PRODUCT] '+JSON.stringify(summary));
 return summary;
}

export async function runRecentReadyLiveProbe(){
 const outdir=process.env.DIC_ISSUE33_READY_LIVE_OUTDIR;
 if(!outdir)throw Error('explicit_runner_evidence_directory_required');
 await mkdir(outdir,{recursive:true});
 const result=[];
 for(const target of CURRENT_READY_CASES)result.push(await probeOne(target));
 const summary={
  schema_version:1,project:'Issue33 recent READY live parser acceptance',
  source_sha:process.env.GITHUB_SHA||'unknown',
  observed_at_utc:new Date().toISOString(),
  actual_public_https_requests:result.reduce((n,x)=>n+x.actual_https_reads.length,0),
  current_raw_html_retrieved:result.filter(x=>x.live_html_bytes>0).length,
  case_count:result.length,
  passed:result.filter(x=>x.verdict==='PASS').length,
  failed_or_unverified:result.filter(x=>x.verdict!=='PASS').length,
  unmatched_duplicate_heading_live_cases:result.filter(x=>!x.repeated_identical_h1_live_evidence).map(x=>x.id),
  no_credentials_or_production_mutations:true,
  real_signed_in_member_testing:false,
  original603_replay:false,
  cases:result
 };
 await writeFile(join(outdir,'live-acceptance.json'),JSON.stringify(summary,null,2)+'\n','utf8');
 console.log('[DIC33 READY LIVE SUMMARY] '+JSON.stringify({
  source_sha:summary.source_sha,case_count:summary.case_count,passed:summary.passed,
  failed_or_unverified:summary.failed_or_unverified,
  actual_public_https_requests:summary.actual_public_https_requests,
  raw_html_retrieved:summary.current_raw_html_retrieved,
  reasons:result.filter(x=>x.verdict!=='PASS').map(x=>({id:x.id,failures:x.failures}))
 }));
 if(summary.failed_or_unverified)process.exitCode=1;
 return summary;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await runRecentReadyLiveProbe();
