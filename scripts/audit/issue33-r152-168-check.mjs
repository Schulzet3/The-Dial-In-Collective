#!/usr/bin/env node
// Issue33 R152 original603 #168; exact selected WooCommerce product, source-bound.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {selectedElementorWooCommerceH2} from './issue33-elementor-woocommerce-h2.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/&(?:nbsp|#160);/giu,' ').replace(/&amp;/giu,' and ')
 .replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
const canonical=x=>String(x||'').replace(/\/+$/u,'');
export const chosen168=Object.freeze({
 number:168,name:'TABi – Natural Process',
 url:'https://iwanacoffee.com/product/tabi-natural-process',
 flavors:['vanilla','caramel','honey','nuts','chocolate']
});
export function selected168Source(html){
 const chosen=productMarkup(String(html||''));
 const headings=selectedProductHeadings(chosen);
 const purchaseH2=selectedElementorWooCommerceH2(String(html||''),{source_url:chosen168.url});
 const visible=norm(removeElements(chosen,
  ['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' '));
 const has=x=>visible.includes(norm(x));
 return {headings,purchaseH2,exactSelectedTitle:(headings.length===1&&norm(headings[0])===norm(chosen168.name))||
  (headings.length===0&&purchaseH2.length===1&&norm(purchaseH2[0])===norm(chosen168.name)),
  direct:{
   selected_process_title:[...headings,...purchaseH2].some(h=>norm(h)===norm(chosen168.name)),
   flavor_prose:has('vanilla, caramel, honey, nuts, and chocolate'),
   balance:has('Silky-bodied with a bright, lively acidity'),
   release_label:has('MICRO-LOT')
  },html_sha256:sha(Buffer.from(html||'')),selected_length:chosen.length};
}
if(process.env.DIC_ISSUE33_R152_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});let e,raw,bytes;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-168.html'));}catch{}
 const failures=[],check=(ok,id)=>{if(!ok)failures.push(id);};
 const rec=e?.records?.find(x=>x.number===168)||{},f=rec.current_fields||{};
 const source=selected168Source(raw?.toString('utf8')||'');
 check(JSON.stringify(e?.case_numbers)==='[168]'&&e?.records?.length===1,'single_original168');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603');
 check(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'bounded_not_global');
 check(rec.official_url===chosen168.url&&canonical(rec.final_url)===canonical(chosen168.url),'same_chosen_official_product_and_canonical_slash');
 check(rec.status==='FETCHED'&&rec.parser_ok===true,'guarded_https_real_parser');
 check(!!raw&&sha(raw)===rec.html_sha256&&raw.length===rec.html_bytes,'raw_html_hash_and_bytes');
 check(source.exactSelectedTitle&&rec.selected_heading_identity_verified===true&&
 rec.selected_elementor_h2?.length===1,'selected_exact_purchase_bound_h2');
 check(Object.values(source.direct).every(Boolean),'direct_selected_own_facts');
 check(norm(f.name)===norm(chosen168.name),'parsed_chosen_name');
 check(norm(f.roaster).includes('iwana'),'parsed_iwana_roaster');
 check(norm(f.process)==='natural','own_process_from_selected_title');
 check(norm(f.variety).includes('tabi'),'own_variety_from_selected_title');
 check(chosen168.flavors.every(x=>norm(f.tasting_notes).includes(norm(x))),'all_selected_flavors');
 check(norm(f.release_label).includes('micro lot'),'direct_selected_micro_lot_badge');
 check(norm(f.origin)==='colombia'&&!f.roast_level&&!f.decaffeination_method&&!f.producer&&!f.elevation_m,
  'selected_colombian_origin_and_no_unpublished_roast_decaf_producer_elevation');
 check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_and_source_review');
 check(Array.isArray(rec.conflicts)&&rec.conflicts.length===0,'no_conflicts');
 check(Array.isArray(rec.seo_fallback_fields)&&rec.seo_fallback_fields.length===0,'no_seo_fallback');
 const proof={case_number:168,source_sha:e?.source_sha||null,passed:failures.length===0,
  failures,source,actual_parser_fields:f,html_bytes:raw?.length||null,
  raw_html_sha256:raw?sha(raw):null,evidence_sha256:bytes?sha(bytes):null,
  semantic_limit:'Colombia is stated in selected product prose; no roast, decaf, named grower or elevation is published. Other coffee tiles cannot fill missing fields.',
  full603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r152-168-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R152 #168] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
