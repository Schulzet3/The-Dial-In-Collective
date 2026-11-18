#!/usr/bin/env node
// Issue #33 R289: fail closed on live selected HTML, exact product or field provenance drift.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r289';
const errors=[],must=(ok,key)=>{if(!ok)errors.push(key)};
const nums=[138,484];
const targets={
 138:{name:'Red Bourbon DECAF',url:'https://gnosiscoffee.com/products/red-bourbon-decaf',
   tokens:['bergamot, red fruit, cola, peach, caramel','sugarcane decaffeination','1,900 masl']},
 484:{name:'Colombia Community Harvest',url:'https://www.fazendacoffee.com/products/colombia-antioquia',
   tokens:['caramel, citrus, cocoa','farmers','cooperative','medium roast']}
};
let report;
try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){errors.push('focused_report_missing_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)===JSON.stringify(nums)&&report?.records?.length===2,
 'exact_original_selected_case_subset');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353',
 'original603_csv_untouched');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,
 'not_corpus_certification_or_provider_write');
must(report?.source_sha===process.env.DIC_R289_EVENT_SHA,'event_sha_matches_focused_source');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R289_CHECKOUT_SHA,
 'checkout_exact_source');
must(requiredFocusedSourceFailures(nums,report?.records||[]).length===0,
 'exact_selected_merchant_parser_preview_source_review');
const records=[];
for(const number of nums){
 const t=targets[number],r=report?.records?.find(x=>x.number===number)||{},f=r.current_fields||{};
 let raw;try{raw=readFileSync(join(dir,'case-'+number+'.html'))}
 catch(e){errors.push(number+'_raw_html_missing_'+(e.code||e.message))}
 let u;try{u=new URL(r.final_url)}catch{}
 const selected=productMarkup(raw?.toString('utf8')||'');
 const h1=selectedProductHeadings(selected);
 const visible=selected.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ')
  .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:nbsp|amp|rsquo);/gi,' ')
  .replace(/\s+/g,' ').toLowerCase();
 must(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===t.url,number+'_public_fetch_and_real_parser');
 must(u?.protocol==='https:'&&u.hostname===new URL(t.url).hostname&&u.pathname===new URL(t.url).pathname,
  number+'_same_exact_official_product_url');
 must(raw?.length>0&&raw?.length===r.html_bytes&&sha(raw)===r.html_sha256,
  number+'_raw_content_sha256_verified');
 must(h1.length===1&&h1[0]===t.name&&f.name===t.name&&r.archived_coffee===t.name,
  number+'_selected_product_identity');
 must(t.tokens.every(token=>visible.includes(token)),number+'_selected_visible_direct_literals');
 must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,
  number+'_user_chooses_and_reviews');
 const notes=String(f.tasting_notes||'').toLowerCase();
 if(number===138){
  for(const literal of ['bergamot','red fruit','cola','peach','caramel'])
   must(notes.includes(literal),number+'_direct_complete_'+literal.replaceAll(' ','_'));
  must(!/blueberry|grapefruit|swiss water/.test(notes),number+'_no_unrelated_sensory_or_decaf');
  must(/sugar|ethyl acetate|ea\b/i.test(String(f.decaffeination_method||'')),
   number+'_selected_sugarcane_deca_method');
  must(!/washed|natural|honey|ferment/i.test(String(f.decaffeination_method||'')),
   number+'_method_distinct_from_primary_processing');
 }else{
  for(const literal of ['caramel','citrus','cocoa'])
   must(notes.includes(literal),number+'_own_selected_'+literal);
  must(!/Huila|Antioquia|Finca El Paraiso/i.test(String(f.origin||'')+' '+String(f.producer||'')),
   number+'_no_stale_unsupported_geography_or_farmer');
  must(!f.decaffeination_method&&!f.variety&&!f.elevation_m,
   number+'_unpublished_specialty_fields_not_autofilled');
 }
 records.push({number,source_url:r.final_url,html_sha256:r.html_sha256,
  html_bytes:r.html_bytes,selected_h1:h1,fields:f,
  conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]});
}
const result={passed:errors.length===0,errors,source_sha:process.env.DIC_R289_EVENT_SHA,
 checkout_sha:process.env.DIC_R289_CHECKOUT_SHA,manual_certified:0,production_operations:0,records};
writeFileSync(join(dir,'r289-afterproof.json'),JSON.stringify(result,null,2)+'\n');
console.log('[DIC33 R289 ACTUAL SELECTED SOURCE AFTERPROOF] '+JSON.stringify(result));
if(errors.length)process.exitCode=1;
