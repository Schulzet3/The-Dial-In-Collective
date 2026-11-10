#!/usr/bin/env node
// Issue #33 R92: exact selected Alta #427/#428, not original603 universal certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/&(?:nbsp|amp);/giu,' ').replace(/[^a-z0-9]+/g,' ').trim();
const clean=s=>String(s||'').replace(/<!--[\s\S]*?-->/g,' ')
 .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
 .replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/giu,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
export const cases=Object.freeze({
 427:{name:'El Madron, Decaf - Mexico - 12oz Bag',url:'https://www.altaroasters.com/products/el-madron-decaf-mexico',
  phrases:['El Madron - Organic - Decaf','Chiapas, Mexico','Typica, Caturra','Washed, Mountain Water Process','1800m','Toffee, Pumpkin Spice, Lime']},
 428:{name:'Kirima Batian - Othaya, Nyeri, Kenya - 12oz Bag',url:'https://www.altaroasters.com/products/kirima-batian-othaya-nyeri-kenya-12oz-bag',
  phrases:['Kirima Batian','SL28, SL34, Batian','Cherry, Raisin, Lemon','1,847m','Kiaguthu Washing Station','Othaya Farmers Cooperative Society']}
});
export function directSelectedAlta(number,markup,headings){
 const spec=cases[number];if(!spec)throw Error('invalid_case');
 const text=norm(clean(markup)), hits=spec.phrases.map(v=>text.includes(norm(v)));
 return {uniqueSelected:Array.isArray(headings)&&headings.length===1&&norm(headings[0])===norm(spec.name),
  ownDirectProductFacts:hits.every(Boolean),hits};
}
if(process.env.DIC_ISSUE33_R92_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 const failures=[],check=(ok,why)=>{if(!ok)failures.push(why)};
 let raw,report;try{raw=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(raw.toString('utf8'))}catch{}
 check(JSON.stringify(report?.case_numbers)==='[427,428]'&&report?.records?.length===2,'exact_original_subset');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original_csv_integrity');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'preservation');
 const detail=[];
 for(const n of [427,428]){
  const spec=cases[n],row=report?.records?.find(x=>x.number===n)||{},f=row.current_fields||{};
  let html;try{html=readFileSync(join(dir,'case-'+n+'.html'))}catch{}
  const selected=productMarkup(html?.toString('utf8')||''),headings=selectedProductHeadings(selected),direct=directSelectedAlta(n,selected,headings);
  let final;try{final=new URL(row.final_url)}catch{}
  const original=new URL(spec.url);
  check(row.archived_coffee===spec.name&&row.official_url===spec.url,n+'_original_selected_identity');
  check(final?.protocol==='https:'&&['altaroasters.com','www.altaroasters.com'].includes(final?.hostname)&&
   final?.pathname.replace(/\/$/,'')===original.pathname&&!final?.search&&!final?.hash,n+'_same_official_handle');
  check(row.status==='FETCHED'&&row.parser_ok===true&&row.selected_heading_identity_verified===true,n+'_actual_selected_parser');
  check(html&&row.html_sha256===sha(html)&&row.html_bytes===html.length,n+'_raw_html_sha');
  check(direct.uniqueSelected&&direct.ownDirectProductFacts,n+'_direct_selected_product_facts');
  check(norm(f.name)===norm(spec.name)&&/alta coffee/i.test(f.roaster||''),n+'_name_and_roaster');
  check(row.add_coffee_ui_rendered===true&&row.source_review_rendered===true,n+'_add_coffee_source_review');
  check(!/passiflora|santos lopez|brown bear|woods blend|alaska artisan/i.test(JSON.stringify(f)),n+'_no_other_product');
  if(n===427){
   check(/chiapas.*mexico/i.test(norm(f.origin)),n+'_own_chiapas_mexico');
   check(f.roast_level==='Medium'&&f.process==='Washed',n+'_medium_washed');
   check(f.decaffeination_method==='Water Process',n+'_mountain_water_is_decaf');
   check(/typica/i.test(f.variety||'')&&/caturra/i.test(f.variety||''),n+'_own_varietals');
   check(/toffee/i.test(f.tasting_notes||'')&&/pumpkin/i.test(f.tasting_notes||'')&&/lime/i.test(f.tasting_notes||''),n+'_own_tasting');
   check(!f.producer,n+'_no_unpublished_producer');
  }else{
   check(/nyeri.*kenya/i.test(norm(f.origin)),n+'_own_kenya_origin');
   check(f.roast_level==='Light'&&f.process==='Washed'&&!f.decaffeination_method,n+'_light_washed_not_decaf');
   check(/SL28/i.test(f.variety||'')&&/Batian/i.test(f.variety||''),n+'_own_varieties');
   check(/cherry/i.test(f.tasting_notes||'')&&/raisin/i.test(f.tasting_notes||'')&&/lemon/i.test(f.tasting_notes||''),n+'_own_notes');
   check(/1847/.test(String(f.elevation_m||'').replace(/[^0-9]/g,'')),n+'_own_elevation');
   check(!/passiflora|santos lopez|estate/i.test(f.producer||''),n+'_no_invented_farm');
  }
  detail.push({number:n,final_url:row.final_url,headings,direct,html_sha256:html?sha(html):null,
   fields:f,conflicts:row.conflicts||[],source_notice:row.metadata_review_notice_rendered});
 }
 const receipt={source_sha:report?.source_sha,case_numbers:[427,428],source_evidence_sha256:raw?sha(raw):null,
  detail,manual_certified:0,production_operations:0,passed:failures.length===0,failures};
 writeFileSync(join(dir,'r92-alta-427-428-afterproof.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log('[DIC33 R92 Alta selected source afterproof] '+JSON.stringify(receipt));
 if(failures.length)process.exitCode=1;
}
