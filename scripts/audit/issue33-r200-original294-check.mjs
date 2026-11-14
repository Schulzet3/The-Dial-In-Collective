#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const dest=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
mkdirSync(dest,{recursive:true});
const num=294,url='https://seedscoffee.com/products/top-shelf-series-colombia-alejandro-ruiz',name='Top Shelf Series: Colombia Alejandro Ruiz';
const sha=x=>createHash('sha256').update(x).digest('hex');
const errors=[];
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[0-9a-f]{40}$/.test(process.env.DIC_R200_EXACT_CHECKOUT_SHA||'')||checkout!==process.env.DIC_R200_EXACT_CHECKOUT_SHA)errors.push('not_exact_checkout');
let summary={};
try {summary=JSON.parse(readFileSync(join(dest,'focused-current-evidence.json'),'utf8'));}catch(e){errors.push('missing_summary:'+e.message);}
if(JSON.stringify(summary.case_numbers)!=='[294]'||summary.records?.length!==1)errors.push('source_subset_mismatch');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('immutable_original603_register_hash_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('false_manual_or_provider_certification');
const r=summary.records?.find(x=>x.number===num)||{};
let bytes=Buffer.alloc(0);
try{bytes=readFileSync(join(dest,'case-'+num+'.html'));}catch(e){errors.push('raw_html_missing:'+e.message);}
const html=bytes.toString('utf8'),selected=productMarkup(html);
const p=bytes.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||url}):{};
const f=p.fields||{},headings=selectedProductHeadings(selected);
const text=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp|quot);/giu,' ').replace(/\s+/gu,' ');
if(r.status!=='FETCHED'||r.official_url!==url||r.final_url!==url||r.parser_ok!==true)errors.push('exact_original_official_url_unavailable_or_parser_failed');
if(bytes.length<1000||r.html_bytes!==bytes.length||r.html_sha256!==sha(bytes))errors.push('raw_html_digest_mismatch');
if(!headings.includes(name)||!r.selected_heading_identity_verified||f.name!==name)errors.push('actual_selected_identity_mismatch');
if(!r.add_coffee_ui_rendered||!r.source_review_rendered)errors.push('preview_or_review_unrendered');
for(const word of ['Alejandro Ruiz','Huila, Colombia','natural processed Caturra','Star Fruit','Guava']){
 if(!text.toLowerCase().includes(word.toLowerCase()))errors.push('direct_selected_source_missing:'+word);
}
if(!/Colombia/i.test(String(f.origin||'')))errors.push('direct_origin_missing');
if(!/Natural/i.test(String(f.process||'')) && !(p.conflicts||[]).includes('process'))errors.push('selected_natural_process_not_retained_or_reviewable');
if(!/Caturra/i.test(String(f.variety||'')) && !(p.conflicts||[]).includes('variety'))errors.push('selected_caturra_not_retained_or_reviewable');
if(!/Alejandro Ruiz/i.test(String(f.producer||'')) && !(p.conflicts||[]).includes('producer'))errors.push('named_current_producer_not_retained_or_reviewable');
for(const word of ['Star Fruit','Guava']){
 if(!String(f.tasting_notes||'').toLowerCase().includes(word.toLowerCase()) && !(p.conflicts||[]).includes('tasting_notes'))errors.push('direct_selected_taste_missing:'+word);
}
if(f.roast_level||f.decaffeination_method||f.elevation_m)errors.push('unsupported_field_autofill');
if((p.conflicts||[]).some(x=>['name','roaster'].includes(x)))errors.push('identity_conflict');
const report={passed:errors.length===0,errors,source_sha:summary.source_sha,checkout_sha:checkout,action_event_sha:process.env.GITHUB_SHA,original603_case:294,manual_certified:false,provider_writes:0,official_url:url,html_bytes:bytes.length,html_sha256:bytes.length?sha(bytes):null,selected_headings:headings,selected_literal_excerpts:text.slice(0,1700),actual_parser_fields:f,source_review_facts:(p.source_facts||[]).filter(x=>['tasting_notes','producer','process','origin','variety'].includes(x.field)).slice(0,16).map(x=>({field:x.field,label:x.label,value:x.value,source_type:x.source_type})),conflicts:p.conflicts||[]};
writeFileSync(join(dest,'r200-294-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R200 EXACT CURRENT SELECTED AFTERPROOF] '+JSON.stringify(report).slice(0,10000));
if(errors.length)throw Error('current_selected_source_afterproof_failed:'+errors.join(','));
