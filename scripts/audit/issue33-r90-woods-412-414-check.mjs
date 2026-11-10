#!/usr/bin/env node
// Issue #33 R90 selected Woods official products: not universal 603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/&(?:nbsp|amp);/giu,' ').replace(/&#(?:x[a-f\d]+|\d+);/giu,' ')
 .replace(/[^a-z0-9]+/g,' ').trim();
const clean=s=>String(s||'').replace(/<!--[\s\S]*?-->/g,' ')
 .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
 .replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/giu,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
const names={412:'Brown Bear',413:'Decaf',414:'Woods Blend'};
const urls={412:'https://woodscoffee.com/products/brown-bear',413:'https://woodscoffee.com/products/decaf',414:'https://woodscoffee.com/products/woods-blend'};
const direct={
 412:['full bodied dark roast','chocolate','vanilla','spice','Rich','Earth'],
 413:['medium roast','Swiss Water Process','sweet','floral','spice','99.9% caffeine free'],
 414:['most popular roast','medium roast','cinnamon','semi-sweet cocoa','Almonds','Mild Fruit','Cocoa Powder']
};
export function selectedWoodsChecks(number,markup,headings){
 if(!direct[number])throw Error('invalid_case');
 const text=norm(clean(markup));
 const ownSourcePhrases=direct[number].map(v=>text.includes(norm(v)));
 return {uniqueSelected:Array.isArray(headings)&&headings.length===1&&norm(headings[0])===norm(names[number]),
  ownDescription:ownSourcePhrases.every(Boolean),ownSourcePhrases};
}
if(process.env.DIC_ISSUE33_R90_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 const failures=[],check=(ok,code)=>{if(!ok)failures.push(code)};
 let report,raw;try{raw=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(raw.toString('utf8'))}catch{}
 check(JSON.stringify(report?.case_numbers)==='[412,413,414]'&&report?.records?.length===3,'exact_original603_subset');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_csv_digest');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'safe_boundaries');
 const detail=[];
 for(const number of [412,413,414]){
  const row=report?.records?.find(x=>x.number===number)||{},f=row.current_fields||{};
  let html;try{html=readFileSync(join(dir,'case-'+number+'.html'))}catch{}
  const headings=selectedProductHeadings(productMarkup(html?.toString('utf8')||''));
  const direct=selectedWoodsChecks(number,productMarkup(html?.toString('utf8')||''),headings);
  let u;try{u=new URL(row.final_url)}catch{}
  const expected=new URL(urls[number]);
  check(row.archived_coffee===names[number]&&row.official_url===urls[number],number+'_original_url_identity');
  check(u?.protocol==='https:'&&['woodscoffee.com','www.woodscoffee.com'].includes(u?.hostname)&&
   u?.pathname.replace(/\/$/,'')===expected.pathname&&!u?.search&&!u?.hash,number+'_current_url');
  check(row.status==='FETCHED'&&row.parser_ok===true&&row.selected_heading_identity_verified===true,number+'_actual_parser_selected');
  check(html&&row.html_sha256===sha(html)&&row.html_bytes===html.length,number+'_raw_bytes_sha');
  check(direct.uniqueSelected&&direct.ownDescription,number+'_direct_selected_prose');
  check(norm(f.name)===norm(names[number])&&/woods coffee/i.test(f.roaster||''),number+'_coffee_and_roaster');
  check(row.add_coffee_ui_rendered===true&&row.source_review_rendered===true,number+'_member_add_coffee_review');
  check(!f.origin&&!f.producer&&!f.variety&&!f.elevation_m,number+'_no_unpublished_facts');
  check(!/guji|ethiopia|guatemala/i.test(JSON.stringify(f)),number+'_no_other_coffee_contamination');
  if(number===412){
   check(f.roast_level==='Dark',number+'_dark_roast');
   check(/spice/i.test(f.tasting_notes||''),number+'_own_tasting');
   check(!f.decaffeination_method,number+'_not_decaf');
  }else if(number===413){
   check(f.roast_level==='Medium',number+'_medium_roast');
   check(f.decaffeination_method==='Water Process',number+'_Swiss_Water_decaf');
   check(/sweet|floral|spice/i.test(f.tasting_notes||''),number+'_own_tasting');
   check(!f.process||f.process==='Other/Unknown',number+'_decaf_is_not_cherry_process');
  }else{
   check(f.roast_level==='Medium',number+'_medium_roast');
   check(/almond|cocoa|cinnamon/i.test(f.tasting_notes||''),number+'_own_tasting');
   check(!f.decaffeination_method,number+'_not_decaf');
  }
  detail.push({number,final_url:row.final_url,html_sha256:html?sha(html):null,headings,direct,fields:f,conflicts:row.conflicts||[]});
 }
 const receipt={source_sha:report?.source_sha,case_numbers:[412,413,414],
  evidence_sha256:raw?sha(raw):null,detail,manual_certified:0,production_operations:0,
  passed:failures.length===0,failures};
 writeFileSync(join(dir,'r90-woods-412-414-afterproof.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log('[DIC33 R90 current selected Woods afterproof] '+JSON.stringify(receipt));
 if(failures.length)process.exitCode=1;
}
