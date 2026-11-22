#!/usr/bin/env node
// R259 exact original selected Dueling Rabbits official-product afterproof; no member or provider effects.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const ownText=html=>norm(String(html||'').replace(/<!--[^]*?-->/g,' ').replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[^]*?<\/\1>/giu,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:nbsp|amp);/giu,' ').replace(/\s+/g,' '));
export const entries=Object.freeze([
 {number:481,name:'Burundi - Amasho',url:'https://www.duelingrabbits.com/products/burundi-amasho',proof:['Brown Sugar','Red Apple','Gatara','Kayanza','Masha','Washed','Red Bourbon','1,600','Medium']},
 {number:482,name:'Ecuador - Finca San Pablo',url:'https://www.duelingrabbits.com/products/ecuador-finca-san-pablo',proof:['Grapefruit','Cocoa','Pichincha','Pablo Ponce','Washed','Sidra','2450','Medium']}
]);
export function identityProof(n,html,headings){
 const e=entries.find(x=>x.number===n);
 return {selected:Array.isArray(headings)&&headings.length===1&&norm(headings[0])===norm(e.name),
  own_fields:e.proof.every(x=>ownText(html).includes(norm(x)))};
}
export function fieldProof(n,f){
 const e=entries.find(x=>x.number===n),note=norm(f.tasting_notes),ori=norm(f.origin),v=norm(f.variety),
  h=String(f.elevation_m||'').replace(/[^0-9]/g,'');
 const common={name:norm(f.name)===norm(e.name),roaster:/dueling rabbits/i.test(f.roaster||''),
  process:f.process==='Washed',roast:f.roast_level==='Medium',
  no_fabricated_decaf:!f.decaffeination_method,no_fabricated_release:!f.release_label&&!f.harvest_year,
  no_unrelated_location:!/italy|milan|delaware|wilmington|kenya|ethiopia|guatemala/i.test(f.origin||'')};
 if(n===481)return {...common,notes:['brown sugar','red apple'].every(x=>note.includes(x)),
  origin:['burundi','gatara','kayanza'].every(x=>ori.includes(x)),producer:/masha/i.test(f.producer||''),
  variety:v.includes('red bourbon'),elevation:h.includes('1600')&&h.includes('1700')};
 return {...common,notes:['grapefruit','cocoa'].every(x=>note.includes(x)),
  origin:['ecuador','pichincha'].every(x=>ori.includes(x)),producer:/pablo ponce/i.test(f.producer||''),
  variety:v.includes('sidra'),elevation:h.includes('2450')};
}
if(process.env.DIC_R259_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
 const problems=[],assert=(ok,code)=>{if(!ok)problems.push(code)};
 let bytes,report;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes);}catch{}
 assert(JSON.stringify(report?.case_numbers)==='[481,482]'&&report?.records?.length===2,'exact_original_subset');
 assert(report?.source_sha===process.env.DIC_R259_EVENT_SHA,'event_source_sha');
 assert(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R259_CHECKOUT_SHA,'exact_checkout_source_sha');
 assert(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_original603_csv_digest');
 assert(report?.original_corpus_modified===false&&report?.production_operations===0&&report?.manual_certified===0,'unmodified_history_no_claims');
 const items=[];
 for(const e of entries){
  const r=report?.records?.find(x=>x.number===e.number)||{},f=r.current_fields||{};
  let html;try{html=readFileSync(join(dir,'case-'+e.number+'.html'));}catch{}
  const selected=productMarkup(html?.toString('utf8')||''),headings=selectedProductHeadings(selected);
  const own=identityProof(e.number,selected,headings),fieldChecks=fieldProof(e.number,f);
  let final;try{final=new URL(r.final_url)}catch{}
  const expected=new URL(e.url);
  assert(r.official_url===e.url&&r.archived_coffee===e.name,e.number+'_original_row');
  assert(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,e.number+'_live_parser_selected_identity');
  assert(html?.length>0&&r.html_bytes===html.length&&r.html_sha256===sha(html),e.number+'_raw_html_digest_and_bytes');
  assert(final?.protocol==='https:'&&final?.hostname===expected.hostname&&final?.pathname.replace(/\/$/,'')===expected.pathname&&!final.search&&!final.hash,e.number+'_same_exact_selected_url');
  assert(own.selected&&own.own_fields,e.number+'_current_direct_product_witness');
  assert(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,e.number+'_Add_Coffee_and_Source_Review');
  assert((r.conflicts||[]).length===0,e.number+'_no_unresolved_canonical_conflict');
  for(const [k,value] of Object.entries(fieldChecks))assert(value,e.number+'_'+k);
  items.push({number:e.number,current_url:r.final_url,status:r.status,html_sha256:html?sha(html):null,html_bytes:html?.length||0,selected_headings:headings,own,fieldChecks,fields:f,conflicts:r.conflicts||[]});
 }
 const result={source_sha:report?.source_sha,checkout_sha:process.env.DIC_R259_CHECKOUT_SHA,evidence_sha256:bytes?sha(bytes):null,
  items,errors:problems,passed:problems.length===0,manual_certified:0,production_operations:0};
 writeFileSync(join(dir,'r259-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[ISSUE33 R259 ORIGINAL481/482] '+JSON.stringify(result));
 if(problems.length)process.exitCode=1;
}
