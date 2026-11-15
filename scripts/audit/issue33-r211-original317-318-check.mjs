#!/usr/bin/env node
// R211: verify current exact original603 #317/#318 official products through actual current parser.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';

const cases=[
 {n:317,name:'Kenya AA - Ndaroini Estate',url:'https://shop.justlovecoffee.com/products/kenya-aa-ndaroini-estate'},
 {n:318,name:'Uganda AA - Lifesong',url:'https://shop.justlovecoffee.com/products/uganda-aa-lifesong'}
];
const errors=[],products=[],dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
mkdirSync(dir,{recursive:true});
const sha=x=>createHash('sha256').update(x).digest('hex');
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(checkout)||checkout!==process.env.DIC_R211_EXACT_CHECKOUT_SHA)errors.push('wrong_checkout');
let summary={};
try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_focused_evidence');}
if(JSON.stringify(summary.case_numbers)!=='[317,318]'||summary.records?.length!==2)errors.push('wrong_original_subset');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('frozen_register_changed');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('invalid_overclaim');
for(const c of cases){
 const r=summary.records?.find(x=>x.number===c.n)||{},e=[];
 let raw=Buffer.alloc(0);
 try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch{e.push('missing_raw_html');}
 const html=raw.toString('utf8'),selected=productMarkup(html),h1=selectedProductHeadings(selected);
 const visible=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp|quot);/giu,' ').replace(/\s+/gu,' ');
 const p=raw.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||c.url}):{},f=p.fields||{};
 if(r.status!=='FETCHED'||r.official_url!==c.url||r.final_url!==c.url||r.parser_ok!==true)e.push('selected_original_url_or_parser_failed');
 if(raw.length<1000||raw.length!==r.html_bytes||sha(raw)!==r.html_sha256)e.push('raw_digest_mismatch');
 if(!r.selected_heading_identity_verified||!h1.includes(c.name)||f.name!==c.name)e.push('wrong_selected_h1_or_name');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)e.push('add_coffee_or_source_review_missing');
 if((p.conflicts||[]).includes('name'))e.push('selected_name_conflict');
 if(f.decaffeination_method||f.espresso_recipe)e.push('unsupported_decaf_or_espresso_recipe');
 const notes=String(f.tasting_notes||'');
 if(c.n===317){
  if(!/Tasting Notes:\s*Bright Peach/iu.test(visible)||!/Origin:\s*Ndaroini Factory, Nyeri, Kenya/iu.test(visible))e.push('seller_direct_notes_or_origin_not_visible');
  if(!/Elevation:\s*1,700 meters/iu.test(visible)||!/Process:\s*Fully Washed/iu.test(visible))e.push('seller_direct_altitude_or_process_not_visible');
  if(!/Nyeri.*Kenya/iu.test(String(f.origin||'')))e.push('selected_nyeri_origin_missing');
  if(f.process!=='Washed'||!/1,?700/u.test(String(f.elevation_m||'')))e.push('selected_washed_or_height_missing');
  if(!['peach','honey','grapefruit'].every(x=>notes.toLowerCase().includes(x)))e.push('selected_exact_flavor_notes_incomplete');
  // This is the exact selected merchant Shopify Product JSON, not the unrelated
  // light-roast collection or customer preference prose. Product id, title and
  // handle must match the chosen original before its roast tags may qualify.
  const ownLight=/\bsswApp\.product\s*=\s*\{"id":9008646881518,"title":"Kenya AA - Ndaroini Estate","handle":"kenya-aa-ndaroini-estate"[\s\S]{0,12000}?"tags":\["Coffee_Light Roast"/u.test(html);
  if(!ownLight||f.roast_level!=='Light')e.push('selected_product_id_handle_own_light_roast_tag_unverified');
 }else{
  if(!/Flavor Notes:\s*Chocolate/iu.test(visible)||!/Origin:\s*Lifesong Farms\s*\|\s*Mt. Elgon, Uganda/iu.test(visible))e.push('seller_direct_notes_or_origin_not_visible');
  if(!/Roast:\s*Medium/iu.test(visible)||!/Elevation:\s*1,280 meters/iu.test(visible)||!/Varietals:\s*Bourbon/iu.test(visible))e.push('seller_direct_roast_altitude_variety_not_visible');
  if(f.roast_level!=='Medium'||f.process!=='Washed')e.push('selected_medium_or_washed_missing');
  if(!/Elgon.*Uganda/iu.test(String(f.origin||''))||/Bududa/iu.test(String(f.origin||'')))e.push('selected_origin_or_philanthropic_context_leak');
  if(!/1,?280/u.test(String(f.elevation_m||'')))e.push('selected_height_missing');
  if(!/Bourbon/iu.test(String(f.variety||''))||!/Typica/iu.test(String(f.variety||'')))e.push('selected_varietals_missing');
  if(!['chocolate','brown sugar','dried fruit'].every(x=>notes.toLowerCase().includes(x)))e.push('selected_exact_flavor_notes_incomplete');
  if(/Manna Origins/iu.test(String(f.producer||'')))e.push('trade_intermediary_promoted_to_grower');
 }
 errors.push(...e.map(x=>'#'+c.n+':'+x));
 products.push({number:c.n,url:c.url,selected_h1:h1,raw_bytes:raw.length,raw_sha256:raw.length?sha(raw):null,fields:f,conflicts:p.conflicts||[],passed:e.length===0,errors:e,selected_excerpt:visible.slice(0,850)});
}
const report={passed:errors.length===0,errors,checkout_sha:checkout,source_sha:summary.source_sha,manual_certified:false,production_operations:0,products};
writeFileSync(join(dir,'r211-original317-318-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R211 OFFICIAL SELECTED AFTERPROOF] '+JSON.stringify(report).slice(0,15000));
if(errors.length)throw Error('r211_exact_selected_verification_failed:'+errors.join(','));
