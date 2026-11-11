#!/usr/bin/env node
// Issue #33 R108: bounded current selected official #551/#552, not frozen603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const fold=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected108=Object.freeze({
  551:{name:'Uganda Organic',url:'https://www.roasted-beans.com/products/uganda-organic',
    own:['Flavor Notes','Dark Chocolate, Raisins, Vanilla','Elevation: 1300 to 2000 meters',
      'Varietals: Bourbon,Kenya SL14,Kenya SL28','Milling Process: Fully Washed',
      'Kapchorwa, Bulambuli and Kween districts on Mt. Elgon']},
  552:{name:'Zambia Natural Gold- Single Origin',url:'https://www.roasted-beans.com/products/zambia-natural-gold-single-origin',
    own:['Dried blueberry, peach, lavender, chocolate','Country of Origin','Zambia',
      'Northern Province','Isanya Estate','Natural/Dry Processed','1600m',
      '2020/21','Catimor 129, Java']}
});
export function currentDirectProof(html,number){
  const scoped=productMarkup(String(html||''));
  const headings=selectedProductHeadings(scoped);
  const own=fold(scoped.replace(/<!--[\s\S]*?-->/gu,' ')
    .replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/giu,' ')
    .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
    .replace(/\s+/gu,' '));
  const spec=selected108[number];
  if(!spec)throw Error('unsupported_case');
  return {headings,uniqueH1:headings.length===1&&fold(headings[0])===fold(spec.name),
    direct:spec.own.map(literal=>({literal,matched:own.includes(fold(literal))}))};
}
export function selected108FieldsOk(number,fields){
  if(!fields||typeof fields!=='object')return false;
  const f=k=>fold(fields[k]);
  if(number===551)return f('name')===fold(selected108[551].name)&&
    f('origin').includes('uganda')&&f('process').includes('washed')&&
    ['1300','2000'].every(x=>f('elevation_m').includes(x))&&
    ['bourbon','sl14','sl28'].every(x=>f('variety').includes(x))&&
    !/^:/.test(String(fields.variety||'').trim())&&
    ['dark chocolate','raisins','vanilla'].every(x=>f('tasting_notes').includes(x));
  if(number===552)return f('name')===fold(selected108[552].name)&&
    f('origin').includes('zambia')&&f('process').includes('natural')&&
    f('producer').includes('isanya')&&f('elevation_m').includes('1600')&&
    ['catimor','java'].every(x=>f('variety').includes(x))&&
    ['blueberry','peach','lavender','chocolate'].every(x=>f('tasting_notes').includes(x));
  return false;
}
if(process.env.DIC_ISSUE33_R108_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw=null,bytes=null,report=null;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'))}catch{}
 const fail=[],check=(v,s)=>{if(!v)fail.push(s)};
 check(JSON.stringify(report?.case_numbers)==='[551,552]'&&report?.records?.length===2,'two_original_selected_cases_only');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_ci_checkout');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_csv_sha256');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_certification_or_provider_write');
 const cases=[];
 for(const number of [551,552]){
   const x=report?.records?.find(q=>q.number===number)||{}, f=x.current_fields||{};
   try{raw=readFileSync(join(dir,'case-'+number+'.html'))}catch{raw=null}
   const proof=currentDirectProof(raw?.toString('utf8')||'',number);
   check(x.status==='FETCHED'&&x.parser_ok===true&&x.selected_heading_identity_verified===true,'current_fetched_and_identity_'+number);
   check(x.official_url===selected108[number].url&&x.final_url===x.official_url,'exact_selected_url_'+number);
   check(x.archived_coffee===selected108[number].name,'original_frozen_identity_'+number);
   check(!!raw&&raw.length===x.html_bytes&&sha(raw)===x.html_sha256,'raw_source_integrity_'+number);
   check(proof.uniqueH1&&proof.direct.every(y=>y.matched),'unique_selected_H1_and_direct_published_facts_'+number);
   check(selected108FieldsOk(number,f),'real_parser_fields_require_source_'+number);
   check(x.add_coffee_ui_rendered===true&&x.source_review_rendered===true,'explicit_Add_Coffee_Source_Review_'+number);
   cases.push({number,html_sha256:x.html_sha256||null,html_bytes:x.html_bytes||null,
     h1:proof.headings,direct:proof.direct,current_fields:f,conflicts:x.conflicts||[]});
 }
 const result={source_sha:report?.source_sha,passed:fail.length===0,failures:fail,cases,
   source_evidence_sha256:bytes?sha(bytes):null,manual_certified:0,production_operations:0};
 writeFileSync(join(dir,'r108-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R108 CURRENT SELECTED PROOF] '+JSON.stringify(result));
 if(fail.length)process.exitCode=1;
}
