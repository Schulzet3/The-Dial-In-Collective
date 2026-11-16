#!/usr/bin/env node
// #33 R246 original603 #412-414: independently parse exact selected public HTML only.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('missing_focused_dir');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const cases=[
 {n:412,name:'Brown Bear',url:'https://woodscoffee.com/products/brown-bear',roast:'Dark',notes:['Spice'],decaf:false},
 {n:413,name:'Decaf',url:'https://woodscoffee.com/products/decaf',roast:'Medium',notes:['Spice'],decaf:true},
 {n:414,name:'Woods Blend',url:'https://woodscoffee.com/products/woods-blend',roast:'Medium',notes:['Cocoa'],decaf:false}
];
const has=(v,s)=>String(v||'').toLowerCase().includes(s.toLowerCase());
const fail=[],records=[];
if(head!==process.env.DIC_R246_HEAD)fail.push('wrong_exact_git_head');
if(JSON.stringify(summary.case_numbers)!=='[412,413,414]'||
 JSON.stringify(summary.negative_identity_case_numbers||[])!=='[]'||summary.records?.length!==3)
 fail.push('wrong_original603_selected_register_cases');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||
 summary.production_operations!==0)fail.push('unearned_global_certification_or_provider_effect');
for(const c of cases){
 const row=summary.records.find(x=>x.number===c.n)||{},errors=[];
 let raw=Buffer.alloc(0);
 try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch{errors.push('missing_raw_selected_html');}
 const sha256=createHash('sha256').update(raw).digest('hex');
 const p=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:row.final_url||c.url}):{};
 const f=p.fields||{},conflicts=p.conflicts||[];
 if(row.status!=='FETCHED'||row.official_url!==c.url||row.parser_ok!==true)
  errors.push('current_exact_selected_url_not_fetched_or_not_parsed');
 if(raw.length<1000||raw.length!==row.html_bytes||sha256!==row.html_sha256)
  errors.push('independent_raw_source_sha256_or_size_mismatch');
 if(row.selected_heading_identity_verified!==true||!has(f.name,c.name))
  errors.push('exact_current_heading_identity_mismatch');
 if(row.add_coffee_ui_rendered!==true||row.source_review_rendered!==true)
  errors.push('actual_add_coffee_or_source_review_not_rendered');
 if(f.roast_level!==c.roast&&!conflicts.includes('roast_level'))
  errors.push('source_selected_roast_not_supported_or_reviewed');
 for(const note of c.notes)if(!has(f.tasting_notes,note)&&!conflicts.includes('tasting_notes'))
  errors.push('direct_selected_note_omitted_without_review:'+note);
 if(c.decaf&&f.decaffeination_method!=='Water Process'&&
    !conflicts.includes('decaffeination_method'))
  errors.push('selected_swiss_water_method_missing_without_review');
 if(!c.decaf&&f.decaffeination_method)
  errors.push('unrelated_decaf_method_contamination');
 if(f.process==='Washed'&&c.decaf)
  errors.push('decaf_water_method_misclassified_as_green_washed');
 if(f.release_label)errors.push('unpublished_current_release_label_invented');
 if(p.roaster_recipe?.dose_g||p.roaster_recipe?.yield_g||p.roaster_recipe?.time_s)
  errors.push('unpublished_numeric_espresso_recipe_invented');
 records.push({number:c.n,url:c.url,bytes:raw.length,sha256,
  fields:f,conflicts,selected_heading_identity_verified:row.selected_heading_identity_verified,errors});
 fail.push(...errors.map(x=>c.n+':'+x));
}
const report={source_sha:head,passed:fail.length===0,
 verified_selected_cases:fail.length?[]:[412,413,414],
 original603_all_individually_certified:false,production_operations:0,records,failures:fail};
writeFileSync(join(dir,'r246-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R246 WOODS] '+JSON.stringify(report).slice(0,32000));
if(fail.length)throw Error(fail.join(','));
