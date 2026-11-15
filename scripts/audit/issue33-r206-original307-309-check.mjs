#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
const cases=[
 {n:307,name:'Embassy Blend',url:'https://shop.compasscoffee.com/products/embassy-blend'},
 {n:308,name:'Emblem Espresso',url:'https://shop.compasscoffee.com/products/emblem-espresso-1'},
 {n:309,name:'Horizon Blend',url:'https://shop.compasscoffee.com/products/horizon-blend'}
];
const hash=b=>createHash('sha256').update(b).digest('hex'),errors=[];
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(process.env.DIC_R206_EXACT_CHECKOUT_SHA||'')||checkout!==process.env.DIC_R206_EXACT_CHECKOUT_SHA)errors.push('wrong_exact_checkout');
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch(e){errors.push('missing_summary:'+e.message);}
if(JSON.stringify(summary.case_numbers)!=='[307,308,309]'||summary.records?.length!==3)errors.push('incorrect_original603_subset');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('immutable_csv_sha_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('false_full_certification_or_provider_write');
const reports=[];
for(const c of cases){
 const r=summary.records?.find(x=>x.number===c.n)||{},e=[];
 let raw=Buffer.alloc(0);try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch(x){e.push('missing_html:'+x.message);}
 const html=raw.toString('utf8'),selected=productMarkup(html),heads=selectedProductHeadings(selected);
 const p=raw.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||c.url}):{},f=p.fields||{};
 const visible=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp|quot);/giu,' ').replace(/\s+/gu,' ');
 if(r.status!=='FETCHED'||r.official_url!==c.url||r.final_url!==c.url||r.parser_ok!==true)e.push('original_selected_url_or_parser_unavailable');
 if(raw.length<1000||r.html_bytes!==raw.length||r.html_sha256!==hash(raw))e.push('source_html_digest_mismatch');
 if(!r.selected_heading_identity_verified||f.name!==c.name)e.push('selected_identity_unverified');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)e.push('add_coffee_or_source_review_missing');
 if(f.decaffeination_method)e.push('unsubstantiated_decaf_on_nondecaf_selected');
 if((p.conflicts||[]).includes('name'))e.push('competing_selected_identity');
 errors.push(...e.map(x=>c.n+':'+x));
 reports.push({number:c.n,passed:e.length===0,errors:e,official_url:c.url,final_url:r.final_url,html_bytes:raw.length,html_sha256:raw.length?hash(raw):null,headings:heads,selected_excerpt:visible.slice(0,2500),fields:f,conflicts:p.conflicts||[],source_review:(p.source_facts||[]).filter(x=>['origin','roast_level','tasting_notes','producer','process'].includes(x.field)).slice(0,18)});
}
const report={passed:errors.length===0,errors,source_sha:summary.source_sha,checkout_sha:checkout,manual_certified:false,provider_writes:0,products:reports};
writeFileSync(join(dir,'r206-307-309-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R206 COMPASS ORIGINAL SELECTED AFTERPROOF] '+JSON.stringify(report).slice(0,24000));
if(errors.length)throw Error('issue33_r206_source_afterproof_failed:'+errors.join(','));
