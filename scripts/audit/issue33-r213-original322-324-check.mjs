#!/usr/bin/env node
// Issue #33 R213: exact current Westrock selected products, fresh bounded GitHub HTTPS proof.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const cases=[
 {n:322,name:'Raiz Campo Sur Whole Bean Coffee Pack',url:'https://shop.westrockcoffee.com/products/raiz-campo-sur-whole-bean-coffee'},
 {n:323,name:'Raiz Palmera Whole Bean Coffee Pack',url:'https://shop.westrockcoffee.com/products/raiz-palmera-whole-bean-coffee'},
 {n:324,name:'Rwanda Select Reserve',url:'https://shop.westrockcoffee.com/products/rwanda-select-reserve'}
];
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.'),errors=[],products=[];
mkdirSync(dir,{recursive:true});
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_current_source_capture');}
const sha=b=>createHash('sha256').update(b).digest('hex');
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(checkout!==process.env.DIC_R213_EXACT_CHECKOUT_SHA)errors.push('checkout_sha_not_exact');
if(JSON.stringify(summary.case_numbers)!=='[322,323,324]'||summary.records?.length!==3)errors.push('wrong_original_cases');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('original603_changed');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('unearned_scope_claim');
for(const c of cases){
 const r=summary.records?.find(x=>x.number===c.n)||{},e=[];
 let raw=Buffer.alloc(0);try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch{e.push('raw_missing');}
 const html=raw.toString('utf8'),selected=productMarkup(html),headings=selectedProductHeadings(selected);
 const visible=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/\s+/gu,' ');
 const p=raw.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||c.url}):{},f=p.fields||{},notes=String(f.tasting_notes||'');
 if(r.status!=='FETCHED'||r.official_url!==c.url||r.final_url!==c.url||r.parser_ok!==true)e.push('original_selected_fetch_or_parser_failed');
 if(raw.length<1000||raw.length!==r.html_bytes||sha(raw)!==r.html_sha256)e.push('raw_digest_unverified');
 if(!r.selected_heading_identity_verified||!headings.includes(c.name)||f.name!==c.name)e.push('selected_product_identity_mismatch');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)e.push('member_preview_or_review_missing');
 if((p.conflicts||[]).includes('name')||f.decaffeination_method||f.espresso_recipe)e.push('unsupported_identity_decaf_or_recipe');
 if(c.n===322){
  if(!/inspired by the Brazilian countryside/iu.test(visible))e.push('seller_marketing_context_missing');
  if(/Brazil/iu.test(String(f.origin||'')) && !/Brazil/iu.test(String(r.selected_official_bean_origin_proof||'')))e.push('inspiration_misclassified_as_bean_origin');
  if(/blueberry|mango/iu.test(notes))e.push('unrelated_notes');
 } else if(c.n===323){
  if(!/100% Central\/South American Arabica/iu.test(visible)||!/medium roast/iu.test(visible)||!/nutty lingering finish/iu.test(visible))e.push('selected_merchant_prose_changed');
  if(f.roast_level!=='Medium')e.push('explicit_selected_medium_missing');
  if(!/caramel/iu.test(notes)||!/nutty/iu.test(notes))e.push('direct_selected_sensory_incomplete');
  if(/Brazil$/iu.test(String(f.origin||''))&&!/Central|South/iu.test(String(f.origin||'')))e.push('inferred_single_country_from_broad_blend');
 }else{
  if(!/Westrock Coffee began in the capital of Rwanda/iu.test(visible))e.push('current_seller_context_changed');
  if(f.producer||/caramel|blueberry|mango/iu.test(notes))e.push('invented_role_or_notes');
 }
 errors.push(...e.map(x=>'#'+c.n+':'+x));
 products.push({number:c.n,official_url:c.url,raw_bytes:raw.length,raw_sha256:raw.length?sha(raw):null,heading:headings,fields:f,conflicts:p.conflicts||[],passed:!e.length,errors:e,selected_excerpt:visible.slice(0,700)});
}
const report={passed:!errors.length,errors,checkout_sha:checkout,full603_semantic_certification:false,production_operations:0,products};
writeFileSync(join(dir,'r213-original322-324-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R213 EXACT CURRENT OFFICIAL] '+JSON.stringify(report).slice(0,17000));
if(errors.length)throw Error('r213_current_selected_source_not_verified:'+errors.join(','));
