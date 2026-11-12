#!/usr/bin/env node
// #33 R131: strict exact current original603 #99 selected-product evidence.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const norm=s=>String(s??'').replace(/&#(?:0*39|x0*27);|&apos;/giu,"'").normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const chosen99=Object.freeze({name:'Guatemala Finca Santa Isabel',url:'https://dekaf.com/products/guatemala-finca-santa-isabel',notes:['bonbon-like caramel','clementine','green apple']});
export function selected99Source(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const visible=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','form','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' '));
 const has=s=>visible.includes(norm(s));
 return {headings,correctH1:headings.some(h=>norm(h)===norm(chosen99.name)),direct:{
  medium:has('ROAST: Medium'),guatemala:has('Guatemala'),notes:chosen99.notes.every(has),
  selectedDecaf:has("Dekáf'd by way of Swiss Water"),
  farm:has('Finca Santa Isabel')&&has('Keller family')}};
}
if(process.env.DIC_ISSUE33_R131_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,e,html;try{raw=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(raw.toString('utf8'));}catch{}
 try{html=readFileSync(join(dir,'case-99.html'));}catch{}
 const failures=[],ck=(ok,k)=>{if(!ok)failures.push(k);};
 const r=e?.records?.find(x=>x.number===99)||{},f=r.current_fields||{};
 const d=selected99Source(html?.toString('utf8')||'');
 ck(JSON.stringify(e?.case_numbers)==='[99]'&&e.records?.length===1,'single_original_99');
 ck(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 ck(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603');
 ck(e?.original_corpus_modified===false&&e.production_operations===0&&e.manual_certified===0,'no_corpus_or_production_mutation');
 ck(r.status==='FETCHED'&&r.parser_ok===true,'actual_guarded_public_parser');
 ck(r.official_url===chosen99.url&&r.final_url===chosen99.url&&r.archived_coffee===chosen99.name,'unchanged_original_official_url_and_selected_identity');
 ck(html&&hash(html)===r.html_sha256&&html.length===r.html_bytes,'raw_html_sha256_bytes');
 ck(d.correctH1&&r.selected_heading_identity_verified===true,'selected_exact_h1');
 ck(Object.values(d.direct).every(Boolean),'direct_selected_roast_notes_farm_swiss_water');
 ck(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_source_review');
 ck(norm(f.name)===norm(chosen99.name)&&norm(f.roast_level)==='medium','current_name_medium');
 ck(norm(f.origin).includes('guatemala'),'current_selected_origin');
 ck(chosen99.notes.every(n=>norm(f.tasting_notes).includes(norm(n))),'current_three_tasting_notes');
 ck(f.decaffeination_method==='Water Process','separate_selected_swiss_water_decaf_method');
 ck(!f.process&&!f.variety&&!f.elevation_m,'no_invented_green_process_variety_altitude');
 ck((r.conflicts||[]).length===0,'no_current_conflicts');
 ck(Array.isArray(r.seo_fallback_fields)&&r.seo_fallback_fields.length===0,'no_seo_only_fields');
 const proof={case:99,source_sha:e?.source_sha||null,passed:failures.length===0,failures,
  html_sha256:r.html_sha256||null,html_bytes:r.html_bytes||null,evidence_sha256:raw?hash(raw):null,
  current_fields:f,source:d,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[],
  original603_global_certified:false,production_operations:0};
 writeFileSync(join(dir,'r131-99-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R131] '+JSON.stringify(proof));if(failures.length)process.exitCode=1;
}
