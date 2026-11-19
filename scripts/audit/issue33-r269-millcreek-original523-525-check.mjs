#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const digest=x=>createHash('sha256').update(x).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r269';
const cases=[
 {n:523,name:'Guatemalan',url:'https://www.millcreekcoffee.com/products/guatemalan',notes:['dark chocolate','citrus'],roast:'Light'},
 {n:524,name:'Kona',url:'https://www.millcreekcoffee.com/products/kona',notes:['nutty','earthy','citrus'],roast:null},
 {n:525,name:'Mexican',url:'https://www.millcreekcoffee.com/products/mexican',notes:['citrus','toffee','dark cocoa'],roast:'Light'}
];
const errors=[],check=(v,k)=>{if(!v)errors.push(k);};
let report,bytes;
try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes);}catch(e){errors.push('missing_report_'+e.code);}
check(JSON.stringify(report?.case_numbers)==='[523,524,525]'&&report?.records?.length===3,'selected_original_3');
check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_source_hash');
check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'nonmutation_no_bulk_certification');
check(report?.source_sha===process.env.DIC_R269_EVENT_SHA,'event_sha');
check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R269_CHECKOUT_SHA,'checkout_sha');
const results=[];
for(const c of cases){
 const row=report?.records?.find(x=>x.number===c.n)||{},f=row.current_fields||{};
 let raw;try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch(e){errors.push('raw_missing_'+c.n+'_'+e.code);}
 const scoped=productMarkup(raw?.toString('utf8')||'');
 const head=selectedProductHeadings(scoped);
 const visible=scoped.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ');
 const notes=String(f.tasting_notes||'').toLowerCase();
 const source=new URL(c.url);let final;try{final=new URL(row.final_url);}catch{}
 check(row.number===c.n&&row.official_url===c.url&&row.archived_coffee===c.name,'original_url_'+c.n);
 check(row.status==='FETCHED'&&row.parser_ok===true,'seller_fetched_parsed_'+c.n);
 check(final?.hostname===source.hostname&&final?.pathname===source.pathname&&final?.protocol==='https:','no_redirect_'+c.n);
 check(raw?.length>0&&raw?.length===row.html_bytes&&digest(raw)===row.html_sha256,'raw_source_sha256_'+c.n);
 check(head.length===1&&head[0]===c.name&&f.name===c.name,'selected_current_heading_'+c.n);
 check(requiredFocusedSourceFailures([c.n],[row]).length===0,'source_identity_preview_review_'+c.n);
 check(c.notes.every(x=>notes.includes(x)),'selected_literal_flavors_'+c.n);
 check(c.notes.every(x=>visible.toLowerCase().includes(x)),'direct_seller_flavors_'+c.n);
 check(/washed/i.test(String(f.process||''))&&!f.decaffeination_method,'green_processing_no_decaf_'+c.n);
 if(c.n===524){
  check(/medium roasted/i.test(visible)&&/Roast Type\s*:?\s*Medium Light/i.test(visible),'two_selected_roast_claims_524');
  check(!f.roast_level&&(row.conflicts||[]).includes('roast_level'),'hold_conflicting_roast_524');
  check(!/toffee/i.test(notes),'no_mexican_sibling_taste_524');
 }else{
  check(/Roast Type\s*:?\s*Light\b/i.test(visible),'seller_light_roast_'+c.n);
  check(f.roast_level===c.roast,'parser_light_roast_'+c.n);
 }
 results.push({case:c.n,url:c.url,current_h1:head,source_sha256:raw?digest(raw):null,raw_bytes:raw?.length||0,fields:f,conflicts:row.conflicts||[]});
}
const verdict={event_sha:report?.source_sha,checkout_sha:process.env.DIC_R269_CHECKOUT_SHA,report_sha256:bytes?digest(bytes):null,cases:results,manual_certified:0,production_operations:0,passed:errors.length===0,errors};
writeFileSync(join(dir,'r269-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R269 MILL CREEK CURRENT SOURCE] '+JSON.stringify(verdict));
if(errors.length)process.exitCode=1;
