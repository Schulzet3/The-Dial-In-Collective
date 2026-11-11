#!/usr/bin/env node
// #33 R120 original selected #568: do not transfer Honduras or other coffee facts.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fold=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected120=Object.freeze({
 number:568,name:'El Salvador - Finca La Esperanza',
 url:'https://www.slowburncoffee.com/products/el-salvador-finca-la-esperanza',
 direct:['Tasting notes: Jasmine Mochi, Blueberry Pie, Brown Butter',
  'farm is managed by the Alvarez family','Farm: Finca La Esperanza',
  'Region: La Libertad','Varietals: Bourbon',
  'Processing: Natural','Altitude: 1,000-1,450 meters']
});
export function direct120(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const visible=fold(scoped.replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/giu,' ')
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
  .replace(/\s+/gu,' '));
 return {headings,uniqueH1:headings.length===1&&fold(headings[0])===fold(selected120.name),
  direct:selected120.direct.map(literal=>({literal,matched:visible.includes(fold(literal))}))};
}
export function fields120Ok(fields){
 if(!fields||typeof fields!=='object')return false;
 const f=k=>fold(fields[k]),e=String(fields.elevation_m||'').replace(/[^0-9]/g,'');
 const notes=f('tasting_notes');
 return f('name')===fold(selected120.name)&&f('origin').includes('el salvador')&&
  f('process')==='natural'&&f('variety').includes('bourbon')&&
  ['jasmine mochi','blueberry pie','brown butter'].every(n=>notes.includes(n))&&
  e.includes('1000')&&e.includes('1450')&&
  !['honduras','padilla','gerardo','milk chocolate','almond','pop rocks'].some(
   n=>[f('origin'),f('producer'),notes].some(v=>v.includes(n)));
}
if(process.env.DIC_ISSUE33_R120_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes=null,html=null,report=null;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'));}catch{}
 try{html=readFileSync(join(dir,'case-568.html'));}catch{}
 const x=report?.records?.[0]||{},d=direct120(html?.toString('utf8')||'');
 const failures=[],check=(ok,label)=>{if(!ok)failures.push(label);};
 check(JSON.stringify(report?.case_numbers)==='[568]'&&report?.records?.length===1,'exact_original_568');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_original603_unchanged');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_or_production_mutation');
 check(x.status==='FETCHED'&&x.parser_ok===true&&x.selected_heading_identity_verified===true,'official_current_selected_parser');
 check(x.official_url===selected120.url&&x.final_url===selected120.url&&x.archived_coffee===selected120.name,'exact_original_current_url_and_coffee');
 check(html&&sha(html)===x.html_sha256&&html.length===x.html_bytes,'raw_official_html_hash');
 check(d.uniqueH1&&d.direct.every(z=>z.matched),'selected_identity_direct_product_text');
 check(fields120Ok(x.current_fields),'actual_parser_selected_farm_notes_natural_variety_elevation');
 check(x.add_coffee_ui_rendered===true&&x.source_review_rendered===true,'Add_Coffee_and_Source_Review');
 check(Array.isArray(x.conflicts)&&x.conflicts.length===0,'no_selected_field_conflicts');
 check(Array.isArray(x.seo_fallback_fields)&&x.seo_fallback_fields.length===0,'no_seo_only_fields');
 const result={source_sha:report?.source_sha,passed:failures.length===0,failures,
  current_identity:d,current_fields:x.current_fields||{},html_bytes:x.html_bytes||null,
  html_sha256:x.html_sha256||null,evidence_sha256:bytes?sha(bytes):null,
  conflicts:x.conflicts||[],seo_fallback_fields:x.seo_fallback_fields||[],
  manual_certified:0,production_operations:0,
  boundary:'Alvarez family is current named farm manager, not independent proof of sole cherry producer. Preserve chosen #568 natural Bourbon and jasmine mochi/blueberry pie/brown butter; reject Honduras and other recommended coffees. No inferred roast or harvest.'};
 writeFileSync(join(dir,'r120-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R120 #568 EXACT CURRENT AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
