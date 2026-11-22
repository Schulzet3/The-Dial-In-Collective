#!/usr/bin/env node
// Original603 #508: retired Avalon URL now has Munsinger H1 and two selected Notes lists.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
export const selectedUrl='https://www.kindercoffeelab.com/products/avalon-light-roast';
export const selectedName='Munsinger Light Roast';
export const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=x=>createHash('sha256').update(x).digest('hex');
// Two contradictory selected-product notes must remain both blank and flagged.
// A conflict flag cannot excuse silently populated canonical tasting notes.
export const selected508ConflictHeld=(fields={},conflicts=[])=>
 !String(fields?.tasting_notes??'').trim()&&Array.isArray(conflicts)&&conflicts.includes('tasting_notes');
export function selected508(html){
 const own=productMarkup(String(html||'')),headings=selectedProductHeadings(own);
 const s=norm(own.replace(/<(script|style|noscript|template|nav|aside|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {headings,exact:headings.length===1&&norm(headings[0])===norm(selectedName),
  first:s.includes('notes red fruit candy grapefruit'),
  second:s.includes('notes red grape fruity sugar like sweetness citrus acidity'),
  light:s.includes('roast type light roast'),
  origin:s.includes('country region peru cajamarca'),washed:s.includes('process washed')};
}
if(process.env.DIC_R359_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r359',errors=[];
 const check=(x,key)=>{if(!x)errors.push(key);};
 let e={};try{e=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_focused_evidence');}
 let buf;try{buf=readFileSync(join(dir,'case-508.html'));}catch{errors.push('missing_raw_selected_html');}
 const r=e.records?.[0]||{},f=r.current_fields||{},html=buf?.toString('utf8')||'',own=selected508(html);
 check(JSON.stringify(e.case_numbers)==='[508]'&&e.records?.length===1,'only_original508');
 check(!requiredFocusedSourceFailures([508],e.records||[]).length,'official_identity_parser_and_UI');
 check(r.official_url===selectedUrl&&r.status==='FETCHED'&&!r.alternate_url_attempted,'exact_original_url');
 check(buf?.length>1000&&r.html_bytes===buf?.length&&r.html_sha256===hash(buf||''),'raw_html_sha256');
 check(own.exact&&r.selected_heading_identity_verified===true&&norm(f.name)===norm(selectedName),'Munsinger_H1_over_retired_Avalon_slug');
 check(own.first&&own.second&&own.light&&own.origin&&own.washed,'two_direct_selected_notes_plus_specs');
 check(norm(f.roast_level)==='light'&&norm(f.process)==='washed','selected_roast_process');
 check(norm(f.origin).includes('peru')&&norm(f.origin).includes('cajamarca'),'selected_origin');
 check(!f.producer&&!f.decaffeination_method,'no_grower_or_decaf_invention');
 check(selected508ConflictHeld(f,r.conflicts),'competing_selected_notes_blank_and_explicit_conflict');
 check(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_legacy_slug_or_SEO_sensory');
 check(e.manual_certified===0&&e.original_corpus_modified===false&&e.production_operations===0,'frozen_corpus_no_provider_writes');
 check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R359_HEAD_SHA&&
 e.source_sha===process.env.DIC_R359_EVENT_SHA&&process.env.GITHUB_SHA===process.env.DIC_R359_EVENT_SHA,'event_source_parity');
 check(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','unchanged_original_CSV_blob');
 const p=extractPublicCoffeeFacts(html,{source_url:r.final_url||selectedUrl});
 check(selected508ConflictHeld(p?.fields,p?.conflicts),'actual_current_parser_notes_blank_with_explicit_conflict');
 check(p?.ok===true&&norm(p.fields?.name)===norm(selectedName)&&
  coffeeUrlPreviewMarkup(p).includes('coffee-url-preview')&&
  coffeeSourceReviewSnapshot({...p,source_url:r.final_url||selectedUrl})?.type==='coffee_source_review',
  'actual_parser_Add_Coffee_Source_Review_no_save');
 const out={passed:!errors.length,errors,source_sha:process.env.DIC_R359_HEAD_SHA,event_sha:process.env.DIC_R359_EVENT_SHA,
  number:508,official_url:r.official_url,selected:own,html_bytes:buf?.length||0,html_sha256:buf?hash(buf):null,
  fields:f,conflicts:r.conflicts||[],source_facts:(r.source_facts||[]).slice(0,30),manual_603_certified:false,member_save:false};
 writeFileSync(join(dir,'r359-original508-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R359] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
