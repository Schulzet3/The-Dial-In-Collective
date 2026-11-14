#!/usr/bin/env node
// R210 original603 selected #315/#316 live exact URL, raw evidence and actual parser.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';

const cases=[
 {n:315,name:'Vienna Roast',url:'https://shop.inkcoffee.com/products/vienna'},
 {n:316,name:'Colombia- Honey Process',url:'https://shop.justlovecoffee.com/products/colombia-honey-process'}
],errors=[],products=[];
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
mkdirSync(dir,{recursive:true});
const sha=x=>createHash('sha256').update(x).digest('hex');
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(checkout)||checkout!==process.env.DIC_R210_EXACT_CHECKOUT_SHA)errors.push('wrong_checkout');
let summary={};
try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_focused_evidence');}
if(JSON.stringify(summary.case_numbers)!=='[315,316]'||summary.records?.length!==2)errors.push('wrong_original_subset');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('frozen_register_changed');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('invalid_overclaim');
for(const c of cases){
 const r=summary.records?.find(x=>x.number===c.n)||{},e=[];
 let raw=Buffer.alloc(0);
 try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch{e.push('missing_raw_html');}
 const html=raw.toString('utf8'),selected=productMarkup(html),h1=selectedProductHeadings(selected);
 const visible=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp|quot);/giu,' ').replace(/\s+/gu,' ');
 const p=raw.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||c.url}):{},f=p.fields||{};
 if(r.status!=='FETCHED'||r.official_url!==c.url||r.final_url!==c.url||r.parser_ok!==true)e.push('wrong_selected_original_url_or_failed_parser');
 if(raw.length<1000||raw.length!==r.html_bytes||sha(raw)!==r.html_sha256)e.push('raw_source_digest_mismatch');
 if(!r.selected_heading_identity_verified||!h1.includes(c.name)||f.name!==c.name)e.push('wrong_selected_h1');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)e.push('missing_add_coffee_or_review');
 if((p.conflicts||[]).includes('name'))e.push('selected_name_conflict');
 if(f.elevation_m||f.decaffeination_method||f.espresso_recipe)e.push('unsupported_height_decaf_or_recipe');
 if(c.n===315){
  if(!/Roast\s*[-:]\s*Dark/iu.test(visible)||!/Origin\s*[-:]\s*Americas/iu.test(visible))e.push('direct_roast_or_region_missing');
  if(f.roast_level!=='Dark'||!/Americas/iu.test(String(f.origin||'')))e.push('direct_roast_or_origin_not_parsed');
  if(!/caramel/iu.test(String(f.tasting_notes||'')))e.push('selected_caramel_missing');
 }else{
  if(!/Grown on the Las Mercedes farm in northern Colombia/iu.test(visible)||!/Gamboa family/iu.test(visible))e.push('current_farm_family_region_missing');
  if(!/light-roasted Honey Process Colombian/iu.test(visible))e.push('current_specific_process_or_roast_missing');
  if(f.process!=='Honey'||f.roast_level!=='Light')e.push('direct_honey_or_light_omitted');
  if(!/Gamboa/iu.test(String(f.producer||'')))e.push('named_current_family_omitted');
  if(!/strawberry/iu.test(String(f.tasting_notes||''))||!/orange/iu.test(String(f.tasting_notes||'')))e.push('direct_notes_omitted');
  if(!/northern colombia/iu.test(String(f.origin||'')))e.push('direct_growing_northern_region_omitted');
 }
 errors.push(...e.map(x=>'#'+c.n+':'+x));
 products.push({number:c.n,url:c.url,selected_h1:h1,raw_bytes:raw.length,raw_sha256:raw.length?sha(raw):null,fields:f,roaster_details:p.roaster_details||{},conflicts:p.conflicts||[],passed:e.length===0,errors:e,selected_excerpt:visible.slice(0,700)});
}
const report={passed:errors.length===0,errors,checkout_sha:checkout,source_sha:summary.source_sha,manual_certified:false,production_operations:0,products};
writeFileSync(join(dir,'r210-original315-316-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R210 SOURCE SELECTED AFTERPROOF] '+JSON.stringify(report).slice(0,14000));
if(errors.length)throw Error('r210_exact_selected_verification_failed:'+errors.join(','));
