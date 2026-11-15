#!/usr/bin/env node
// Exact bounded original603 selected case afterproof, not full corpus certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings,selectedSchemaProductOfferH2} from './issue33-selected-product-heading.mjs';
const cases=[
 {n:325,name:'Simpatico Organic Low Acid Half-Caff Coffee',url:'https://simpaticocoffee.com/products/organic-low-acid-half-caff-coffee'},
 {n:326,name:'Simpatico Organic Low Acid: Medium Smooth Roast',url:'https://simpaticocoffee.com/products/simpatico-low-acid-coffee-medium-smooth-roast'},
 {n:327,name:'Simpatico Low Acid Decaf: Dark Smooth Roast',url:'https://simpaticocoffee.com/products/simpatico-low-acid-decaf-coffee-dark-smooth-roast'}];
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.'),errors=[],products=[];
mkdirSync(dir,{recursive:true});
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_current_source_capture');}
const sha=b=>createHash('sha256').update(b).digest('hex');
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(checkout!==process.env.DIC_R215_EXACT_CHECKOUT_SHA)errors.push('checkout_sha_not_exact');
if(JSON.stringify(summary.case_numbers)!=='[325,326,327]'||summary.records?.length!==3)errors.push('wrong_original_cases');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('original603_changed');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('unearned_scope_claim');
for(const c of cases){
 const r=summary.records?.find(x=>x.number===c.n)||{},e=[];
 let raw=Buffer.alloc(0);try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch{e.push('raw_missing');}
 const html=raw.toString('utf8'),chosen=productMarkup(html),heads=selectedProductHeadings(chosen);
 const offered=selectedSchemaProductOfferH2(html,{source_url:c.url});
 const visible=chosen.replace(/<[^<>]{0,2000}>/gu,' ').replace(/\s+/gu,' ');
 const p=raw.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||c.url}):{},f=p.fields||{},notes=String(f.tasting_notes||'');
 if(r.status!=='FETCHED'||r.official_url!==c.url||r.final_url!==c.url||r.parser_ok!==true)e.push('selected_fetch_or_parser_not_pass');
 if(raw.length<1000||raw.length!==r.html_bytes||sha(raw)!==r.html_sha256)e.push('raw_sha_unverified');
 if(!r.selected_heading_identity_verified||!(heads.includes(c.name)||offered.includes(c.name))||f.name!==c.name)e.push('chosen_product_identity_mismatch');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)e.push('preview_or_review_missing');
 if((p.conflicts||[]).includes('name')||f.espresso_recipe)e.push('identity_or_recipe_error');
 if(c.n===325){
  if(!/nutty\/cocoa/iu.test(visible)||!/half.caff|half of the caffeine/iu.test(visible))e.push('chosen_halfcaff_source_changed');
  if(f.decaffeination_method)e.push('half_caff_is_not_full_decaf');
 }else if(c.n===326){
  if(!/medium smooth roast/iu.test(visible)||!/clean, nutty flavor/iu.test(visible))e.push('chosen_regular_source_changed');
  if(f.roast_level!=='Medium'||!/nutty/iu.test(notes))e.push('own_roast_or_notes_missing');
  if(f.decaffeination_method)e.push('sibling_decaf_method_leaked');
 }else{
  if(!/mountain water processed with no chemicals/iu.test(visible)||!/dark fruit flavors/iu.test(visible))e.push('chosen_decaf_source_changed');
  if(f.roast_level!=='Dark'||!/dark fruit/iu.test(notes))e.push('own_roast_or_notes_missing');
  if(f.decaffeination_method!=='Water Process')e.push('own_mountain_water_decaf_missing');
  if(f.process==='Washed')e.push('decaf_misclassified_as_green_washed');
 }
 errors.push(...e.map(x=>'#'+c.n+':'+x));
 products.push({number:c.n,official_url:c.url,raw_bytes:raw.length,raw_sha256:raw.length?sha(raw):null,selected_headings:heads,selected_offer_h2:offered,fields:f,conflicts:p.conflicts||[],passed:!e.length,errors:e,selected_excerpt:visible.slice(0,650)});
}
const report={passed:errors.length===0,errors,checkout_sha:checkout,full603_semantic_certification:false,production_operations:0,products};
writeFileSync(join(dir,'r215-original325-327-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R215 exact selected] '+JSON.stringify(report).slice(0,17000));
if(errors.length)throw Error('r215_source_not_verified:'+errors.join(','));
