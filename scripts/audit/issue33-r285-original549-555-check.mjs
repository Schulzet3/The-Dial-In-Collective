#!/usr/bin/env node
// Selected current primary source exact bytes / parser / Source Review afterproof.
// Never upgrades all 603 cases to manual semantic certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r285';
const errors=[],must=(ok,key)=>{if(!ok)errors.push(key)};
let report;
try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){errors.push('missing_public_report_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)===JSON.stringify([549,555])&&report?.records?.length===2,'exact_two_original_cases');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_csv');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_603_or_provider_certification');
must(report?.source_sha===process.env.DIC_R285_EVENT_SHA,'exact_event_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R285_CHECKOUT_SHA,'exact_checkout_sha');
must(requiredFocusedSourceFailures([549,555],report?.records||[]).length===0,'selected_source_identity_parser_and_ui');
const targets={
 549:{name:'Tanzania Peaberry',url:'https://www.realdope.coffee/products/tanazania-peaberry',host:'www.realdope.coffee',tokens:['tanzania peaberry','earth','fruity','cacao','dark']},
 555:{name:'Organic Timor',url:'https://www.roc2.com/products/organic-timor',host:'www.roc2.com',tokens:['organic timor','medium roast','pineapple','fresh orange juice','raw sugar']}
};
const evidence=[];
for(const n of [549,555]){
 const t=targets[n],r=report?.records?.find(x=>x.number===n)||{},f=r.current_fields||{};
 let raw;
 try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch(e){errors.push(n+'_missing_raw_'+(e.code||e.message))}
 let url;try{url=new URL(r.final_url)}catch{}
 const scoped=productMarkup(raw?.toString('utf8')||'');
 const selected=selectedProductHeadings(scoped);
 const visible=scoped.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
 must(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===t.url,n+'_live_public_selected_parser');
 must(url?.protocol==='https:'&&url.hostname===t.host&&url.pathname===new URL(t.url).pathname,n+'_exact_original_url_no_replacement');
 must(raw?.length>0&&raw.length===r.html_bytes&&hash(raw)===r.html_sha256,n+'_raw_selected_byte_hash');
 must(selected.length===1&&selected[0]===t.name&&f.name===t.name&&r.archived_coffee===t.name,n+'_one_exact_h1');
 must(t.tokens.every(w=>visible.includes(w)),n+'_selected_literal_source_evidence');
 must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,n+'_explicit_editable_add_and_review');
 must(!f.decaffeination_method,n+'_no_other_coffee_decaf_method');
 const notes=String(f.tasting_notes||'').toLowerCase();
 must(!(r.conflicts||[]).includes('tasting_notes'),n+'_no_false_notes_conflict');
 if(n===549){
  must(/tanzania/i.test(String(f.origin||'')),n+'_current_tanzania');
  must(/dark/i.test(String(f.roast_level||'')),n+'_direct_dark_roast');
  for(const w of ['earth','fruit','cacao'])must(notes.includes(w),n+'_selected_'+w);
  must(!/southern highlands/i.test(String(f.origin||'')),n+'_no_historical_unsourced_region');
  must(!/jasmine|raspberry|papaya/i.test(notes),n+'_no_sibling_notes');
 }else{
  must(/timor/i.test(String(f.origin||'')),n+'_selected_timor_origin');
  must(/^medium$/i.test(String(f.roast_level||'').trim()),n+'_literal_medium_roast');
  for(const w of ['pineapple','fresh orange juice','raw sugar'])must(notes.includes(w),n+'_literal_'+w.replace(/ /g,'_'));
  must(!/molasses|lemongrass|mango/i.test(notes),n+'_no_neighboring_roc2_notes');
 }
 evidence.push({number:n,source_url:r.final_url,raw_bytes:r.html_bytes,raw_sha256:r.html_sha256,selected_h1:selected,fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]});
}
const out={passed:errors.length===0,errors,event_sha:process.env.DIC_R285_EVENT_SHA,checkout_sha:process.env.DIC_R285_CHECKOUT_SHA,manual_certified:0,production_operations:0,records:evidence};
writeFileSync(join(dir,'r285-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R285 AFTERPROOF] '+JSON.stringify(out));
if(errors.length)process.exitCode=1;
