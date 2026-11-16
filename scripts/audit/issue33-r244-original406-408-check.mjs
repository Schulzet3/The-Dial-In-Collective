#!/usr/bin/env node
// Current selected official WeBe 406/408 evidence afterproof, not all603 manual certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('missing_exact_selected_source_dir');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const cases=[
 {n:406,name:'Guatemala Los Volcanes',url:'https://webe.coffee/products/guatemala-los-volcanes',
   origin:['Guatemala','Alta Verapaz'],notes:['Brown Sugar','Red Apple','Milk Chocolate','Orange'],roast:'Light',process:'Washed'},
 {n:408,name:'Holy Grail No. 2: Strawberry Jam',url:'https://webe.coffee/products/strawberry-jam-colombia-santa-monica',
   origin:['Colombia','Quindío'],notes:['Ripe Strawberry','Tangerine','Caramel','Chocolate'],roast:'Light',process:'Anaerobic'}
];
const has=(v,s)=>String(v||'').toLocaleLowerCase().includes(s.toLocaleLowerCase());
const failures=[],records=[];
if(head!==process.env.DIC_R244_HEAD)failures.push('wrong_exact_git_head');
if(JSON.stringify(summary.case_numbers)!=='[406,408]'||
 JSON.stringify(summary.negative_identity_case_numbers||[])!=='[]'||
 summary.records?.length!==2)failures.push('original_selected_case_register_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||
 summary.production_operations!==0)failures.push('unsupported_global_or_provider_claim');
for(const c of cases){
 const row=summary.records.find(x=>x.number===c.n)||{},errors=[];
 let raw=Buffer.alloc(0);try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch{errors.push('missing_raw_html');}
 const digest=createHash('sha256').update(raw).digest('hex');
 const p=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:row.final_url||c.url}):{};
 const f=p.fields||{},conflicts=p.conflicts||[];
 if(row.status!=='FETCHED'||row.official_url!==c.url||row.parser_ok!==true)
   errors.push('current_original_official_url_not_fetched_parsed');
 if(raw.length<1000||raw.length!==row.html_bytes||digest!==row.html_sha256)
   errors.push('source_raw_length_sha256_mismatch');
 if(row.selected_heading_identity_verified!==true||
  !has(f.name,c.name)||!has(c.name,f.name||'?'))
   errors.push('selected_product_h1_name_mismatch');
 if(row.add_coffee_ui_rendered!==true||row.source_review_rendered!==true)
   errors.push('actual_add_coffee_or_review_missing');
 for(const x of c.origin)if(!has(f.origin,x)&&!conflicts.includes('origin'))
   errors.push('selected_origin_absent_without_review:'+x);
 for(const x of c.notes)if(!has(f.tasting_notes,x)&&!conflicts.includes('tasting_notes'))
   errors.push('selected_tasting_note_absent_without_review:'+x);
 if(f.roast_level!==c.roast&&!conflicts.includes('roast_level'))
   errors.push('selected_light_roast_missing_without_review');
 if(f.process!==c.process&&!conflicts.includes('process'))
   errors.push('selected_process_missing_without_review');
 if(f.decaffeination_method)errors.push('unrelated_decaf_contamination');
 if(p.roaster_recipe?.dose_g||p.roaster_recipe?.yield_g||p.roaster_recipe?.time_s)
   errors.push('pour_over_incorrectly_persisted_as_espresso_recipe');
 if(c.n===406&&f.release_label)errors.push('related_holy_grail_release_leak');
 records.push({number:c.n,url:c.url,bytes:raw.length,sha256:digest,
  selected_heading_identity_verified:row.selected_heading_identity_verified,fields:f,conflicts,errors});
 failures.push(...errors.map(e=>c.n+':'+e));
}
const report={source_sha:head,passed:!failures.length,
 verified_selected_cases:failures.length?[]:[406,408],
 original603_all_individually_certified:false,production_operations:0,records,failures};
writeFileSync(join(dir,'r244-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R244 WEBE SELECTED] '+JSON.stringify(report).slice(0,30000));
if(failures.length)throw Error(failures.join(','));
