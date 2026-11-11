#!/usr/bin/env node
// Issue #33 R111: original #561 selected Rusty Dog Peru; one current official source, NOT all-603 certification.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fold=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected111=Object.freeze({
 number:561,
 name:'Peru Churupampa, City (mild) Roast, Fair Trade-Organic',
 url:'https://www.rustydogcoffee.com/products/peru',
 own:['Cupping notes: Lime/Grape/Brown Sugar','Grower: Finca Churupampa','Region: Chirinos, Cajamarca','Altitude: 1,600-1,900m','Process: Washed','Eber Tocto and his brothers']
});
export function selected111Direct(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const visible=fold(scoped
   .replace(/<!--[\s\S]*?-->/gu,' ')
   .replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/giu,' ')
   .split(/<h[23][^>]*>\s*(?:Customer Reviews|You may also like)/i)[0]
   .replace(/<[^>]{0,2000}>/gu,' ')
   .replace(/&(?:nbsp|amp);/giu,' ')
   .replace(/\s+/gu,' '));
 return {headings,uniqueH1:headings.length===1&&fold(headings[0])===fold(selected111.name),
   direct:selected111.own.map(literal=>({literal,matched:visible.includes(fold(literal))}))};
}
export function selected111FieldsOk(fields){
 if(!fields||typeof fields!=='object')return false;
 const f=k=>fold(fields[k]);
 return f('name')===fold(selected111.name)&&
  f('origin').includes('peru')&&f('origin').includes('cajamarca')&&f('origin').includes('chirinos')&&
  f('process')==='washed'&&
  f('producer').includes('finca churupampa')&&
  ['lime','grape','brown sugar'].every(x=>f('tasting_notes').includes(x))&&
  /1600|1 600/.test(f('elevation_m'))&&/1900|1 900/.test(f('elevation_m'))&&
  !f('decaffeination_method');
}
if(process.env.DIC_ISSUE33_R111_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let report=null,evidence=null;try{evidence=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(evidence.toString('utf8'));}catch{}
 const failures=[],check=(ok,key)=>{if(!ok)failures.push(key);};
 check(JSON.stringify(report?.case_numbers)==='[561]'&&report?.records?.length===1,'only_original_561');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_checkout_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original_csv_unchanged');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_false_cert_or_writes');
 const r=report?.records?.[0]||{};
 let raw=null;try{raw=readFileSync(join(dir,'case-561.html'));}catch{}
 const direct=selected111Direct(raw?.toString('utf8')||'');
 check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'actual_public_parser_and_identity');
 check(r.official_url===selected111.url&&r.final_url===r.official_url,'exact_original_official_url');
 check(r.archived_coffee===selected111.name,'immutable_selected_name');
 check(raw&&sha(raw)===r.html_sha256&&raw.length===r.html_bytes,'bound_original_https_raw_html');
 check(direct.uniqueH1&&direct.direct.every(x=>x.matched),'current_direct_unique_h1_and_specs');
 check(selected111FieldsOk(r.current_fields),'actual_parser_current_fields');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_and_review');
 const result={source_sha:report?.source_sha,passed:failures.length===0,failures,
   official_html_sha256:r.html_sha256||null,official_html_bytes:r.html_bytes||null,
   source_evidence_sha256:evidence?sha(evidence):null,selected_direct:direct,
   actual_fields:r.current_fields||null,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[],
   manual_certified:0,production_operations:0,notes:'City (mild) and selectable Profile are not silently equated to an unambiguous categorical Light roast'};
 writeFileSync(join(dir,'r111-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R111 561 AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
