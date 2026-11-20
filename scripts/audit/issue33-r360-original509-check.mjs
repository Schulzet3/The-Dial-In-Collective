#!/usr/bin/env node
// Original603 #509: retired Kraken URL now has St. Germain H1 and two identical direct selected Notes lists.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
export const selectedUrl='https://www.kindercoffeelab.com/products/kraken-dark-roast';
export const selectedName='St. Germain Dark Roast';
export const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=x=>createHash('sha256').update(x).digest('hex');
export function selected509(html){
 const own=productMarkup(String(html||'')),headings=selectedProductHeadings(own);
 const s=norm(own.replace(/<(script|style|noscript|template|nav|aside|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {headings,exact:headings.length===1&&norm(headings[0])===norm(selectedName),
  first:s.includes('notes dark chocolate cooked cranberry tobacco'),
  second:(s.match(/notes dark chocolate cooked cranberry tobacco/g)||[]).length>=2,
  light:s.includes('roast type dark roast'),
  origin:s.includes('country region mexico cristal'),washed:s.includes('process washed')};
}
if(process.env.DIC_R360_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r360',errors=[];
 const check=(x,key)=>{if(!x)errors.push(key);};
 let e={};try{e=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_focused_evidence');}
 let buf;try{buf=readFileSync(join(dir,'case-509.html'));}catch{errors.push('missing_raw_selected_html');}
 const r=e.records?.[0]||{},f=r.current_fields||{},html=buf?.toString('utf8')||'',own=selected509(html);
 check(JSON.stringify(e.case_numbers)==='[509]'&&e.records?.length===1,'only_original509');
 check(!requiredFocusedSourceFailures([509],e.records||[]).length,'official_identity_parser_and_UI');
 check(r.official_url===selectedUrl&&r.status==='FETCHED'&&!r.alternate_url_attempted,'exact_original_url');
 check(buf?.length>1000&&r.html_bytes===buf?.length&&r.html_sha256===hash(buf||''),'raw_html_sha256');
 check(own.exact&&r.selected_heading_identity_verified===true&&norm(f.name)===norm(selectedName),'St_Germain_H1_over_retired_Kraken_slug');
 check(own.first&&own.second&&own.light&&own.origin&&own.washed,'two_direct_selected_notes_plus_specs');
 check(norm(f.roast_level)==='dark'&&norm(f.process)==='washed','selected_roast_process');
 check(norm(f.origin).includes('mexico')&&norm(f.origin).includes('cristal'),'selected_origin');
 check(!f.producer&&!f.decaffeination_method,'no_grower_or_decaf_invention');
 check(['dark chocolate','cooked cranberry','tobacco'].every(x=>norm(f.tasting_notes).includes(x))&&!(r.conflicts||[]).includes('tasting_notes'),'duplicated_selected_notes_preserved_without_false_conflict');
 check(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_legacy_slug_or_SEO_sensory');
 check(e.manual_certified===0&&e.original_corpus_modified===false&&e.production_operations===0,'frozen_corpus_no_provider_writes');
 check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R360_HEAD_SHA&&
 e.source_sha===process.env.DIC_R360_EVENT_SHA&&process.env.GITHUB_SHA===process.env.DIC_R360_EVENT_SHA,'event_source_parity');
 check(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','unchanged_original_CSV_blob');
 const p=extractPublicCoffeeFacts(html,{source_url:r.final_url||selectedUrl});
 check(p?.ok===true&&norm(p.fields?.name)===norm(selectedName)&&
  coffeeUrlPreviewMarkup(p).includes('coffee-url-preview')&&
  coffeeSourceReviewSnapshot({...p,source_url:r.final_url||selectedUrl})?.type==='coffee_source_review',
  'actual_parser_Add_Coffee_Source_Review_no_save');
 const out={passed:!errors.length,errors,source_sha:process.env.DIC_R360_HEAD_SHA,event_sha:process.env.DIC_R360_EVENT_SHA,
  number:509,official_url:r.official_url,selected:own,html_bytes:buf?.length||0,html_sha256:buf?hash(buf):null,
  fields:f,conflicts:r.conflicts||[],source_facts:(r.source_facts||[]).slice(0,30),manual_603_certified:false,member_save:false};
 writeFileSync(join(dir,'r360-original509-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R360] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
