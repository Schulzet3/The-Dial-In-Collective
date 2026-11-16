#!/usr/bin/env node
// R243 exact current Wake selected-source independent afterproof (not full603 certification).
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('missing_selected_source_dir');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const cases=[
 {n:403,name:'Ambler Blend',url:'https://wakecoffee.com/products/ambler-blend',origin:['Latin America'],notes:[]},
 {n:404,name:'Bromo',url:'https://wakecoffee.com/products/bromo-blend',origin:['Central America','Indonesia'],notes:['caramel']},
 {n:405,name:'Mountain Water Decaf',url:'https://wakecoffee.com/products/decaf',origin:['Latin America','Indonesia','Africa'],notes:['herbal','dark chocolate'],decaf:'Water Process'}
];
const has=(v,s)=>String(v||'').toLocaleLowerCase().includes(s.toLocaleLowerCase());
const failures=[],records=[];
if(head!==process.env.DIC_R243_HEAD)failures.push('wrong_exact_source_git_head');
if(JSON.stringify(summary.case_numbers)!=='[403,404,405]'||
 JSON.stringify(summary.negative_identity_case_numbers||[])!=='[]'||
 summary.records?.length!==3||
 summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 failures.push('original603_register_or_selected_target_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||
 summary.production_operations!==0)failures.push('unsupported_certification_or_provider_claim');
for(const c of cases){
 const row=summary.records.find(x=>x.number===c.n)||{},errors=[];
 let raw=Buffer.alloc(0);try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch{errors.push('missing_selected_raw_html');}
 const digest=createHash('sha256').update(raw).digest('hex');
 const p=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:row.final_url||c.url}):{};
 const f=p.fields||{},conflicts=p.conflicts||[];
 if(row.status!=='FETCHED'||row.official_url!==c.url||row.parser_ok!==true)
  errors.push('exact_selected_original_official_url_unfetched_or_unparsed');
 if(raw.length<1000||raw.length!==row.html_bytes||digest!==row.html_sha256)
  errors.push('selected_raw_bytes_sha256_mismatch');
 if(row.selected_heading_identity_verified!==true||
  String(f.name||'').toLocaleLowerCase()!==c.name.toLocaleLowerCase())
  errors.push('selected_original_product_h1_name_mismatch');
 if(row.add_coffee_ui_rendered!==true||row.source_review_rendered!==true)
  errors.push('actual_add_coffee_or_source_review_missing');
 for(const origin of c.origin)if(!has(f.origin,origin)&&!conflicts.includes('origin'))
  errors.push('source_printed_origin_missing_without_review:'+origin);
 for(const note of c.notes)if(!has(f.tasting_notes,note)&&!conflicts.includes('tasting_notes'))
  errors.push('source_printed_selected_tasting_missing_without_review:'+note);
 if(c.decaf){
  if(f.decaffeination_method!==c.decaf&&!conflicts.includes('decaffeination_method'))
   errors.push('source_named_water_decaf_method_missing_without_review');
 }else if(f.decaffeination_method)errors.push('regular_coffee_borrowed_decaf_method');
 if(f.roast_level)errors.push('review_medium_body_or_customer_dark_misclassified_roast');
 for(const field of ['process','producer','variety','release_label'])
  if(f[field])errors.push('unsupported_selected_'+field+'_invented');
 if(p.roaster_recipe?.dose_g||p.roaster_recipe?.yield_g||p.roaster_recipe?.time_s)
  errors.push('grind_choice_or_customer_review_numeric_recipe_contamination');
 records.push({number:c.n,url:c.url,bytes:raw.length,sha256:digest,fields:f,
  identity_verified:row.selected_heading_identity_verified===true,conflicts,errors});
 failures.push(...errors.map(e=>c.n+':'+e));
}
const report={source_sha:head,passed:failures.length===0,
 verified_selected_cases:failures.length?[]:[403,404,405],
 original603_all_individually_certified:false,production_operations:0,records,failures};
writeFileSync(join(dir,'r243-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R243 WAKE SELECTED] '+JSON.stringify(report).slice(0,30000));
if(failures.length)throw Error(failures.join(','));
