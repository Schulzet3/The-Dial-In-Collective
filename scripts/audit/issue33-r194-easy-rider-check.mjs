#!/usr/bin/env node
// Issue #33 R194: original603 #281 direct current product + actual parser afterproof;
// never substitute sibling product, frozen history, global SEO or 603-wide certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
mkdirSync(dir,{recursive:true});
const original='https://ridleyroasthouse.com/products/ridley-roasthouse-easy-rider-organic-decaf';
const errs=[],expect=(value,label)=>{if(!value)errs.push(label);};
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}
catch(e){errs.push('missing_summary:'+e.message);}
let data=Buffer.alloc(0);try{data=readFileSync(join(dir,'case-281.html'));}
catch(e){errs.push('missing_raw_html:'+e.message);}
const rec=(summary.records||[]).find(r=>r.number===281)||{};
const html=data.toString('utf8');
const actual=data.length?extractPublicCoffeeFacts(html,{source_url:rec.final_url||original}):{};
const headings=selectedProductHeadings(productMarkup(html)),fields=actual.fields||{};
const selectedText=productMarkup(html).replace(/<[^<>]{0,1200}>/g,' ')
  .replace(/&(?:nbsp|amp);/gi,' ').replace(/\s+/g,' ');
expect(JSON.stringify(summary.case_numbers)==='[281]'&&summary.records?.length===1,'only_original_281');
expect(summary.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
expect(summary.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','unchanged_frozen_csv');
expect(summary.manual_certified===0&&summary.original_corpus_modified===false&&summary.production_operations===0,'no_false_603_or_production');
expect(rec.official_url===original&&rec.status==='FETCHED'&&rec.final_url===original&&rec.parser_ok===true,'guarded_exact_original_selected_fetch');
expect(data.length>1000&&rec.html_bytes===data.length&&rec.html_sha256===hash(data),'raw_html_hash');
expect(headings.includes('Easy Rider SWP Decaf')&&rec.selected_heading_identity_verified===true,'selected_current_h1');
expect(actual.ok===true&&fields.name==='Easy Rider SWP Decaf','selected_actual_parser_name');
expect(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'explicit_add_coffee_source_review');
expect(/\borigin:\s*honduras\b/i.test(selectedText),'direct_selected_origin');
expect(/\broast:\s*dark\b/i.test(selectedText),'direct_selected_roast');
expect(/\bflavor:\s*cane sugar\b/i.test(selectedText),'direct_selected_flavor');
expect(/swiss water process/i.test(selectedText),'direct_selected_water_decaf');
expect(/honduras/i.test(String(fields.origin||'')),'parsed_own_honduras');
expect(fields.roast_level==='Dark','parsed_own_dark_roast');
expect(['cane sugar','cocoa','citrus'].every(x=>String(fields.tasting_notes||'').toLowerCase().includes(x)),'parsed_selected_own_tasting');
expect(fields.decaffeination_method==='Water Process','parsed_selected_swiss_water_method');
expect(!fields.process,'no_swiss_water_as_green_bean_process');
expect(!fields.producer&&!fields.espresso_recipe,'no_unpublished_producer_or_recipe');
expect(!/bold betty|pura vida|founders roast|abuelita caliente/i.test(String(fields.tasting_notes||'')),'no_sibling_tasting_notes');
const output={source_sha:summary.source_sha,preflight_bound_in_same_commit:true,original603_certified:false,
 current:{number:281,official_url:original,final_url:rec.final_url,selected_h1:headings,
  status:rec.status,source_bytes:data.length,source_sha256:data.length?hash(data):null,
  parsed_fields:fields,conflicts:actual.conflicts||[]},
 errors:errs,passed:errs.length===0};
writeFileSync(join(dir,'r194-easy-rider-afterproof.json'),JSON.stringify(output,null,2)+'\n');
console.log('[DIC33 R194 CURRENT SELECTED AFTERPROOF] '+JSON.stringify(output).slice(0,14000));
if(errs.length)throw Error('r194_281_FAIL:'+errs.join(','));
