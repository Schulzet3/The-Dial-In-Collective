#!/usr/bin/env node
// Issue #33 R88: two individual current selected WeBe source checks, not all-603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'')
 .replace(/&(?:amp|nbsp);/giu,' ').replace(/&#(?:x[a-f\d]+|\d+);/giu,' ')
 .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const clean=html=>String(html||'').replace(/<!--[\s\S]*?-->/g,' ')
 .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
 .replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/giu,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:nbsp|amp);/giu,' ')
 .replace(/\s+/g,' ').trim();
const names={406:'Guatemala Los Volcanes',408:'Holy Grail No. 2: Strawberry Jam'};
const urls={406:'https://webe.coffee/products/guatemala-los-volcanes',408:'https://webe.coffee/products/strawberry-jam-colombia-santa-monica'};
const needed={
 406:['Alta Verapaz','Smallholder','fully washed','Brown Sugar','Red Apple','Milk Chocolate','Orange'],
 408:['Jairo Arcila','Santa Mónica','Castillo','72-hour','strawberries','wine yeast','honey processed']
};
export function selectedWebeChecks(number,markup,headings){
 const title=names[number],phrases=needed[number];
 if(!title||!phrases)throw Error('unsupported_selected_case');
 const prose=norm(clean(markup));
 return {uniqueSelected:Array.isArray(headings)&&headings.length===1&&norm(headings[0])===norm(title),
  ownDescription:phrases.every(s=>prose.includes(norm(s))),
  ownSourcePhrases:phrases.map(s=>prose.includes(norm(s)))};
}
if(process.env.DIC_ISSUE33_R88_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 const errors=[],check=(ok,code)=>{if(!ok)errors.push(code)};
 let report,raw;try{raw=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(raw.toString('utf8'))}catch{}
 check(JSON.stringify(report?.case_numbers)==='[406,408]'&&report?.records?.length===2,'exact_two_original_cases');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_sha256');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'original_and_production_boundaries');
 const detail=[];
 for(const number of [406,408]){
  const r=report?.records?.find(x=>x.number===number)||{};
  let html;try{html=readFileSync(join(dir,'case-'+number+'.html'))}catch{}
  const selected=productMarkup(html?.toString('utf8')||'');
  const heads=selectedProductHeadings(selected),direct=selectedWebeChecks(number,selected,heads),f=r.current_fields||{};
  let final;try{final=new URL(r.final_url)}catch{}
  const expected=new URL(urls[number]);
  check(r.archived_coffee===names[number]&&r.official_url===urls[number],number+'_original_exact_url');
  check(final?.protocol==='https:'&&['webe.coffee','www.webe.coffee'].includes(final?.hostname)
   &&final?.pathname.replace(/\/$/,'')===expected.pathname&&!final?.search&&!final?.hash,number+'_selected_final_url');
  check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,number+'_live_parser_selected_H1');
  check(html&&r.html_sha256===sha(html)&&r.html_bytes===html.length,number+'_raw_html_digest');
  check(direct.uniqueSelected&&direct.ownDescription,number+'_own_exact_selected_prose');
  check(norm(f.name)===norm(names[number])&&/webe/i.test(f.roaster||''),number+'_canonical_coffee_roaster');
  check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,number+'_add_coffee_source_review');
  check((r.conflicts||[]).length===0,number+'_no_conflicts');
  check(f.roast_level==='Light',number+'_literal_light_roast');
  check(!f.decaffeination_method,number+'_no_decaf_from_menu');
  if(number===406){
   check(/guatemala/i.test(f.origin||'')&&/alta verapaz/i.test(f.origin||''),number+'_own_region_origin');
   check(f.process==='Washed',number+'_fully_washed');
   check(['brown sugar','red apple','milk chocolate','orange'].every(s=>norm(f.tasting_notes).includes(norm(s))),number+'_own_four_notes');
   check(/smallholder/i.test(f.producer||''),number+'_published_smallholders');
   check(!/colombia|quindio/i.test(f.origin||''),number+'_no_neighbor_origin');
   check(!/strawberry|tangerine/i.test(f.tasting_notes||''),number+'_no_neighbor_limited_release_notes');
  }else{
   check(/colombia/i.test(f.origin||'')&&/quindio/i.test(f.origin||''),number+'_own_lot_location');
   check(/jairo arcila/i.test(f.producer||'')&&/santa monica/i.test(norm(f.producer)),number+'_own_named_producer');
   check(/castillo/i.test(f.variety||''),number+'_own_variety');
   check(f.process==='Anaerobic',number+'_coferment_primary_process');
   check(['ripe strawberry','tangerine','caramel','chocolate'].every(s=>norm(f.tasting_notes).includes(norm(s))),number+'_own_four_notes');
   check(!/guatemala|alta verapaz/i.test(f.origin||''),number+'_no_adjacent_origin');
   check(!/brown sugar|red apple/i.test(f.tasting_notes||''),number+'_no_adjacent_tasting');
  }
  detail.push({number,final_url:r.final_url,html_sha256:html?sha(html):null,headings:heads,direct,fields:f,conflicts:r.conflicts||[]});
 }
 const receipt={source_sha:report?.source_sha,case_numbers:[406,408],evidence_sha256:raw?sha(raw):null,detail,manual_certified:0,production_operations:0,passed:errors.length===0,failures:errors};
 writeFileSync(join(dir,'r88-webe-406-408-afterproof.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log('[DIC33 R88 selected source afterproof] '+JSON.stringify(receipt));
 if(errors.length)process.exitCode=1;
}
