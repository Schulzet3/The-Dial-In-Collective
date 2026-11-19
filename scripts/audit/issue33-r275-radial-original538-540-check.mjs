#!/usr/bin/env node
// Issue33 R275: current official selected Radial page truth takes precedence over recycled country URL slugs.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const norm=v=>String(v||'').normalize('NFKC').replace(/\s+/g,' ').trim();
const domain='https://www.radialcoffee.com',directory=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r275';
const targets={
 538:{name:'Guatemala — Pablo & Eva Del Cid',path:'/products/colombia-pablo-eva-del-cid',country:'Guatemala',notCountry:'Colombia',words:['washed process','light roast','pablo del cid','guatemala','praline','nougat','raspberry']},
 540:{name:'Colombia — Inza Decaf',path:'/products/guatemala',country:'Colombia',notCountry:'Guatemala',words:['washed process','medium roast','inza','colombia','dark chocolate','cherries','raisins']}
};
const errors=[],ok=(condition,key)=>{if(!condition)errors.push(key);};
let report,bytes;
try{bytes=readFileSync(join(directory,'focused-current-evidence.json'));report=JSON.parse(bytes);}catch(e){errors.push('report_'+(e.code||e.message));}
ok(JSON.stringify(report?.case_numbers)==='[538,540]'&&report?.records?.length===2,'exact_two_selected_originals');
ok(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','unchanged_original_csv');
ok(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_false_global_certification');
ok(report?.source_sha===process.env.DIC_R275_EVENT_SHA,'event_bound');
ok(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R275_CHECKOUT_SHA,'checkout_bound');
const results=[];
for(const n of [538,540]){
 const t=targets[n],r=report?.records?.find(v=>v.number===n)||{},f=r.current_fields||{};
 let raw;try{raw=readFileSync(join(directory,'case-'+n+'.html'));}catch(e){errors.push(n+'_raw_'+(e.code||e.message));}
 const own=productMarkup(raw?.toString('utf8')||''),h1=selectedProductHeadings(own);
 const words=own.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
 let url;try{url=new URL(r.final_url)}catch{}
 ok(r.official_url===domain+t.path&&r.status==='FETCHED'&&r.parser_ok===true,n+'_original_fetched_parsed');
 ok(url?.protocol==='https:'&&url.hostname==='www.radialcoffee.com'&&url.pathname===t.path,n+'_redirect_same_exact_selected');
 ok(raw?.length>0&&raw.length===r.html_bytes&&hash(raw)===r.html_sha256,n+'_raw_html_sha256');
 ok(h1.length===1&&norm(h1[0])===norm(t.name)&&norm(f.name)===norm(t.name)&&norm(r.archived_coffee)===norm(t.name),n+'_h1_current_selected_identity');
 ok(requiredFocusedSourceFailures([n],[r]).length===0,n+'_identity_preview_and_source_review');
 ok(t.words.every(w=>words.includes(w)),n+'_direct_selected_source_words');
 ok(String(f.origin||'').toLowerCase().includes(t.country.toLowerCase()),n+'_selected_country');
 ok(!new RegExp(t.notCountry,'i').test(String(f.origin||'')),n+'_old_slug_country_not_in_origin');
 ok(!/mango|hibiscus/i.test(String(f.tasting_notes||'')),n+'_no_sibling_tasting');
 ok(!f.decaffeination_method&&!f.elevation_m&&!f.variety,n+'_do_not_invent_unpublished_values');
 if(n===538){
  ok(f.process==='Washed'&&f.roast_level==='Light',n+'_washed_light');
  ok(['praline','nougat','raspberry'].every(w=>String(f.tasting_notes||'').toLowerCase().includes(w)),n+'_selected_tasting');
 }else{
  ok(f.process==='Washed'&&f.roast_level==='Medium',n+'_washed_medium');
  ok(['dark chocolate','cherr','raisin'].every(w=>String(f.tasting_notes||'').toLowerCase().includes(w)),n+'_selected_tasting');
  ok(!/red fox/i.test(String(f.producer||'')),n+'_importer_not_farmer');
 }
 results.push({number:n,url:r.final_url,html_bytes:raw?.length||0,html_sha256:raw?hash(raw):null,h1,fields:f,conflicts:r.conflicts||[],add_coffee:r.add_coffee_ui_rendered,source_review:r.source_review_rendered});
}
const out={source_sha:report?.source_sha,checkout_sha:process.env.DIC_R275_CHECKOUT_SHA,report_sha256:bytes?hash(bytes):null,cases:results,passed:!errors.length,errors,manual_certified:0,production_operations:0};
writeFileSync(join(directory,'r275-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R275 RADIAL 538/540] '+JSON.stringify(out));
if(errors.length)process.exitCode=1;
