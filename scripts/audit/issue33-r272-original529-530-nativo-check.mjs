#!/usr/bin/env node
// #33 R272: two exact original603 Nativo selected official sources, not universal certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const digest=x=>createHash('sha256').update(x).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r272';
const spec={
 529:{name:'EQUILIBRIO, Medium Roast, 12oz',slug:'equilibrio-medium-roast',notes:['berries','pineapple','chocolate'],other:['honey','hazelnut']},
 530:{name:'SUAVIDAD, Medium Roast, 12 oz',slug:'suavidad-medium-roast',notes:['cocoa','honey','hazelnut'],other:['pineapple','berries']}
};
const errors=[],check=(v,key)=>{if(!v)errors.push(key);};
let data,report;
try{data=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(data);}catch(e){errors.push('report_'+e.code);}
check(JSON.stringify(report?.case_numbers)==='[529,530]'&&report?.records?.length===2,'exact_two_originals');
check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original_frozen_register');
check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_mass_certification_or_mutation');
check(report?.source_sha===process.env.DIC_R272_EVENT_SHA,'event_sha');
check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R272_CHECKOUT_SHA,'checkout_sha');
const result=[];
for(const number of [529,530]){
 const s=spec[number],r=report?.records?.find(x=>x.number===number)||{},f=r.current_fields||{};
 const expectedUrl='https://www.nativocoffeeroasters.com/products/'+s.slug;
 let raw;try{raw=readFileSync(join(dir,'case-'+number+'.html'));}catch(e){errors.push(number+'_html_'+e.code);}
 let u;try{u=new URL(r.final_url);}catch{}
 const own=productMarkup(raw?.toString('utf8')||'');
 const h1=selectedProductHeadings(own),notes=String(f.tasting_notes||'').toLowerCase();
 const text=own.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
 check(r.official_url===expectedUrl&&r.archived_coffee===s.name&&r.status==='FETCHED'&&r.parser_ok===true,number+'_selected_fetched_parser');
 check(u?.protocol==='https:'&&u?.hostname==='www.nativocoffeeroasters.com'&&u?.pathname==='/products/'+s.slug,number+'_not_replaced_or_redirected');
 check(raw?.length>0&&raw.length===r.html_bytes&&digest(raw)===r.html_sha256,number+'_raw_bytes_digest');
 check(h1.length===1&&h1[0]===s.name&&f.name===s.name,number+'_own_exact_h1');
 check(!requiredFocusedSourceFailures([number],[r]).length,number+'_add_coffee_source_review');
 check(f.roast_level==='Medium'&&String(f.origin||'').toLowerCase().includes('huila')&&String(f.origin||'').toLowerCase().includes('colombia'),number+'_roast_and_origin');
 check(s.notes.every(x=>notes.includes(x))&&s.notes.every(x=>text.includes(x)),number+'_direct_selected_tasting');
 check(s.other.every(x=>!notes.includes(x)),number+'_no_adjacent_coffee_tasting');
 check(!f.decaffeination_method&&!f.process&&!f.producer&&!f.elevation_m,number+'_unsupported_fields_blank');
 if(number===530)check(String(f.variety||'').toLowerCase().includes('pink bourbon')&&text.includes('pink bourbon'),number+'_pink_bourbon_variety');
 result.push({number,source_url:r.final_url,html_sha256:raw?digest(raw):null,bytes:raw?.length||0,h1,fields:f,
  conflicts:r.conflicts||[],add_coffee:r.add_coffee_ui_rendered,source_review:r.source_review_rendered});
}
const output={event_sha:report?.source_sha,checkout_sha:process.env.DIC_R272_CHECKOUT_SHA,
 report_sha256:data?digest(data):null,cases:result,passed:errors.length===0,errors,manual_certified:0,production_operations:0};
writeFileSync(join(dir,'r272-afterproof.json'),JSON.stringify(output,null,2)+'\n');
console.log('[DIC33 R272 SELECTED NATIVE 529 530] '+JSON.stringify(output));
if(errors.length)process.exitCode=1;
