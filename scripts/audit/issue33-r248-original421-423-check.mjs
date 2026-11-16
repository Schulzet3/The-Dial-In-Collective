#!/usr/bin/env node
// Issue #33 R248 selected original603 #421/#423 independent raw-source afterproof.
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
 {n:421,name:'AK Mountain',url:'https://www.alaskaartisancoffee.com/products/ak-mountain',notes:['cacao','apricot'],roast:'Medium'},
 {n:423,name:'White Coffee',url:'https://www.alaskaartisancoffee.com/products/white-coffee',notes:[],roast:null}
];
const has=(v,s)=>String(v||'').toLowerCase().includes(s.toLowerCase());
const fail=[],records=[];
if(head!==process.env.DIC_R248_HEAD)fail.push('wrong_exact_git_head');
if(JSON.stringify(summary.case_numbers)!=='[421,423]'||
 JSON.stringify(summary.negative_identity_case_numbers||[])!=='[]'||summary.records?.length!==2)
 fail.push('wrong_original603_case_selection');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||
 summary.production_operations!==0)fail.push('unearned_global_or_provider_assertion');
for(const c of cases){
 const row=summary.records.find(x=>x.number===c.n)||{},errors=[];
 let raw=Buffer.alloc(0);try{raw=readFileSync(join(dir,'case-'+c.n+'.html'))}
 catch{errors.push('missing_exact_current_raw_html')}
 const sha256=createHash('sha256').update(raw).digest('hex');
 const parsed=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:row.final_url||c.url}):{};
 const f=parsed.fields||{},conflicts=parsed.conflicts||[];
 if(row.status!=='FETCHED'||row.official_url!==c.url||row.parser_ok!==true)
  errors.push('exact_official_selected_not_fetched_or_parsed');
 if(raw.length<1000||raw.length!==row.html_bytes||sha256!==row.html_sha256)
  errors.push('source_sha_or_bytes_mismatch');
 if(row.selected_heading_identity_verified!==true||!has(f.name,c.name))
  errors.push('selected_product_identity_unverified');
 if(row.add_coffee_ui_rendered!==true||row.source_review_rendered!==true)
  errors.push('add_coffee_source_review_unverified');
 if(c.roast&&f.roast_level!==c.roast&&!conflicts.includes('roast_level'))
  errors.push('selected_direct_medium_roast_missing');
 for(const note of c.notes)if(!has(f.tasting_notes,note)&&!conflicts.includes('tasting_notes'))
  errors.push('own_selected_note_missing_without_review:'+note);
 if(c.n===423){
   if(has(f.origin,'Malaysia')||has(f.origin,'Ipoh'))
    errors.push('educational_white_coffee_location_promoted_to_crop_origin');
   if(has(f.tasting_notes,'fruity')||has(f.tasting_notes,'floral'))
    errors.push('generic_white_coffee_education_promoted_to_own_notes');
 }
 if(f.decaffeination_method&&!conflicts.includes('decaffeination_method'))
  errors.push('unsupported_decaffeination_method');
 if(f.release_label)errors.push('unpublished_current_unique_release');
 if(parsed.roaster_recipe?.dose_g||parsed.roaster_recipe?.yield_g)
  errors.push('unsupported_numeric_espresso_dose_or_yield');
 records.push({number:c.n,url:c.url,bytes:raw.length,sha256,fields:f,conflicts,
  selected_identity:row.selected_heading_identity_verified,errors});
 fail.push(...errors.map(e=>c.n+':'+e));
}
const report={source_sha:head,passed:fail.length===0,
 verified_selected_cases:fail.length?[]:[421,423],
 original603_all_individually_certified:false,production_operations:0,records,failures:fail};
writeFileSync(join(dir,'r248-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R248 ALASKA] '+JSON.stringify(report).slice(0,32000));
if(fail.length)throw Error(fail.join(','));
