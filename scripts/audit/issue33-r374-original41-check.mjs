#!/usr/bin/env node
// #33 R374: one original603 #41 official selected product; no real member/add writes.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
const url='https://brickhouseroasters.com/products/descafeinado';
const name='Descafeinado';
const hash=x=>createHash('sha256').update(x).digest('hex');
export function selected41(html){
 const own=productMarkup(String(html||''));
 const h1=selectedProductHeadings(own);
 const body=own.replace(/<(?:script|style|noscript|nav|aside|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:rsquo|ldquo|rdquo|nbsp);/gi,' ')
  .replace(/\s+/g,' ').trim();
 return {h1,identity:h1.length===1&&h1[0]===name,
  currentCaneRemoval:/we[’']ve stripped this bean of its caffeine content through a natural sugar cane process/i.test(body),
  selectedTypo:/processing method\s+sugan cane/i.test(body),
  selectedColombia:/country of origin\s+colombia/i.test(body),
  currentDecafRhetoric:/is this really decaf/i.test(body)};
}
if(process.env.DIC_R374_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r374';
 const errors=[],ck=(v,s)=>{if(!v)errors.push(s)};
 let evidence={},bytes;
 try{evidence=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch{errors.push('missing_collector_json')}
 try{bytes=readFileSync(join(dir,'case-41.html'))}catch{errors.push('missing_official_raw_html')}
 const r=evidence.records?.[0]||{},html=bytes?.toString('utf8')||'',own=selected41(html);
 ck(JSON.stringify(evidence.case_numbers)==='[41]'&&evidence.records?.length===1,'exact_single_case41');
 ck(requiredFocusedSourceFailures([41],evidence.records||[]).length===0,'original_selected_H1_parser_and_both_UI');
 ck(r.status==='FETCHED'&&r.official_url===url&&r.final_url===url&&!r.alternate_url_attempted,
  'exact_original_official_selected_url_not_replaced');
 ck(bytes?.length>1500&&r.html_bytes===bytes?.length&&r.html_sha256===hash(bytes||''),'real_source_bytes_and_sha256');
 ck(own.identity&&own.currentCaneRemoval&&own.selectedTypo&&own.selectedColombia,
  'selected_H1_and_seller_own_product_description_cane_country_profile');
 ck(evidence.manual_certified===0&&!evidence.original_corpus_modified&&evidence.production_operations===0,
  'no_member_operation_or_original603_certification');
 ck(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R374_HEAD_SHA&&
  evidence.source_sha===process.env.DIC_R374_EVENT_SHA&&process.env.GITHUB_SHA===process.env.DIC_R374_EVENT_SHA,
  'exact_checkout_event_source');
 ck(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6',
  'immutable_original603_csv_blob');
 let parsed={};try{parsed=extractPublicCoffeeFacts(html,{source_url:r.final_url||url})}catch{errors.push('actual_parser_threw')}
 ck(parsed.ok&&parsed.fields?.name===name&&coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview')&&
  coffeeSourceReviewSnapshot({...parsed,source_url:r.final_url||url})?.type==='coffee_source_review',
  'independently_replayed_parser_and_no_save_member_interfaces');
 const out={passed:errors.length===0,errors,source_sha:process.env.DIC_R374_HEAD_SHA,event_sha:process.env.DIC_R374_EVENT_SHA,
  official_url:url,html_sha256:bytes?hash(bytes):null,html_bytes:bytes?.length||0,
  selected_direct:own,collector_fields:r.current_fields||{},actual_parser_fields:parsed.fields||{},
  actual_conflicts:parsed.conflicts||[],decaffeination_method_verified:false,
  method_candidate_gap:own.currentCaneRemoval&&parsed.fields?.decaffeination_method!=='Sugar Process',
  full603_manual_certification:false,member_save:false};
 writeFileSync(join(dir,'r374-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R374 ORIGINAL41 SOURCE DIAGNOSTIC] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
