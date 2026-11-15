#!/usr/bin/env node
// R236: independently bind current original selected #389 and #390 Topeca HTML,
// parser and existing Add Coffee / Source Review. Not a 603-case certificate.
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
 {n:389,name:'El Salvador El Manzano Natural',url:'https://topecacoffee.com/products/el-salvador-manzano-natural',
  own:'Persimmon',other:'Nougat'},
 {n:390,name:'Santa Ana Swiss Water® Decaf',url:'https://topecacoffee.com/products/santa-ana-swiss-water®-decaf',
  own:'Nougat',other:'Persimmon'}
];
const has=(v,s)=>String(v||'').toLocaleLowerCase().includes(s.toLocaleLowerCase());
const failures=[],records=[];
if(head!==process.env.DIC_R236_HEAD)failures.push('wrong_exact_source_head');
if(JSON.stringify(summary.case_numbers)!=='[389,390]'||
 JSON.stringify(summary.negative_identity_case_numbers||[])!=='[]'||
 summary.records?.length!==2||
 summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 failures.push('original603_or_target_identity_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||
 summary.production_operations!==0)failures.push('unsupported_603_or_provider_claim');
for(const c of targets){
 const row=summary.records.find(x=>x.number===c.n)||{},errors=[];
 let raw=Buffer.alloc(0);
 try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch{errors.push('raw_html_missing');}
 const sha256=createHash('sha256').update(raw).digest('hex');
 const p=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:row.final_url||c.url}):{};
 const f=p.fields||{},conflicts=p.conflicts||[];
 if(row.status!=='FETCHED'||row.official_url!==c.url||row.parser_ok!==true)
  errors.push('exact_official_product_not_fetched_and_parsed');
 if(raw.length<1000||raw.length!==row.html_bytes||sha256!==row.html_sha256)
  errors.push('official_source_raw_byte_digest_mismatch');
 if(row.selected_heading_identity_verified!==true||!row.parser_ok||
  String(f.name||'').toLocaleLowerCase()!==c.name.toLocaleLowerCase())
  errors.push('exact_selected_product_identity_unverified');
 if(row.add_coffee_ui_rendered!==true||row.source_review_rendered!==true)
  errors.push('actual_add_coffee_source_review_missing');
 if(!has(f.tasting_notes,c.own)&&!conflicts.includes('tasting_notes'))
  errors.push('own_selected_flavor_missing_without_review');
 if(has(f.tasting_notes,c.other))errors.push('sibling_flavor_contamination');
 if(c.n===389){
  if(!has(f.origin,'El Salvador'))errors.push('current_selected_El_Salvador_lost');
  if(f.process!=='Natural')errors.push('selected_green_Natural_missing');
  if(f.roast_level!=='Light')errors.push('selected_Light_missing');
  if(f.decaffeination_method)errors.push('borrowed_sibling_decaf');
  if(f.release_label&&f.release_label!=='2026')
   errors.push('nonselected_or_invented_year_release');
 }
 if(c.n===390){
  if(!has(f.origin,'El Salvador'))errors.push('selected_El_Salvador_lost');
  if(f.roast_level!=='Light')errors.push('selected_Light_overwritten_by_medium_sibling');
  if(f.decaffeination_method!=='Water Process')
   errors.push('selected_Swiss_Water_decaffeination_missing');
  if(['Washed','Natural'].includes(f.process)&&!conflicts.includes('process'))
   errors.push('mixed_green_process_silently_reduced_to_one');
  if(f.release_label==='2026')errors.push('other_product_year_borrowed');
 }
 failures.push(...errors.map(x=>c.n+':'+x));
 records.push({case:c.n,source_url:c.url,bytes:raw.length,sha256,
  selected_heading_identity_verified:row.selected_heading_identity_verified===true,
  parsed:p.ok===true,fields:f,conflicts,errors});
}
const report={exact_git_source_sha:head,passed:failures.length===0,
 verified_selected_cases:failures.length?[]:[389,390],
 original603_all_individually_certified:false,production_operations:0,records,failures};
writeFileSync(join(dir,'r236-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R236 selected current Topeca] '+JSON.stringify(report).slice(0,30000));
if(failures.length)throw Error(failures.join(','));
