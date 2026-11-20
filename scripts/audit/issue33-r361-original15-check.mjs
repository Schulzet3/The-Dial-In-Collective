#!/usr/bin/env node
// #33 original603 #15: exact selected Beanstock Gesha despite recycled former holiday coffee handle.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';

export const selectedUrl='https://beanstockcoffee.com/products/last-roast-holiday-roast-2-el-salvador-finca-los-angeles-pacamara-black-honey-process-copy';
export const selectedName='Colombia Gesha Natural Lisandro Cardenas Finca Las Brisas';
export const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=x=>createHash('sha256').update(x).digest('hex');

export function selected15(html){
 const own=productMarkup(String(html||''));
 const headings=selectedProductHeadings(own);
 const text=norm(own.replace(/<(script|style|noscript|template|nav|aside|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
   .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {headings,
   exact:headings.length===1&&(norm(headings[0])===norm(selectedName)||
    headings[0]==='Last Roast!! '+selectedName),
   currentNarrative:text.includes('you asked and we answered')&&text.includes('gesha from our 2026 good food awards producer'),
   directTasting:text.includes('notes of cranberry and lychee')&&text.includes('caramelized sugar'),
   directProducer:text.includes('lisandro cardenas')&&text.includes('inherited being a producer'),
   retiredHolidayNotEvidence:!text.includes('el salvador finca los angeles pacamara black honey')
 };
}
if(process.env.DIC_R361_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r361',errors=[];
 const check=(ok,key)=>{if(!ok)errors.push(key);};
 let evidence={};try{evidence=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_focused_current_evidence');}
 let buf;try{buf=readFileSync(join(dir,'case-15.html'));}catch{errors.push('missing_raw_selected_html');}
 const r=evidence.records?.[0]||{},f=r.current_fields||{},own=selected15(buf?.toString('utf8')||'');
 check(JSON.stringify(evidence.case_numbers)==='[15]'&&evidence.records?.length===1,'only_original15');
 check(requiredFocusedSourceFailures([15],evidence.records||[],{negativeIdentityNumbers:[15]}).length===0,
   'strict_official_source_CHANGED_identity_negative_parser_UI');
 check(r.status==='FETCHED'&&r.official_url===selectedUrl&&!r.alternate_url_attempted,'exact_original_official_url');
 check(buf?.length>1000&&r.html_bytes===buf.length&&r.html_sha256===hash(buf),'actual_raw_html_SHA256');
 check(own.exact&&own.headings[0]==='Last Roast!! '+selectedName&&
   r.selected_heading_identity_verified===false&&r.original_product_not_certified===true&&
   r.current_identity_exception==='CHANGED_SELECTED_PRODUCT_EXPLICIT_NEGATIVE_DO_NOT_TRANSFER_ARCHIVED_FIELDS'&&
   norm(f.name)===norm(own.headings[0]),'selected_last_roast_CHANGED_H1_negative_no_original_identity_transfer');
 check(own.currentNarrative&&own.directTasting&&own.directProducer,'selected_product_direct_description_and_notes');
 check(own.retiredHolidayNotEvidence,'no_retired_holiday_coffee_prose');
 check(['cranberry','lychee','caramelized sugar'].every(n=>norm(f.tasting_notes).includes(n)),'direct_current_three_tasting_notes');
 check(!f.roast_level&&!f.decaffeination_method&&!f.release_label,'no_unsupported_roast_decaf_or_award_year_as_release');
 check(!f.producer||norm(f.producer).includes('lisandro cardenas'),'no_other_producer_invention');
 check(!f.variety||norm(f.variety).includes('gesha'),'no_other_variety_invention');
 check(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_retired_SEO_sensory_transfer');
 check(evidence.manual_certified===0&&evidence.original_corpus_modified===false&&evidence.production_operations===0,'no_manual603_or_provider_operations');
 check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R361_HEAD_SHA&&
    evidence.source_sha===process.env.DIC_R361_EVENT_SHA&&process.env.GITHUB_SHA===process.env.DIC_R361_EVENT_SHA,
    'actual_event_checkout_source');
 check(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','untouched_frozen_603_CSV');
 const p=extractPublicCoffeeFacts(buf?.toString('utf8')||'',{source_url:r.final_url||selectedUrl});
 check(p?.ok===true&&norm(p.fields?.name)===norm(own.headings[0])&&
   coffeeUrlPreviewMarkup(p).includes('coffee-url-preview')&&
   coffeeSourceReviewSnapshot({...p,source_url:r.final_url||selectedUrl})?.type==='coffee_source_review',
   'actual_current_parser_AddCoffee_SourceReview_nosave');
 const out={passed:errors.length===0,errors,source_sha:process.env.DIC_R361_HEAD_SHA,event_sha:process.env.DIC_R361_EVENT_SHA,
  case:15,official_url:r.official_url,current_selected:own,html_bytes:buf?.length||0,
  html_sha256:buf?hash(buf):null,fields:f,conflicts:r.conflicts||[],source_facts:(r.source_facts||[]).slice(0,24),
  manually_certified_all603:false,member_save:false};
 writeFileSync(join(dir,'r361-original15-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R361] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}