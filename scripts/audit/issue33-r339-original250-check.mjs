#!/usr/bin/env node
// Issue #33 R339: real original603 #250 selected product. No automatic 603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
const url='https://orleanscoffee.com/product/colombia-supremo-bucaramanga-coffee';
const name='Colombia Supremo Bucaramanga';
const frozen='docs/audits/issue33-original603-source-level-adjudication-20261029.csv';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r339';
const hash=v=>createHash('sha256').update(v).digest('hex');
const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function selected250(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 // Only selected product markup, never SEO, related-product cards, nav or footer.
 const t=norm(selected.replace(/<(script|style|noscript|template|nav|aside|footer|header|select)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
   .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {headings,exact:headings.length===1&&norm(headings[0])===norm(name),
  ownRoast:/\bmedium roast\b/.test(t)||/\bmedium roasted\b/.test(t),
  ownWashed:/\bprocess washed\b/.test(t),
  ownSantander:/\bdept of santander\b/.test(t),
  ownElevation:/\b1 200 1 800 meters\b/.test(t),
  ownVarieties:['caturra','castillo','catimor'].every(v=>t.includes(v)),
  ownNotes:/\bnotes sweet tart peach apricot\b/.test(t),
  ownFlavor:/\bflavor hints of tangerine orange notes of tobacco\b/.test(t),
  ownDrying:/\bdrying sun dried patio\b/.test(t)
 };
}
if(process.env.DIC_R339_VERIFY==='1'){
 const errors=[],need=(yes,key)=>{if(!yes)errors.push(key);};
 let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_runner_report');}
 need(JSON.stringify(report?.case_numbers)==='[250]'&&report?.records?.length===1,'only_original250');
 need(execFileSync('git',['rev-parse','HEAD:'+frozen],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','immutable_original603_csv_git_blob');
 need(report?.original603_register_sha256===hash(readFileSync(new URL('../../'+frozen,import.meta.url))),'immutable_csv_raw_sha256');
 need(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_frozen_or_provider_operation');
 need(report?.source_sha===process.env.DIC_R339_EVENT_SHA,'event_source_sha');
 need(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R339_HEAD_SHA,'exact_runner_checkout');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 need(requiredFocusedSourceFailures([250],report?.records||[]).length===0,'required_real_source_parser_and_ui');
 let bytes;try{bytes=readFileSync(join(dir,'case-250.html'));}catch{errors.push('missing_public_html');}
 const html=bytes?.toString('utf8')||'',own=selected250(html);
 need(r.official_url===url&&(!r.alternate_url_attempted||r.alternate_url_attempted===url+'/'),'registered_original_url_or_same_handle_slash');
 need(r.status==='FETCHED'&&r.parser_ok===true&&Boolean(bytes?.length)&&r.html_bytes===bytes?.length&&r.html_sha256===hash(bytes||''),'raw_first_party_html_sha256');
 need(r.archived_coffee===name&&own.exact&&norm(f.name)===norm(name),'exact_selected_title_not_recycled_sku');
 for(const key of ['ownRoast','ownWashed','ownSantander','ownElevation','ownVarieties','ownNotes','ownFlavor','ownDrying'])need(own[key],'selected_first_party_'+key);
 need(norm(f.roast_level)==='medium','only_explicit_product_medium_roast');
 need(f.process==='Washed','washed_not_sun_drying');
 need(!f.decaffeination_method,'no_unsupported_decaf');
 need(!(r.seo_fallback_fields||[]).some(k=>['tasting_notes','process','roast_level','variety','origin'].includes(k)),'no_seo_field_substitution');
 const parsed=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
 need(parsed?.ok===true&&norm(parsed.fields?.name)===norm(name),'actual_current_parser_replay');
 need(parsed?.ok===true&&coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview')&&
  coffeeSourceReviewSnapshot({...parsed,source_url:r.final_url||url})?.type==='coffee_source_review','Add_Coffee_and_Source_Review_without_save');
 const sensory=norm(parsed?.fields?.tasting_notes);
 const rawFlavor=['tangerine','orange','tobacco'].every(x=>sensory.includes(x));
 const sourceFacts=(parsed?.source_facts||[]).filter(x=>x.field==='tasting_notes');
 const reviewFlavor=sourceFacts.some(x=>['tangerine','orange','tobacco'].every(word=>norm(x.value).includes(word)));
 // Multiple selected captions are both evidence, but do NOT blindly concatenate
 // or claim a conflict is resolved. Require that the second literal is at least
 // present in parser evidence or canonical notes for conscious review.
 need(rawFlavor||reviewFlavor,'second_own_flavor_caption_not_retained_for_review');
 const out={passed:errors.length===0,errors,case:250,source_sha:process.env.DIC_R339_HEAD_SHA,
  event_sha:process.env.DIC_R339_EVENT_SHA,manual_semantic_certified:false,all603_certified:false,
  selected:{url,final_url:r.final_url||null,headings:own.headings,html_sha256:r.html_sha256,
    html_bytes:r.html_bytes,own,fields:f,conflicts:r.conflicts||[],seo:r.seo_fallback_fields||[],
    secondary_flavor_in_canonical:rawFlavor,secondary_flavor_in_source_review:reviewFlavor,
    full_603_or_sale_lot_unverified:true}};
 writeFileSync(join(dir,'r339-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R339] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
