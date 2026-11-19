#!/usr/bin/env node
// R284 current EXACT official-source afterproof; no global 603 manual certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const digest=x=>createHash('sha256').update(x).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r284';
const errors=[],must=(ok,key)=>{if(!ok)errors.push(key)};
let report;
try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){errors.push('public_report_missing_'+(e.code||e.message))}
const nums=[546,547,548];
must(JSON.stringify(report?.case_numbers)===JSON.stringify(nums)&&report?.records?.length===3,'exact_three_case_subset');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original_csv_unchanged');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_global_cert_or_provider_mutation');
must(report?.source_sha===process.env.DIC_R284_EVENT_SHA,'event_sha_exact');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R284_CHECKOUT_SHA,'checkout_sha_exact');
must(requiredFocusedSourceFailures(nums,report?.records||[]).length===0,'every_original_selected_identity_parser_and_ui');
const targets={
 546:{name:'Venezuela',url:'https://www.readingcoffee.com/products/venezuela-finca-berlin-single-origin-coffee',host:'www.readingcoffee.com',tokens:['finca berlin','alfredo rojas','anaerobic honey','monte claro','fresh coffee cherry','dried cascara','mellow cocoa','warm spice']},
 547:{name:'Burundi Kibingo',url:'https://www.realdope.coffee/products/burundi-kibingo',host:'www.realdope.coffee',tokens:['kibingo','burundi','gently tart','mellow cocoa','smooth finish']},
 548:{name:'Rwanda Isimbi (S.O.P)',url:'https://www.realdope.coffee/products/rawandan-isimni',host:'www.realdope.coffee',tokens:['isimbi','rwanda','cocoa','jasmine','juicy fruit','chocolate','nutty finish']}
};
const evidence=[];
for(const n of nums){
 const t=targets[n],r=report?.records?.find(x=>x.number===n)||{},f=r.current_fields||{};
 let raw;try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch(e){errors.push(n+'_raw_html_missing_'+(e.code||e.message))}
 const selected=productMarkup(raw?.toString('utf8')||''),head=selectedProductHeadings(selected);
 const visible=selected.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
 let u;try{u=new URL(r.final_url)}catch{}
 must(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===t.url,n+'_live_official_parser');
 must(u?.protocol==='https:'&&u.hostname===t.host&&u.pathname===new URL(t.url).pathname,n+'_no_replaced_slug_redirect');
 must(raw?.length>0&&raw.length===r.html_bytes&&digest(raw)===r.html_sha256,n+'_actual_raw_source_hash');
 must(head.length===1&&head[0]===t.name&&f.name===t.name&&r.archived_coffee===t.name,n+'_one_exact_selected_h1');
 must(t.tokens.every(w=>visible.includes(w)),n+'_direct_current_selected_source_literals');
 must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,n+'_editable_explicit_add_and_review');
 must(!f.decaffeination_method,n+'_no_sidebar_or_optional_decaf');
 must(!/papaya|raspberry|swiss water/i.test(String(f.tasting_notes||'')),n+'_no_sibling_notes');
 must(!(r.conflicts||[]).includes('tasting_notes'),n+'_direct_selected_tasting_not_false_conflict');
 if(n===546){
  must(/venezuela/i.test(String(f.origin||''))&&/t.chira|tachira|táchira/i.test(String(f.origin||'')),n+'_selected_geography');
  must(/alfredo rojas/i.test(String(f.producer||'')),n+'_direct_named_producer');
  must(/anaerobic/i.test(String(f.process||'')),n+'_anaerobic_honey');
  must(/monte claro/i.test(String(f.variety||'')),n+'_direct_variety');
  must(/1100/.test(String(f.elevation_m||'')),n+'_published_elevation');
  for(const w of ['fresh coffee cherry','dried cascara','mellow cocoa','warm spice'])must(String(f.tasting_notes||'').toLowerCase().includes(w),n+'_own_note_'+w.replace(/\s/g,'_'));
  must(!/september|january/i.test(String(f.release_label||'')),n+'_harvest_window_not_release_date');
 } else {
  must(/medium/i.test(String(f.roast_level||''))&&!/medium-light/i.test(String(f.roast_level||'')),n+'_medium_roast_not_body');
  must(new RegExp(n===547?'burundi':'rwanda','i').test(String(f.origin||'')),n+'_selected_origin');
  const notes=n===547?['gently tart','mellow cocoa','smooth finish']:['cocoa','jasmine','juicy fruit','chocolate','nutty finish'];
  for(const w of notes)must(String(f.tasting_notes||'').toLowerCase().includes(w),n+'_own_note_'+w.replace(/\s/g,'_'));
  must(!/customer|delicious|coffee infused|ethiopian dripp/i.test(String(f.tasting_notes||'')),n+'_no_reviews_cross_product');
 }
 evidence.push({number:n,source_url:r.final_url,raw_bytes:r.html_bytes,raw_sha256:r.html_sha256,selected_h1:head,fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]});
}
const out={passed:errors.length===0,errors,source_sha:process.env.DIC_R284_EVENT_SHA,checkout_sha:process.env.DIC_R284_CHECKOUT_SHA,manual_certified:0,production_operations:0,records:evidence};
writeFileSync(join(dir,'r284-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R284 AFTERPROOF] '+JSON.stringify(out));
if(errors.length)process.exitCode=1;
