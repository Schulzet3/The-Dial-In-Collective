#!/usr/bin/env node
// #33 R247 independent current original603 #418–419 selected-source test and raw bytes.
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
 {n:418,name:'AFRICAN BLEND',url:'https://www.ahrre.com/products/african-blend',notes:['Floral','Berry'],mustFullCity:true},
 {n:419,name:'COLOMBIAN LIGHT ROAST',url:'https://www.ahrre.com/products/colombian-light-roast',notes:[],comparisonFullCity:true}
];
const has=(v,s)=>String(v||'').toLowerCase().includes(s.toLowerCase());
const fail=[],records=[];
if(head!==process.env.DIC_R247_HEAD)fail.push('wrong_exact_git_head');
if(JSON.stringify(summary.case_numbers)!=='[418,419]'||
 JSON.stringify(summary.negative_identity_case_numbers||[])!=='[]'||summary.records?.length!==2)
 fail.push('wrong_original603_current_selected_cases');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||
 summary.production_operations!==0)fail.push('unearned_global_certification_or_provider_effect');
for(const c of cases){
 const row=summary.records.find(x=>x.number===c.n)||{},errors=[];
 let raw=Buffer.alloc(0);try{raw=readFileSync(join(dir,'case-'+c.n+'.html'))}
 catch{errors.push('missing_raw_selected_html')}
 const sha256=createHash('sha256').update(raw).digest('hex');
 const p=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:row.final_url||c.url}):{};
 const f=p.fields||{},conflicts=p.conflicts||[];
 if(row.status!=='FETCHED'||row.official_url!==c.url||row.parser_ok!==true)
  errors.push('selected_original_exact_url_not_fetched_or_not_parsed');
 if(raw.length<1000||raw.length!==row.html_bytes||sha256!==row.html_sha256)
  errors.push('independent_raw_source_sha256_or_size_mismatch');
 if(row.selected_heading_identity_verified!==true||!has(f.name,c.name))
  errors.push('selected_product_heading_identity_unverified');
 if(row.add_coffee_ui_rendered!==true||row.source_review_rendered!==true)
  errors.push('actual_add_coffee_or_source_review_not_rendered');
 if(c.mustFullCity&&f.roast_level!=='Medium-Dark'&&!conflicts.includes('roast_level'))
  errors.push('direct_selected_full_city_missing_or_wrong');
 if(c.comparisonFullCity&&f.roast_level==='Medium-Dark'&&!conflicts.includes('roast_level'))
  errors.push('comparison_only_full_city_promoted_to_selected');
 for(const note of c.notes)if(!has(f.tasting_notes,note)&&!conflicts.includes('tasting_notes'))
  errors.push('direct_selected_flavor_missing_without_review:'+note);
 if(f.decaffeination_method&&!conflicts.includes('decaffeination_method'))
  errors.push('generic_all_decaf_or_unselected_variant_contamination');
 if(f.release_label)errors.push('unpublished_current_release_label');
 if(p.roaster_recipe?.dose_g||p.roaster_recipe?.yield_g||p.roaster_recipe?.time_s)
  errors.push('unpublished_numeric_espresso_recipe');
 records.push({number:c.n,url:c.url,bytes:raw.length,sha256,fields:f,
  conflicts,identity:row.selected_heading_identity_verified,errors});
 fail.push(...errors.map(e=>c.n+':'+e));
}
const report={source_sha:head,passed:fail.length===0,
 verified_selected_cases:fail.length?[]:[418,419],original603_all_individually_certified:false,
 production_operations:0,records,failures:fail};
writeFileSync(join(dir,'r247-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R247 AHRRE] '+JSON.stringify(report).slice(0,32000));
if(fail.length)throw Error(fail.join(','));
