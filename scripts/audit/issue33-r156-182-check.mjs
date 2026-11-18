#!/usr/bin/env node
// Issue #33 R156: one original603 exact current selected #182; not global certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
import {extractSelectedCoffeeRoastVariantsFromHtml} from '../../src/server/coffee-roast-variants.mjs';
import {coffeeRoastVariantPreview,coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
const hash=v=>createHash('sha256').update(v).digest('hex');
const clean=v=>String(v||'').replace(/&(?:amp|nbsp);/gi,m=>m.toLowerCase()==='&amp;'?'&':' ')
 .replace(/<[^>]{0,3000}>/gu,' ').replace(/\s+/gu,' ').trim();
const norm=v=>clean(v).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[’‘]/g,"'")
 .replace(/[^a-z0-9]+/g,' ').trim();
export const original182=Object.freeze({
 number:182,name:'100% Kona Peaberry Coffee, The Champagne of Kona',
 url:'https://konaearth.com/products/100-kona-peaberry-coffee-1-lb',
 medium:'Bittersweet chocolate, cream, prune, caramel',
 mediumDark:'Caramel, butter, cocoa, toffee, creamy body, sweet spice'
});
export function selected182Evidence(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const noRelated=removeElements(selected,['script','style','noscript','template','nav','aside','footer','header']);
 const prose=clean(noRelated), lower=norm(prose);
 const headingsMatch=headings.some(h=>norm(h)===norm(original182.name));
 const label=/Tasting Notes by Roast\s*:/i.test(prose);
 const medium=norm(original182.medium),mediumDark=norm(original182.mediumDark);
 const directBoth=label&&lower.includes(medium)&&lower.includes(mediumDark);
 // Purchase options require actual selectable product controls, not words in a story.
 const variants=extractSelectedCoffeeRoastVariantsFromHtml(html);
 const chosen=Object.fromEntries(variants.map(x=>[x.id,x]));
 return {headings,headingsMatch,label,directBoth,variants,
  mediumMatch:norm(chosen.medium?.fields?.tasting_notes)===medium,
  mediumDarkMatch:norm(chosen['medium-dark']?.fields?.tasting_notes)===mediumDark,
  noExtraRoasts:variants.length===2&&variants.every(v=>['medium','medium-dark'].includes(v.id)),
  selected_html_sha256:hash(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R156_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let evidenceBytes=null,htmlBytes=null,e={};
 try{evidenceBytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(evidenceBytes.toString('utf8'));}catch{}
 try{htmlBytes=readFileSync(join(dir,'case-182.html'));}catch{}
 const r=e?.records?.find(x=>x.number===182)||{}, fields=r.current_fields||{};
 const selected=selected182Evidence(htmlBytes?.toString('utf8')||'');
 const fail=[],check=(pass,name)=>{if(!pass)fail.push(name)};
 check(JSON.stringify(e.case_numbers)==='[182]'&&e.records?.length===1,'one_original_case_182');
 check(e.source_sha===process.env.GITHUB_SHA,'exact_hosted_source_sha');
 check(e.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_original_csv_unchanged');
 check(e.original_corpus_modified===false&&e.manual_certified===0&&e.production_operations===0,'no_global_or_production_claim');
 check(r.official_url===original182.url&&String(r.final_url||'').replace(/\/+$/u,'')===original182.url,'exact_selected_product_url');
 check(r.status==='FETCHED'&&r.parser_ok===true,'guarded_public_https_and_real_parser');
 check(!!htmlBytes&&hash(htmlBytes)===r.html_sha256&&htmlBytes.length===r.html_bytes,'official_raw_html_bytes_hash');
 check(selected.headingsMatch&&r.selected_heading_identity_verified===true,'current_exact_selected_h1');
 check(selected.label&&selected.directBoth,'direct_selected_tasting_notes_by_roast');
 check(selected.noExtraRoasts&&selected.mediumMatch&&selected.mediumDarkMatch,'direct_purchase_roast_options_preserve_both_labeled_profiles');
 check(norm(fields.name)===norm(original182.name),'current_selected_name');
 check(norm(fields.roaster).includes('kona earth'),'current_selected_roaster');
 // The unchosen base preview must not silently choose one purchasable roast.
 check(!fields.roast_level&&!fields.tasting_notes,'no_automatic_roast_or_cross_variant_tastes');
 check(!fields.producer&&!fields.process&&!fields.decaffeination_method&&!fields.elevation_m&&!fields.variety,
  'no_unpublished_or_unrelated_product_fields');
 check((r.conflicts||[]).length===0&&(!r.seo_fallback_fields||r.seo_fallback_fields.length===0),'no_unrelated_seo_or_false_conflict');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'add_coffee_and_source_review');
 if(selected.noExtraRoasts){
  const base={ok:true,fields,source_url:original182.url,roast_variants:selected.variants};
  const before=coffeeUrlPreviewMarkup(base);
  const medium=coffeeRoastVariantPreview(base,'medium');
  const dark=coffeeRoastVariantPreview(base,'medium-dark');
  check(before.includes('Which roast did you buy?'),'member_choice_required');
  check(norm(medium.fields.tasting_notes)===norm(original182.medium)&&
   norm(dark.fields.tasting_notes)===norm(original182.mediumDark),'chosen_profiles_do_not_mix');
  check(coffeeSourceReviewSnapshot(dark).selected_roast_variant==='medium-dark','review_preserves_selection');
 }
 const result={number:182,source_sha:e?.source_sha||null,passed:fail.length===0,failures:fail,
  raw_html_sha256:htmlBytes?hash(htmlBytes):null,raw_html_bytes:htmlBytes?.length||0,
  evidence_sha256:evidenceBytes?hash(evidenceBytes):null,selected,
  parser_fields:fields,current_availability_unverified:true,
  caution:'Official product currently displays Sold out; published historic/about-product profiles do not verify an available 2026 lot. No selected roast auto-pick, unrelated product borrowing or source rewrite.',
  global603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r156-182-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R156 #182 SELECTED STRICT AFTERPROOF] '+JSON.stringify(result));
 if(fail.length)process.exitCode=1;
}
