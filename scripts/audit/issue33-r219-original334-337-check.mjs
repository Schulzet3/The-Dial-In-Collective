#!/usr/bin/env node
// Guarded original603 #334/#337 exact current selected official-product afterproof.
// Never convert this two-case review into universal frozen603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';

const rows=[
 {n:334,url:'https://smallplanescoffee.com/products/colombia-la-muralla',
  name:'Colombia La Muralla',roast:'Medium-Light',process:'Washed',notes:['Pomegranate','Brown Butter','Goldenberry'],
  origin:/Huila|Colombia/i,producer:/La Muralla/i,decaf:null},
 {n:337,url:'https://snowyelk.com/products/corpse-pose-decaf',
  name:'Corpse Pose Decaf',roast:'Medium',process:'Washed',notes:['Nutty','chocolate'],
  origin:/Peru/i,decaf:'Water Process'}
];
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.'),errors=[],products=[];
mkdirSync(dir,{recursive:true});
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_original603_capture_summary');}
const hash=b=>createHash('sha256').update(b).digest('hex');
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(checkout!==process.env.DIC_R219_EXACT_CHECKOUT_SHA)errors.push('not_exact_checkout');
if(JSON.stringify(summary.case_numbers)!=='[334,337]'||summary.records?.length!==2)errors.push('wrong_original603_case_set');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('original603_source_register_changed');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('unearned_corpus_or_provider_claim');
for(const row of rows){
 const r=summary.records?.find(x=>x.number===row.n)||{},e=[];
 let raw=Buffer.alloc(0);
 try{raw=readFileSync(join(dir,'case-'+row.n+'.html'));}catch{e.push('missing_raw_selected_source');}
 const html=raw.toString('utf8'),selected=productMarkup(html),heads=selectedProductHeadings(selected);
 const p=raw.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||row.url}):{},f=p.fields||{};
 const visible=selected.replace(/<[^<>]{0,2500}>/gu,' ').replace(/&(?:nbsp|#0*160|#x0*a0);/giu,' ').replace(/\s+/gu,' ');
 if(r.status!=='FETCHED'||r.official_url!==row.url||r.final_url!==row.url||!r.parser_ok)e.push('source_or_parser_unavailable');
 if(raw.length<1000||raw.length!==r.html_bytes||hash(raw)!==r.html_sha256)e.push('source_hash_or_bytes_mismatch');
 if(!r.selected_heading_identity_verified||!heads.includes(row.name)||f.name!==row.name)e.push('selected_product_h1_mismatch');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)e.push('Add_Coffee_or_Source_Review_unavailable');
 if((p.conflicts||[]).includes('name')||f.espresso_recipe)e.push('invalid_identity_conflict_or_borrowed_espresso');
 if(f.roast_level!==row.roast||f.process!==row.process)e.push('own_roast_or_green_process_missing');
 if(!row.origin.test(String(f.origin||'')))e.push('own_origin_missing');
 if(row.producer&&!row.producer.test(String(f.producer||'')))e.push('own_producer_missing');
 if(row.decaf?f.decaffeination_method!==row.decaf:Boolean(f.decaffeination_method))e.push('decaf_method_misclassified');
 for(const note of row.notes)if(!String(f.tasting_notes||'').toLowerCase().includes(note.toLowerCase()))e.push('own_tasting_missing:'+note);
 if(/Mango|Guatemala|Bronze Medal/i.test(String(f.tasting_notes||'')))e.push('borrowed_SEO_or_award_tasting');
 if(row.n===334){
  if(!/San Agustín|San Agustin/i.test(visible)||!/La Muralla Community/i.test(visible)||
   !/1,?700\s*-\s*1,?900/i.test(visible)||!/Light\s*-\s*Medium/i.test(visible)||
   !/Pomegranate/i.test(visible)||!/Brown Butter/i.test(visible))e.push('current_selected_334_primary_spec_changed');
 }else if(row.n===337){
  if(!/Swiss\s+Water\s+Process/i.test(visible)||!/Washed/i.test(visible)||
   !/Corpse Pose Decaf/i.test(visible)||!/Peru/i.test(visible))e.push('current_selected_337_named_decaf_spec_changed');
 }
 errors.push(...e.map(s=>'#'+row.n+':'+s));
 products.push({number:row.n,source_url:row.url,selected_h1:heads,raw_sha256:raw.length?hash(raw):null,
  raw_bytes:raw.length,fields:f,conflicts:p.conflicts||[],passed:e.length===0,errors:e});
}
const report={passed:errors.length===0,errors,checkout_sha:checkout,
 original603_individual_manual_certification_complete:false,production_operations:0,products};
writeFileSync(join(dir,'r219-original334-337-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R219 chosen source and parser] '+JSON.stringify(report).slice(0,20000));
if(errors.length)throw Error('r219_exact_current_source_not_verified:'+errors.join(','));
