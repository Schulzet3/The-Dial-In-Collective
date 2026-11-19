#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const clean=x=>String(x||'').replace(/<(script|style|nav|aside|footer|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
export const cases={
427:{name:'El Madron, Decaf - Mexico - 12oz Bag',url:'https://www.altaroasters.com/products/el-madron-decaf-mexico',proof:['El Madron - Organic - Decaf','Chiapas, Mexico','Medium','Typica, Caturra','Washed, Mountain Water Process','1800m','Toffee, Pumpkin Spice, Lime']},
428:{name:'Kirima Batian - Othaya, Nyeri, Kenya - 12oz Bag',url:'https://www.altaroasters.com/products/kirima-batian-othaya-nyeri-kenya-12oz-bag',proof:['Kirima Batian','Light Roast','SL28, SL34, Batian','Washed','1,847m','Cherry, Raisin, Lemon','Kiaguthu Washing Station']}
};
export function direct(n,html,heads){
 const c=cases[n],body=norm(clean(productMarkup(html)));
 return {identity:Array.isArray(heads)&&heads.length===1&&norm(heads[0])===norm(c.name),
         own_facts:c.proof.every(w=>body.includes(norm(w)))};
}
export function fields(n,f){
 const t=norm(f.tasting_notes),v=norm(f.variety).replace(/sl 28/g,'sl28').replace(/sl 34/g,'sl34');
 if(n===427)return {
 medium:f.roast_level==='Medium',washed_green:f.process==='Washed',water_decaf:f.decaffeination_method==='Water Process',
 origin:/chiapas/i.test(f.origin||'')&&/mexico/i.test(f.origin||''),
 taste:['toffee','pumpkin spice','lime'].every(w=>t.includes(w)),
 cultivar:['typica','caturra'].every(w=>v.includes(w)),elevation:/1800/.test(f.elevation_m||'')};
 if(n===428)return {
 light:f.roast_level==='Light',washed:f.process==='Washed',elevation:/1,?847/.test(f.elevation_m||'')&& !/5,?199/.test(f.elevation_m||''),
 taste:['cherry','raisin','lemon'].every(w=>t.includes(w)),
 cultivar:['sl28','sl34','batian'].every(w=>v.includes(w)),
 no_2010_1964_release:!/(?:2010|1964)/.test([f.release_year,f.harvest_year,f.crop_year,f.year].join(' '))};
 throw Error('unrecognized_case');
}
if(process.env.DIC_R251_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR,fail=[],ok=(x,k)=>{if(!x)fail.push(k)};
 let report,source;try{source=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(source.toString('utf8'))}catch{}
 ok(JSON.stringify(report?.case_numbers)==='[427,428]'&&report.records?.length===2,'cohort');
 ok(report?.source_sha===process.env.DIC_R251_EVENT_SHA,'event_source_sha');
 ok(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R251_SOURCE_SHA,'checkout_sha');
 ok(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original_csv_hash');
 ok(report?.original_corpus_modified===false&&report?.production_operations===0&&report?.manual_certified===0,'frozen_and_safety');
 const evidence=[];
 for(const n of [427,428]){
  const c=cases[n],r=report?.records?.find(x=>x.number===n)||{},f=r.current_fields||{};
  let raw;try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch{}
  const heads=raw?selectedProductHeadings(productMarkup(raw.toString('utf8'))):[];
  const s=direct(n,raw?.toString('utf8')||'',heads);
  let uri;try{uri=new URL(r.final_url)}catch{}
  const expected=new URL(c.url);
  ok(r.archived_coffee===c.name&&r.official_url===c.url,n+'_immutable_selected_identity');
  ok(uri?.protocol==='https:'&&uri.hostname===expected.hostname&&uri.pathname.replace(/\/$/,'')===expected.pathname&&!uri.search&&!uri.hash,n+'_exact_url');
  ok(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,n+'_actual_parser');
  ok(raw?.length>0&&r.html_bytes===raw.length&&r.html_sha256===hash(raw),n+'_independent_raw_sha');
  ok(s.identity&&s.own_facts,n+'_selected_direct_source');
  ok(norm(f.name)===norm(c.name)&&/alta/i.test(f.roaster||''),n+'_chosen_coffee');
  ok(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,n+'_actual_preview_and_review');
  const checks=fields(n,f);for(const [k,v] of Object.entries(checks))ok(v,n+'_'+k);
  ok((r.conflicts||[]).length===0,n+'_source_conflicts');
  evidence.push({n,raw_sha:raw?hash(raw):null,headings:heads,fields:f,checks,source:s});
 }
 const result={checked_sha:process.env.DIC_R251_SOURCE_SHA,event_sha:report?.source_sha,raw_report_sha:source?hash(source):null,evidence,fail,passed:fail.length===0,manual_certified:0};
 writeFileSync(join(dir,'r251-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[R251] '+JSON.stringify(result));
 if(fail.length)process.exitCode=1;
}
