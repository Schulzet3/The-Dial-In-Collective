#!/usr/bin/env node
// Issue #33 R118: original #553 current selected product only; frozen oracle unchanged.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fold=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected118=Object.freeze({
 number:553,name:'Organic Honduras',
 url:'https://www.roc2.com/products/organic-honduras',
 own:['A sweet medium roast','hint of honey, caramel, and chocolate','high-altitude farms of Honduras']
});
export function direct118(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const visible=fold(scoped.replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/giu,' ')
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
  .replace(/\s+/gu,' '));
 return {headings,uniqueH1:headings.length===1&&fold(headings[0])===fold(selected118.name),
  direct:selected118.own.map(literal=>({literal,matched:visible.includes(fold(literal))}))};
}
export function fields118Ok(fields){
 if(!fields||typeof fields!=='object')return false;
 const f=k=>fold(fields[k]);
 return f('name')===fold(selected118.name)&&f('origin').includes('honduras')&&f('roast_level')==='medium'&&
 ['honey','caramel','chocolate'].every(t=>f('tasting_notes').includes(t))&&
 !f('process')&&!f('variety')&&!f('producer')&&!f('elevation_m')&&!f('release_label');
}
if(process.env.DIC_ISSUE33_R118_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes=null,report=null,html=null;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'));}catch{}
 try{html=readFileSync(join(dir,'case-553.html'));}catch{}
 const x=report?.records?.[0]||{},direct=direct118(html?.toString('utf8')||'');
 const errors=[],assert=(v,k)=>{if(!v)errors.push(k);};
 assert(JSON.stringify(report?.case_numbers)==='[553]'&&report?.records?.length===1,'exact_original_553');
 assert(report?.source_sha===process.env.GITHUB_SHA,'exact_source_checkout');
 assert(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_unchanged');
 assert(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_or_production_mutation');
 assert(x.status==='FETCHED'&&x.parser_ok===true&&x.selected_heading_identity_verified===true,'real_selected_parser');
 assert(x.official_url===selected118.url&&x.final_url===selected118.url&&x.archived_coffee===selected118.name,'exact_original_selected_identity');
 assert(html&&sha(html)===x.html_sha256&&html.length===x.html_bytes,'current_raw_html_digest');
 assert(direct.uniqueH1&&direct.direct.every(y=>y.matched),'direct_selected_literals');
 assert(fields118Ok(x.current_fields),'current_parser_owned_fields');
 assert(x.add_coffee_ui_rendered===true&&x.source_review_rendered===true,'explicit_Add_Coffee_and_Source_Review');
 assert(Array.isArray(x.conflicts)&&x.conflicts.length===0&&Array.isArray(x.seo_fallback_fields)&&x.seo_fallback_fields.length===0,'no_conflicts_or_seo_only_fields');
 const result={source_sha:report?.source_sha,passed:errors.length===0,failures:errors,
  official_html_sha256:x.html_sha256||null,official_html_bytes:x.html_bytes||null,
  evidence_sha256:bytes?sha(bytes):null,identity:direct,fields:x.current_fields||null,
  conflicts:x.conflicts||[],seo_fallback_fields:x.seo_fallback_fields||[],
  manual_certified:0,production_operations:0,
  qualification:'Direct selected text establishes Medium, Honduras and honey/caramel/chocolate. High-altitude does not establish an elevation; honey is a sensory note, not Honey processing. No individual producer, year, or variety is published.'};
 writeFileSync(join(dir,'r118-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R118 ORIGINAL 553 AFTERPROOF] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}
