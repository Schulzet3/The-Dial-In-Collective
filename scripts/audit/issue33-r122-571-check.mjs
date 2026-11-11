#!/usr/bin/env node
// #33 R122: exact selected Stage Line blended-processing contract, not universal 603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fold=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const selected122=Object.freeze({
 number:571, name:'Brazil Capricornio Dulce Signature',
 url:'https://www.stageline.coffee/product-page/brazil-capricornio-dulce-signature',
 own:['50% naturally processed yellow catuai cherries','50% honey processed mondo novo cherries',
 'Dulce is part of their signature series'],
 foreign:['jasmine mochi','nano challa','orange blossom','brown butter']
});
export function direct122(html){
 const product=productMarkup(String(html||''));
 const headings=selectedProductHeadings(product);
 const visible=fold(product.replace(/<!--[\\s\S]*?-->/g,' ')
   .replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/gi,' ')
   .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:nbsp|amp);/gi,' ').replace(/\s+/g,' '));
 return {headings,uniqueH1:headings.length===1&&fold(headings[0])===fold(selected122.name),
 own:selected122.own.map(s=>({literal:s,matched:visible.includes(fold(s))}))};
}
export function fields122Ok(fields){
 if(!fields||typeof fields!=='object')return false;
 const f=k=>fold(fields[k]);
 return f('name')===fold(selected122.name)&&f('origin').includes('brazil')&&
  (!fields.process||f('process')===fold('Other/Unknown'))&&
  !fields.producer&&!fields.roast_level&&!fields.decaffeination_method&&
  selected122.foreign.every(term=>![f('tasting_notes'),f('origin'),f('producer')].some(v=>v.includes(fold(term))));
}
if(process.env.DIC_ISSUE33_R122_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw=null,e=null,html=null;try{raw=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(raw.toString())}catch{}
 try{html=readFileSync(join(dir,'case-571.html'))}catch{}
 const failures=[],check=(ok,label)=>{if(!ok)failures.push(label)};
 const r=e?.records?.find(x=>x.number===571)||{},d=direct122(html?.toString()||'');
 check(JSON.stringify(e?.case_numbers)==='[571]'&&e.records?.length===1,'one_original_571_only');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_immutable_source_sha');
 check(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'immutable_no_production_no_global_certification');
 check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'public_fetch_actual_parser_selected_identity');
 check(r.official_url===selected122.url&&r.final_url===selected122.url&&r.archived_coffee===selected122.name,'exact_original_selected_url_product');
 check(html&&sha(html)===r.html_sha256&&html.length===r.html_bytes,'raw_official_html_hash_and_size');
 check(d.uniqueH1&&d.own.every(x=>x.matched),'selected_primary_product_50_50_split_and_blend_program');
 check(fields122Ok(r.current_fields),'actual_parser_no_false_single_processing_or_invented_roast_producer');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'user_add_coffee_and_source_review_present');
 check(Array.isArray(r.conflicts)&&r.conflicts.length===0,'no_conflicting_chosen_source');
 check(Array.isArray(r.seo_fallback_fields)&&r.seo_fallback_fields.length===0,'no_seo_only_field_fallback');
 const verdict={source_sha:e?.source_sha,passed:failures.length===0,failures,html_sha256:r.html_sha256||null,
 html_bytes:r.html_bytes||null,evidence_sha256:raw?sha(raw):null,selected:d,fields:r.current_fields||null,
 conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[],manual_certified:0,
 boundary:'One individual exact selected original603 coffee: two distinct 50% processed constituents, no unsupported single-process, producer, roast or borrowed flavors. Not all603 certification; no production writes.'};
 writeFileSync(join(dir,'r122-571-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
 console.log('[DIC33 R122 SELECTED AFTERPROOF] '+JSON.stringify(verdict));
 if(failures.length)process.exitCode=1;
}
