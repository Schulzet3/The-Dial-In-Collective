#!/usr/bin/env node
// Original603 #118: verify this current chosen espresso blend, not its 2026-10 cached composition.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const norm=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const chosen118=Object.freeze({
 number:118,name:'electrify espresso',
 url:'https://epiphanycoffee.co/products/electrify-espresso',
 selectedComponents:[
  'Guatemala - Antigua Volcanes - (Washed Process)',
  'Ethiopia Koke Station (Honey Process)',
  'Ethiopia - Godina Guji - (Natural Process)'
 ],
 tastes:['milk chocolate','roasted almonds','dried fruits']
});
export function selected118Source(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const visible=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' '));
 const has=value=>visible.includes(norm(value));
 return {
  headings,
  exactH1:headings.length===1&&norm(headings[0])===norm(chosen118.name),
  direct:{
   guatemalaWashed:has(chosen118.selectedComponents[0]),
   kokeHoney:has(chosen118.selectedComponents[1]),
   godinaNatural:has(chosen118.selectedComponents[2]),
   currentThreeComponentOrder:has(chosen118.selectedComponents.join(', and '))||
    has(chosen118.selectedComponents.join(', '))||
    (has(chosen118.selectedComponents[0]+', '+chosen118.selectedComponents[1]+', and '+chosen118.selectedComponents[2])),
   mediumRoast:has('Medium Roast'),
   milkChocolate:has(chosen118.tastes[0]),
   roastedAlmonds:has(chosen118.tastes[1]),
   driedFruits:has(chosen118.tastes[2])
  },
  selected_visible_length:visible.length,source_sha256:sha(Buffer.from(html||''))
 };
}
if(process.env.DIC_ISSUE33_R138_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes,e,raw;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-118.html'));}catch{}
 const failures=[],check=(ok,id)=>{if(!ok)failures.push(id);};
 const rec=e?.records?.find(row=>row.number===118)||{},f=rec.current_fields||{};
 const direct=selected118Source(raw?.toString('utf8')||'');
 check(JSON.stringify(e?.case_numbers)==='[118]'&&e?.records?.length===1,'only_original118');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_checkout_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_unchanged');
 check(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'no_publication_or_global_certification');
 check(rec.status==='FETCHED'&&rec.parser_ok===true,'real_guarded_official_fetch_and_parser');
 check(rec.official_url===chosen118.url&&rec.final_url===chosen118.url&&norm(rec.archived_coffee)===norm(chosen118.name),'exact_original_selected_url_and_name');
 check(!!raw&&sha(raw)===rec.html_sha256&&raw.length===rec.html_bytes,'official_raw_html_byte_hash');
 check(direct.exactH1&&rec.selected_heading_identity_verified===true,'selected_current_h1_identity');
 check(Object.values(direct.direct).every(Boolean),'current_three_exact_components_roast_and_tastes');
 check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'current_add_coffee_source_review');
 check(norm(f.name)===norm(chosen118.name),'parser_selected_identity');
 check(norm(f.origin).includes('guatemala')&&norm(f.origin).includes('ethiopia')&&!norm(f.origin).includes('colombia'),'no_old_colombia_component_contamination');
 check(!f.process||norm(f.process)===norm('Other/Unknown'),'mixed_methods_not_one_selected_process');
 check(norm(f.roast_level)==='medium','selected_current_medium_roast');
 check(chosen118.tastes.every(x=>norm(f.tasting_notes).includes(norm(x))),'three_selected_blend_flavors');
 check(Array.isArray(rec.conflicts)&&rec.conflicts.length===0,'no_unadjudicated_conflicts');
 check(Array.isArray(rec.seo_fallback_fields)&&rec.seo_fallback_fields.length===0,'no_seo_fallback');
 const proof={case_number:118,source_sha:e?.source_sha||null,passed:!failures.length,failures,
  current_selected:chosen118,official_html_sha256:rec.html_sha256||null,official_html_bytes:rec.html_bytes||null,
  evidence_sha256:bytes?sha(bytes):null,direct,actual_parser_fields:f,
  old_component_country:'Colombia',current_component_countries:['Guatemala','Ethiopia'],
  no_global603_certification:true,production_operations:0};
 writeFileSync(join(dir,'r138-118-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R138] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
