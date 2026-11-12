#!/usr/bin/env node
// Issue #33 R134: exact selected original603 #107 Earthback Ethiopian Yirgacheffe.
// This audit gates current literal selected facts, not a universal 603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const norm=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const chosen107=Object.freeze({
 number:107,name:'Ethiopian Yirgacheffe',
 url:'https://earthbackcoffee.com/products/ethiopian-yirgacheffe-medium-roast',
 notes:['well balanced','bright and floral','tangerine','lemongrass']
});
export function selected107Source(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const visible=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' '));
 const has=v=>visible.includes(norm(v));
 return {headings,exactH1:headings.length===1&&norm(headings[0])===norm(chosen107.name),
  direct:{medium:has('Medium Roast'),washedBean:has('Washed bean'),
   notes:chosen107.notes.every(has),smallFarmers:has('Small farmers working hard within the co-op')},
  selected_visible_length:visible.length,source_sha256:sha(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R134_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes,e,html;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'));}catch{}
 try{html=readFileSync(join(dir,'case-107.html'));}catch{}
 const failures=[],ck=(value,key)=>{if(!value)failures.push(key);};
 const rec=e?.records?.find(row=>row.number===107)||{},f=rec.current_fields||{};
 const direct=selected107Source(html?.toString('utf8')||'');
 ck(JSON.stringify(e?.case_numbers)==='[107]'&&e?.records?.length===1,'original107_only');
 ck(e?.source_sha===process.env.GITHUB_SHA,'exact_checkout_source_sha');
 ck(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_digest');
 ck(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'no_global_certification_or_production');
 ck(rec.status==='FETCHED'&&rec.parser_ok===true,'guarded_official_https_and_real_parser');
 ck(rec.official_url===chosen107.url&&rec.final_url===chosen107.url&&rec.archived_coffee===chosen107.name,
  'exact_original_selected_url_and_original_coffee');
 ck(!!html&&sha(html)===rec.html_sha256&&html.length===rec.html_bytes,'current_raw_html_integrity');
 ck(direct.exactH1&&rec.selected_heading_identity_verified===true,'current_exact_selected_identity');
 ck(Object.values(direct.direct).every(Boolean),'direct_medium_washed_farmers_and_notes');
 ck(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'real_add_coffee_source_review');
 ck(norm(f.name)===norm(chosen107.name)&&norm(f.roast_level)==='medium','current_parser_name_medium_roast');
 ck(norm(f.origin).includes('ethiopia'),'current_selected_ethiopian_origin');
 ck(norm(f.process)==='washed','current_explicit_selected_washed_process');
 ck(chosen107.notes.every(n=>norm(f.tasting_notes).includes(norm(n))),'current_selected_four_flavor_phrases');
 // "Small farmers working hard within the co-op" names no individual producer or farm.
 ck(!f.producer&&!f.variety&&!f.elevation_m&&!f.decaffeination_method,
  'do_not_invent_unpublished_producer_variety_elevation_decaf');
 ck(Array.isArray(rec.conflicts)&&rec.conflicts.length===0&&
  Array.isArray(rec.seo_fallback_fields)&&rec.seo_fallback_fields.length===0,
  'no_other_coffee_conflict_or_seo_fallback');
 const proof={case_number:107,source_sha:e?.source_sha||null,passed:failures.length===0,
  failures,official_html_sha256:rec.html_sha256||null,official_html_bytes:rec.html_bytes||null,
  evidence_sha256:bytes?sha(bytes):null,direct,actual_parser_fields:f,
  parser_conflicts:rec.conflicts||[],seo_fallback_fields:rec.seo_fallback_fields||[],
  corpus_603_individually_certified:false,production_operations:0};
 writeFileSync(join(dir,'r134-107-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R134] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
