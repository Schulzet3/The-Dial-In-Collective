#!/usr/bin/env node
// Issue #33 R119 original #565; selected direct product, not menu/SEO or generic blends.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const fold=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected119=Object.freeze({
 number:565,name:'Espresso',url:'https://www.sidecarcoffee.com/products/espresso',
 direct:['Our house espresso blend, roasted medium-light',
  'blend of washed and natural process coffees',
  'notes of dark chocolate, blueberries and pop rocks']
});
export function direct119(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const visible=fold(scoped.replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/giu,' ')
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
  .replace(/\s+/gu,' '));
 return {headings,uniqueH1:headings.length===1&&fold(headings[0])===fold(selected119.name),
  direct:selected119.direct.map(literal=>({literal,matched:visible.includes(fold(literal))}))};
}
export function fields119Ok(fields){
 if(!fields||typeof fields!=='object')return false;
 const f=k=>fold(fields[k]);
 return f('name')===fold(selected119.name)&&f('roast_level')==='medium light'&&
  f('process')==='other unknown'&&
  ['dark chocolate','blueberries','pop rocks'].every(t=>f('tasting_notes').includes(t))&&
  !f('origin')&&!f('producer')&&!f('variety')&&!f('elevation_m')&&!f('release_label');
}
if(process.env.DIC_ISSUE33_R119_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes=null,report=null,html=null;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'));}catch{}
 try{html=readFileSync(join(dir,'case-565.html'));}catch{}
 const x=report?.records?.[0]||{},direct=direct119(html?.toString('utf8')||'');
 const errors=[],check=(value,name)=>{if(!value)errors.push(name);};
 check(JSON.stringify(report?.case_numbers)==='[565]'&&report?.records?.length===1,'exact_original_565');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_frozen603');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'nonmutating_review');
 check(x.status==='FETCHED'&&x.parser_ok===true&&x.selected_heading_identity_verified===true,'current_selected_primary');
 check(x.official_url===selected119.url&&x.final_url===selected119.url&&x.archived_coffee===selected119.name,'original_selected_exact_url_name');
 check(html&&hash(html)===x.html_sha256&&html.length===x.html_bytes,'raw_html_sha256');
 check(direct.uniqueH1&&direct.direct.every(v=>v.matched),'selected_direct_visible_prose');
 check(fields119Ok(x.current_fields),'actual_parser_mediumlight_mixed_notes_no_unpublished_fields');
 check(x.add_coffee_ui_rendered===true&&x.source_review_rendered===true,'Add_Coffee_and_Source_Review');
 check(Array.isArray(x.conflicts)&&x.conflicts.length===0&&Array.isArray(x.seo_fallback_fields)&&x.seo_fallback_fields.length===0,'no_conflict_or_seo_autofill');
 const result={source_sha:report?.source_sha,passed:errors.length===0,failures:errors,
  selected_product_identity:direct,current_fields:x.current_fields||{},html_bytes:x.html_bytes||null,
  html_sha256:x.html_sha256||null,evidence_sha256:bytes?hash(bytes):null,
  conflicts:x.conflicts||[],seo_fallback_fields:x.seo_fallback_fields||[],
  manual_certified:0,production_operations:0,
  qualification:'Mixed washed/natural COMPONENTS justify Other/Unknown, not one single processing method. Exact house espresso has no selected-country, producer, variety, elevation or harvest claim. Do not borrow Peru Churupampa brown sugar, SEY lot details, or neighboring products.'};
 writeFileSync(join(dir,'r119-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R119 #565 DIRECT SELECTED AFTERPROOF] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}
