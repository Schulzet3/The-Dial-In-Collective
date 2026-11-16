#!/usr/bin/env node
// R245 original #409–411 current selected source verification. Never global 603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('missing_selected_public_dir');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const cases=[
 {n:409,name:'Decaf',url:'https://whiterhinocoffee.com/products/decaf',roast:'Medium',
  origin:['Guatemala'],notes:['Caramel Apple','Black Tea','Raisin'],process:'Washed',decaf:'Water Process'},
 {n:410,name:'Ethiopia Kayon Mountain',url:'https://whiterhinocoffee.com/products/ethiopia-kayon-mountain',
  roast:'Light',origin:['Ethiopia','Guji'],notes:['Nectarine','Jasmine','Toffee','Honeysuckle'],process:'Washed'},
 {n:411,name:'Hidden Eagle (Espresso Blend)',url:'https://whiterhinocoffee.com/products/hidden-eagle-espresso',
  roast:'Medium',origin:['Brazil','Peru'],notes:['Cocoa','Nut Butter','Honey','Dried Apricot','Caramel'],process:'Other/Unknown'}
];
const has=(v,s)=>String(v||'').toLowerCase().includes(s.toLowerCase());
const failures=[],records=[];
if(head!==process.env.DIC_R245_HEAD)failures.push('wrong_exact_git_head');
if(JSON.stringify(summary.case_numbers)!=='[409,410,411]'||
 JSON.stringify(summary.negative_identity_case_numbers||[])!=='[]'||summary.records?.length!==3)
 failures.push('selected_original_case_register_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||
 summary.production_operations!==0)failures.push('incorrect_global_or_provider_claim');
for(const c of cases){
 const row=summary.records.find(x=>x.number===c.n)||{},errors=[];
 let raw=Buffer.alloc(0);
 try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch{errors.push('raw_source_unavailable');}
 const sha256=createHash('sha256').update(raw).digest('hex');
 const p=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:row.final_url||c.url}):{};
 const f=p.fields||{},conflicts=p.conflicts||[];
 if(row.status!=='FETCHED'||row.official_url!==c.url||row.parser_ok!==true)
  errors.push('exact_selected_official_source_unavailable_or_parser_failed');
 if(raw.length<1000||raw.length!==row.html_bytes||sha256!==row.html_sha256)
  errors.push('raw_html_source_digest_or_bytes_mismatch');
 if(row.selected_heading_identity_verified!==true||
  !has(f.name,c.name)||!has(c.name,String(f.name||'').replace(/\$\s*[0-9]+(?:\.[0-9]{2})?/g,'').trim()))
  errors.push('current_selected_product_identity_unverified');
 if(row.add_coffee_ui_rendered!==true||row.source_review_rendered!==true)
  errors.push('actual_add_coffee_or_source_review_missing');
 for(const x of c.origin)if(!has(f.origin,x)&&!conflicts.includes('origin'))
  errors.push('official_origin_missing_without_review:'+x);
 for(const x of c.notes)if(!has(f.tasting_notes,x)&&!conflicts.includes('tasting_notes'))
  errors.push('official_selected_note_missing_without_review:'+x);
 if(f.roast_level!==c.roast&&!conflicts.includes('roast_level'))
  errors.push('official_selected_roast_missing_without_review');
 if(f.process!==c.process&&!conflicts.includes('process'))
  errors.push('official_selected_process_missing_without_review');
 if(c.decaf&&f.decaffeination_method!==c.decaf)
  errors.push('direct_swiss_water_method_not_captured');
 if(!c.decaf&&f.decaffeination_method)
  errors.push('unrelated_decaf_method_contamination');
 if(c.n===410){
  if(/1200\s*[-–]\s*2100/.test(String(f.elevation_m||'')))
   errors.push('generic_view_details_altitude_overrode_selected_1900_2200');
  if(f.release_label)errors.push('producer_foundation_year_not_release');
 }
 if(c.n===411&&(/^(Natural|Washed)$/.test(String(f.process||''))))
  errors.push('multi_process_blend_simplified_to_single_green_method');
 if((c.n===409||c.n===411)&&
  (p.roaster_recipe?.dose_g||p.roaster_recipe?.yield_g||p.roaster_recipe?.time_s))
  errors.push('missing_numeric_espresso_recipe_invented');
 records.push({number:c.n,url:c.url,bytes:raw.length,sha256,fields:f,conflicts,
  selected_heading_identity_verified:row.selected_heading_identity_verified,errors});
 failures.push(...errors.map(e=>c.n+':'+e));
}
const report={source_sha:head,passed:failures.length===0,
 verified_selected_cases:failures.length?[]:[409,410,411],
 original603_all_individually_certified:false,production_operations:0,records,failures};
writeFileSync(join(dir,'r245-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R245 WHITE RHINO] '+JSON.stringify(report).slice(0,32000));
if(failures.length)throw Error(failures.join(','));
