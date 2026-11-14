#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';

const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
const url="https://sextantcoffee.com/products/yirgacheffe-heirloom-12oz-bag", name="Black Lion - Best Seller Organic Yirgacheffe Heirloom - Ethiopian Coffee",num=300;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const errors=[];
if(!/^[a-f0-9]{40}$/.test(process.env.DIC_R202_EXACT_CHECKOUT_SHA||'')||checkout!==process.env.DIC_R202_EXACT_CHECKOUT_SHA)errors.push('wrong_checkout_sha');
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch(e){errors.push('missing_summary:'+e.message);}
if(JSON.stringify(summary.case_numbers)!=='[300]'||summary.records?.length!==1)errors.push('subset_mismatch');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('frozen_register_changed');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('false_corpus_or_production_claim');
const r=summary.records?.find(x=>x.number===num)||{};
let bytes=Buffer.alloc(0);try{bytes=readFileSync(join(dir,'case-'+num+'.html'));}catch(e){errors.push('missing_html:'+e.message);}
const html=bytes.toString('utf8'), selected=productMarkup(html), headings=selectedProductHeadings(selected);
const parsed=bytes.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||url}):{},fields=parsed.fields||{};
const text=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp|quot);/giu,' ').replace(/\s+/gu,' ');
if(r.status!=='FETCHED'||r.official_url!==url||r.final_url!==url||r.parser_ok!==true)errors.push('official_selected_fetch_or_parse_failed');
if(bytes.length<1000||r.html_bytes!==bytes.length||r.html_sha256!==hash(bytes))errors.push('html_hash_mismatch');
if(!headings.includes(name)||!r.selected_heading_identity_verified||fields.name!==name)errors.push('current_selected_identity_changed');
if(!r.add_coffee_ui_rendered||!r.source_review_rendered)errors.push('add_coffee_or_source_review_not_rendered');
for(const s of ['Black Lion - Yirgacheffe Heirloom','natural process organic coffee','Sweet and slightly Floral','malty and Blueberry finish']){
 if(!text.toLowerCase().includes(s.toLowerCase()))errors.push('selected_direct_literal_missing:'+s);
}
if(!/Ethiopia/i.test(String(fields.origin||'')))errors.push('direct_origin_omitted');
if(fields.process!=='Natural')errors.push('published_natural_process_omitted');
if(!/Heirloom/i.test(String(fields.variety||'')))errors.push('published_heirloom_omitted');
for(const s of ['floral','malt','blueberry']){
 if(!String(fields.tasting_notes||'').toLowerCase().includes(s))errors.push('direct_selected_sensory_omitted:'+s);
}
if(fields.producer)errors.push('unnamed_source_misrepresented_as_named_producer');
if((parsed.conflicts||[]).includes('name'))errors.push('selected_identity_conflict');
const report={passed:errors.length===0,errors,source_sha:summary.source_sha,checkout_sha:checkout,event_sha:process.env.GITHUB_SHA,case_number:num,url,html_bytes:bytes.length,html_sha256:bytes.length?hash(bytes):null,headings,selected_excerpt:text.slice(0,1600),fields,conflicts:parsed.conflicts||[],source_facts:(parsed.source_facts||[]).filter(f=>f.field==='tasting_notes').slice(0,16),manual_certified:false,provider_writes:0};
writeFileSync(join(dir,'r202-300-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[Issue33 R202 original300 selected afterproof] '+JSON.stringify(report).slice(0,10000));
if(errors.length)throw Error('original300_selected_afterproof_failed:'+errors.join(','));
