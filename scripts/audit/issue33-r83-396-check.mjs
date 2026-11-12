#!/usr/bin/env node
// Original603 #396 current Wush Wush: no adjacent Papayo/Bayter #395 contamination.
// This is a bounded source/behavior acceptance, NOT universal corpus certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha = data => createHash('sha256').update(data).digest('hex');
const fold = value => String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
const sourceText=html=>String(html||'')
 .replace(/<!--[\s\S]*?-->/gu,' ')
 .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
 .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|#160);/giu,' ')
 .replace(/&amp;/giu,'&').replace(/\u00a0/gu,' ').replace(/\s+/gu,' ').trim();
export function selected396(markup,headings){
 const txt=sourceText(markup);
 return {
  selectedIdentity:Array.isArray(headings)&&headings.length===1&&fold(headings[0])==='wush wush anaerobic natural',
  ownNotes:/Tasting Notes:\s*Strawberry,\s*Watermelon,\s*Peach Tea\b/i.test(txt),
  namedProducer:/This Wush Wush comes from producer Mamush Kabtimer in Chito in the Gedio Zone\b/i.test(txt),
  namedCultivar:/Wush Wush is a low-yield heirloom variety\b/i.test(txt),
  ownCountry:/\bOrigin:\s*Ethiopia\b/i.test(txt),
  ownRegion:/\bRegion:\s*Chito,\s*Gedio\b/i.test(txt),
  ownVarietySpec:/\bVariety:\s*Heirloom\b/i.test(txt),
  ownElevation:/\bAltitude:\s*2025\s*masl\b/i.test(txt),
  ownProcessing:/\bProcessing:\s*120hr\s*Anaerobic Natural\b/i.test(txt),
  selectedFermentation:/sealed barrels to ferment anaerobically for 120 hours\b/i.test(txt),
  fruitDrying:/oxygen-free environment for 120 hours before drying it in the whole fruit\b/i.test(txt)
 };
}
if(process.env.DIC_ISSUE33_R83_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});
 const failures=[],check=(v,s)=>{if(!v)failures.push(s)};
 let report=null,rawReport=null,raw=null;
 try{rawReport=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(rawReport.toString('utf8'))}catch{}
 try{raw=readFileSync(join(dir,'case-396.html'))}catch{}
 const record=report?.records?.find(r=>r.number===396)||{};
 const fields=record.current_fields||{};
 const selected=productMarkup(raw?.toString('utf8')||'');
 const headings=selectedProductHeadings(selected);
 const sourceFacts=selected396(selected,headings);
 let finalUrl;try{finalUrl=new URL(record.final_url)}catch{}
 check(JSON.stringify(report?.case_numbers)==='[396]'&&report?.records?.length===1,'original_subset_396');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_workflow_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603');
 check(report?.manual_certified===0&&report?.production_operations===0&&report?.original_corpus_modified===false,'scope_preservation');
 check(record.archived_coffee==='Wush Wush - Anaerobic Natural'&&record.official_url==='https://vestacoffee.com/products/wush-wush-anaerobic-natural','original_selected_binding');
 check(finalUrl?.protocol==='https:'&&['vestacoffee.com','www.vestacoffee.com'].includes(finalUrl.hostname)&&
 finalUrl.pathname.replace(/\/$/,'')==='/products/wush-wush-anaerobic-natural'&&!finalUrl.search&&!finalUrl.hash,'same_selected_product_path');
 check(record.status==='FETCHED'&&record.parser_ok===true&&record.selected_heading_identity_verified===true,'current_selected_parser');
 check(!!raw&&record.html_bytes===raw.length&&record.html_sha256===sha(raw),'raw_official_html_sha256');
 for(const [name,value]of Object.entries(sourceFacts))check(value,'literal_selected_396_'+name);
 check(fold(fields.name)==='wush wush anaerobic natural','parser_selected_name');
 check(/vesta/i.test(fields.roaster||''),'own_roaster');
 check(['strawberry','watermelon','peach tea'].every(x=>(fields.tasting_notes||'').toLowerCase().includes(x)),'selected_taste_all_three');
 check(/chito/i.test(fields.origin||'')&&/gedio/i.test(fields.origin||'')&&/ethiopia/i.test(fields.origin||''),'selected_region_country');
 check(/anaerobic/i.test(fields.process||''),'selected_anaerobic_processing');
 check(/\b2025\b/i.test(fields.elevation_m||''),'selected_elevation_2025');
 check(/heirloom|wush wush/i.test(fields.variety||''),'selected_named_variety');
 check(/mamush kabtimer/i.test(fields.producer||''),'selected_named_producer');
 check(!fields.roast_level,'no_unpublished_roast');
 check(!/El.as.*Bayter|Papayo|Tangerine|Molasses|Colombia|Tolima|Fresno|1500 MASL/i.test(JSON.stringify(fields)),'exclude_neighbor_395');
 check(record.add_coffee_ui_rendered===true&&record.source_review_rendered===true,'add_coffee_source_review');
 check(!(record.conflicts||[]).some(x=>/name|origin|process|roast|tasting|producer|variety/i.test(String(x))),'no_selected_field_conflicts');
 const verdict={source_sha:report?.source_sha,report_sha256:rawReport?sha(rawReport):null,
  raw_html_sha256:raw?sha(raw):null,original603_number:396,sourceFacts,headings,
  fields,conflicts:record.conflicts||[],manual_certified:0,production_operations:0,
  passed:failures.length===0,failures};
 writeFileSync(join(dir,'r83-396-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
 console.log('[ISSUE33 R83 VERIFIED ONLY IF TRUE] '+JSON.stringify(verdict));
 if(failures.length)process.exitCode=1;
}
