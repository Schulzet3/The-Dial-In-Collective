#!/usr/bin/env node
// Issue #33 R104: source-bound single original603 selected #542 ONLY.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fold=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const chosen=Object.freeze({
 number:542,name:'Ethiopia Refisa',host:'www.rallycoffee.co',path:'/products/ethiopia-refisa',
 direct:['Ethiopia Refisa is a washed coffee from the West Arsi region',
   'processed at the Testi West Arsi Washing Station',
   'around 850 smallholder farmers who deliver ripe coffee cherry',
   'fermented for 24–48 hours, washed, and dried slowly on raised beds for 12–15 days']
});
export function selectedProof(html,headings=selectedProductHeadings(productMarkup(html))){
 const chosenHtml=productMarkup(String(html||''));
 const own=fold(chosenHtml.replace(/<!--[\s\S]*?-->/gu,' ')
   .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
   .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
   .replace(/&#(?:39|x27);/giu,"'").replace(/\s+/gu,' '));
 return {
  uniqueH1:Array.isArray(headings)&&headings.length===1&&fold(headings[0])===fold(chosen.name),
  direct:chosen.direct.map(x=>own.includes(fold(x))),
  archivedFlavorAbsentFromSelected:/\b(?:jasmine|berry candy)\b/iu.test(own)===false &&
    !/\blime\b/iu.test(own)
 };
}
if(process.env.DIC_ISSUE33_R104_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});let report=null,bytes=null,raw=null;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'))}catch{}
 try{raw=readFileSync(join(dir,'case-542.html'))}catch{}
 const failures=[],check=(valid,label)=>{if(!valid)failures.push(label)};
 check(JSON.stringify(report?.case_numbers)==='[542]'&&report?.records?.length===1,'exact_only_original_542');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_checked_out_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_603_csv_unchanged');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_or_production_mutations');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 let url=null;try{url=new URL(r.final_url)}catch{}
 check(r.official_url==='https://'+chosen.host+chosen.path&&r.archived_coffee===chosen.name,'frozen_542_selected_url');
 check(url?.protocol==='https:'&&url?.hostname===chosen.host&&url?.pathname.replace(/\/$/u,'')===chosen.path&&!url?.search&&!url?.hash,'exact_current_selected_url');
 check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'guarded_live_official_parser_and_identity');
 check(Boolean(raw)&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'raw_html_byte_hash');
 const scoped=productMarkup(raw?.toString('utf8')||'');
 const headings=selectedProductHeadings(scoped),proof=selectedProof(scoped,headings);
 check(proof.uniqueH1&&proof.direct.every(Boolean),'selected_h1_and_direct_lot_literally_printed');
 check(proof.archivedFlavorAbsentFromSelected,'historical_jasmine_lime_berry_candy_not_current_direct');
 check(fold(f.name)===fold(chosen.name)&&!(r.conflicts||[]).includes('name'),'current_selected_identity');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_source_review');
 check(fold(f.process)==='washed','current_printed_washed');
 check(fold(f.origin).includes('west arsi')&&fold(f.origin).includes('ethiopia'),'current_printed_west_arsi_ethiopia');
 check(!f.tasting_notes,'historical_flavor_without_current_selected_corroboration_must_be_blank');
 check(!f.roast_level&&!f.variety&&!f.elevation_m&&!f.decaffeination_method,'unpublished_specs_unfilled');
 check(!f.producer||/smallholder|farmer/i.test(f.producer),'smallholder_farmer_not_washing_station_operator');
 const result={source_sha:report?.source_sha,case_number:542,final_url:r.final_url||null,
  selected_h1:headings,printed_selected_source:proof,raw_html_sha256:r.html_sha256||null,
  source_evidence_sha256:bytes?sha(bytes):null,parser_fields:f,
  source_facts:(r.source_facts||[]).slice(0,24),conflicts:r.conflicts||[],
  manual_certified:0,production_operations:0,passed:failures.length===0,failures};
 writeFileSync(join(dir,'r104-542-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R104 EXACT SELECTED SOURCE] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
