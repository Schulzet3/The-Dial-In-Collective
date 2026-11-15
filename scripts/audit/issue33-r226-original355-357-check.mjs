#!/usr/bin/env node
// R226: strict original603 #356/#357 selected current primary afterproof; #355 remains a separate access/identity exception.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('source_evidence_directory_required');
const errors=[],cases=[];
let summary={};
try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch{errors.push('source_evidence_missing')}
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(sha!==process.env.DIC_R226_HEAD)errors.push('checkout_sha_mismatch');
if(JSON.stringify(summary.case_numbers)!=='[356,357]'||summary.records?.length!==2||
 summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 errors.push('original603_register_or_case_inventory_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)
 errors.push('unearned_corpus_certification_or_operations');
const expected=[
 [356,'https://stovetoproasters.com/products/decaf-colombia','Decaf Colombia'],
 [357,'https://stovetoproasters.com/products/ethiopia-worka-chelbessa','Ethiopia Worka Chelbessa']
];
for(const [n,url,name] of expected){
 const bad=[],r=summary.records?.find(x=>x.number===n)||{};
 let raw=Buffer.alloc(0);
 try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch{bad.push('raw_current_html_missing')}
 const hash=createHash('sha256').update(raw).digest('hex');
 const selected=productMarkup(raw.toString('utf8'));
 const headings=selectedProductHeadings(selected);
 const t=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:amp|nbsp);/giu,' ').replace(/\s+/gu,' ');
 const p=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:r.final_url||url}):{};
 const f=p.fields||{};
 if(r.status!=='FETCHED'||r.official_url!==url||r.final_url!==url||!r.parser_ok)
  bad.push('exact_original_official_url_or_parser_unavailable');
 if(raw.length<1000||r.html_bytes!==raw.length||r.html_sha256!==hash)
  bad.push('raw_source_bytes_not_sha_bound');
 if(!r.selected_heading_identity_verified||!headings.includes(name)||f.name!==name)
  bad.push('selected_current_h1_or_coffee_identity_mismatch');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)
  bad.push('Add_Coffee_or_Source_Review_not_rendered');
 if((p.conflicts||[]).includes('name'))bad.push('selected_name_conflict');
 if(n===356){
  if(f.process!=='Washed'||f.decaffeination_method!=='Sugar Process'||
   !/Huila/i.test(String(f.origin||'')))
    bad.push('incorrect_washed_green_vs_sugarcane_decaf_or_huila');
  if(!/Sweet/i.test(String(f.tasting_notes||''))||
   !/Lemon/i.test(String(f.tasting_notes||''))||
   !/Creamy/i.test(String(f.tasting_notes||'')))
    bad.push('direct_selected_tasting_notes_not_preserved');
  if(!/Process:\s*Washed,\s*Sugar Cane Decaf/i.test(t)||
   !/ethyl acetate decaf|E\.A\. is derived from fermented cane sugar/i.test(t))
    bad.push('current_direct_process_source_text_changed');
 } else {
  if(f.process!=='Washed'||!/Gedeb|Yirgacheffe/i.test(String(f.origin||''))||
   !/Pear/i.test(String(f.tasting_notes||''))||
   !/Orange/i.test(String(f.tasting_notes||''))||
   !/Rose/i.test(String(f.tasting_notes||'')))
    bad.push('worka_current_selected_washed_geography_notes_missing');
  if(!/Worka Chelbessa washing station/i.test(t))
    bad.push('selected_station_source_identity_changed');
  if(/(?:Atlantic Specialty|SNAP) owner|(?:Atlantic Specialty|SNAP) founder/i.test(String(f.producer||'')))
    bad.push('supplier_or_cooperative_misidentified_as_named_grower');
  if(f.decaffeination_method)bad.push('invented_decaf_from_unselected_product');
 }
 if(f.roast_level)bad.push('unsupported_current_selected_roast_level');
 if(f.espresso_recipe)bad.push('brew_or_grind_choice_not_espresso_recipe');
 errors.push(...bad.map(e=>n+':'+e));
 cases.push({number:n,url,source_h1:headings,bytes:raw.length,raw_sha256:hash,
  canonical_fields:f,conflicts:p.conflicts||[],errors:bad});
}
// The exact #355 URL yielded a separate initial public 404; do not include it
// in requiredFocusedSourceFailures or claim the current original product verified.
cases.unshift({number:355,url:'https://stovetoproasters.com/products/brazil-joao-hamilton',
 source_status:'INITIAL_BROWSER_HTTP_404',verified_current_identity:false,
 adjudication:'UNVERIFIED_OFFICIAL_EXACT_URL_REQUIRES_INDEPENDENT_RECHECK'});
const report={source_sha:sha,passed:errors.length===0,
 verified_selected_cases:[356,357],unresolved_exception_cases:[355],
 all_603_independently_certified:false,production_operations:0,cases,errors};
writeFileSync(join(dir,'r226-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R226 SELECTED CURRENT AFTERPROOF] '+JSON.stringify(report).slice(0,21000));
if(errors.length)throw Error(errors.join(','));
