#!/usr/bin/env node
// Issue #33 R110: exact original #556/#557 selected official product validation (not all603 certification).
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fold=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected110=Object.freeze({
 556:{name:'Family Tradition - Brazilian Coffee, Seibt Family Farm, Cerrado Mineiro Region',
      url:'https://www.rossstreetroasting.com/products/family-tradition-brazilian-coffee-seibt-family-farm-cerrado-mineiro-region',
      own:['Roast level: Medium-Dark','Origin: Seibt Family Farm, Cerrado Mineiro Region, Brazil','Elevation: 900 masl']},
 557:{name:'Kula Peaberry - Papua New Guinea Light-Medium Roast Relationship Coffee',
      url:'https://www.rossstreetroasting.com/products/kula-peaberry-papua-new-guinea',
      own:['Tasting notes: Sweet aroma, chocolate','Roast color: Light-Medium','Country: Papua New Guinea',
           'Region: Waghi Valley','Farm: Sigri Estate','Tree variety: Predominantly Typica','Elevation: 1,500-1,600 masl']}
});
export function currentDirect110(html,n){
 const spec=selected110[n];if(!spec)throw Error('wrong_frozen_case');
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const visible=fold(scoped
  .replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/giu,' ')
  .split(/<h[23][^>]*>\s*Customer Reviews/i)[0]
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ').replace(/\s+/gu,' '));
 return {headings,uniqueH1:headings.length===1&&fold(headings[0])===fold(spec.name),
  direct:spec.own.map(literal=>({literal,matched:visible.includes(fold(literal))}))};
}
export function selected110FieldsOk(n,fields){
 if(!fields||typeof fields!=='object')return false;
 const f=k=>fold(fields[k]);
 if(n===556)return f('name')===fold(selected110[556].name)&&
  f('origin').includes('brazil')&&f('origin').includes('cerrado')&&
  f('roast_level')==='medium dark'&&/900/.test(f('elevation_m'))&&
  !f('tasting_notes')&&!f('process');
 if(n===557)return f('name')===fold(selected110[557].name)&&
  f('origin').includes('papua new guinea')&&f('origin').includes('waghi')&&
  f('roast_level')==='medium light'&&/1500/.test(f('elevation_m'))&&
  /typica/.test(f('variety'))&&['chocolate','raisin','earthy'].every(t=>f('tasting_notes').includes(t));
 return false;
}
if(process.env.DIC_ISSUE33_R110_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let report=null,bytes=null;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'));}catch{}
 const errors=[],assert=(condition,key)=>{if(!condition)errors.push(key);};
 assert(JSON.stringify(report?.case_numbers)==='[556,557]'&&report?.records?.length===2,'exact_selected_subset');
 assert(report?.source_sha===process.env.GITHUB_SHA,'exact_ci_sha');
 assert(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_csv');
 assert(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_false_cert_or_writes');
 const cases=[];
 for(const n of [556,557]){
  const x=report?.records?.find(c=>c.number===n)||{},fields=x.current_fields||{};
  let html=null;try{html=readFileSync(join(dir,'case-'+n+'.html'));}catch{}
  const direct=currentDirect110(html?.toString('utf8')||'',n);
  assert(x.status==='FETCHED'&&x.parser_ok===true&&x.selected_heading_identity_verified===true,'live_parser_identity_'+n);
  assert(x.official_url===selected110[n].url&&x.final_url===x.official_url,'selected_exact_url_'+n);
  assert(x.archived_coffee===selected110[n].name,'frozen_selected_identity_'+n);
  assert(html&&sha(html)===x.html_sha256&&html.length===x.html_bytes,'raw_official_source_hash_'+n);
  assert(direct.uniqueH1&&direct.direct.every(f=>f.matched),'current_selected_primary_spec_'+n);
  assert(selected110FieldsOk(n,fields),'actual_parser_fields_'+n);
  assert(x.add_coffee_ui_rendered===true&&x.source_review_rendered===true,'add_coffee_and_source_review_'+n);
  cases.push({number:n,source_sha256:x.html_sha256,bytes:x.html_bytes,headings:direct.headings,direct:direct.direct,
   fields,conflicts:x.conflicts||[],seo_fallback_fields:x.seo_fallback_fields||[]});
 }
 const result={source_sha:report?.source_sha,passed:errors.length===0,failures:errors,
  source_evidence_sha256:bytes?sha(bytes):null,cases,manual_certified:0,production_operations:0};
 writeFileSync(join(dir,'r110-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[ISSUE33 R110 SELECTED SOURCE AFTERPROOF] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}
