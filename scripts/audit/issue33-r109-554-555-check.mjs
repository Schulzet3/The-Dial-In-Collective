#!/usr/bin/env node
// #33 R109: original #554/555 selected current official source; not global frozen certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const fold=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected109=Object.freeze({
  554:{name:'Organic Mexican',url:'https://www.roc2.com/products/organic-mexican',own:[
    'A well-balanced lighter roast','molasses, caramel, and lemongrass tasting notes',
    'Sourced from organic Mexican farms']},
  555:{name:'Organic Timor',url:'https://www.roc2.com/products/organic-timor',own:[
    'single-origin medium roast','pineapple and fresh orange juice',
    'smooth finish of raw sugar']}
});
export function currentDirect109(html,number){
 const spec=selected109[number];if(!spec)throw Error('case_not_selected');
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const visible=fold(scoped.replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/giu,' ')
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
  .replace(/\s+/gu,' '));
 return {headings,uniqueH1:headings.length===1&&fold(headings[0])===fold(spec.name),
  direct:spec.own.map(literal=>({literal,matched:visible.includes(fold(literal))}))};
}
export function selected109FieldsOk(number,fields){
 if(!fields||typeof fields!=='object')return false;
 const f=k=>fold(fields[k]);
 if(number===554)return f('name')===fold(selected109[554].name)&&
   f('origin').includes('mexico')&&['molasses','caramel','lemongrass'].every(t=>f('tasting_notes').includes(t))&&
   !f('roast_level')&&!f('elevation_m')&&!f('process')&&!f('variety')&&!f('producer');
 if(number===555)return f('name')===fold(selected109[555].name)&&
   f('origin').includes('timor')&&f('roast_level')==='medium'&&
   ['pineapple','orange juice','raw sugar'].every(t=>f('tasting_notes').includes(t))&&
   !f('process')&&!f('elevation_m')&&!f('producer');
 return false;
}
if(process.env.DIC_ISSUE33_R109_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let report=null,bytes=null;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'))}catch{}
 const errors=[],assert=(v,k)=>{if(!v)errors.push(k);};
 assert(JSON.stringify(report?.case_numbers)==='[554,555]'&&report?.records?.length===2,'exact_selected_cohort');
 assert(report?.source_sha===process.env.GITHUB_SHA,'exact_ci_checkout');
 assert(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_immutable');
 assert(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_unsupported_certification_or_writes');
 const cases=[];
 for(const number of [554,555]){
  const x=report?.records?.find(y=>y.number===number)||{},fields=x.current_fields||{};
  let html=null;try{html=readFileSync(join(dir,'case-'+number+'.html'))}catch{}
  const p=currentDirect109(html?.toString('utf8')||'',number);
  assert(x.status==='FETCHED'&&x.parser_ok===true&&x.selected_heading_identity_verified===true,'real_product_parser_'+number);
  assert(x.official_url===selected109[number].url&&x.final_url===x.official_url,'no_product_replacement_'+number);
  assert(x.archived_coffee===selected109[number].name,'immutable_selected_identity_'+number);
  assert(html&&sha(html)===x.html_sha256&&html.length===x.html_bytes,'raw_source_sha_'+number);
  assert(p.uniqueH1&&p.direct.every(y=>y.matched),'current_product_direct_literals_'+number);
  assert(selected109FieldsOk(number,fields),'current_parser_exact_fields_'+number);
  assert(x.add_coffee_ui_rendered===true&&x.source_review_rendered===true,'explicit_add_coffee_review_'+number);
  cases.push({number,bytes:x.html_bytes,html_sha256:x.html_sha256,headings:p.headings,
   direct:p.direct,fields,conflicts:x.conflicts||[],seo_fallback_fields:x.seo_fallback_fields||[]});
 }
 const result={source_sha:report?.source_sha,passed:errors.length===0,failures:errors,
  source_evidence_sha256:bytes?sha(bytes):null,cases,manual_certified:0,production_operations:0};
 writeFileSync(join(dir,'r109-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[ISSUE33 R109 SELECTED CURRENT SOURCE AFTERPROOF] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}
