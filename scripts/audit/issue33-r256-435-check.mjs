#!/usr/bin/env node
// Audit-only, fail-closed official selected #435 afterproof. No member or provider writes.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const own=html=>productMarkup(String(html||'')).replace(/<(script|style|nav|aside|footer|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ');
export const selected={number:435,name:'The Dark',url:'https://www.blackcoffeeroastingco.com/product/the-dark'};
export function direct(html,headings){
 const t=norm(own(html));
 return {identity:Array.isArray(headings)&&headings.length===1&&norm(headings[0])===norm(selected.name),
   own_dark_description:t.includes(norm('This is our darkest blend'))&&t.includes(norm('Roast Level: Our Darkest'))};
}
export function fields(f){
 const taste=norm(f.tasting_notes);
 return {selected_name:norm(f.name)===norm(selected.name),merchant:/black coffee roasting/i.test(f.roaster||''),
   explicit_dark:f.roast_level==='Dark',
   no_review_chocolate:!taste.includes('chocolatiness')&&!taste.includes('favorite')&&!taste.includes('smooth'),
   no_night_as_flavor:!taste.includes('moonless')&&!taste.includes('night')&&!taste.includes('paris'),
   no_invented_sensory:!f.tasting_notes,
   no_invented_origin:!f.origin,no_invented_producer:!f.producer,
   no_unpublished_process:!f.process,no_unpublished_elevation:!f.elevation_m,
   no_unpublished_decaf:!f.decaffeination_method,
   no_invented_recipe:![f.dose_g,f.yield_g,f.time_s].some(Boolean)};
}
if(process.env.DIC_R256_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR,errors=[];
 const require=(ok,label)=>{if(!ok)errors.push(label);};
 let bytes,report;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'));}catch{}
 require(JSON.stringify(report?.case_numbers)==='[435]'&&report.records?.length===1,'exact_435_only');
 require(report?.source_sha===process.env.DIC_R256_EVENT_SHA,'event_source_sha');
 require(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R256_SOURCE_SHA,'checkout_source_sha');
 require(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_csv_sha256');
 require(report?.original_corpus_modified===false&&report?.production_operations===0&&report?.manual_certified===0,'no_unsafe_mutations_or_false_corpus_certification');
 const r=report?.records?.find(x=>x.number===435)||{},f=r.current_fields||{};
 let raw;try{raw=readFileSync(join(dir,'case-435.html'));}catch{}
 const html=raw?.toString('utf8')||'';
 const headings=selectedProductHeadings(productMarkup(html));
 let final;try{final=new URL(r.final_url);}catch{}
 const expected=new URL(selected.url);
 require(r.archived_coffee===selected.name&&r.official_url===selected.url,'frozen_selected_product_identity');
 require(final?.protocol==='https:'&&final.host===expected.host&&final.pathname.replace(/\/$/,'')===expected.pathname&&!final.search&&!final.hash,'unchanged_exact_selected_product_url');
 require(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'guarded_current_parser_selected_identity');
 require(raw?.length>0&&r.html_bytes===raw.length&&r.html_sha256===hash(raw),'independent_raw_source_sha256');
 const proof=direct(html,headings);require(proof.identity&&proof.own_dark_description,'selected_direct_dark_evidence');
 require(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_and_source_review');
 const checks=fields(f);for(const [name,ok] of Object.entries(checks))require(ok,'435_'+name);
 require((r.conflicts||[]).length===0,'no_unresolved_selected_conflicts');
 const result={case:435,source_sha:process.env.DIC_R256_SOURCE_SHA,event_sha:report?.source_sha,
   raw_html_sha256:raw?hash(raw):null,raw_html_bytes:raw?.length||0,
   report_sha256:bytes?hash(bytes):null,headings,proof,fields:f,checks,errors,
   passed:errors.length===0,manual_certified:0};
 writeFileSync(join(dir,'r256-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R256] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}