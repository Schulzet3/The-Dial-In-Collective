#!/usr/bin/env node
// Issue #33 R133: original603 #106 exact current Colombia Valley de Cauca selected source.
// This is an audit-specific proof gate, not an extractor behavior change.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const norm=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const chosen106=Object.freeze({
 number:106,name:'Colombia Valley de Cauca',
 url:'https://earthbackcoffee.com/products/colombia-valley-de-cauca-medium-dark-roast',
 roast:'Medium-Dark',notes:['mild cherry','milk chocolate','balanced']
});
export function selected106Source(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const visible=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' '));
 const has=value=>visible.includes(norm(value));
 return {headings,exactH1:headings.length===1&&norm(headings[0])===norm(chosen106.name),
  direct:{mediumDark:has('Medium-Dark Roast'),notes:chosen106.notes.every(has),
   selectedRegionalHeadline:headings.some(h=>norm(h).includes('colombia valley de cauca'))},
  explicitNamedGreenProcess:/\b(?:processing|process)\s+(?:washed|wet hulled|natural|honey)\b/iu.test(visible),
  source_sha256:sha(Buffer.from(html||'')),selected_visible_length:visible.length};
}
if(process.env.DIC_ISSUE33_R133_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes,e,html;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'));}catch{}
 try{html=readFileSync(join(dir,'case-106.html'));}catch{}
 const failures=[],ck=(v,k)=>{if(!v)failures.push(k);};
 const rec=e?.records?.find(row=>row.number===106)||{},f=rec.current_fields||{};
 const direct=selected106Source(html?.toString('utf8')||'');
 ck(JSON.stringify(e?.case_numbers)==='[106]'&&e?.records?.length===1,'one_original106_only');
 ck(e?.source_sha===process.env.GITHUB_SHA,'exact_checkout_source_sha');
 ck(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_digest');
 ck(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'no_global_certification_or_production');
 ck(rec.status==='FETCHED'&&rec.parser_ok===true,'guarded_official_https_and_actual_parser');
 ck(rec.official_url===chosen106.url&&rec.final_url===chosen106.url&&rec.archived_coffee===chosen106.name,
  'exact_original_selected_url_and_identity');
 ck(!!html&&sha(html)===rec.html_sha256&&html.length===rec.html_bytes,'current_raw_html_byte_hash');
 ck(direct.exactH1&&rec.selected_heading_identity_verified===true,'current_selected_exact_h1');
 ck(Object.values(direct.direct).every(Boolean),'direct_selected_medium_dark_three_notes_and_identity');
 ck(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'actual_add_coffee_source_review');
 ck(norm(f.name)===norm(chosen106.name)&&norm(f.roast_level)==='medium dark','selected_name_medium_dark_roast');
 ck(norm(f.origin).includes('colombia'),'selected_colombia_origin');
 ck(chosen106.notes.every(n=>norm(f.tasting_notes).includes(norm(n))),'selected_three_notes');
 // Selected farmer marketing prose is NOT proof of a named farmer/green process.
 ck(direct.explicitNamedGreenProcess||!f.process||f.process==='Other/Unknown',
  'do_not_invent_unpublished_green_process');
 ck(!f.producer&&!f.variety&&!f.elevation_m&&!f.decaffeination_method,
  'do_not_invent_unpublished_grower_variety_elevation_decaf');
 ck((rec.conflicts||[]).length===0&&Array.isArray(rec.seo_fallback_fields)&&
  rec.seo_fallback_fields.length===0,'no_unselected_seo_or_current_conflicts');
 const proof={case_number:106,source_sha:e?.source_sha||null,passed:failures.length===0,
  failures,official_html_sha256:rec.html_sha256||null,official_html_bytes:rec.html_bytes||null,
  evidence_sha256:bytes?sha(bytes):null,direct,actual_parser_fields:f,
  parser_conflicts:rec.conflicts||[],seo_fallback_fields:rec.seo_fallback_fields||[],
  corpus_603_individually_certified:false,production_operations:0};
 writeFileSync(join(dir,'r133-106-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R133] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
