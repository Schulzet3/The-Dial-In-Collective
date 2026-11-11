#!/usr/bin/env node
// Issue #33 R114: original603 #559 exact selected Rusty Dog Ethiopia Wush Wush; not all-corpus certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fold=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected114=Object.freeze({
 number:559,
 name:'Ethiopia Wush Wush, Natural Processed, Light Roast - Single Farmer',
 url:'https://www.rustydogcoffee.com/products/ethiopia-wush-wush-natural-processed-light-roast-single-farmer',
 own:['Cupping notes: Red Grape, Leather, Jasmine','Grower: Asnake Kassa','Variety: Native Heirloom','Region: Oromia, Hambela']
});
export function selected114Direct(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const visible=fold(selected.replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/giu,' ')
  .split(/<h[23][^>]*>\s*(?:Customer Reviews|You may also like)/i)[0]
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ').replace(/\s+/gu,' '));
 return {headings,uniqueH1:headings.length===1&&fold(headings[0])===fold(selected114.name),
  direct:selected114.own.map(literal=>({literal,matched:visible.includes(fold(literal))}))};
}
export function selected114FieldsOk(fields){
 if(!fields||typeof fields!=='object')return false;
 const f=k=>fold(fields[k]);
 return f('name')===fold(selected114.name)&&f('origin').includes('ethiopia')&&
  f('process')==='natural'&&f('roast_level')==='light'&&
  f('producer').includes('asnake kassa')&&
  ['red grape','leather','jasmine'].every(x=>f('tasting_notes').includes(x))&&
  !/guatemala|peru|kefa|keffa/.test(f('origin'))&&
  !/blueberry|nutmeg|frankincense/.test(f('tasting_notes'));
}
if(process.env.DIC_ISSUE33_R114_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let report=null,evidence=null;try{evidence=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(evidence.toString('utf8'));}catch{}
 const failures=[],check=(ok,key)=>{if(!ok)failures.push(key);};
 check(JSON.stringify(report?.case_numbers)==='[559]'&&report?.records?.length===1,'only_original_559');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original_csv_hash_unchanged');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_cert_or_provider_writes');
 const r=report?.records?.[0]||{};
 let raw=null;try{raw=readFileSync(join(dir,'case-559.html'));}catch{}
 const direct=selected114Direct(raw?.toString('utf8')||'');
 check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'selected_parser_identity');
 check(r.official_url===selected114.url&&r.final_url===r.official_url,'current_exact_original_url');
 check(r.archived_coffee===selected114.name,'original_selected_name');
 check(raw&&sha(raw)===r.html_sha256&&raw.length===r.html_bytes,'raw_https_source_hash');
 check(direct.uniqueH1&&direct.direct.every(x=>x.matched),'current_direct_own_specs');
 check(selected114FieldsOk(r.current_fields),'actual_current_parser_fields');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_source_review');
 const result={source_sha:report?.source_sha,passed:failures.length===0,failures,
  official_html_sha256:r.html_sha256||null,official_html_bytes:r.html_bytes||null,
  source_evidence_sha256:evidence?sha(evidence):null,selected_direct:direct,
  actual_fields:r.current_fields||null,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[],
  manual_certified:0,production_operations:0,
  qualification:'Rusty Dog selected light-roast Wush Wush from Asnake Kassa, not Red Rooster/Dancing Goats Wush Wush. Native Heirloom versus Wush Wush is qualified variety wording; do not mix other roaster lot, harvest, flavor or producer.'};
 writeFileSync(join(dir,'r114-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R114 559 AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
