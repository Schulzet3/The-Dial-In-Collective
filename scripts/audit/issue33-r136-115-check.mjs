#!/usr/bin/env node
// Issue #33 R136: original603 #115 current selected Frinsa, never old slug "lactic honey" process.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=v=>String(v??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const chosen115=Object.freeze({
 number:115,name:'Frinsa',url:'https://enjoycoffeeroasters.com/products/frinsa-lactic-honey-copy',
 notes:['orange','graham cracker','pu-erh tea']
});
export function selected115Source(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const visible=norm(removeElements(scoped,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' '));
 const has=s=>visible.includes(norm(s));
 return {headings,exactH1:headings.length===1&&norm(headings[0])===norm(chosen115.name),
  direct:{
   currentProducer:has('Producer Fikri Raihan Hakim - Frinsa Estate'),
   currentOrigin:has('Origin Pangalengan, Garut, West Java, Indonesia'),
   currentElevation:has('Elevation 1350-1700 MASL'),
   currentVariety:has('Variety Field Blend'),
   wetHulled:has('Process Wet Hulled'),
   lightMedium:has('Roast Level Light-Medium'),
   threeNotes:chosen115.notes.every(has),
   ownLotWetHulling:has('This Frinsa lot is processed via wet hulling')
  },selected_visible_length:visible.length,source_sha256:sha(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R136_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes,recEvidence,raw;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));recEvidence=JSON.parse(bytes.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-115.html'));}catch{}
 const failures=[],ck=(ok,why)=>{if(!ok)failures.push(why);};
 const rec=recEvidence?.records?.find(x=>x.number===115)||{},f=rec.current_fields||{};
 const direct=selected115Source(raw?.toString('utf8')||'');
 ck(JSON.stringify(recEvidence?.case_numbers)==='[115]'&&recEvidence?.records?.length===1,'original115_only');
 ck(recEvidence?.source_sha===process.env.GITHUB_SHA,'exact_checked_out_source_sha');
 ck(recEvidence?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_digest');
 ck(recEvidence?.original_corpus_modified===false&&recEvidence?.production_operations===0&&recEvidence?.manual_certified===0,'no_global_certification_or_production');
 ck(rec.status==='FETCHED'&&rec.parser_ok===true,'guarded_official_https_current_parser');
 ck(rec.official_url===chosen115.url&&rec.final_url===chosen115.url&&rec.archived_coffee===chosen115.name,'same_original_official_selected_identity');
 ck(!!raw&&sha(raw)===rec.html_sha256&&raw.length===rec.html_bytes,'raw_official_source_byte_integrity');
 ck(direct.exactH1&&rec.selected_heading_identity_verified===true,'exact_current_selected_h1');
 ck(Object.values(direct.direct).every(Boolean),'own_selected_product_labeled_source_facts');
 ck(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'real_add_coffee_and_source_review');
 ck(norm(f.name)===norm(chosen115.name),'actual_parser_current_name');
 ck(norm(f.origin).includes('pangalengan')&&norm(f.origin).includes('indonesia'),'actual_parser_current_origin');
 ck(norm(f.producer).includes('fikri raihan hakim')&&norm(f.producer).includes('frinsa estate'),'actual_parser_current_producer');
 ck(norm(f.elevation_m).includes('1350')&&norm(f.elevation_m).includes('1700'),'actual_parser_current_elevation');
 ck(norm(f.variety)==='field blend','actual_parser_current_variety');
 ck(['Medium-Light','Light-Medium'].includes(f.roast_level),'actual_parser_labeled_current_roast');
 ck(chosen115.notes.every(v=>norm(f.tasting_notes).includes(norm(v))),'actual_parser_three_current_notes');
 // Wet hulling is a literal published subtype; approved canonical categories exclude it.
 // Never turn old "lactic honey" URL slug or the estate's educational list into Honey/Washed.
 ck(!['Honey','Washed','Natural','Anaerobic'].includes(f.process),'do_not_transfer_old_slug_or_other_lot_processing');
 ck(!f.decaffeination_method,'no_unpublished_decaffeination_method');
 ck(Array.isArray(rec.conflicts)&&rec.conflicts.length===0,'no_selected_fact_conflicts');
 ck(Array.isArray(rec.seo_fallback_fields)&&rec.seo_fallback_fields.length===0,'no_seo_fallback_facts');
 const proof={number:115,source_sha:recEvidence?.source_sha||null,passed:!failures.length,failures,
  official_html_sha256:rec.html_sha256||null,official_html_bytes:rec.html_bytes||null,
  evidence_sha256:bytes?sha(bytes):null,direct,actual_parser_fields:f,
  process_qualification:'DIRECT_WET_HULLED_OTHER_UNKNOWN_CANONICAL_NOT_WASHED_OR_HONEY',
  selected_identity:'FRINSA_CURRENT_H1_NOT_OLD_LACTIC_HONEY_SLUG',
  source_conflicts:rec.conflicts||[],seo_fallback_fields:rec.seo_fallback_fields||[],
  original603_all_individually_certified:false,production_operations:0};
 writeFileSync(join(dir,'r136-115-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R136] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
