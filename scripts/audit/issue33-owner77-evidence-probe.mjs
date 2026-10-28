// Owner-reviewed 77 independent current official product fact audit.
// This probe does not authenticate, mutate production or approve a missing fact.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fetchPublicCoffeeHtml,safeCoffeeUrl,MAX_PRODUCT_RETRY_BYTES} from '../../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
const rows=JSON.parse(readFileSync(new URL('../../docs/audits/extractor-issue33-independent-77-review-register.json',import.meta.url),'utf8')).records;
if(rows.length!==77||new Set(rows.map(x=>x.original_product_url)).size!==77||
 rows.some((x,i)=>x.number!==i+1||!safeCoffeeUrl(x.original_product_url)))throw Error('Original 77 URL intake changed');
const evidenceDir=process.env.DIC_OWNER77_PUBLIC_CAPTURE_DIR||'';
if(evidenceDir)mkdirSync(evidenceDir,{recursive:true});
const clamp=(s,n=250)=>String(s??'').replace(/\s+/g,' ').trim().slice(0,n);
const fieldOf=claim=>/producer/i.test(claim)?'producer':/roast/i.test(claim)?'roast_level':
 /notes?/i.test(claim)?'tasting_notes':/processing/i.test(claim)?'process':
 /origin/i.test(claim)?'origin':/release/i.test(claim)?'release_label':
 /elevation/i.test(claim)?'elevation_m':'review';
async function audit(row){
 const field=fieldOf(row.original_missing_claim),out={number:row.number,url:row.original_product_url,
  prior_name:row.original_coffee,field,decision:clamp(row.reverse_chat_assessment,450),
  status:'UNKNOWN',selected:{},related:[],details:{},conflicts:[],review:'SOURCE_UNCHECKED'};
 try{
  const opts=[50,67].includes(row.number)?{maxBytes:MAX_PRODUCT_RETRY_BYTES}:undefined;
  const page=await fetchPublicCoffeeHtml(row.original_product_url,opts);
  if(!page?.ok){out.status='UNAVAILABLE';out.reason=clamp(page?.reason);}
  else{
   out.digest=createHash('sha256').update(page.html).digest('hex');
   // Exact public HTTP response only. Preserve the original page bytes in
   // a private, short-retention CI artifact for independent decision review.
   // Never save tokens, member data, cookies or arbitrary linked resources.
   if(evidenceDir)writeFileSync(join(evidenceDir,'coffee-'+String(row.number).padStart(2,'0')+'.html'),page.html,'utf8');
   const result=extractPublicCoffeeFacts(page.html,{source_url:page.source_url||row.original_product_url});
   if(!result?.ok){out.status='REJECTED';out.reason=clamp(result?.reason);}
   else{
    out.status='PARSED';
    for(const [k,v] of Object.entries(result.fields||{}))if(typeof v==='string')out.selected[k]=clamp(v,340);
    for(const [k,v] of Object.entries(result.roaster_details||{}))
     if(typeof v==='string'&&/process|harvest|lot|farm|producer|component|decaf/.test(k))out.details[k]=clamp(v,340);
    out.conflicts=result.conflicts||[];
    out.process_review=clamp(result.process_review_note,350);
    out.roast_review=clamp(result.roast_hint,350);
    out.options=(result.conflict_options||{})[field]?.slice(0,5).map(x=>({value:clamp(x.value,150),label:clamp(x.label,95)}))||[];
    const keys=new Set([field]);
    if(field==='release_label'){keys.add('harvest_season');keys.add('lot_type');}
    if(field==='process')keys.add('decaffeination_method');
    if(field==='producer')keys.add('named_producer');
    const seen=new Set();
    for(const x of result.source_facts||[]){
     if(!keys.has(x.field)&&!(field==='release_label'&&/harvest|microlot|micro.lot/i.test(x.label||'')))continue;
     const k=String(x.field)+'|'+String(x.value).toLowerCase();
     if(seen.has(k))continue;seen.add(k);
     if(out.related.length>=12)break;
     out.related.push({field:clamp(x.field,60),label:clamp(x.label,105),
      value:clamp(x.value,290),type:clamp(x.source_type,65),
      section:clamp(x.section,105),conflicting:x.conflicting===true});
    }
    const preview=coffeeUrlPreviewMarkup(result);
    const reviewExport=coffeeSourceReviewSnapshot(result);
    out.preview={visible:/class="coffee-url-preview"/.test(preview),
     conflict_warning:out.conflicts.length===0||/Review conflicting details/.test(preview),
     qualified_process_warning:!result.process_review_note||preview.includes('Processing review:'),
     qualified_process_review_export:!result.process_review_note||reviewExport?.processing_review_note===result.process_review_note};
    if(row.number===6)out.fudam_qualification={
     selected_current_identity:/\bFUDAM\b/i.test(result.fields?.name||''),
     explicit_selected_process:result.fields?.process||null,
     qualified_association_review_present:Boolean(result.process_review_note),
     qualifier_retained_in_source_review:out.preview.qualified_process_review_export};
    out.review=out.conflicts.includes(field)?'CURRENT_FIELD_CONFLICT':
     out.selected[field]?'CANONICAL_FIELD_PRESENT':
     out.related.length||out.details[field]?'LITERAL_SOURCE_CONTEXT_ONLY':
     'UNPUBLISHED_OR_NOT_EXTRACTED';
   }
  }
 }catch(e){out.status='ERROR';out.reason=clamp(e?.name||'Error');}
 console.log('[DIC33 OWNER77] '+JSON.stringify(out));return out;
}
const all=[];
for(let i=0;i<rows.length;i+=4)all.push(...await Promise.all(rows.slice(i,i+4).map(audit)));
const states={};for(const x of all)states[x.review]=(states[x.review]||0)+1;
const summary={attempted:all.length,parsed:all.filter(x=>x.status==='PARSED').length,
 states,preview_pass:all.filter(x=>x.preview?.visible&&x.preview?.conflict_warning&&x.preview?.qualified_process_warning).length,
 oracle_edited:false,authenticated:false,database_writes:0,individual_source_certification:false};
if(evidenceDir){
 writeFileSync(join(evidenceDir,'owner77-selected-replay.json'),JSON.stringify({
  schema_version:1,source_head_sha:process.env.GITHUB_SHA||'unbound_local',
  source_kind:'BOUNDED_DIRECT_PUBLIC_OFFICIAL_HTTPS_ONLY',
  confidential_member_data_included:false,immutable603_modified:false,
  assessment:'SELECTED_PARSER_AND_PREVIEW_DIAGNOSTIC_NOT_ALL77_APPROVAL',
  summary,records:all
 },null,2)+'\n','utf8');
}
console.log('[DIC33 OWNER77 SUMMARY] '+JSON.stringify(summary));
if(summary.parsed!==77||summary.preview_pass!==77){
 console.error('[DIC33 OWNER77 ACCEPTANCE] INCOMPLETE: public source or UI preview failed; inspect private artifact');
 process.exitCode=1;
}
