#!/usr/bin/env node
// Exact selected original603 #311 current official, H1 and parser producer proof.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
const number=311,name='Volcán Atitlán Guatemala',url='https://shop.iconikcoffee.com/products/washed-guatemala-finca-san-jeronimo';
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const errors=[];if(checkout!==process.env.DIC_R208_EXACT_CHECKOUT_SHA||!(/^[a-f0-9]{40}$/.test(checkout)))errors.push('wrong_exact_checkout');
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch(e){errors.push('missing_summary:'+e.message);}
if(JSON.stringify(summary.case_numbers)!=='[311]'||summary.records?.length!==1)errors.push('wrong_original_case');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('original_corpus_mismatch');
if(summary.manual_certified!==0||summary.production_operations!==0||summary.original_corpus_modified!==false)errors.push('false_full_certification_or_provider_write');
const r=summary.records?.[0]||{};
let raw=Buffer.alloc(0);try{raw=readFileSync(join(dir,'case-311.html'));}catch(e){errors.push('missing_original_html:'+e.message);}
const html=raw.toString('utf8'),p=raw.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||url}):{},f=p.fields||{};
const hash=raw.length?createHash('sha256').update(raw).digest('hex'):null;
const selected=productMarkup(html),heads=selectedProductHeadings(selected),visible=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/\s+/gu,' ');
if(r.status!=='FETCHED'||r.official_url!==url||r.final_url!==url||r.parser_ok!==true)errors.push('original_exact_selected_url_unavailable');
if(raw.length<1000||hash!==r.html_sha256||r.html_bytes!==raw.length)errors.push('actual_raw_source_digest_invalid');
if(!r.selected_heading_identity_verified||!heads.includes(name)||f.name!==name)errors.push('selected_h1_or_identity_mismatch');
if(!r.add_coffee_ui_rendered||!r.source_review_rendered)errors.push('missing_add_coffee_or_source_review');
if(!visible.includes('Bressani Family, San Jerónimo Guatemala')||!visible.includes('Giorgio')||!visible.includes('family farm'))errors.push('named_current_family_growing_evidence_missing');
if(f.producer!=='Bressani Family')errors.push('current_producer_omission:'+String(f.producer||'BLANK'));
if(f.origin!=='Guatemala'||f.process!=='Washed'||f.variety!=='Catuaí'||f.elevation_m!=='1300m')errors.push('selected_original_other_fields_changed');
if(!/walnut|cherry|nougat/i.test(String(f.tasting_notes||'')))errors.push('current_selected_tastes_missing');
if(f.decaffeination_method||f.roast_level||f.espresso_recipe)errors.push('invented_decaf_roast_or_recipe');
if((p.conflicts||[]).length)errors.push('source_conflicts:'+p.conflicts.join(','));
const report={passed:errors.length===0,errors,source_sha:summary.source_sha,checkout_sha:checkout,manual_certified:false,provider_writes:0,case_number:number,original_url:url,raw_bytes:raw.length,raw_sha256:hash,selected_h1:heads,fields:f,source_review:(p.source_facts||[]).filter(x=>['producer','origin','process','tasting_notes'].includes(x.field)).slice(0,16)};
writeFileSync(join(dir,'r208-311-afterproof.json'),JSON.stringify(report,null,2)+'\n');console.log('[DIC33 R208 NAMED FAMILY CURRENT SOURCE AFTERPROOF] '+JSON.stringify(report).slice(0,12500));
if(errors.length)throw Error('r208_original311_failed:'+errors.join(','));
