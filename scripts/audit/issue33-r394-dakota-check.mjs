#!/usr/bin/env node
// #33 original603 #88/#90: require current selected first-party HTML, parser, unsaved UI.
// A green result is a bounded source contract, NOT 603-coffee manual certification.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';

const expected=new Map([
 [88,{name:'701 Blend',url:'https://dakotaroasters.com/products/701-blend',
  roast:'Medium',notes:['nutty','cocoa','lemongrass']}],
 [90,{name:'Great Plains Decaf',url:'https://dakotaroasters.com/products/great-plains-decaf',
  roast:'Medium',notes:['chocolate','caramel','apple'],decaf:'Water Process'}]
]);
const sha=html=>createHash('sha256').update(html).digest('hex');
const clean=markup=>String(markup||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
 .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]{0,2000}>/g,' ')
 .replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
export function dakotaSelectedSourceFailures(summary,htmlByNumber){
 const errors=[];
 if(!summary||JSON.stringify(summary.case_numbers)!=='[88,90]'||
    summary.manual_certified!==0||summary.original_corpus_modified!==false||
    summary.production_operations!==0||summary.public_only!==true)
   errors.push('corpus_or_case_scope_invariant');
 if(summary?.fetched!==2||summary?.parsed!==2)errors.push('both_official_pages_not_fetched_and_parsed');
 const rows=Array.isArray(summary?.records)?summary.records:[];
 if(rows.length!==2||new Set(rows.map(r=>r.number)).size!==2)errors.push('invalid_exact_record_count');
 for(const [number,own] of expected){
  const r=rows.find(row=>row.number===number);
  if(!r){errors.push('missing_case_'+number);continue;}
  if(r.status!=='FETCHED'||r.parser_ok!==true||r.selected_heading_identity_verified!==true||
     r.add_coffee_ui_rendered!==true||r.source_review_rendered!==true)
   errors.push('selected_identity_parser_or_unsaved_ui_unverified_'+number);
  if(r.official_url!==own.url||r.final_url!==own.url)
   errors.push('exact_original_official_url_changed_'+number);
  if(r.current_fields?.name!==own.name||
     !/Dakota Roasters/i.test(r.current_fields?.roaster||''))
   errors.push('parsed_selected_identity_mismatch_'+number);
  if(r.current_fields?.roast_level!==own.roast)
   errors.push('selected_roast_incorrect_'+number);
  const notes=String(r.current_fields?.tasting_notes||'').toLowerCase();
  if(own.notes.some(note=>!notes.includes(note)))errors.push('selected_tasting_notes_missing_'+number);
  if((r.conflicts||[]).includes('tasting_notes')||
     (r.seo_fallback_fields||[]).includes('tasting_notes'))
   errors.push('sensory_conflict_or_seo_dependency_'+number);
  const raw=htmlByNumber?.[number];
  if(typeof raw!=='string'||!raw.length||r.html_sha256!==sha(raw)||
     r.html_bytes!==Buffer.byteLength(raw,'utf8')){
   errors.push('raw_official_html_hash_unverified_'+number);continue;
  }
  const selected=productMarkup(raw);
  const headings=selectedProductHeadings(selected);
  if(headings.length!==1||headings[0]!==own.name||
     !/<h1\b/i.test(selected))errors.push('selected_h1_missing_or_multiple_'+number);
  const selectedText=clean(selected).toLowerCase();
  if(!selectedText.includes('medium roast')||
     own.notes.some(note=>!selectedText.includes(note)))
   errors.push('direct_selected_literature_missing_'+number);
  if(number===88){
   if(r.current_fields?.decaffeination_method)errors.push('regular_blend_false_decaf');
  }else{
   // Exact page says Swiss Water, which the approved taxonomy renders as Water Process.
   if(!/swiss[\s-]*water\s+process(?:ed)?/i.test(selectedText)||
      r.current_fields?.decaffeination_method!=='Water Process'||
      r.current_fields?.process)
    errors.push('selected_swiss_water_or_green_process_mismatch');
   if((r.conflicts||[]).includes('decaffeination_method')||
      (r.seo_fallback_fields||[]).includes('decaffeination_method'))
    errors.push('decaf_method_conflict_or_seo_dependency');
  }
 }
 return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const dir=process.env.DIC_ISSUE33_R394_DIR||'/tmp/dic33-r394';
 const summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
 const htmlByNumber={};
 for(const n of expected.keys())htmlByNumber[n]=readFileSync(join(dir,'case-'+n+'.html'),'utf8');
 const errors=dakotaSelectedSourceFailures(summary,htmlByNumber);
 console.log('[DIC33 R394 DAKOTA EXACT FIRST-PARTY] '+JSON.stringify({
  source_sha:process.env.GITHUB_SHA||null,number:[...expected.keys()],
  html_sha256:summary.records.map(r=>[r.number,r.html_sha256]),
  selected_fields:summary.records.map(r=>({number:r.number,fields:r.current_fields,
   conflicts:r.conflicts,seo_fallback_fields:r.seo_fallback_fields})),
  manual_certified:0,passed:errors.length===0,errors
 }));
 if(errors.length)process.exitCode=1;
}