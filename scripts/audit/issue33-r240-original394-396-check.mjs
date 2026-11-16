#!/usr/bin/env node
// Issue #33 R240: independent selected raw-source afterproof for original603 #394-396.
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
 {n:394,name:'Kamwangi - Kenya',url:'https://vestacoffee.com/products/kamwangi-kenya',origin:'Kenya',
  process:'Washed',notes:['Apricot','Blackberry','Toffee']},
 {n:395,name:'Wush Wush + Papayo, Anaerobic Natural - Elías & Shady Bayter',
  url:'https://vestacoffee.com/products/papayo-wushwush-elias-shady-bayter',origin:'Colombia',
  process:'Anaerobic',notes:['Tangerine','Tropical Fruit','Molasses']},
 {n:396,name:'Wush Wush - Anaerobic Natural',
  url:'https://vestacoffee.com/products/wush-wush-anaerobic-natural',origin:'Ethiopia',
  process:'Anaerobic',notes:['Strawberry','Watermelon','Peach Tea']}
];
const has=(v,s)=>String(v||'').toLocaleLowerCase().includes(s.toLocaleLowerCase());
const failures=[],records=[];
if(head!==process.env.DIC_R240_HEAD)failures.push('wrong_exact_source_git_head');
if(JSON.stringify(summary.case_numbers)!=='[394,395,396]'||
 JSON.stringify(summary.negative_identity_case_numbers||[])!=='[]'||
 summary.records?.length!==3||
 summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 failures.push('immutable_original603_or_target_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||
 summary.production_operations!==0)failures.push('unsupported_corpus_or_provider_claim');
for(const c of cases){
 const row=summary.records.find(x=>x.number===c.n)||{},errors=[];
 let raw=Buffer.alloc(0);
 try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch{errors.push('selected_raw_html_missing');}
 const digest=createHash('sha256').update(raw).digest('hex');
 const parsed=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:row.final_url||c.url}):{};
 const f=parsed.fields||{},conflicts=parsed.conflicts||[];
 if(row.status!=='FETCHED'||row.official_url!==c.url||row.parser_ok!==true)
  errors.push('selected_original_official_url_unfetched_or_unparsed');
 if(raw.length<1000||raw.length!==row.html_bytes||digest!==row.html_sha256)
  errors.push('raw_bytes_or_sha256_mismatch');
 if(row.selected_heading_identity_verified!==true||String(f.name||'').toLocaleLowerCase()!==c.name.toLocaleLowerCase())
  errors.push('current_selected_product_heading_or_name_not_qualified');
 if(row.add_coffee_ui_rendered!==true||row.source_review_rendered!==true)
  errors.push('actual_add_coffee_or_source_review_missing');
 if(!has(f.origin,c.origin))errors.push('direct_selected_country_missing');
 if(f.process!==c.process&&!conflicts.includes('process'))
  errors.push('direct_selected_processing_missing_without_review');
 for(const note of c.notes)if(!has(f.tasting_notes,note)&&!conflicts.includes('tasting_notes'))
  errors.push('direct_selected_tasting_notes_missing:'+note);
 if(f.roast_level)errors.push('unpublished_selected_roast_invented');
 if(f.release_label)errors.push('station_founding_altitude_footer_or_marketing_as_selected_release');
 if(c.n===394){
  if(has(f.origin,'Ethiopia')||has(f.tasting_notes,'Strawberry')||has(f.tasting_notes,'Molasses'))
   errors.push('other_vesta_product_contamination');
 }
 if(c.n===395){
  if(has(f.origin,'Ethiopia')||has(f.producer,'Mamush')||has(f.tasting_notes,'Peach Tea'))
   errors.push('other_wush_wush_product_contamination');
 }
 if(c.n===396){
  if(has(f.origin,'Colombia')||has(f.producer,'Bayter')||has(f.tasting_notes,'Molasses'))
   errors.push('other_wush_wush_product_contamination');
  if(!has(f.producer,'Mamush')&&!conflicts.includes('producer'))
   errors.push('direct_selected_mamush_producer_missing_without_review');
 }
 records.push({number:c.n,url:c.url,bytes:raw.length,sha256:digest,fields:f,
  identity_verified:row.selected_heading_identity_verified===true,conflicts,errors});
 failures.push(...errors.map(e=>c.n+':'+e));
}
const report={source_sha:head,passed:failures.length===0,
 verified_selected_cases:failures.length?[]:[394,395,396],
 original603_all_individually_certified:false,production_operations:0,records,failures};
writeFileSync(join(dir,'r240-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R240 VESTA SELECTED] '+JSON.stringify(report).slice(0,30000));
if(failures.length)throw Error(failures.join(','));
