#!/usr/bin/env node
// Issue33 R281: exact current selected ROC2 source, not blanket frozen603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const errors=[],check=(v,k)=>{if(!v)errors.push(k)};
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r281';
let report;
try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){errors.push('no_evidence_'+(e.code||e.message))}
check(JSON.stringify(report?.case_numbers)==='[553,555]'&&report?.records?.length===2,'original_exact_two');
check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','unchanged_original_csv');
check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_global_cert_or_provider_writes');
check(report?.source_sha===process.env.DIC_R281_EVENT_SHA,'exact_event');
check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R281_CHECKOUT_SHA,'exact_checkout');
check(requiredFocusedSourceFailures([553,555],report?.records||[]).length===0,'source_identity_preview_and_review');
const targets={
 553:{name:'Organic Honduras',url:'https://www.roc2.com/products/organic-honduras',tokens:['sweet medium roast','honey','caramel','chocolate','honduras'],
      notes:['honey','caramel','chocolate'],other:['pineapple','orange juice','raw sugar']},
 555:{name:'Organic Timor',url:'https://www.roc2.com/products/organic-timor',tokens:['single-origin medium roast','pineapple','fresh orange juice','raw sugar','timor'],
      notes:['pineapple','orange juice','raw sugar'],other:['honey','caramel','chocolate']}
};
const evidence=[];
for(const n of [553,555]){
 const t=targets[n],r=report?.records?.find(x=>x.number===n)||{},f=r.current_fields||{};
 let raw;try{raw=readFileSync(join(dir,'case-'+n+'.html'))}
 catch(e){errors.push(n+'_source_missing_'+(e.code||e.message))}
 const selected=productMarkup(raw?.toString('utf8')||''),h1=selectedProductHeadings(selected);
 const visible=selected.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
 let final;try{final=new URL(r.final_url)}catch{}
 check(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===t.url,n+'_fetched_and_parsed');
 check(final?.protocol==='https:'&&final.hostname==='www.roc2.com'&&final.pathname===new URL(t.url).pathname,n+'_same_selected_url');
 check(raw?.length>0&&raw.length===r.html_bytes&&hash(raw)===r.html_sha256,n+'_byte_bound_html');
 check(h1.length===1&&h1[0]===t.name&&f.name===t.name&&r.archived_coffee===t.name,n+'_exact_selected_product_identity');
 check(t.tokens.every(token=>visible.includes(token)),n+'_selected_source_literals');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,n+'_member_editable_preview_and_review');
 check(f.roast_level==='Medium',n+'_direct_current_roast');
 check(new RegExp(n===553?'honduras':'timor','i').test(String(f.origin||'')),n+'_own_country');
 for(const token of t.notes)check(String(f.tasting_notes||'').toLowerCase().includes(token),n+'_direct_taste_'+token.replace(/\s+/g,'_'));
 for(const token of t.other)check(!String(f.tasting_notes||'').toLowerCase().includes(token),n+'_no_other_coffee_'+token.replace(/\s+/g,'_'));
 check(!f.producer&&!f.process&&!f.decaffeination_method&&!f.release_label&&!f.elevation_m,n+'_no_unpublished_field_invention');
 check((r.conflicts||[]).length===0,n+'_no_false_source_conflict');
 evidence.push({number:n,status:r.status,bytes:r.html_bytes,source_sha256:r.html_sha256,selected_h1:h1,current_fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]});
}
const out={passed:errors.length===0,errors,event_sha:process.env.DIC_R281_EVENT_SHA,checkout_sha:process.env.DIC_R281_CHECKOUT_SHA,manual_certified:0,production_operations:0,records:evidence};
writeFileSync(join(dir,'r281-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R281 AFTERPROOF] '+JSON.stringify(out));
if(errors.length)process.exitCode=1;
