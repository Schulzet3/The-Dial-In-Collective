#!/usr/bin/env node
// Issue #33 R105: current exact-selected original603 #543 only; no certification by replay.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fold=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const chosen=Object.freeze({
 number:543,name:'Mexico Chiapas Seasonal Espresso',host:'www.rallycoffee.co',
 path:'/products/mexico-chiapas-seasonal-espresso',
 direct:[
  'This coffee comes from Chiapas, Mexico, grown in the highlands near the El Triunfo Biosphere Reserve',
  'traditional varieties like Typica, Bourbon, and Caturra create ideal conditions',
  'Sourced through the Comon Yaj Noptic cooperative',
  'Certified organic and Fair Trade'
 ]
});
export function selectedProof(html,headings=selectedProductHeadings(productMarkup(html))){
 const own=fold(productMarkup(String(html||'')).replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
  .replace(/&#(?:39|x27);/giu,"'").replace(/\s+/gu,' '));
 return {uniqueH1:Array.isArray(headings)&&headings.length===1&&fold(headings[0])===fold(chosen.name),
  direct:chosen.direct.map(x=>own.includes(fold(x))),
  oldFlavorAbsent:!/\b(?:red apple|panela|panels|brown sugar)\b/iu.test(own)};
}
if(process.env.DIC_ISSUE33_R105_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});let report=null,bytes=null,raw=null;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'))}catch{}
 try{raw=readFileSync(join(dir,'case-543.html'))}catch{}
 const failures=[],check=(valid,label)=>{if(!valid)failures.push(label)};
 check(JSON.stringify(report?.case_numbers)==='[543]'&&report?.records?.length===1,'exact_only_original_543');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_checkout_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_csv_byte_hash');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_or_prod_mutations');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 let url=null;try{url=new URL(r.final_url)}catch{}
 check(r.official_url==='https://'+chosen.host+chosen.path&&r.archived_coffee===chosen.name,'immutable_identity_url');
 check(url?.protocol==='https:'&&url?.hostname===chosen.host&&url?.pathname.replace(/\/$/u,'')===chosen.path&&!url?.search&&!url?.hash,'exact_current_selected_url');
 check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'guarded_live_official_parser_identity');
 check(Boolean(raw)&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'official_html_byte_hash');
 const headings=selectedProductHeadings(productMarkup(raw?.toString('utf8')||'')),proof=selectedProof(raw?.toString('utf8')||'',headings);
 check(proof.uniqueH1&&proof.direct.every(Boolean),'unique_selected_H1_current_coffee_lot_story');
 check(proof.oldFlavorAbsent,'stale_flavor_not_printed_on_current_selected_page');
 check(fold(f.name)===fold(chosen.name)&&!(r.conflicts||[]).includes('name'),'current_chosen_coffee_identity');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_source_review');
 check(fold(f.origin).includes('chiapas')&&fold(f.origin).includes('mexico'),'explicit_chiapas_mexico_origin');
 check(!f.producer||/comon yaj noptic/i.test(f.producer),'cooperative_not_other_person');
 check(!f.tasting_notes,'historical_meta_only_flavor_not_canonical');
 check(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_stale_seo_flavor_fallback');
 check(!f.roast_level&&!f.process&&!f.elevation_m,'unpublished_roast_process_numeric_elevation_blank');
 check(!f.variety,'regional_example_varieties_not_assigned_to_specific_lot');
 const result={source_sha:report?.source_sha,case_number:543,final_url:r.final_url||null,
  selected_h1:headings,selected_direct_proof:proof,raw_html_sha256:r.html_sha256||null,
  source_evidence_sha256:bytes?sha(bytes):null,parser_fields:f,conflicts:r.conflicts||[],
  source_facts:(r.source_facts||[]).slice(0,24),seo_fallback_fields:r.seo_fallback_fields||[],
  manual_certified:0,production_operations:0,passed:failures.length===0,failures};
 writeFileSync(join(dir,'r105-543-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R105 EXACT SELECTED SOURCE] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
