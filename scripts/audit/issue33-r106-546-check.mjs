#!/usr/bin/env node
// #33 R106: exact current selected #546; frozen source replay is NOT certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fold=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const chosen=Object.freeze({
 number:546,name:'Venezuela',host:'www.readingcoffee.com',
 path:'/products/venezuela-finca-berlin-single-origin-coffee',
 direct:[
  'Sourced from Finca Berlin in the mountains of Táchira State',
  'producer Alfredo Rojas',
  'anaerobic honey method',
  'fresh coffee cherry and dried cascara',
  'Fresh Coffee Cherry',
  'Dried Cascara',
  'Mellow Cocoa',
  'Warm Spice',
  'Region: Junín Municipality, Táchira State',
  'Elevation: ~1100 MASL',
  'Variety: Monte Claro',
  'Process: Anaerobic Honey'
 ]
});
export function selectedProof(html,headings=selectedProductHeadings(productMarkup(html))){
 const scoped=productMarkup(String(html||''));
 const own=fold(scoped.replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
  .replace(/&#(?:39|x27);/giu,"'").replace(/\s+/gu,' '));
 return {uniqueH1:headings.length===1&&fold(headings[0])===fold(chosen.name),
  direct:chosen.direct.map(x=>own.includes(fold(x)))};
}
if(process.env.DIC_ISSUE33_R106_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});
 let bytes=null,report=null,raw=null;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'))}catch{}
 try{raw=readFileSync(join(dir,'case-546.html'))}catch{}
 const failures=[],check=(valid,label)=>{if(!valid)failures.push(label)};
 check(JSON.stringify(report?.case_numbers)==='[546]'&&report?.records?.length===1,'exact_case_only_546');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_checked_out_source_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_csv_unchanged');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'immutable_scope_and_no_prod_writes');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 let final=null;try{final=new URL(r.final_url)}catch{}
 check(r.archived_coffee===chosen.name&&r.official_url==='https://'+chosen.host+chosen.path,'original_exact_product_url_identity');
 check(final?.protocol==='https:'&&final?.hostname===chosen.host&&final?.pathname.replace(/\/$/u,'')===chosen.path&&!final?.search&&!final?.hash,'no_unapproved_redirect_or_other_product');
 check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'real_bounded_guarded_HTTPS_parser_H1_identity');
 check(Boolean(raw)&&r.html_bytes===raw?.length&&r.html_sha256===sha(raw),'raw_selected_HTML_byte_hash');
 const proof=selectedProof(raw?.toString('utf8')||'');
 check(proof.uniqueH1&&proof.direct.every(Boolean),'exact_current_H1_and_printed_selected_facts');
 check(fold(f.name)===fold(chosen.name),'original_coffee_name_retained');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_Add_Coffee_and_Source_Review');
 check(fold(f.origin).includes('tachira')&&fold(f.origin).includes('venezuela'),'exact_provenance_country_region');
 check(fold(f.producer).includes('alfredo rojas'),'actual_selected_producer');
 check(fold(f.variety).includes('monte claro'),'own_variety');
 check(fold(f.elevation_m).includes('1100'),'own_elevation');
 check(f.roast_level==='Medium','own_medium_roast');
 check(fold(f.process).includes('anaerobic')||fold(f.process).includes('honey'),'source_compatible_combined_fermentation_process');
 check(['fresh coffee cherry','dried cascara','mellow cocoa','warm spice'].every(v=>fold(f.tasting_notes).includes(v)),'all_four_literal_current_selected_notes');
 check(!fold(f.tasting_notes).includes('roasted fruit'),'generic_store_category_not_selected_notes');
 check(!/september.{0,5}january/iu.test(String(f.release_label||'')),'recurring_harvest_window_not_release_year');
 const out={source_sha:report?.source_sha,case:546,passed:failures.length===0,failures,
  current_html_sha256:r.html_sha256||null,source_evidence_sha256:bytes?sha(bytes):null,
  url:r.final_url||null,current_selected_h1:r.selected_h1||[],
  selected_proof:proof,fields:f,conflicts:r.conflicts||[],
  source_facts:(r.source_facts||[]).slice(0,25),manual_certified:0,production_operations:0};
 writeFileSync(join(dir,'r106-546-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R106 EXACT CURRENT ORIGINAL546] '+JSON.stringify(out));
 if(failures.length)process.exitCode=1;
}
