#!/usr/bin/env node
// R276 independent selected Rally afterproof, never a universal 603 signoff.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r276',errors=[];
const must=(ok,key)=>{if(!ok)errors.push(key)};
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch(e){errors.push('missing_report_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[541,542]'&&report?.records?.length===2,'exact_originals');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_frozen_csv');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_global_certification_or_provider_changes');
must(report?.source_sha===process.env.DIC_R276_EVENT_SHA,'event_source');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R276_CHECKOUT_SHA,'checkout_source');
const targets={
 541:{name:'Costa Rica Las Lajas',url:'https://www.rallycoffee.co/products/costa-rica-las-lajas',country:'Costa Rica',process:'Natural',tokens:['las lajas','oscar','francisca','perla negra','natural-process']},
 542:{name:'Ethiopia Refisa',url:'https://www.rallycoffee.co/products/ethiopia-refisa',country:'Ethiopia',process:'Washed',tokens:['ethiopia refisa','west arsi','testi','850','washed']}
};
const records=[];
for(const n of [541,542]){
 const t=targets[n],r=report?.records?.find(x=>x.number===n)||{},f=r.current_fields||{};
 let raw;try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch(e){errors.push(n+'_raw_missing_'+(e.code||e.message))}
 const scoped=productMarkup(raw?.toString('utf8')||''),h=selectedProductHeadings(scoped);
 const text=scoped.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
 must(r.official_url===t.url&&r.status==='FETCHED'&&r.parser_ok===true,n+'_fetched_and_parsed');
 let final;try{final=new URL(r.final_url)}catch{}
 must(final?.hostname==='www.rallycoffee.co'&&final.protocol==='https:'&&final.pathname===new URL(t.url).pathname,n+'_exact_url');
 must(raw?.length>0&&raw.length===r.html_bytes&&hash(raw)===r.html_sha256,n+'_raw_sha256');
 must(h.length===1&&h[0]===t.name&&f.name===t.name&&r.archived_coffee===t.name,n+'_selected_identity');
 must(requiredFocusedSourceFailures([n],[r]).length===0,n+'_source_review_and_add_coffee');
 must(t.tokens.every(x=>text.includes(x)),n+'_direct_description');
 must(String(f.origin||'').includes(t.country),n+'_source_origin');
 must(f.process===t.process,n+'_source_process');
 must(!f.decaffeination_method&&!f.elevation_m,n+'_do_not_invent_methods_elevation');
 if(n===541)must(/oscar/i.test(f.producer||'')&&/francisca/i.test(f.producer||''),n+'_selected_named_producers');
 else must(!/testi.*station/i.test(f.producer||''),n+'_washing_station_not_farmer');
 records.push({number:n,status:r.status,source_sha256:r.html_sha256,selected_h1:h,observed:f,review_scope:'two_selected_current_products_only'});
}
const out={passed:errors.length===0,errors,event_sha:process.env.DIC_R276_EVENT_SHA,checkout_sha:process.env.DIC_R276_CHECKOUT_SHA,manual_certified:0,production_operations:0,records};
writeFileSync(join(dir,'r276-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R276 AFTERPROOF] '+JSON.stringify(out));
if(errors.length)process.exitCode=1;