#!/usr/bin/env node
// #33 R223: current raw chosen URL, SHA and real Add Coffee for originals 347/348.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR,errors=[],results=[];
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch{errors.push('missing_summary')}
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(sha!==process.env.DIC_R223_HEAD)errors.push('wrong_checkout_sha');
if(JSON.stringify(summary.case_numbers)!=='[347,348]'||summary.records?.length!==2||summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('original603_unchanged_register_required');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('invalid_global_certification');
for(const [number,url,name] of [
 [347,'https://sparkyscraftcoffeeroasting.com/products/las-lajas-micromill-finca-calle-liles-black-honey','Las Lajas Micromill – Finca Calle Liles - Black Honey'],
 [348,'https://sparkyscraftcoffeeroasting.com/products/womens-produced-colombia-decaf','Night Shift Espresso Decaf']
]){
 const bad=[],record=summary.records?.find(x=>x.number===number)||{};
 let raw=Buffer.alloc(0);try{raw=readFileSync(join(dir,'case-'+number+'.html'))}catch{bad.push('missing_raw_html')}
 const digest=createHash('sha256').update(raw).digest('hex');
 const chosen=productMarkup(raw.toString('utf8')),heads=selectedProductHeadings(chosen);
 const parsed=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:record.final_url||url}):{};
 const fields=parsed.fields||{},selected=chosen.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ').replace(/\s+/gu,' ');
 if(record.status!=='FETCHED'||record.official_url!==url||record.final_url!==url||!record.parser_ok)bad.push('exact_current_official_url_unavailable');
 if(raw.length<1000||digest!==record.html_sha256||raw.length!==record.html_bytes)bad.push('current_source_raw_hash_mismatch');
 if(!record.selected_heading_identity_verified||!heads.includes(name)||fields.name!==name)bad.push('changed_or_recycled_product_identity');
 if(!record.add_coffee_ui_rendered||!record.source_review_rendered)bad.push('missing_Add_Coffee_Source_Review');
 if((parsed.conflicts||[]).includes('name'))bad.push('selected_identity_conflict');
 if(number===347){
  if(fields.process!=='Honey'||!/San Isidro/i.test(String(fields.variety||''))||!/1400/.test(String(fields.elevation_m||''))||!/Costa Rica/i.test(String(fields.origin||'')))bad.push('missing_direct_green_source_facts');
  if(!/Micromill\s*(?:\|\s*)?Las Lajas/i.test(selected)||!/Process\s*(?:\|\s*)?Black Honey/i.test(selected))bad.push('seller_selected_spec_changed');
  if((parsed.conflicts||[]).includes('process'))bad.push('green_process_conflict');
 }else{
  if(!/When you need a coffee but also need to sleep later/i.test(selected)||!/first responders/i.test(selected))bad.push('chosen_description_changed');
  if(/Women Producers Colombia/i.test(String(fields.name||''))||/Blueberry|Jasmine/i.test(String(fields.tasting_notes||'')))bad.push('old_coffee_identity_or_reviews_leaked');
 }
 if(fields.decaffeination_method||fields.roast_level||fields.espresso_recipe)bad.push('unverified_method_roast_or_espresso');
 errors.push(...bad.map(x=>number+':'+x));
 results.push({number,html_bytes:raw.length,html_sha256:digest,selected_h1:heads,fields,errors:bad});
}
const report={source_sha:sha,passed:!errors.length,cases:results,errors,manual_603_certified:false,provider_writes:0};
writeFileSync(join(dir,'r223-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R223 CURRENT OFFICIAL AFTERPROOF] '+JSON.stringify(report).slice(0,20000));
if(errors.length)throw Error(errors.join(','));
