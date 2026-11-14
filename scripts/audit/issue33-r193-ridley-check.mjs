#!/usr/bin/env node
// Original603 #280: bounded current selected source/parser proof, NOT 603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {sameHandleCollectionAlternate} from './issue33-selected-public-alternate.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
mkdirSync(dir,{recursive:true});
const original='https://ridleyroasthouse.com/products/pura-vida';
const fallback='https://ridleyroasthouse.com/collections/coffee/products/pura-vida';
const errs=[];
const expect=(value,label)=>{if(!value)errs.push(label);};
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}
catch(e){errs.push('missing_summary:'+e.message);}
let data=Buffer.alloc(0);try{data=readFileSync(join(dir,'case-280.html'));}
catch(e){errs.push('missing_raw_html:'+e.message);}
const rec=(summary.records||[]).find(r=>r.number===280)||{};
const html=data.toString('utf8');
const actual=data.length?extractPublicCoffeeFacts(html,{source_url:rec.final_url||original}):{};
const headings=selectedProductHeadings(productMarkup(html)),fields=actual.fields||{};
const text=productMarkup(html).replace(/<[^<>]{0,1200}>/g,' ')
 .replace(/&(?:nbsp|amp);/gi,' ').replace(/\s+/g,' ');
expect(JSON.stringify(summary.case_numbers)==='[280]'&&summary.records?.length===1,'only_original_280');
expect(summary.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
expect(summary.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_original_csv');
expect(summary.manual_certified===0&&summary.original_corpus_modified===false&&summary.production_operations===0,'no_false_603_or_production');
expect(rec.official_url===original&&rec.status==='FETCHED'&&rec.parser_ok===true,'original_selected_guarded_fetch');
expect(rec.final_url===original||(rec.final_url===fallback&&
 rec.alternate_url_attempted===fallback&&rec.alternate_identity_match===true&&
 sameHandleCollectionAlternate(original,fallback)===fallback),'no_wrong_product_alternate');
expect(data.length>1000&&rec.html_bytes===data.length&&rec.html_sha256===hash(data),'raw_official_hash');
expect(headings.includes('Pura Vida')&&rec.selected_heading_identity_verified===true,'unique_selected_h1');
expect(actual.ok===true&&fields.name==='Pura Vida','selected_actual_parser');
expect(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'explicit_add_coffee_source_review');
expect(/origin:\s*costa rica/i.test(text)&&/region:\s*tarraz/i.test(text)&&
 /process:\s*washed/i.test(text)&&/varietal:\s*caturra/i.test(text),'direct_selected_specs');
expect(/tasting notes:\s*smooth peanut butter and hickory/i.test(text),'direct_selected_tasting');
expect(/finca santa elena/i.test(text),'current_selected_farm_narrative');
expect(/costa rica/i.test(String(fields.origin||'')),'own_origin');
expect(fields.process==='Washed','own_washed');
expect(/caturra/i.test(String(fields.variety||'')),'own_caturra');
expect(/peanut butter/i.test(String(fields.tasting_notes||''))&&/hickory/i.test(String(fields.tasting_notes||'')),'own_two_notes');
expect(!fields.roast_level&&!fields.decaffeination_method&&!fields.espresso_recipe,'unpublished_fields_blank');
expect(!/^(this farmer|she|costa rica|tarrazu)$/i.test(String(fields.producer||'')),'no_generic_named_farmer');
const output={source_sha:summary.source_sha,preflight_bound_in_same_commit:true,original603_certified:false,
 current:{number:280,official_url:original,final_url:rec.final_url,selected_h1:headings,
 status:rec.status,source_bytes:data.length,source_sha256:data.length?hash(data):null,
 parsed_fields:fields,conflicts:actual.conflicts||[],alternate:rec.alternate_url_attempted||null},
 errors:errs,passed:errs.length===0};
writeFileSync(join(dir,'r193-ridley-afterproof.json'),JSON.stringify(output,null,2)+'\n');
console.log('[DIC33 R193 CURRENT SELECTED AFTERPROOF] '+JSON.stringify(output).slice(0,14000));
if(errs.length)throw Error('r193_280_FAIL:'+errs.join(','));
