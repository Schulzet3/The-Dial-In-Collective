#!/usr/bin/env node
// Issue #33 R103: exact selected original603 #540 ONLY, not global certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fold=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const chosen=Object.freeze({
 number:540,name:'Colombia — Inza Decaf',host:'www.radialcoffee.com',path:'/products/guatemala',
 own:['Washed Process','Medium Roast','smallholder farms nestled in the vibrant town of Inza, Colombia',
      'notes of sweet dark chocolate, juicy cherries and rich raisins']
});
export function selectedProof(html,headings=selectedProductHeadings(productMarkup(html))) {
 const selected=productMarkup(String(html||''));
 const own=fold(selected.replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
  .replace(/&#(?:39|x27);/giu,"'").replace(/\s+/gu,' '));
 return {uniqueH1:Array.isArray(headings)&&headings.length===1&&fold(headings[0])===fold(chosen.name),
         direct:chosen.own.map(x=>own.includes(fold(x)))};
}
if(process.env.DIC_ISSUE33_R103_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});
 let report=null,bytes=null,raw=null;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'))}catch{}
 try{raw=readFileSync(join(dir,'case-540.html'))}catch{}
 const errors=[],ok=(v,k)=>{if(!v)errors.push(k);};
 ok(JSON.stringify(report?.case_numbers)==='[540]'&&report?.records?.length===1,'exact_only_original_540');
 ok(report?.source_sha===process.env.GITHUB_SHA,'exact_checked_out_sha');
 ok(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_csv_unchanged');
 ok(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'corpus_and_production_untouched');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 let url=null;try{url=new URL(r.final_url)}catch{}
 ok(r.official_url==='https://'+chosen.host+chosen.path&&r.archived_coffee===chosen.name,'frozen_selected_url_identity');
 ok(url?.protocol==='https:'&&url?.hostname===chosen.host&&url?.pathname.replace(/\/$/u,'')===chosen.path&&!url?.search&&!url?.hash,'official_exact_current_not_neighbor');
 ok(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'guarded_live_exact_current_parser');
 ok(Boolean(raw)&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'raw_source_byte_hash');
 const selected=productMarkup(raw?.toString('utf8')||'');
 const headings=selectedProductHeadings(selected),proof=selectedProof(selected,headings);
 ok(proof.uniqueH1&&proof.direct.every(Boolean),'selected_unique_h1_and_all_direct_printed_literals');
 ok(fold(f.name)===fold(chosen.name)&&!(r.conflicts||[]).includes('name'),'chosen_identity_not_guatemala_slug');
 ok(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_and_source_review');
 ok(fold(f.process)==='washed'&&fold(f.roast_level)==='medium','direct_washed_medium');
 ok(fold(f.origin).includes('inza')&&fold(f.origin).includes('colombia'),'selected_inza_colombia_origin');
 ok(['sweet dark chocolate','juicy cherries','rich raisins'].every(v=>fold(f.tasting_notes).includes(v)),
   'complete_direct_selected_notes');
 ok(!f.decaffeination_method&&!f.variety&&!f.elevation_m,'unpublished_method_variety_elevation_blank');
 ok(!/Guatemala|Pablo|Eva Del Cid|Arquimedes|stone fruit|praline|nougat/i.test(JSON.stringify(f)),
   'no_reused_url_or_related_product_contamination');
 ok(!f.producer||/smallholder|collective/i.test(f.producer),'grower_not_importer');
 const result={source_sha:report?.source_sha,case_number:540,selected_url:r.final_url||null,
  selected_h1:headings,printed_current_source:proof,raw_html_sha256:r.html_sha256||null,
  evidence_sha256:bytes?sha(bytes):null,parser_fields:f,source_facts:(r.source_facts||[]).slice(0,20),
  conflicts:r.conflicts||[],manual_certified:0,production_operations:0,passed:errors.length===0,failures:errors};
 writeFileSync(join(dir,'r103-540-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R103 STRICT SELECTED CURRENT] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}
