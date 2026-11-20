#!/usr/bin/env node
// Issue33 R341 exact original249 current selected product, not 603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
const url='https://onyxcoffeelab.com/products/mexico-finca-santa-cruz-gesha';
const name='Mexico Finca Santa Cruz Gesha';
const frozen='docs/audits/issue33-original603-source-level-adjudication-20261029.csv';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r341';
const hash=v=>createHash('sha256').update(v).digest('hex');
const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function selected249(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const t=norm(selected.replace(/<(script|style|noscript|template|nav|aside|footer|header|select)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {headings,exact:headings.length===1&&norm(headings[0])===norm(name),
  ownWashed:/\b(?:process washed|washed process)\b/.test(t),
  ownVariety:/\b(?:variety gesha|gesha variety)\b/.test(t),
  ownRoast:/\b(?:roast level light|light agtron)\b/.test(t),
  ownProducer:/\bjose pepe arguello\b/.test(t),
  ownElevation:/\b1650 masl\b/.test(t),
  ownFlavor:['yellow pear','chamomile','almond','vanilla blossom'].every(x=>t.includes(x)),
  ownChiapas:/\bchiapas mexico\b/.test(t),
  historicalNaturalAwards:/\bnatural gesha\b/.test(t)};
}
if(process.env.DIC_R341_VERIFY==='1'){
 const errors=[],need=(yes,key)=>{if(!yes)errors.push(key);};
 let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_runner_report');}
 need(JSON.stringify(report?.case_numbers)==='[249]'&&report?.records?.length===1,'only_original249');
 need(execFileSync('git',['rev-parse','HEAD:'+frozen],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','immutable_original603_csv_blob');
 need(report?.original603_register_sha256===hash(readFileSync(new URL('../../'+frozen,import.meta.url))),'original_csv_sha256');
 need(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_mutation_or_false_global_certification');
 need(report?.source_sha===process.env.DIC_R341_EVENT_SHA,'exact_event_source_sha');
 need(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R341_HEAD_SHA,'exact_runner_checkout');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 need(requiredFocusedSourceFailures([249],report?.records||[]).length===0,'required_official_identity_parser_and_ui');
 let bytes;try{bytes=readFileSync(join(dir,'case-249.html'));}catch{errors.push('missing_official_html');}
 const html=bytes?.toString('utf8')||'',own=selected249(html);
 need(r.official_url===url&&!r.alternate_url_attempted,'only_registered_official_url');
 need(r.status==='FETCHED'&&r.parser_ok===true&&Boolean(bytes?.length)&&r.html_bytes===bytes?.length&&r.html_sha256===hash(bytes||''),'real_source_HTML_SHA');
 need(r.archived_coffee===name&&own.exact&&norm(f.name)===norm(name),'selected_current_H1_identity');
 for(const key of ['ownWashed','ownVariety','ownRoast','ownProducer','ownElevation','ownFlavor','ownChiapas'])need(own[key],'direct_selected_'+key);
 need(f.process==='Washed','washed_not_other_natural_award');
 need(norm(f.roast_level)==='light','exact_selected_roast');
 need(norm(f.variety).includes('gesha'),'exact_selected_variety');
 need(norm(f.origin).includes('mexico'),'selected_country');
 need(norm(f.producer).includes('arguello'),'named_producer_not_generic_farm');
 need(['yellow pear','chamomile','almond','vanilla blossom'].every(x=>norm(f.tasting_notes).includes(x)),'four_selected_tasting_notes');
 need(!f.decaffeination_method,'generic_caffeine_panel_not_decaf_method');
 need(!(r.conflicts||[]).includes('process'),'no_non_selected_award_process_conflict');
 need(!(r.seo_fallback_fields||[]).some(x=>['process','tasting_notes','variety','roast_level','producer'].includes(x)),'no_SEO_substitution');
 need(!/2026/.test(String(f.harvest_year||f.harvest_date||f.harvest||'')),'2026_award_not_selected_harvest');
 const parsed=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
 need(parsed?.ok===true&&norm(parsed.fields?.name)===norm(name)&&parsed.fields?.process==='Washed'&&!parsed.fields?.decaffeination_method,'real_current_parser_replay');
 need(parsed?.ok===true&&coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview')&&
  coffeeSourceReviewSnapshot({...parsed,source_url:r.final_url||url})?.type==='coffee_source_review','AddCoffee_SourceReview_without_save');
 const out={passed:errors.length===0,errors,case:249,source_sha:process.env.DIC_R341_HEAD_SHA,event_sha:process.env.DIC_R341_EVENT_SHA,
  manual_semantic_certified:false,all603_certified:false,
  selected:{url,final_url:r.final_url||null,headings:own.headings,html_bytes:r.html_bytes,html_sha256:r.html_sha256,
   own,fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[],
   historical_awards_not_selected_process:true,current_sale_lot_not_certified:true}};
 writeFileSync(join(dir,'r341-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R341] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
