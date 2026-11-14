#!/usr/bin/env node
// Issue33 R188: original603 #272 exact current public Quills selection, NOT all603.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {productCoffeeProse} from '../../src/server/coffee-product-prose.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
const path=join(dir,'focused-current-evidence.json');
const errors=[],check=(ok,message)=>{if(!ok)errors.push(message);};
let summary={},html=Buffer.from('');
try{summary=JSON.parse(readFileSync(path,'utf8'));}catch(e){errors.push('missing_evidence:'+e.message);}
try{html=readFileSync(join(dir,'case-272.html'));}catch(e){errors.push('missing_raw_html:'+e.message);}
const r=(summary.records||[]).find(x=>x.number===272)||{};
const official='https://quillscoffee.com/products/colombia-guamo',name='Colombia | Natural Guamo';
const parsed=extractPublicCoffeeFacts(html.toString('utf8'),{source_url:official});
const scoped=productMarkup(html.toString('utf8'));
const heads=selectedProductHeadings(scoped);
const clean=(v,n=6001)=>String(v||'').replace(/<[^<>]{0,1200}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ').replace(/\s+/gu,' ').trim().slice(0,n);
const prose=productCoffeeProse(scoped,clean).filter(x=>!x.educational).map(x=>x.text).join(' ');
const facts=parsed.source_facts||[],f=parsed.fields||{};
check(JSON.stringify(summary.case_numbers)==='[272]'&&summary.records?.length===1,'single_original_272');
check(summary.source_sha===process.env.GITHUB_SHA,'exact_checked_out_source');
check(summary.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_original603_unchanged');
check(summary.manual_certified===0&&summary.production_operations===0&&summary.original_corpus_modified===false,'immutable_no_provider_writes');
check(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===official&&r.final_url===official,'guarded_original_selected_url');
check(html.length>1000&&r.html_sha256===sha(html)&&r.html_bytes===html.length,'raw_html_sha_and_size');
check(heads.length===1&&heads[0]===name&&r.selected_heading_identity_verified===true,'exact_selected_h1');
check(/Reforest Project,\s+an initiative\b/i.test(prose)&&/plant(?:ing|ed|s)?\s+(?:[\d,]+\s+)?(?:native\s+)?trees?/i.test(prose),'own_story_environmental_project');
check(/Producer\s*:\s*Reforest Project/i.test(prose),'literal_current_seller_label');
check(parsed.ok===true&&f.name===name,'actual_parser_exact_name');
check(!f.producer,'non_growing_project_not_canonical_producer');
check(/Reforest Project.*tree-planting initiative/i.test(parsed.producer_review_note||''),'review_note_explains_lot_qualification');
check(facts.some(x=>x.value==='Reforest Project'&&x.field==='producer_context'&&x.conflicting===true),'literal_review_fact_not_canonical');
for(const note of ['papaya','guava','hibiscus'])check(String(f.tasting_notes||'').toLowerCase().includes(note),'direct_selected_note_'+note);
check(String(f.origin||'').includes('Colombia')&&String(f.variety||'').toLowerCase().includes('caturra'),'independent_origin_and_variety');
check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'explicit_add_and_review_ui');
const result={source_sha:summary.source_sha,original603_number:272,official_url:official,
 raw_html_sha256:html.length?sha(html):null,raw_html_bytes:html.length,selected_headings:heads,
 actual_parser_fields:f,producer_review_note:parsed.producer_review_note||null,
 producer_review_facts:facts.filter(x=>x.value==='Reforest Project').slice(0,8),
 errors,passed:errors.length===0,original603_certified:false,production_operations:0};
writeFileSync(join(dir,'r188-272-afterproof.json'),JSON.stringify(result,null,2)+'\n');
console.log('[DIC33 R188 #272 CURRENT SELECTED AFTERPROOF] '+JSON.stringify(result).slice(0,15000));
if(errors.length)throw Error('R188 exact selected official proof FAILED: '+errors.join(','));
