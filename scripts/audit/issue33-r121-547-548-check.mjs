#!/usr/bin/env node
// Issue #33 R121: require two exact selected Dope Coffee releases, not the adjacent playlist, cart or SEO.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fold=v=>String(v??'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected121=Object.freeze({
 547:{
  name:'Burundi Kibingo',url:'https://www.realdope.coffee/products/burundi-kibingo',
  origin:'Burundi (Kibingo)',notes:['gently tart aroma','mellow cocoa','smooth finish'],
  direct:['Single-origin. Kibingo, Burundi.','Origin: Burundi (Kibingo)',
    'Roast: Medium','Tasting notes: Gently tart aroma · mellow cocoa · smooth finish'],
  foreign:['jasmine','juicy fruit','nutty finish','Isimbi']
 },
 548:{
  name:'Rwanda Isimbi (S.O.P)',url:'https://www.realdope.coffee/products/rawandan-isimni',
  origin:'Rwanda (Isimbi)',notes:['cocoa','jasmine','juicy fruit','chocolate','nutty finish'],
  direct:['Single-origin. Isimbi, Rwanda.','Origin: Rwanda (Isimbi)',
    'Roast: Medium','Tasting notes: Cocoa · jasmine · juicy fruit · chocolate · nutty finish'],
  foreign:['gently tart aroma','smoothest cup','Kibingo']
 }
});
export function direct121(html,n){
 const sel=selected121[n];if(!sel)throw Error('invalid_case_number');
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const visible=fold(scoped.replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/giu,' ')
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
  .replace(/\s+/gu,' '));
 return {headings,uniqueH1:headings.length===1&&fold(headings[0])===fold(sel.name),
   direct:sel.direct.map(literal=>({literal,matched:visible.includes(fold(literal))}))};
}
export function fields121Ok(fields,n){
 const sel=selected121[n];if(!sel||!fields||typeof fields!=='object')return false;
 const f=k=>fold(fields[k]);
 return f('name')===fold(sel.name)&&f('origin')===fold(sel.origin)&&
  f('roast_level')==='medium'&&sel.notes.every(note=>f('tasting_notes').includes(fold(note)))&&
  sel.foreign.every(term=>![f('origin'),f('tasting_notes'),f('producer')].some(v=>v.includes(fold(term))))&&
  ['process','producer','variety','elevation_m','decaffeination_method'].every(k=>!fields[k]);
}
if(process.env.DIC_ISSUE33_R121_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let evidence=null,raw=null;
 try{raw=readFileSync(join(dir,'focused-current-evidence.json'));evidence=JSON.parse(raw.toString('utf8'))}catch{}
 const failures=[],check=(ok,label)=>{if(!ok)failures.push(label)};
 check(JSON.stringify(evidence?.case_numbers)==='[547,548]'&&evidence?.records?.length===2,'exact_two_original_cases');
 check(evidence?.source_sha===process.env.GITHUB_SHA,'exact_checked_out_source_sha');
 check(evidence?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_source_sha');
 check(evidence?.original_corpus_modified===false&&evidence?.manual_certified===0&&evidence?.production_operations===0,'no_unauthorized_scope_or_corpus_certification');
 const details=[];
 for(const n of [547,548]){
  const s=selected121[n],r=evidence?.records?.find(x=>x.number===n)||{};
  let html=null;try{html=readFileSync(join(dir,'case-'+n+'.html'))}catch{}
  const d=direct121(html?.toString('utf8')||'',n);
  check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,n+'_official_parser_selected_identity');
  check(r.official_url===s.url&&r.final_url===s.url&&r.archived_coffee===s.name,n+'_exact_selected_url_and_coffee');
  check(html&&sha(html)===r.html_sha256&&html.length===r.html_bytes,n+'_actual_html_hash_and_bytes');
  check(d.uniqueH1&&d.direct.every(y=>y.matched),n+'_direct_selected_literals');
  check(fields121Ok(r.current_fields,n),n+'_parser_fields_and_no_borrowed_attributes');
  check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,n+'_add_coffee_and_source_review');
  check(Array.isArray(r.conflicts)&&r.conflicts.length===0,n+'_no_selected_conflicts');
  check(Array.isArray(r.seo_fallback_fields)&&r.seo_fallback_fields.length===0,n+'_no_metadata_only_fallback');
  details.push({number:n,source_url:r.final_url,html_sha256:r.html_sha256,html_bytes:r.html_bytes,
   selected_identity:d,parsed:r.current_fields,conflicts:r.conflicts,seo_fallback_fields:r.seo_fallback_fields});
 }
 const verdict={source_sha:evidence?.source_sha,passed:failures.length===0,failures,
  evidence_sha256:raw?sha(raw):null,details,manual_certified:0,production_operations:0,
  boundary:'Two exact selected official product identities. Burundi gently tart/mellow cocoa/smooth finish cannot borrow Rwanda jasmine/juicy fruit/nutty finish; medium-light body is not a light roast. Unpublished farm, cultivar, elevation, processing and producer stay blank; recommendation/SEO/cart excluded. Source-run validation is not global 603 certification.'};
 writeFileSync(join(dir,'r121-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
 console.log('[DIC33 R121 CURRENT SELECTED AFTERPROOF] '+JSON.stringify(verdict));
 if(failures.length)process.exitCode=1;
}