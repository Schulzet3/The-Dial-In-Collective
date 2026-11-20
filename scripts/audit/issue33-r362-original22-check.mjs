#!/usr/bin/env node
// Original603 #22: selected COMSA product prose, not menu-category roast or a harvest-as-release.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
export const selectedUrl='https://blackriverroasters.com/products/organic-honduras-comsa';
export const selectedName='Organic Honduras COMSA';
export const norm=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=x=>createHash('sha256').update(x).digest('hex');
export function selected22(html){
 const own=productMarkup(String(html||'')),headings=selectedProductHeadings(own);
 const prose=norm(own.replace(/<(script|style|noscript|template|nav|aside|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {headings,identity:headings.length===1&&norm(headings[0])===norm(selectedName),
  notes:prose.includes('raspberry jam cranberry and cherry'),
  variety:prose.includes('bourbon catuai caturra typica'),
  altitude:prose.includes('altitude 1220 masl'),
  natural:prose.includes('process natural'),
  harvest:prose.includes('harvest december april'),
  comsa:prose.includes('comsa'),
  ownRoastLiteral:/(?:^|\s)roast (?:level|type) (?:light|medium|dark)(?:\s|$)/.test(prose)};
}
if(process.env.DIC_R362_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r362',errors=[];
 const check=(condition,key)=>{if(!condition)errors.push(key);};
 let e={};try{e=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_collector_evidence');}
 let buf;try{buf=readFileSync(join(dir,'case-22.html'));}catch{errors.push('missing_actual_html');}
 const r=e.records?.[0]||{},f=r.current_fields||{},html=buf?.toString('utf8')||'',own=selected22(html);
 check(JSON.stringify(e.case_numbers)==='[22]'&&e.records?.length===1,'only_original22');
 check(!requiredFocusedSourceFailures([22],e.records||[]).length,'official_identity_parser_no_save_UI');
 check(r.official_url===selectedUrl&&r.status==='FETCHED'&&!r.alternate_url_attempted,'exact_official_url');
 check(buf?.length>1000&&r.html_bytes===buf.length&&r.html_sha256===hash(buf),'actual_raw_html_SHA');
 check(own.identity&&r.selected_heading_identity_verified===true&&norm(f.name)===norm(selectedName),'selected_exact_product_H1');
 check(own.notes&&own.natural&&own.variety&&own.altitude&&own.comsa,'selected_literal_specs');
 check(norm(f.process)==='natural','own_natural_process');
 check(norm(f.origin).includes('honduras'),'direct_Honduras');
 check(['raspberry','jam','cranberry','cherry'].every(x=>norm(f.tasting_notes).includes(x)),'direct_selected_notes');
 check(!f.decaffeination_method,'no_invented_decaf');
 // The dated harvest is NOT a release label. Menu-only Light Roast is not chosen-product evidence.
 check(!f.release_label,'no_harvest_as_release_label');
 if(!own.ownRoastLiteral)check(!f.roast_level,'no_menu_category_or_SEO_roast_invention');
 check(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_SEO_sensory');
 check(e.manual_certified===0&&e.original_corpus_modified===false&&e.production_operations===0,'no_frozen_corpus_or_provider_writes');
 check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R362_HEAD_SHA &&
  e.source_sha===process.env.DIC_R362_EVENT_SHA&&process.env.GITHUB_SHA===process.env.DIC_R362_EVENT_SHA,'head_event_parity');
 check(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','frozen_original_csv_unchanged');
 const p=extractPublicCoffeeFacts(html,{source_url:r.final_url||selectedUrl});
 check(p?.ok===true&&norm(p.fields?.name)===norm(selectedName)&&
  coffeeUrlPreviewMarkup(p).includes('coffee-url-preview')&&
  coffeeSourceReviewSnapshot({...p,source_url:r.final_url||selectedUrl})?.type==='coffee_source_review',
  'actual_parser_preview_review_without_save');
 const out={passed:!errors.length,errors,source_sha:process.env.DIC_R362_HEAD_SHA,
  event_sha:process.env.DIC_R362_EVENT_SHA,official_url:r.official_url,selected:own,
  raw_html_bytes:buf?.length||0,raw_html_sha256:buf?hash(buf):null,
  current_fields:f,conflicts:r.conflicts||[],manual_603_certified:false,member_save:false};
 writeFileSync(join(dir,'r362-original22-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R362] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
