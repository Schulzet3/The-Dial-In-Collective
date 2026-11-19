#!/usr/bin/env node
// Issue #33 R337: exactly original603 #248 selected official Onyx product. Not all-603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
const url='https://onyxcoffeelab.com/products/ethiopia-agaro-yukro-g1';
const name='Ethiopia Agaro Yukro G1';
const frozen='docs/audits/issue33-original603-source-level-adjudication-20261029.csv';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r337';
const hash=v=>createHash('sha256').update(v).digest('hex');
const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function selected248(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const text=selected.replace(/<(script|style|noscript|template|nav|aside|footer|header|select)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' ')
  .replace(/&(?:nbsp|amp|#160|#xA0);/gi,' ').replace(/\s+/g,' ');
 const t=norm(text);
 return {headings,exact:headings.length===1&&norm(headings[0])===norm(name),
  ownFlavor:['apricot','barley tea','bergamot','caramel'].every(x=>t.includes(x)),
  ownVariety:/\blandrace\b/.test(t),
  ownWashed:/\bwashed\b/.test(t),
  ownElevation:/\b1900 masl\b/.test(t),
  ownRoast:/\bultra light\b/.test(t),
  ownGrowerGroup:/\b579 smallholder farmers in wanja kersa\b/.test(t),
  archivedBanner:/\bthis product is archived\b/.test(t),
  genericCaffeineWidget:/\b0mg 12oz\b/.test(t),
  summer2026:/\b2026 summer coffee program\b/.test(t)};
}
if(process.env.DIC_R337_VERIFY==='1'){
 const errors=[],need=(condition,k)=>{if(!condition)errors.push(k);};
 let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_report');}
 need(JSON.stringify(report?.case_numbers)==='[248]'&&report?.records?.length===1,'only_original248');
 need(execFileSync('git',['rev-parse','HEAD:'+frozen],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','frozen_git_blob_untouched');
 need(report?.original603_register_sha256===hash(readFileSync(new URL('../../'+frozen,import.meta.url))),'frozen_csv_bytes_untouched');
 need(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_unsupported_certification');
 need(report?.source_sha===process.env.DIC_R337_EVENT_SHA,'source_event_sha');
 need(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R337_HEAD_SHA,'actual_checkout_sha');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 need(requiredFocusedSourceFailures([248],report?.records||[]).length===0,'current_exact_source_parser_and_UI');
 let bytes;try{bytes=readFileSync(join(dir,'case-248.html'));}catch{errors.push('missing_real_html');}
 const html=bytes?.toString('utf8')||'',own=selected248(html);
 need(r.official_url===url&&!r.alternate_url_attempted,'exact_registered_first_party_url');
 need(r.status==='FETCHED'&&r.parser_ok===true&&Boolean(bytes?.length)&&r.html_bytes===bytes?.length&&r.html_sha256===hash(bytes||''),'current_fetched_raw_html_hash');
 need(r.archived_coffee===name&&own.exact&&norm(f.name)===norm(name),'exact_selected_product_H1_and_name');
 for(const key of ['ownFlavor','ownVariety','ownWashed','ownElevation','ownRoast','ownGrowerGroup','archivedBanner','summer2026'])need(own[key],'seller_selected_'+key);
 need(f.process==='Washed','literal_washed');
 need(norm(f.variety).includes('landrace'),'literal_landrace');
 need(norm(f.roast_level)==='ultra light','seller_ultra_light');
 need(norm(f.elevation_m).includes('1900'),'literal_selected_elevation');
 need(['apricot','barley tea','bergamot','caramel'].every(x=>norm(f.tasting_notes).includes(x)),'full_seller_tasting');
 // A collectively credited grower is not an individual; blank is reviewable, but a station, broker,
 // or name from another product cannot be promoted to this coffee's producer.
 const producer=norm(f.producer);
 need(!producer||(/smallholder farmers/.test(producer)&&/wanja kersa/.test(producer)),'producer_only_exact_collective_or_blank');
 need(norm(f.producer)==='579 smallholder farmers in wanja kersa','direct_exact_selected_counted_grower_collective');
 need(!f.decaffeination_method,'merchant_generic_caffeine_widget_is_not_decaftreatment');
 need(!(r.seo_fallback_fields||[]).some(x=>['producer','process','roast_level','variety','tasting_notes','decaffeination_method'].includes(x)),'no_foreign_or_generic_seo_source');
 need(!(r.conflicts||[]).length,'selected_canonical_conflicts_unresolved');
 const parsed=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
 need(parsed?.ok===true&&norm(parsed?.fields?.name)===norm(name)&&parsed?.fields?.process==='Washed'&&!parsed?.fields?.decaffeination_method,'real_selected_html_parser_replay');
 need(parsed?.ok===true&&coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview')&&
  coffeeSourceReviewSnapshot({...parsed,source_url:r.final_url||url})?.type==='coffee_source_review','real_AddCoffee_SourceReview');
 const out={passed:errors.length===0,errors,case:248,source_sha:process.env.DIC_R337_HEAD_SHA,
  event_sha:process.env.DIC_R337_EVENT_SHA,original603_manual_certified:false,manual_certified:0,
  production_operations:0,selected:{url,headings:own.headings,html_sha256:r.html_sha256,html_bytes:r.html_bytes,
   own,fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[],
   archived_not_current_sale_lot:true,collective_grower_attribution_needs_human_review:!producer}};
 writeFileSync(join(dir,'r337-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R337] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
