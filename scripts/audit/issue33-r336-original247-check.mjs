#!/usr/bin/env node
// #33 R336: exact original #247 selected source, no whole-corpus/lot certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
const url='https://onyxcoffeelab.com/products/colombia-finca-anaya-wush-wush';
const name='Colombia Finca Anaya Wush Wush';
const frozen='docs/audits/issue33-original603-source-level-adjudication-20261029.csv';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r336';
const hash=v=>createHash('sha256').update(v).digest('hex');
const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function selected247(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const text=selected.replace(/<(script|style|noscript|template|nav|aside|footer|header|select)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' ')
  .replace(/&(?:nbsp|amp|#160|#xA0);/gi,' ').replace(/\s+/g,' ');
 const t=norm(text);
 return {headings,exact:headings.length===1&&norm(headings[0])===norm(name),
  ownVariety:/\bvariety wush wush\b/.test(t),
  ownWashed:/\b(?:process washed|washed process)\b/.test(t),
  ownProducer:/\bsergio dario aranda gomez\b/.test(t),
  ownElevation:/\b(?:1600|1 600) masl\b/.test(t),
  ownFlavor:['key lime','jasmine','white cranberry','marzipan'].every(x=>t.includes(x)),
  archivedBanner:/\bthis product is archived\b/.test(t)};
}
if(process.env.DIC_R336_VERIFY==='1'){
 const errors=[],need=(x,k)=>{if(!x)errors.push(k);};
 let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_report');}
 need(JSON.stringify(report?.case_numbers)==='[247]'&&report?.records?.length===1,'only_case247');
 need(execFileSync('git',['rev-parse','HEAD:'+frozen],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','frozen_git_blob_unchanged');
 need(report?.original603_register_sha256===hash(readFileSync(new URL('../../'+frozen,import.meta.url))),'frozen_csv_bytes');
 need(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_mutation_or_false_certification');
 need(report?.source_sha===process.env.DIC_R336_EVENT_SHA,'event_source_sha');
 need(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R336_HEAD_SHA,'checkout_sha');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 need(requiredFocusedSourceFailures([247],report?.records||[]).length===0,'official_identity_parser_ui_required');
 let bytes;try{bytes=readFileSync(join(dir,'case-247.html'));}catch{errors.push('missing_real_html');}
 const html=bytes?.toString('utf8')||'',own=selected247(html);
 need(r.official_url===url&&!r.alternate_url_attempted,'registered_first_party_only');
 need(r.status==='FETCHED'&&r.parser_ok===true&&Boolean(bytes?.length)&&r.html_bytes===bytes?.length&&r.html_sha256===hash(bytes||''),'actual_fetched_html_sha');
 need(r.archived_coffee===name&&own.exact&&norm(f.name)===norm(name),'selected_current_identity_h1_name');
 for(const k of ['ownVariety','ownWashed','ownProducer','ownElevation','ownFlavor'])need(own[k],'direct_selected_'+k);
 need(f.process==='Washed','own_green_washed');
 need(norm(f.variety).includes('wush wush'),'own_variety');
 need(norm(f.producer).includes('sergio dario aranda gomez'),'own_named_grower');
 need(['key lime','jasmine','white cranberry','marzipan'].every(x=>norm(f.tasting_notes).includes(x)),'complete_own_tasting_notes');
 need(!f.decaffeination_method,'generic_caffeine_widget_not_decaf_method');
 need(!(r.seo_fallback_fields||[]).some(x=>['producer','variety','process','tasting_notes','decaffeination_method'].includes(x)),'no_SEO_selected_field');
 need(!(r.conflicts||[]).length,'unresolved_selected_conflict');
 const parsed=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
 need(parsed?.ok===true&&norm(parsed?.fields?.name)===norm(name)&&parsed?.fields?.process==='Washed'&&!parsed?.fields?.decaffeination_method,'real_raw_html_parser_replay');
 need(parsed?.ok===true&&coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview')&&
  coffeeSourceReviewSnapshot({...parsed,source_url:r.final_url||url})?.type==='coffee_source_review','raw_html_AddCoffee_SourceReview');
 const out={passed:errors.length===0,errors,case:247,source_sha:process.env.DIC_R336_HEAD_SHA,
  event_sha:process.env.DIC_R336_EVENT_SHA,manual_certified:0,all603_manual_semantic_certified:false,
  production_operations:0,source:{url,headings:own.headings,html_sha256:r.html_sha256,html_bytes:r.html_bytes,
  own,fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[],
  current_sale_lot_not_certified:true}};
 writeFileSync(join(dir,'r336-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R336] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
