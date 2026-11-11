#!/usr/bin/env node
// #33 R116: selected current original603 #564 only; immutable original scorer/CSV unchanged.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings,selectedProductFormH2,selectedProductPurchaseRootH2} from './issue33-selected-product-heading.mjs';
import {selectedShopifyCurrentVisibleIdentity} from './issue33-shopify-current-visible-identity.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fold=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected116=Object.freeze({
 number:564,
 name:'2026 Yaye Arbegona - Ethiopia',
 url:'https://www.seycoffee.com/products/2026-yaye-arbegona-ethiopia',
 own:['Arbegona holds a very special place in our hearts',
  'In the cup we find watermelon, a lovely florality, and berries',
  'Ethiopian Landrace','Arbegona, Sidama','2,300 masl','January 2026',
  'Fermented underwater for 36 hours']
});
export function direct116(html){
 const selected=productMarkup(String(html||''));
 const h1=selectedProductHeadings(selected);
 const form=h1.length?[]:selectedProductFormH2(selected);
 const purchase=(!h1.length&&!form.length)?selectedProductPurchaseRootH2(String(html||'')):[];
 const headings=h1.length?h1:form.length?form:purchase;
 const parsed=(!headings.length)?extractPublicCoffeeFacts(String(html||''),{source_url:selected116.url}):null;
 const shopify=(!headings.length&&parsed?.ok===true)?selectedShopifyCurrentVisibleIdentity(String(html||''),{
  source_url:selected116.url,expected_name:selected116.name,parsed_name:parsed.fields?.name}):null;
 const body=fold(selected.replace(/<h[12]\b[^>]*>[\s\S]*?<\/h[12]>/giu,' ').replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/giu,' ')
  .split(/<h[23][^>]*>\s*(?:Customer Reviews|You may also like|Related coffees)/i)[0]
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ').replace(/\s+/gu,' '));
 const title=fold(headings[0]);
 const unique=(headings.length===1&&/yaye arbegona/.test(title)&&!/\b(?:chericho|raro|halo hartume|2025)\b/.test(title)&&title.split(' ').includes('ethiopia'))||Boolean(shopify);
 return {headings,h1_count:h1.length,identity_source:h1.length?'selected_h1':form.length?'selected_product_form_h2':purchase.length?'selected_purchase_root_h2':shopify?'selected_shopify_tracker_and_visible_dual_hero':'unverified',embedded:shopify,unique,required:selected116.own.map(literal=>({literal,matched:body.includes(fold(literal))}))};
}
export function fields116Ok(fields){
 if(!fields||typeof fields!=='object')return false;
 const f=k=>fold(fields[k]);
 return f('name').includes('yaye arbegona')&&f('origin').includes('ethiopia')&&f('origin').includes('arbegona')&&f('origin').includes('sidama')&&
 f('process')==='washed'&&f('variety').includes('ethiopian landrace')&&
 ['watermelon','florality','berries'].every(v=>f('tasting_notes').includes(v))&&
 !/lychee|botanicals|peach|lemon verbena|plum/.test(f('tasting_notes'))&&
 !/colombia|gedeb|yirgacheffe|guji/.test(f('origin'))&&
 !/gesha|chiroso|bourbon/.test(f('variety'));
}
if(process.env.DIC_ISSUE33_R116_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes=null,report=null,html=null;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'));}catch{}
 try{html=readFileSync(join(dir,'case-564.html'));}catch{}
 const r=report?.records?.[0]||{},direct=direct116(html?.toString('utf8')||'');
 const failures=[],test=(ok,key)=>{if(!ok)failures.push(key);};
 test(JSON.stringify(report?.case_numbers)==='[564]'&&report?.records?.length===1,'only_original_564');
 test(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 test(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original_csv_unchanged');
 test(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_or_production_change');
 test(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'selected_current_identity_and_parser');
 test(r.official_url===selected116.url&&r.final_url===selected116.url,'exact_original_official_url');
 test(r.archived_coffee===selected116.name,'original_selected_title');
 test(html&&sha(html)===r.html_sha256&&html.length===r.html_bytes,'raw_selected_hash');
 test(direct.unique&&direct.required.every(e=>e.matched),'selected_current_identity_and_direct_selected_fields');
 test(fields116Ok(r.current_fields),'actual_parser_owned_fields');
 test(Array.isArray(r.conflicts)&&r.conflicts.length===0&&Array.isArray(r.seo_fallback_fields)&&r.seo_fallback_fields.length===0,'no_conflicts_or_unsupported_SEO_fields');
 test(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_Add_Coffee_and_Source_Review');
 const result={source_sha:report?.source_sha,passed:failures.length===0,failures,
  official_html_sha256:r.html_sha256||null,official_html_bytes:r.html_bytes||null,
  evidence_json_sha256:bytes?sha(bytes):null,direct,
  actual_fields:r.current_fields||null,conflicts:r.conflicts||[],
  seo_fallback_fields:r.seo_fallback_fields||[],manual_certified:0,production_operations:0,
  qualification:'January 2026 is the selected lot harvest label, not a universal current harvest. Yaye Arbegona is a selected washing-station/site label, not proof of individually named cherry growers. Reject 2025 Yaye, Halo Hartume, Raro or other-release notes.'};
 writeFileSync(join(dir,'r116-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R116 SELECTED 564 AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
