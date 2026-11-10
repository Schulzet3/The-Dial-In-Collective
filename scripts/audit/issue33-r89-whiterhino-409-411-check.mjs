#!/usr/bin/env node
// R89: exact original603 White Rhino #409-411; current selected source only, NOT whole-corpus certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/&(?:amp|nbsp);/gi,' ').replace(/[^a-z0-9]+/g,' ').trim();
const plain=s=>String(s||'').replace(/<!--[\s\S]*?-->/g,' ')
 .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
 .replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/giu,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp);/gi,' ').replace(/\s+/g,' ').trim();
const cases={
 409:{name:'Decaf',url:'https://whiterhinocoffee.com/products/decaf',
  phrases:['Swiss Water Process','Guatemala','Washed','1320','Caramel Apple','Black Tea','Raisin']},
 410:{name:'Ethiopia Kayon Mountain',url:'https://whiterhinocoffee.com/products/ethiopia-kayon-mountain',
  phrases:['Kayon Mountain Coffee Farm','Ismael Hassen','Oromia','Guji','Shakiso','Washed','1900','Nectarine','Jasmine','Toffee','Honeysuckle']},
 411:{name:'Hidden Eagle (Espresso Blend)',url:'https://whiterhinocoffee.com/products/hidden-eagle-espresso',
  phrases:['Natural Brazil','Washed Peru','Cocoa','Nut Butter','Honey','Dried Apricot','Caramel','900-1800']}
};
export function selectedWhiteRhinoChecks(number,markup,headings){
 const c=cases[number];if(!c)throw Error('unsupported_selected_case');
 const prose=norm(plain(markup));
 const ownSourcePhrases=c.phrases.map(p=>prose.includes(norm(p)));
 return {uniqueSelected:Array.isArray(headings)&&headings.length===1&&norm(headings[0])===norm(c.name),
  ownDescription:ownSourcePhrases.every(Boolean),ownSourcePhrases};
}
if(process.env.DIC_ISSUE33_R89_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 const errors=[],check=(ok,code)=>{if(!ok)errors.push(code)};
 let report,raw;try{raw=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(raw.toString('utf8'))}catch{}
 check(JSON.stringify(report?.case_numbers)==='[409,410,411]'&&report?.records?.length===3,'exact_three_original_cases');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_sha256');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'corpus_and_production_boundaries');
 const detail=[];
 for(const number of [409,410,411]){
  const c=cases[number],r=report?.records?.find(x=>x.number===number)||{},f=r.current_fields||{};
  let html;try{html=readFileSync(join(dir,'case-'+number+'.html'))}catch{}
  const selected=productMarkup(html?.toString('utf8')||'');
  const headings=selectedProductHeadings(selected),direct=selectedWhiteRhinoChecks(number,selected,headings);
  let final;try{final=new URL(r.final_url)}catch{}
  const expected=new URL(c.url);
  check(r.archived_coffee===c.name&&r.official_url===c.url,number+'_immutable_exact_url');
  check(final?.protocol==='https:'&&['whiterhinocoffee.com','www.whiterhinocoffee.com'].includes(final?.hostname)
   &&final?.pathname.replace(/\/$/,'')===expected.pathname&&!final?.search&&!final?.hash,number+'_final_same_product_url');
  check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,number+'_fetched_selected_parser');
  check(html&&r.html_sha256===sha(html)&&r.html_bytes===html.length,number+'_raw_source_sha');
  check(direct.uniqueSelected&&direct.ownDescription,number+'_own_product_prose_not_navigation');
  check(norm(f.name)===norm(c.name)&&/white rhino/i.test(f.roaster||''),number+'_correct_coffee_identity');
  check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,number+'_add_coffee_and_review');
  check((r.conflicts||[]).length===0,number+'_no_extraction_conflicts');
  if(number===409){
   check(f.roast_level==='Medium'&&/guatemala/i.test(f.origin||''),number+'_own_roast_origin');
   check(f.process==='Washed'&&/water/i.test(f.decaffeination_method||''),number+'_washed_and_water_decaf');
   check(['caramel apple','black tea','raisin'].every(p=>norm(f.tasting_notes).includes(p)),number+'_own_three_tasting_notes');
   check(/1320/.test(f.elevation_m||'')&&/1600/.test(f.elevation_m||''),number+'_selected_elevation');
   check(!/kayon|peru|brazil/i.test(JSON.stringify(f)),number+'_no_adjacent_coffee');
  }else if(number===410){
   check(f.roast_level==='Light'&&f.process==='Washed',number+'_own_roast_process');
   check(/ethiopia/i.test(f.origin||'')&&/guji/i.test(f.origin||'')&&/shakiso/i.test(f.origin||''),number+'_own_origin');
   check(/ismael hassen/i.test(f.producer||''),number+'_named_current_farm_owner');
   check(['nectarine','jasmine','toffee','honeysuckle'].every(p=>norm(f.tasting_notes).includes(p)),number+'_own_four_notes');
   check(/1900/.test(f.elevation_m||'')&&/2200/.test(f.elevation_m||''),number+'_primary_selected_elevation');
   check(!/colombia|peru|brazil/i.test(f.origin||''),number+'_no_lower_generic_panel_origin');
  }else{
   check(f.roast_level==='Medium',number+'_own_medium');
   check(/brazil/i.test(f.origin||'')&&/peru/i.test(f.origin||''),number+'_two_own_blend_origins');
   check(['cocoa','nut butter','honey','dried apricot','caramel'].every(p=>norm(f.tasting_notes).includes(p)),number+'_own_five_notes');
   check(!/guatemala|kayon|ethiopia/i.test(f.origin||''),number+'_no_other_origin');
   check(!f.decaffeination_method,number+'_no_neighbor_decaf');
  }
  detail.push({number,final_url:r.final_url,html_sha256:html?sha(html):null,headings,direct,fields:f,conflicts:r.conflicts||[]});
 }
 const receipt={source_sha:report?.source_sha,case_numbers:[409,410,411],evidence_sha256:raw?sha(raw):null,
  detail,manual_certified:0,production_operations:0,passed:errors.length===0,failures:errors};
 writeFileSync(join(dir,'r89-whiterhino-409-411-afterproof.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log('[DIC33 R89 selected original source afterproof] '+JSON.stringify(receipt));
 if(errors.length)process.exitCode=1;
}