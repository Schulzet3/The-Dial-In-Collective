#!/usr/bin/env node
// DIC #33 R282: current original535/536 direct selected merchant HTML, NOT a frozen603 manual certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const failures=[],check=(test,reason)=>{if(!test)failures.push(reason)};
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r282';
let report;
try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){failures.push('no_evidence_'+(e.code||e.message))}
check(JSON.stringify(report?.case_numbers)==='[535,536]'&&report?.records?.length===2,'exact_two_selected_originals');
check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_original_csv_unmodified');
check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_global_manual_cert_or_provider_writes');
check(report?.source_sha===process.env.DIC_R282_EVENT_SHA,'exact_event_sha');
check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R282_CHECKOUT_SHA,'exact_checkout_sha');
check(requiredFocusedSourceFailures([535,536],report?.records||[]).length===0,'exact_selected_identity_and_add_coffee_review');
const targets={
 535:{name:'-FIRST CLASS - LAS NUBES WUSH WUSH, RISARALDA, COLOMBIA',url:'https://www.paperplanecoffee.com/products/first-class-las-nubes-wush-wush-risaralda-colombia',
  tokens:['milk chocolate','orange peel','amber honey','pink peppercorn','las nubes','anaerobic fermentation'],notes:['milk chocolate','orange peel','amber honey','pink peppercorn'],reject:['cranberry','blackberry','hibiscus','lavender','strawberry','yuzu','plum'],origin:'colombia',process:'Anaerobic'},
 536:{name:'(micro plane) las lajas, alma negra natural, cost rica',url:'https://www.paperplanecoffee.com/products/micro-plane-las-lajas-alma-negra-natural-cost-rica',
  tokens:['dried cranberry','blackberry','hibiscus','lavender','finca mirella','alma negra natural'],notes:['cranberry','blackberry','hibiscus','lavender'],reject:['pink peppercorn','amber honey','orange peel','yuzu','plum'],origin:'costa rica',process:'Natural'}
};
const evidence=[];
for(const n of [535,536]){
 const t=targets[n],r=report?.records?.find(x=>x.number===n)||{},f=r.current_fields||{};
 let raw;try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch(e){failures.push(n+'_raw_source_missing_'+(e.code||e.message))}
 const selected=productMarkup(raw?.toString('utf8')||'');
 const headings=selectedProductHeadings(selected);
 const visible=selected.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
 let u;try{u=new URL(r.final_url)}catch{}
 check(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===t.url,n+'_guarded_selected_fetched_parsed');
 check(u?.protocol==='https:'&&u.hostname==='www.paperplanecoffee.com'&&u.pathname===new URL(t.url).pathname,n+'_exact_original_selected_url');
 check(raw?.length>0&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,n+'_independent_raw_sha256');
 const permittedHeadings=n===536?[t.name,'MICRO PLANE – LAS LAJAS ALMA NEGRA, COSTA RICA']:[t.name];
 check(headings.length>0&&headings.includes(t.name)&&headings.every(h=>permittedHeadings.includes(h))&&f.name===t.name&&r.archived_coffee===t.name,n+'_current_direct_h1_identity');
 check(t.tokens.every(x=>visible.includes(x)),n+'_direct_selected_literal_source');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,n+'_editable_add_coffee_and_review');
 check(String(f.origin||'').toLowerCase().includes(t.origin),n+'_selected_country');
 for(const x of t.notes)check(String(f.tasting_notes||'').toLowerCase().includes(x),n+'_selected_flavor_'+x.replace(/\s/g,'_'));
 for(const x of t.reject)check(!String(f.tasting_notes||'').toLowerCase().includes(x),n+'_no_neighbor_or_locale_flavor_'+x.replace(/\s/g,'_'));
 check(f.process===t.process,n+'_selected_process');
 check(!f.decaffeination_method&&!String(f.release_label||'').includes('2026'),n+'_no_fake_decaf_or_current_harvest');
 check((r.conflicts||[]).length===0,n+'_no_source_conflict');
 if(n===535)check(String(f.variety||'').toLowerCase().includes('wush wush'),n+'_selected_wush_wush');
 if(n===536){
  check(String(f.producer||'').toLowerCase().includes('oscar'),n+'_named_selected_producer');
  check(!/^(?:caturra,\s*catuai,\s*bourbon)/i.test(String(f.variety||'')),n+'_no_likely_cultivars_as_certain');
 }
 evidence.push({number:n,status:r.status,raw_html_bytes:r.html_bytes,raw_html_sha256:r.html_sha256,selected_h1:headings,selected_current_fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]});
}
const out={passed:failures.length===0,errors:failures,event_sha:process.env.DIC_R282_EVENT_SHA,checkout_sha:process.env.DIC_R282_CHECKOUT_SHA,manual_certified:0,production_operations:0,records:evidence};
writeFileSync(join(dir,'r282-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R282 AFTERPROOF] '+JSON.stringify(out));
if(failures.length)process.exitCode=1;
