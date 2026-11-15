#!/usr/bin/env node
// Independent afterproof: exact original selected official URL/H1 and actual parser, not frozen-oracle certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
const cases=[
 {n:310,name:'Finca Costa Rica',url:'https://shop.iconikcoffee.com/products/finca-costa-rica'},
 {n:311,name:'Volcán Atitlán Guatemala',url:'https://shop.iconikcoffee.com/products/washed-guatemala-finca-san-jeronimo'},
 {n:312,name:'Bressani Family Washed Sidra',url:'https://shop.iconikcoffee.com/products/washed-sidra-giorgio-bressani'}
];
const hash=b=>createHash('sha256').update(b).digest('hex'),errors=[];
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(process.env.DIC_R207_EXACT_CHECKOUT_SHA||'')||checkout!==process.env.DIC_R207_EXACT_CHECKOUT_SHA)errors.push('wrong_exact_checkout');
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch(e){errors.push('missing_summary:'+e.message);}
if(JSON.stringify(summary.case_numbers)!=='[310,311,312]'||summary.records?.length!==3)errors.push('wrong_original_subset');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('immutable_register_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('false_certification_or_provider_write');
const products=[];
for(const c of cases){
 const r=summary.records?.find(x=>x.number===c.n)||{},e=[];
 let raw=Buffer.alloc(0);try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch(x){e.push('missing_html:'+x.message);}
 const html=raw.toString('utf8'),selected=productMarkup(html),heads=selectedProductHeadings(selected);
 const p=raw.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||c.url}):{},f=p.fields||{};
 const visible=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp|quot);/giu,' ').replace(/\s+/gu,' ');
 if(r.status!=='FETCHED'||r.official_url!==c.url||r.final_url!==c.url||r.parser_ok!==true)e.push('exact_selected_official_url_or_parser_unavailable');
 if(raw.length<1000||r.html_bytes!==raw.length||r.html_sha256!==hash(raw))e.push('source_html_digest_mismatch');
 if(!r.selected_heading_identity_verified||f.name!==c.name||!heads.some(h=>h===c.name))e.push('selected_h1_or_identity_mismatch');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)e.push('add_coffee_or_source_review_missing');
 if(f.decaffeination_method||f.espresso_recipe)e.push('unsupported_decaf_or_espresso_recipe');
 if((p.conflicts||[]).includes('name'))e.push('selected_product_identity_conflict');
 if(c.n===310 && /Costa Rica/i.test(String(f.origin||'')))e.push('farm_name_false_geographic_origin');
 if(c.n===310 && !/Colombia/i.test(String(f.origin||'')))e.push('selected_colombian_farm_origin_missing');
 if(c.n===311 && !/Guatemala/i.test(String(f.origin||'')))e.push('selected_guatemala_origin_missing');
 if(c.n===312 && /Ecuador/i.test(String(f.origin||'')))e.push('variety_history_false_geographic_origin');
 if(c.n===312 && !/Guatemala/i.test(String(f.origin||'')))e.push('selected_guatemala_family_origin_missing');
 if(f.roast_level)e.push('no_selected_roast_publish_confirmed');
 if(c.n===310 && !/cherry/i.test(String(f.tasting_notes||'')))e.push('own_selected_cherry_notes_missing');
 if(c.n===311 && !/walnut|nougat|cherry/i.test(String(f.tasting_notes||'')))e.push('own_selected_tasting_missing');
 if(c.n===312 && !/chamomile|pear/i.test(String(f.tasting_notes||'')))e.push('own_selected_tasting_missing');
 errors.push(...e.map(x=>c.n+':'+x));
 products.push({number:c.n,passed:e.length===0,errors:e,url:c.url,html_bytes:raw.length,html_sha256:raw.length?hash(raw):null,h1:heads,selected_excerpt:visible.slice(0,2200),fields:f,conflicts:p.conflicts||[],source_review:(p.source_facts||[]).filter(x=>['origin','roast_level','tasting_notes','producer','process','variety'].includes(x.field)).slice(0,16)});
}
const report={passed:errors.length===0,errors,source_sha:summary.source_sha,checkout_sha:checkout,manual_certified:false,provider_writes:0,products};
writeFileSync(join(dir,'r207-310-312-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R207 ICONIK SELECTED AFTERPROOF] '+JSON.stringify(report).slice(0,23000));
if(errors.length)throw Error('issue33_r207_afterproof_failed:'+errors.join(','));
