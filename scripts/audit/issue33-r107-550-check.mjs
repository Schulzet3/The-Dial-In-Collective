#!/usr/bin/env node
// Source-bound selected original #550 acceptance. A frozen replay alone is never certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fold=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected550=Object.freeze({
 number:550,name:'Ethiopia Natural Kembata Grade 1 (GP)',url:'https://www.roasted-beans.com/products/ethiopia-natural-kembata-grade-1-gp',
 direct:['Elevation: 2100 m','Varietals: Ethiopian Heirloom','Milling Process: Natural','Drying Process: Raised beds','Durame Village of Kembata, Ethiopia','notes of blueberry and strawberry']
});
export function directSelectedProof(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const own=fold(scoped.replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/giu,' ')
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
  .replace(/\s+/gu,' '));
 return {headings,uniqueH1:headings.length===1&&fold(headings[0])===fold(selected550.name),
  direct:selected550.direct.map(s=>own.includes(fold(s)))};
}
export const locationUnrepeated=origin=>['durame','kembata'].every(w=>
 (fold(origin).match(new RegExp('\\b'+w+'\\b','g'))||[]).length<=1);
if(process.env.DIC_ISSUE33_R107_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes=null,report=null,raw=null;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'))}catch{}
 try{raw=readFileSync(join(dir,'case-550.html'))}catch{}
 const failures=[],check=(v,s)=>{if(!v)failures.push(s)};
 check(JSON.stringify(report?.case_numbers)==='[550]'&&report?.records?.length===1,'only_original_550');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_checkout_SHA');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_original_csv');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'immutable_and_public_only');
 const x=report?.records?.[0]||{},f=x.current_fields||{};
 check(x.official_url===selected550.url&&x.archived_coffee===selected550.name,'exact_original_product_identity');
 check(x.final_url===selected550.url,'no_recycled_slug_or_other_coffee_redirect');
 check(x.status==='FETCHED'&&x.parser_ok===true&&x.selected_heading_identity_verified===true,'guarded_public_live_parser_selected_identity');
 check(Boolean(raw)&&raw?.length===x.html_bytes&&sha(raw)===x.html_sha256,'raw_HTML_integrity');
 const proof=directSelectedProof(raw?.toString('utf8')||'');
 check(proof.uniqueH1&&proof.direct.every(Boolean),'visible_current_selected_H1_and_six_direct_facts');
 check(fold(f.name)===fold(selected550.name),'actual_parsed_product_name');
 check(fold(f.origin).includes('durame')&&fold(f.origin).includes('kembata')&&fold(f.origin).includes('ethiopia'),'selected_geography_preserved');
 check(locationUnrepeated(f.origin),'no_repeated_Kembata_Durame_place_tokens');
 check(fold(f.elevation_m).includes('2100'),'selected_2100_m_elevation');
 check(fold(f.variety).includes('ethiopian heirloom'),'own_variety');
 check(fold(f.process).includes('natural'),'own_natural_milling');
 check(['blueberry','strawberry'].every(t=>fold(f.tasting_notes).includes(t)),'selected_two_tasting_notes');
 check(!/november.{0,10}january/i.test(String(f.release_label||'')),'recurring_harvest_not_release');
 check(x.add_coffee_ui_rendered===true&&x.source_review_rendered===true,'explicit_Add_Coffee_and_Source_Review');
 const result={case:550,source_sha:report?.source_sha,passed:!failures.length,failures,
  selected_H1:x.selected_h1||[],current_fields:f,current_html_sha256:x.html_sha256||null,
  evidence_sha256:bytes?sha(bytes):null,proof,conflicts:x.conflicts||[],manual_certified:0,production_operations:0};
 writeFileSync(join(dir,'r107-550-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R107 ORIGINAL550 CURRENT SOURCE] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
