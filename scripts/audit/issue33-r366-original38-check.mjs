#!/usr/bin/env node
// Issue #33 original603 #38: exact selected Ethiopia Natural source semantics.
// A washing station is not proof that the station owns or grows this lot.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';

export const selectedUrl='https://brewtusroasting.com/products/ethiopia-natural';
export const selectedName='Ethiopia Natural';
export const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=x=>createHash('sha256').update(x).digest('hex');
export function selected38(html){
 const own=productMarkup(String(html||'')),h1=selectedProductHeadings(own);
 const prose=norm(own.replace(/<(script|style|noscript|nav|aside|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]{0,2000}>/g,' '));
 return {h1,identity:h1.length===1&&norm(h1[0])===norm(selectedName),
  exactNaturalLot:prose.includes('latest natural lot from the renowned shantawane washing station in sidama ethiopia'),
  directElevation:prose.includes('between 2000 and 2200 meters above sea level'),
  stationPaysFarmers:prose.includes('shantawane washing station')&&prose.includes('paying premiums to smallholder farmers'),
  selectedVillages:prose.includes('nearby villages of shantawene and bombe'),
  directRoast:prose.includes('this natural lot is lightly roasted'),
  directSensory:prose.includes('strawberry peach and brown sugar')};
}
export function unsafe38Fields(fields={}){
 const origin=norm(fields.origin),notes=norm(fields.tasting_notes),elevation=norm(fields.elevation_m),producer=norm(fields.producer);
 return norm(fields.name)!==norm(selectedName)||
  !origin.includes('sidama')||!origin.includes('ethiopia')||
  norm(fields.process)!=='natural'||norm(fields.roast_level)!=='light'||
  !['strawberry','peach','brown sugar'].every(x=>notes.includes(x))||
  !elevation.includes('2000')||!elevation.includes('2200')||
  (Boolean(producer)&&(!producer.includes('smallholder')||/shantawane|washing|station/.test(producer)))||
  Boolean(fields.decaffeination_method||fields.release_label||fields.espresso_recipe);
}
if(process.env.DIC_R366_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r366',errors=[];
 const ck=(v,k)=>{if(!v)errors.push(k)};
 let e={},buf;
 try{e=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch{errors.push('collector_missing')}
 try{buf=readFileSync(join(dir,'case-38.html'))}catch{errors.push('official_html_missing')}
 const rec=e.records?.[0]||{},html=buf?.toString('utf8')||'',source=selected38(html),fields=rec.current_fields||{};
 ck(JSON.stringify(e.case_numbers)==='[38]'&&e.records?.length===1,'one_selected_38');
 ck(requiredFocusedSourceFailures([38],e.records||[]).length===0,'official_identity_parser_ui');
 ck(rec.official_url===selectedUrl&&rec.status==='FETCHED'&&!rec.alternate_url_attempted,'exact_original_selected_url');
 ck(buf?.length>1000&&rec.html_bytes===buf?.length&&rec.html_sha256===hash(buf||''),'original_raw_html_sha');
 ck(source.identity&&rec.selected_heading_identity_verified&&norm(fields.name)===norm(selectedName),'current_selected_H1');
 ck(source.exactNaturalLot&&source.directElevation&&source.stationPaysFarmers&&source.selectedVillages&&source.directRoast&&source.directSensory,'first_party_selected_literal_evidence');
 ck(!unsafe38Fields(fields),'selected_facts_no_station_as_grower_or_invented_release');
 ck(e.manual_certified===0&&!e.original_corpus_modified&&e.production_operations===0,'original603_immutable_no_production');
 ck(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R366_HEAD_SHA&&
    process.env.GITHUB_SHA===process.env.DIC_R366_EVENT_SHA&&e.source_sha===process.env.DIC_R366_EVENT_SHA,'exact_checkout_event_sha');
 ck(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','original603_CSV_blob_preserved');
 let parsed={};
 try{parsed=extractPublicCoffeeFacts(html,{source_url:rec.final_url||selectedUrl})}catch{errors.push('parser_exception')}
 ck(parsed?.ok&&norm(parsed.fields?.name)===norm(selectedName)&&
    coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview')&&
    coffeeSourceReviewSnapshot({...parsed,source_url:rec.final_url||selectedUrl})?.type==='coffee_source_review',
    'current_parser_two_readonly_ui_surfaces');
 ck(!unsafe38Fields(parsed?.fields||{}),'actual_parser_semantics_safe');
 const output={passed:!errors.length,errors,source_sha:process.env.DIC_R366_HEAD_SHA,
  event_sha:process.env.DIC_R366_EVENT_SHA,source,raw_html_bytes:buf?.length||0,
  raw_html_sha256:buf?hash(buf):null,fields,parser_fields:parsed?.fields||{},conflicts:rec.conflicts||[],
  member_save:false,full603_manual_certification:false};
 writeFileSync(join(dir,'r366-afterproof.json'),JSON.stringify(output,null,2)+'\n');
 console.log('[DIC33 R366 original38] '+JSON.stringify(output));
 if(errors.length)process.exitCode=1;
}
