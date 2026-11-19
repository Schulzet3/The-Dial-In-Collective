#!/usr/bin/env node
// R222 current original #346; a green probe is not all-603 manual certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
mkdirSync(dir,{recursive:true});
const errors=[],url='https://sparkyscraftcoffeeroasting.com/products/below-zero-blend';
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_source_summary');}
let raw=Buffer.alloc(0);try{raw=readFileSync(join(dir,'case-346.html'));}catch{errors.push('missing_current_official_html');}
const r=summary.records?.find(x=>x.number===346)||{};
const digest=createHash('sha256').update(raw).digest('hex');
const selected=productMarkup(raw.toString('utf8')),heads=selectedProductHeadings(selected);
const parsed=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:r.final_url||url}):{};
const f=parsed.fields||{};
const source=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:nbsp|#0*160|#x0*a0);/giu,' ').replace(/&amp;/giu,'&').replace(/\s+/gu,' ');
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(checkout!==process.env.DIC_R222_EXACT_CHECKOUT_SHA)errors.push('wrong_checkout_sha');
if(JSON.stringify(summary.case_numbers)!=='[346]'||summary.records?.length!==1||
 summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 errors.push('immutable_original603_register_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)
 errors.push('unearned_frozen_or_provider_claim');
if(r.status!=='FETCHED'||r.official_url!==url||r.final_url!==url||!r.parser_ok)
 errors.push('selected_official_url_or_parser_unavailable');
if(raw.length<1000||raw.length!==r.html_bytes||digest!==r.html_sha256)
 errors.push('selected_raw_bytes_sha256_mismatch');
if(!r.selected_heading_identity_verified||!heads.includes('Below Zero Ethiopia Natural')||f.name!=='Below Zero Ethiopia Natural')
 errors.push('changed_selected_product_identity');
if(!r.add_coffee_ui_rendered||!r.source_review_rendered)errors.push('Add_Coffee_or_Source_Review_missing');
if(f.process!=='Natural')errors.push('chosen_green_Natural_process_missing');
if(!/Heirloom/i.test(String(f.variety||''))||!/1850/.test(String(f.elevation_m||''))||
 !/Idido|Yirgacheffe|Ethiopia/i.test(String(f.origin||'')))
 errors.push('chosen_source_spec_missing');
if(f.decaffeination_method||f.roast_level||f.espresso_recipe)
 errors.push('unsupported_decaf_roast_espresso');
// The current exact chosen product has a *named* primary seller metadata
// sentence: "unique floral and chocolatey notes of Below Zero Ethiopia Natural
// Coffee". This is qualified identity-matched seller fallback, NOT the generic
// Yirgacheffe/Harrar botanical narrative or an independently labeled cup list.
// Reject the same notes when product-specific corroboration is missing.
const namedCurrentMeta=(parsed.source_facts||[]).some(e=>e.source_type==='html'&&
 e.section==='Published page metadata'&&
 /unique floral and chocolatey notes of Below Zero Ethiopia Natural Coffee\b/i.test(String(e.value||'')));
const implicitNotes=/floral|chocolatey|sparkling acidity/i.test(String(f.tasting_notes||''));
if(implicitNotes&&!namedCurrentMeta)
 errors.push('generic_region_notes_without_exact_named_current_product_source');
if(/Harrar|Yirgacheffe forests/i.test(String(f.producer||'')))
 errors.push('regional_background_falsely_selected_as_producer');
if(!/Washing Station\s*(?:\|\s*)?Idido/i.test(source)||!/Process\s*(?:\|\s*)?Natural/i.test(source))
 errors.push('current_direct_selected_labeled_source_changed');
if((parsed.conflicts||[]).includes('name')||(parsed.conflicts||[]).includes('process'))
 errors.push('false_identity_or_process_conflict');
const report={passed:!errors.length,source_sha:checkout,raw_sha256:digest,raw_bytes:raw.length,official_url:url,selected_h1:heads,fields:f,conflicts:parsed.conflicts||[],notes_source_boundary:implicitNotes?(namedCurrentMeta?'EXACT_NAMED_PRIMARY_SELLER_METADATA_QUALIFIED_FALLBACK':'REGIONAL_PROSE_UNSUPPORTED'):'NO_AUTO_NOTES',errors,original603_manually_certified:false,production_operations:0};
writeFileSync(join(dir,'r222-original346-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R222 original346 current afterproof] '+JSON.stringify(report).slice(0,17000));
if(errors.length)throw Error('r222_current_selected_source_unverified:'+errors.join(','));
