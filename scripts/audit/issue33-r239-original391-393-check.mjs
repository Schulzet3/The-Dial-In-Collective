#!/usr/bin/env node
// R239: fresh original603 #391-393 selected official seller raw bytes,
// real parser and Add Coffee/Source Review. NOT whole-603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('missing_bounded_current_source_dir');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const targets=[
 {n:391,name:'Downshift',url:'https://umblecoffee.com/products/downshift',
  notes:['Chocolate','Caramel','Hazelnut'],origin:'Colombia',process:'Washed',roast:'Medium'},
 {n:392,name:'Front Runner',url:'https://umblecoffee.com/products/front-runner',
  notes:['Graham Cracker','Toffee','Marshmallow'],origin:'Colombia',process:'Washed',roast:'Medium'},
 {n:393,name:'Umble Reserve - Prologue',url:'https://umblecoffee.com/products/prologue',
  notes:['Apricot','Raspberry','Pink Starburst'],origin:'Colombia',process:'Natural',roast:null}
];
const has=(v,s)=>String(v||'').toLocaleLowerCase().includes(s.toLocaleLowerCase());
const failures=[],records=[];
if(head!==process.env.DIC_R239_HEAD)failures.push('wrong_exact_git_source_head');
if(JSON.stringify(summary.case_numbers)!=='[391,392,393]'||
 JSON.stringify(summary.negative_identity_case_numbers||[])!=='[]'||
 summary.records?.length!==3||
 summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 failures.push('target_or_immutable_original603_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||
 summary.production_operations!==0)failures.push('unsupported_global_certification_or_provider_claim');
for(const c of targets){
 const row=summary.records.find(x=>x.number===c.n)||{},errors=[];
 let raw=Buffer.alloc(0);
 try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch{errors.push('raw_html_missing');}
 const digest=createHash('sha256').update(raw).digest('hex');
 const p=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:row.final_url||c.url}):{};
 const f=p.fields||{},conflicts=p.conflicts||[];
 if(row.status!=='FETCHED'||row.official_url!==c.url||row.parser_ok!==true)
   errors.push('exact_official_selected_product_unavailable_or_unparsed');
 if(raw.length<1000||raw.length!==row.html_bytes||digest!==row.html_sha256)
   errors.push('current_raw_selected_html_hash_or_size_mismatch');
 if(row.selected_heading_identity_verified!==true||
   String(f.name||'').toLocaleLowerCase()!==c.name.toLocaleLowerCase())
   errors.push('selected_h1_and_current_parser_identity_unverified');
 if(row.add_coffee_ui_rendered!==true||row.source_review_rendered!==true)
   errors.push('actual_add_coffee_or_source_review_not_rendered');
 if(!has(f.origin,c.origin))errors.push('direct_current_selected_origin_missing');
 if(f.process!==c.process&&!conflicts.includes('process'))
   errors.push('selected_green_processing_lost_without_conflict');
 if(c.roast&&f.roast_level!==c.roast&&!conflicts.includes('roast_level'))
   errors.push('selected_current_roast_missing_without_conflict');
 for(const note of c.notes)
  if(!has(f.tasting_notes,note)&&!conflicts.includes('tasting_notes'))
   errors.push('own_selected_flavor_missing_without_review:'+note);
 if(c.n===391){
  if(f.decaffeination_method)
   errors.push('generic_educational_Swiss_Water_podcast_mistaken_for_selected_decaf_method');
  if(has(f.tasting_notes,'Marshmallow')||has(f.tasting_notes,'Pink Starburst'))
   errors.push('sibling_sensory_contamination');
 }
 if(c.n===392){
  if(f.decaffeination_method)errors.push('unrelated_Downshift_decaf_method_borrowed');
  if(has(f.tasting_notes,'Hazelnut')||has(f.tasting_notes,'Pink Starburst'))
   errors.push('sibling_sensory_contamination');
  if(p.roaster_recipe||f.espresso_recipe)errors.push('unpublished_numeric_espresso_recipe_invented');
 }
 if(c.n===393){
  if(f.release_label)errors.push('historical_Limited_batch_or_footer_year_invented_current_release');
  if(f.roast_level)errors.push('unpublished_current_roast_invented');
  if(has(f.tasting_notes,'Hazelnut')||has(f.tasting_notes,'Marshmallow'))
   errors.push('sibling_sensory_contamination');
 }
 records.push({number:c.n,url:c.url,bytes:raw.length,sha256:digest,
  current_selected_identity:row.selected_heading_identity_verified===true,
  fields:f,conflicts,errors});
 failures.push(...errors.map(e=>c.n+':'+e));
}
const report={source_sha:head,passed:failures.length===0,verified_selected_cases:failures.length?[]:[391,392,393],
 original603_all_individually_certified:false,production_operations:0,records,failures};
writeFileSync(join(dir,'r239-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R239 Umble current selected source] '+JSON.stringify(report).slice(0,30000));
if(failures.length)throw Error(failures.join(','));
