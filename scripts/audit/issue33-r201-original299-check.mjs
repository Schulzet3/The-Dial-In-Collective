#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';

const dest=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dest,{recursive:true});
const num=299,url='https://sextantcoffee.com/products/the-windsor-sextant-coffee',name='The Windsor - Brazil Coffee';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const errors=[],checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[0-9a-f]{40}$/.test(process.env.DIC_R201_EXACT_CHECKOUT_SHA||'')||checkout!==process.env.DIC_R201_EXACT_CHECKOUT_SHA)errors.push('not_exact_checkout');
let summary={};try{summary=JSON.parse(readFileSync(join(dest,'focused-current-evidence.json'),'utf8'));}catch(e){errors.push('missing_summary:'+e.message);}
if(JSON.stringify(summary.case_numbers)!=='[299]'||summary.records?.length!==1)errors.push('original_subset_mismatch');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('original_immutable_register_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('incorrect_corpus_or_provider_claim');
const r=summary.records?.find(x=>x.number===num)||{};
let bytes=Buffer.alloc(0);try{bytes=readFileSync(join(dest,'case-'+num+'.html'));}catch(e){errors.push('missing_current_html:'+e.message);}
const html=bytes.toString('utf8'),selected=productMarkup(html),headings=selectedProductHeadings(selected);
const p=bytes.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||url}):{};
const fields=p.fields||{},text=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp|quot);/giu,' ').replace(/\s+/gu,' ');
if(r.status!=='FETCHED'||r.official_url!==url||r.final_url!==url||r.parser_ok!==true)errors.push('selected_original_official_fetch_or_parser_failed');
if(bytes.length<1000||r.html_bytes!==bytes.length||r.html_sha256!==sha(bytes))errors.push('raw_html_hash_mismatch');
if(!headings.includes(name)||!r.selected_heading_identity_verified||fields.name!==name)errors.push('selected_current_product_identity_mismatch');
if(!r.add_coffee_ui_rendered||!r.source_review_rendered)errors.push('missing_add_coffee_or_review');
for(const term of ['multi-generational Brazilian family','Minas Gerais','cherry','milk chocolate']){
 if(!text.toLowerCase().includes(term.toLowerCase()))errors.push('current_selected_literal_missing:'+term);
}
if(!/Brazil/i.test(String(fields.origin||'')))errors.push('selected_brazil_origin_missing');
for(const note of ['cherry','milk chocolate']){
 if(!String(fields.tasting_notes||'').toLowerCase().includes(note)&&!(p.conflicts||[]).includes('tasting_notes'))errors.push('selected_notes_missing:'+note);
}
if(fields.producer)errors.push('unnamed_family_misrepresented_as_identified_producer');
if(fields.roast_level)errors.push('roast_not_explicitly_qualified');
if(fields.process==='Washed')errors.push('water_friendly_description_not_washed_process_proof');
if((p.conflicts||[]).some(key=>['name','roaster'].includes(key)))errors.push('identity_conflict');
const report={passed:errors.length===0,errors,source_sha:summary.source_sha,checkout_sha:checkout,action_event_sha:process.env.GITHUB_SHA,original603_case:299,official_url:url,html_bytes:bytes.length,html_sha256:bytes.length?sha(bytes):null,selected_headings:headings,selected_literal_excerpt:text.slice(0,1800),actual_parser_fields:fields,source_review:(p.source_facts||[]).filter(f=>['producer','origin','process','tasting_notes'].includes(f.field)).slice(0,20).map(f=>({field:f.field,label:f.label,value:f.value,source_type:f.source_type})),conflicts:p.conflicts||[],manual_certified:false,provider_writes:0};
writeFileSync(join(dest,'r201-299-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R201 selected current Windsor afterproof] '+JSON.stringify(report).slice(0,10000));
if(errors.length)throw Error('selected_original299_afterproof_failed:'+errors.join(','));
