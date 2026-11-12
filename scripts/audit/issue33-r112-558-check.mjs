#!/usr/bin/env node
// Issue #33 R112: source-bound original603 #558, not universal coffee certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fold=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected112=Object.freeze({
  number:558,
  name:'Divine Inspiration - Nicaraguan Light-Medium Roast Relationship Coffee',
  url:'https://www.rossstreetroasting.com/products/nicaragua-divine-inspiration-relationship-coffee',
  own:[
    'Flavor notes: Chocolate, spiced apple, nutty',
    'Roast level: Light-Medium',
    'Origin: Nicaragua, Jinotega region',
    'Farms: Smallholder farms in the region',
    'Processing method: Washed'
  ]
});
export function currentDirect112(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const visible=fold(scoped
  .replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/giu,' ')
  .split(/<h[23][^>]*>\s*Customer Reviews/i)[0]
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ').replace(/\s+/gu,' '));
 return {headings,uniqueH1:headings.length===1&&fold(headings[0])===fold(selected112.name),
  direct:selected112.own.map(literal=>({literal,matched:visible.includes(fold(literal))})),
  historicHarvestOnly:/current harvest 2023 24/.test(visible),historicUpdateOnly:/sept 2024 update/.test(visible)};
}
export function selected112FieldsOk(fields){
 if(!fields||typeof fields!=='object')return false;
 const f=k=>fold(fields[k]);
 return f('name')===fold(selected112.name)&&
  f('origin').includes('nicaragua')&&f('origin').includes('jinotega')&&
  f('roast_level')==='medium light'&&f('process')==='washed'&&
  ['chocolate','spiced apple','nutty'].every(x=>f('tasting_notes').includes(x))&&
  !/2026/.test(f('release_label'))&&
  !/papua new guinea|brazil/.test(f('origin'));
}
if(process.env.DIC_ISSUE33_R112_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let report=null,evidence=null;try{evidence=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(evidence.toString('utf8'));}catch{}
 const failures=[],check=(v,k)=>{if(!v)failures.push(k);};
 check(JSON.stringify(report?.case_numbers)==='[558]'&&report?.records?.length===1,'only_original_558');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_checkout_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_csv');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_false_cert_or_writes');
 const r=report?.records?.[0]||{};
 let raw=null;try{raw=readFileSync(join(dir,'case-558.html'));}catch{}
 const direct=currentDirect112(raw?.toString('utf8')||'');
 check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'actual_current_parser_and_selected_identity');
 check(r.official_url===selected112.url&&r.final_url===r.official_url,'exact_original_official_url');
 check(r.archived_coffee===selected112.name,'immutable_selected_name');
 check(raw&&sha(raw)===r.html_sha256&&raw.length===r.html_bytes,'bounded_official_html_hash');
 check(direct.uniqueH1&&direct.direct.every(x=>x.matched),'selected_direct_specs');
 check(selected112FieldsOk(r.current_fields),'actual_parser_selected_fields');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_and_source_review');
 // These dated product claims are the seller's historical inventory labels, not a current 2026 harvest.
 const result={source_sha:report?.source_sha,passed:failures.length===0,failures,
  official_html_sha256:r.html_sha256||null,official_html_bytes:r.html_bytes||null,
  source_evidence_sha256:evidence?sha(evidence):null,
  selected_direct:direct,actual_fields:r.current_fields||null,
  conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[],
  manual_certified:0,production_operations:0,
  qualification:'Page may still display historical 2023-24 harvest / September 2024 update; never infer 2026 harvest or transfer Gold Mountain Finca Idealista as selected smallholder farm.'};
 writeFileSync(join(dir,'r112-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R112 558 AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
