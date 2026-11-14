#!/usr/bin/env node
// Issue33 R209 exact original selected official URL/H1/source parser evidence.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const cases=[
 {n:313,name:'6610',url:'https://shop.inkcoffee.com/products/6610'},
 {n:314,name:'Espresso 89',url:'https://shop.inkcoffee.com/products/espresso-89'}
],errors=[],out=[];
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(checkout)||checkout!==process.env.DIC_R209_EXACT_CHECKOUT_SHA)errors.push('not_exact_checkout');
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch(e){errors.push('missing_summary:'+e.message);}
if(JSON.stringify(summary.case_numbers)!=='[313,314]'||summary.records?.length!==2)errors.push('wrong_original_subset');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('original_source_changed');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('invalid_certification_or_provider_write');
for(const c of cases){
 const r=summary.records?.find(x=>x.number===c.n)||{},e=[];
 let raw=Buffer.alloc(0);try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch{e.push('missing_raw_html');}
 const html=raw.toString('utf8'),selected=productMarkup(html),heads=selectedProductHeadings(selected);
 const visible=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp|quot);/giu,' ').replace(/\s+/gu,' ');
 const p=raw.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||c.url}):{},f=p.fields||{};
 if(r.status!=='FETCHED'||r.official_url!==c.url||r.final_url!==c.url||r.parser_ok!==true)e.push('exact_original_selected_url_or_parser_failed');
 if(raw.length<1000||raw.length!==r.html_bytes||sha(raw)!==r.html_sha256)e.push('raw_source_digest_invalid');
 if(!r.selected_heading_identity_verified||!heads.includes(c.name)||f.name!==c.name)e.push('exact_selected_h1_identity_failed');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)e.push('add_coffee_or_source_review_failed');
 if((p.conflicts||[]).includes('name'))e.push('selected_name_conflict');
 if(f.elevation_m)e.push('roasting_site_not_green_growing_elevation');
 if(f.decaffeination_method||f.espresso_recipe)e.push('unsourced_decaf_or_recipe');
 if(c.n===313){
  if(!/6610\s*ft/iu.test(visible)||!/altitude\s+we\s+roast\s+our\s+coffee/iu.test(visible))e.push('roasting_site_role_not_direct');
  if(!/Roast\s*[-:]\s*Special\s+Dark/iu.test(visible))e.push('selected_own_special_dark_missing');
  if(f.roast_level!=='Dark')e.push('own_selected_dark_roast_omitted');
  if(!/America/iu.test(String(f.origin||'')))e.push('source_regional_origin_omitted');
  if(!/smoky|chocolate/iu.test(String(f.tasting_notes||'')))e.push('own_selected_notes_omitted');
 }else{
  if(!/Roast\s*[-:]\s*Trade\s+Secret/iu.test(visible))e.push('selected_roast_undisclosed_label_missing');
  if(f.roast_level)e.push('trade_secret_not_publishable_roast_degree');
  if(/Italy/iu.test(String(f.origin||'')))e.push('italian_style_not_farm_origin');
  if(!/Africa|Asia|America/iu.test(String(f.origin||'')))e.push('selected_regional_origin_omitted');
  if(!/chocolate|licorice/iu.test(String(f.tasting_notes||'')))e.push('own_selected_sensory_missing');
 }
 errors.push(...e.map(x=>'#'+c.n+':'+x));
 out.push({number:c.n,url:c.url,passed:e.length===0,errors:e,raw_bytes:raw.length,raw_sha256:raw.length?sha(raw):null,selected_h1:heads,fields:f,conflicts:p.conflicts||[],selected_excerpt:visible.slice(0,1000)});
}
const report={passed:errors.length===0,errors,source_sha:summary.source_sha,checkout_sha:checkout,manual_certified:false,provider_writes:0,products:out};
writeFileSync(join(dir,'r209-313-314-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R209 ORIGINAL313/314 INK SELECTED AFTERPROOF] '+JSON.stringify(report).slice(0,16000));
if(errors.length)throw Error('r209_selected_current_afterproof_failed:'+errors.join(','));
