#!/usr/bin/env node
// Issue #33 R79: selected #72/#78 official-source validation; #69 is separate diagnostic only.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fold=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
const text=html=>String(html||'').replace(/<!--[\s\S]*?-->/gu,' ')
 .replace(/<(script|style|template|noscript|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
 .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|#160);/giu,' ')
 .replace(/&amp;/giu,'&').replace(/\s+/gu,' ').trim();
export function selected72(markup,headings){
 const t=text(markup);
 return {
  identity:Array.isArray(headings)&&headings.length===1&&fold(headings[0])==='sumatra',
  namedCountry:/\bCountry of Origin:\s*Sumatra\b/iu.test(t),
  namedRegion:/\bRegion:\s*Mandheling\b/iu.test(t),
  explicitRoast:/\bRoast Level:\s*Dark\b/iu.test(t),
  explicitNotes:/\bIn the Cup:\s*Baker['’]s Chocolate,\s*Syrupy,\s*Dark Cherry,\s*Sweet Lemon acidity,\s*Earthy\b/iu.test(t)
 };
}
export function selected78(markup,headings){
 const t=text(markup);
 return {
  identity:Array.isArray(headings)&&headings.length===1&&fold(headings[0])==='peace love caffeine',
  namedBlend:/\bPeace,\s*Love\s*&\s*Caffeine is our Vietnamese-style roast that blends earthy Robusta beans with Arabica beans\b/iu.test(t),
  directNotes:/\bnotes of long pepper,\s*root beer,\s*and cherry spice\b/iu.test(t),
  naturalNotesCaption:/\bNatural Notes:\s*Long Pepper-Root Beer-Cherry Spice\b/iu.test(t)
 };
}
if(process.env.DIC_ISSUE33_R79_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'');
 mkdirSync(dir,{recursive:true});
 const failures=[],check=(ok,k)=>{if(!ok)failures.push(k)};
 let bytes=null,report=null;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString());}catch{}
 check(JSON.stringify(report?.case_numbers)==='[72,78]'&&report?.records?.length===2,'exact_two_cases');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_csv_sha');
 check(report?.manual_certified===0&&report?.production_operations===0&&report?.real_auth===false&&report?.original_corpus_modified===false,'preservation');
 const expected={
  72:{name:'Sumatra',url:'https://coppercanyoncoffee.com/products/sumatra',host:'coppercanyoncoffee.com',path:'/products/sumatra'},
  78:{name:'Peace, Love & Caffeine',url:'https://craftsmancliffroasters.com/products/vietnamese-roast',host:'craftsmancliffroasters.com',path:'/products/vietnamese-roast'}
 };
 const evidence=[];
 for(const n of [72,78]){
  const e=expected[n],r=report?.records?.find(x=>x.number===n)||{},f=r.current_fields||{};
  let raw=null;try{raw=readFileSync(join(dir,'case-'+n+'.html'));}catch{}
  const u=(()=>{try{return new URL(r.final_url)}catch{return null}})();
  check(r.archived_coffee===e.name&&r.official_url===e.url,'original_selected_'+n);
  check(u?.protocol==='https:'&&u?.hostname===e.host&&u?.pathname===e.path&&!u.search&&!u.hash,'exact_redirect_'+n);
  check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'fetched_real_parser_selected_'+n);
  check(!!raw&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'raw_selected_hash_'+n);
  const selected=productMarkup(raw?.toString('utf8')||''),headings=selectedProductHeadings(selected);
  const facts=n===72?selected72(selected,headings):selected78(selected,headings);
  for(const [k,v] of Object.entries(facts))check(v,'current_selected_'+n+'_'+k);
  check(f.name===e.name,'parsed_name_'+n);
  if(n===72){
   check(String(f.origin||'').toLowerCase().includes('mandheling')&&String(f.origin||'').toLowerCase().includes('sumatra'),'named_region_'+n);
   check(String(f.roast_level||'').toLowerCase()==='dark','named_roast_'+n);
   for(const token of ['chocolate','dark cherry','lemon','earthy'])
    check(String(f.tasting_notes||'').toLowerCase().includes(token),'selected_notes_'+n+'_'+token);
   // Generic regional wet-hulling discussion does not prove this lot's process.
   check(!f.process,'educational_method_not_selected_process_'+n);
  } else {
   for(const token of ['long pepper','root beer','cherry spice'])
    check(String(f.tasting_notes||'').toLowerCase().includes(token),'selected_notes_'+n+'_'+token);
   // Vietnamese-style roast is not country of origin; Natural Notes is a flavor caption.
   check(!f.origin,'vietnamese_style_not_country_'+n);
   check(!f.process,'natural_notes_not_process_'+n);
   check(!f.roast_level,'roast_style_not_numeric_grade_'+n);
  }
  check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'add_coffee_review_'+n);
  check(!(r.conflicts||[]).some(c=>/name|origin|process|roast|tasting/iu.test(JSON.stringify(c))),'current_conflicts_'+n);
  evidence.push({number:n,source_sha256:raw?sha(raw):null,headings,direct_facts:facts,parser_fields:f,conflicts:r.conflicts||[]});
 }
 const verdict={source_sha:report?.source_sha,report_sha256:bytes?sha(bytes):null,manual_certified:0,production_operations:0,evidence,passed:failures.length===0,failures};
 writeFileSync(join(dir,'r79-72-78-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
 console.log('[DIC33 R79 SELECTED] '+JSON.stringify(verdict));
 if(failures.length)process.exitCode=1;
}
