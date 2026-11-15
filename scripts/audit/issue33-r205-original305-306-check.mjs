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
 {n:305,name:'Organico',url:'https://shop.caffedarte.com/products/organico-drip-coffee',
  literals:['certified organic beans','medium-dark','bright, natural earthy','Organico is the new name'],
  fields:{roast_level:/Medium-Dark/i}},
 {n:306,name:'Swiss Water Decaf Drip',url:'https://shop.caffedarte.com/products/swiss-water-decaf-drip',
  literals:['Swiss Water Process','Medium-Dark Roast'],
  fields:{roast_level:/Medium-Dark/i,decaffeination_method:/Water/i}}
];
const sha=b=>createHash('sha256').update(b).digest('hex'),errors=[];
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(process.env.DIC_R205_EXACT_CHECKOUT_SHA||'')||checkout!==process.env.DIC_R205_EXACT_CHECKOUT_SHA)errors.push('wrong_exact_checkout');
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch(e){errors.push('missing_source_summary:'+e.message);}
if(JSON.stringify(summary.case_numbers)!=='[305,306]'||summary.records?.length!==2)errors.push('incorrect_original603_subset');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('frozen_original603_digest_changed');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('false_whole_corpus_or_provider_claim');
const reports=[];
for(const c of cases){
 const r=summary.records?.find(x=>x.number===c.n)||{},e=[];
 let raw=Buffer.alloc(0);try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch(x){e.push('missing_html:'+x.message);}
 const html=raw.toString('utf8'),selected=productMarkup(html),headings=selectedProductHeadings(selected);
 const p=raw.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||c.url}):{},f=p.fields||{};
 const visible=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp|quot);/giu,' ').replace(/\s+/gu,' ');
 if(r.status!=='FETCHED'||r.official_url!==c.url||r.final_url!==c.url||r.parser_ok!==true)e.push('exact_official_url_or_parser_unavailable');
 if(raw.length<1000||r.html_bytes!==raw.length||r.html_sha256!==sha(raw))e.push('raw_html_hash_mismatch');
 if(!headings.includes(c.name)||!r.selected_heading_identity_verified||f.name!==c.name)e.push('current_selected_identity_mismatch');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)e.push('add_coffee_or_source_review_missing');
 for(const literal of c.literals)if(!visible.toLowerCase().includes(literal.toLowerCase()))e.push('direct_selected_literal_missing:'+literal);
 for(const [key,re] of Object.entries(c.fields))if(!re.test(String(f[key]||''))&&!(p.conflicts||[]).includes(key))e.push('direct_field_missing_without_review:'+key);
 if(f.origin||f.producer||f.elevation_m||f.process)e.push('unpublished_origin_producer_elevation_green_process');
 if(c.n===305&&f.decaffeination_method)e.push('organic_nondecaf_contamination');
 if(/(?:smoky|smoke|peach|pineapple|jasmine)/i.test(String(f.tasting_notes||'')))e.push('sitewide_or_other_coffee_flavor_leak');
 if((p.conflicts||[]).includes('name'))e.push('false_selected_name_conflict');
 errors.push(...e.map(x=>c.n+':'+x));
 reports.push({number:c.n,passed:e.length===0,errors:e,url:c.url,final_url:r.final_url,html_bytes:raw.length,html_sha256:raw.length?sha(raw):null,headings,selected_excerpt:visible.slice(0,1200),fields:f,conflicts:p.conflicts||[],source_review:(p.source_facts||[]).filter(x=>['roast_level','decaffeination_method','tasting_notes','origin'].includes(x.field)).slice(0,15)});
}
const report={passed:errors.length===0,errors,source_sha:summary.source_sha,checkout_sha:checkout,event_sha:process.env.GITHUB_SHA,manual_certified:false,provider_writes:0,products:reports};
writeFileSync(join(dir,'r205-305-306-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R205 ORIGINAL SELECTED OFFICIAL AFTERPROOF] '+JSON.stringify(report).slice(0,21000));
if(errors.length)throw Error('issue33_r205_source_afterproof_failed:'+errors.join(','));
