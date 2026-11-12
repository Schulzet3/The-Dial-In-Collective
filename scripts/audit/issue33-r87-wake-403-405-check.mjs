#!/usr/bin/env node
// Issue #33 R87: bounded original603 #403-405 exact selected Wake source checks.
// This is an individual-case acceptance probe, never a 603-coffee certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').replace(/&(?:amp|nbsp);/giu,' ').replace(/&#(?:x[a-f\d]+|\d+);/giu,' ').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const clean=html=>String(html||'')
 .replace(/<!--[^]*?-->/g,' ')
 .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[^]*?<\/\1>/giu,' ')
 .replace(/<h1\b[^>]*>[^]*?<\/h1>/giu,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:nbsp|amp);/giu,' ')
 .replace(/\s+/g,' ').trim();
const names={403:'Ambler Blend',404:'Bromo',405:'Mountain Water Decaf'};
const needed={
 403:['Celebrating the heart and soul of Ambler','Crafted with Latin-American beans','light-bodied, spirited coffee experience'],
 404:['Keasbey and Mattison','Central American and Indonesian beans','robust caramel flavor'],
 405:['100% chemical-free decaffeination process','Tasting notes: herbal, dark chocolate, medium body','Latin American, Indonesian and African Blend']
};
export function selectedWakeChecks(number,markup,headings){
 const title=names[number],phrases=needed[number];
 if(!title||!phrases)throw Error('unsupported_case');
 const prose=norm(clean(markup));
 return {uniqueSelected:Array.isArray(headings)&&headings.length===1&&norm(headings[0])===norm(title),
  ownDescription:phrases.every(x=>prose.includes(norm(x))),
  ownSourcePhrases:phrases.map(x=>prose.includes(norm(x)))};
}
if(process.env.DIC_ISSUE33_R87_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 const errors=[],check=(ok,code)=>{if(!ok)errors.push(code)};
 let report,sourceBytes;
 try{sourceBytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(sourceBytes.toString('utf8'))}catch{}
 check(JSON.stringify(report?.case_numbers)==='[403,404,405]'&&report?.records?.length===3,'exact_three_original_cases');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_sha256');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'original_and_production_boundaries');
 const urls={403:'https://wakecoffee.com/products/ambler-blend',404:'https://wakecoffee.com/products/bromo-blend',405:'https://wakecoffee.com/products/decaf'};
 const detail=[];
 for(const number of [403,404,405]){
  const r=report?.records?.find(x=>x.number===number)||{};
  let html=null;try{html=readFileSync(join(dir,'case-'+number+'.html'))}catch{}
  const selected=productMarkup(html?.toString('utf8')||'');
  const heads=selectedProductHeadings(selected),direct=selectedWakeChecks(number,selected,heads),f=r.current_fields||{};
  let final;try{final=new URL(r.final_url)}catch{}
  const url=new URL(urls[number]);
  check(r.archived_coffee===names[number]&&r.official_url===urls[number],number+'_exact_original_url');
  check(final?.protocol==='https:'&&['wakecoffee.com','www.wakecoffee.com'].includes(final?.hostname)
   &&final?.pathname.replace(/\/$/,'')===url.pathname&&!final?.search&&!final?.hash,number+'_original_selected_final_url');
  check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,number+'_actual_parser_and_selected_heading');
  check(html&&r.html_sha256===hash(html)&&r.html_bytes===html.length,number+'_raw_html_sha256_and_bytes');
  check(direct.uniqueSelected&&direct.ownDescription,number+'_own_selected_story');
  check(norm(f.name)===norm(names[number])&&norm(f.roaster).includes('wake coffee'),number+'_canonical_identity');
  check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,number+'_member_add_coffee_review');
  check((r.conflicts||[]).length===0,number+'_no_source_conflicts');
  check(!f.roast_level,number+'_no_customer_review_or_body_as_roast');
  check(!f.process&&!f.producer&&!f.variety&&!f.elevation_m,number+'_unpublished_details_blank');
  if(number===403){
   check(norm(f.origin).includes('latin america'),number+'_latin_america_selected');
   check(!/central america|indonesia|africa/i.test(f.origin||''),number+'_no_other_blend_origin');
  }else if(number===404){
   check(['central america','indonesia'].every(x=>norm(f.origin).includes(x)),number+'_both_blend_regions');
   check(/caramel/i.test(f.tasting_notes||''),number+'_own_robust_caramel');
   check(!f.decaffeination_method,number+'_no_decaf_from_historical_ad_copy');
  }else{
   check(['latin america','indonesia','africa'].every(x=>norm(f.origin).includes(x)),number+'_three_current_regions');
   check(['herbal','dark chocolate','medium body'].every(x=>norm(f.tasting_notes).includes(x)),number+'_literal_selected_taste_and_body');
   check(f.decaffeination_method==='Water Process',number+'_named_mountain_water_decaf');
  }
  detail.push({number,status:r.status,final:r.final_url,html_sha256:html?hash(html):null,headings:heads,direct,fields:f,conflicts:r.conflicts||[]});
 }
 const receipt={source_sha:report?.source_sha,case_numbers:[403,404,405],evidence_sha256:sourceBytes?hash(sourceBytes):null,detail,manual_certified:0,production_operations:0,passed:errors.length===0,failures:errors};
 writeFileSync(join(dir,'r87-wake-403-405-afterproof.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log('[DIC33 R87 selected source afterproof] '+JSON.stringify(receipt));
 if(errors.length)process.exitCode=1;
}
