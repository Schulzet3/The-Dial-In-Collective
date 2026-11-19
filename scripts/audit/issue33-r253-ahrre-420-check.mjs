#!/usr/bin/env node
// Audit-only afterproof for exact current original603 #420. Does not add parser rules.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {selectedShopifyPurchaseH3Identity} from './issue33-shopify-selected-product-h3.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const clean=x=>String(x||'').replace(/<(script|style|nav|aside|footer|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
export const cases={
 420:{name:'TANZANIAN PEABERRY',url:'https://www.ahrre.com/products/test',
  own:['flavor notes','floral fruity berry','region africa','roast full city']}
};
export function selectedDirect(html){
 const own=norm(clean(productMarkup(html)));
 const {own:parts}=cases[420];
 return {own_facts:parts.every(part=>own.includes(norm(part)))};
}
export function canonical(f){
 const notes=norm(f.tasting_notes),origin=norm(f.origin),grower=norm(f.producer);
 return {
  selected_name:norm(f.name)===norm(cases[420].name),
  merchant:/ahrre/i.test(f.roaster||''),
  full_city:f.roast_level==='Medium-Dark',
  direct_notes:['floral','fruity','berry'].every(x=>notes.includes(x)),
  tanzania:origin.includes('tanzania')&&!origin.includes('kenya'),
  no_unrelated_grower:!grower.includes('kenya'),
  no_unpublished_decaf:!f.decaffeination_method,
  no_fabricated_lot:![f.harvest_year,f.release_year,f.crop_year].some(Boolean),
  no_fabricated_numerical_recipe:![f.dose_g,f.yield_g,f.time_s].some(Boolean)
 };
}
if(process.env.DIC_R253_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
 const errors=[],check=(ok,key)=>{if(!ok)errors.push(key)};
 let report,reportBytes,raw;
 try{reportBytes=readFileSync(join(dir,'focused-current-evidence.json'));
  report=JSON.parse(reportBytes.toString('utf8'))}catch{}
 try{raw=readFileSync(join(dir,'case-420.html'))}catch{}
 const r=report?.records?.find(x=>x.number===420)||{},f=r.current_fields||{};
 const html=raw?.toString('utf8')||'',original=cases[420];
 check(JSON.stringify(report?.case_numbers)==='[420]'&&report?.records?.length===1,'exact_cohort');
 check(report?.source_sha===process.env.DIC_R253_EVENT_SHA,'report_event_sha');
 check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===
  process.env.DIC_R253_SOURCE_SHA,'checked_out_source_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353',
  'immutable_frozen_csv_hash');
 check(report?.original_corpus_modified===false&&report?.production_operations===0&&
  report?.manual_certified===0,'frozen_and_no_production');
 let url;try{url=new URL(r.final_url)}catch{}
 const originalUrl=new URL(original.url);
 check(url?.protocol==='https:'&&url.host===originalUrl.host&&
  url.pathname.replace(/\/$/,'')===originalUrl.pathname&&!url.search&&!url.hash,'exact_selected_url');
 check(r.archived_coffee===original.name&&r.official_url===original.url,'original_selected_identity');
 check(r.status==='FETCHED'&&r.parser_ok===true&&
  r.selected_heading_identity_verified===true,'actual_parser_and_identity');
 check(raw?.length>0&&r.html_bytes===raw.length&&r.html_sha256===hash(raw),'independent_raw_sha256');
 const headings=raw?selectedProductHeadings(productMarkup(html)):[];
 const h3Proof=(!headings.length&&raw)
  ?selectedShopifyPurchaseH3Identity(html,{source_url:original.url,
   expected_name:original.name,parsed_name:f.name}):null;
 check((headings.length===1&&norm(headings[0])===norm(original.name))||
  Boolean(h3Proof),'chosen_visible_current_h1_or_purchase_linked_h3');
 check(selectedDirect(html).own_facts,'direct_selected_label_source');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_preview_review');
 const fields=canonical(f);
 for(const [key,ok] of Object.entries(fields))check(ok,'current_'+key);
 check((r.conflicts||[]).length===0,'unresolved_canonical_conflicts');
 const result={checked_sha:process.env.DIC_R253_SOURCE_SHA,
  event_sha:report?.source_sha,report_sha256:reportBytes?hash(reportBytes):null,
  raw_sha256:raw?hash(raw):null,raw_bytes:raw?.length||0,
  actual_selected_headings:headings,h3_identity:h3Proof||null,
  selected_direct:selectedDirect(html),current_fields:f,
  canonical_checks:fields,errors,passed:errors.length===0,
  manually_certified:0};
 writeFileSync(join(dir,'r253-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R253] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}
