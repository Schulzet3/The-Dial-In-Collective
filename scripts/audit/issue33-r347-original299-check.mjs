#!/usr/bin/env node
// Issue #33 R347: source-bound original #299 only, not global accuracy or member save.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
export const selectedUrl='https://sextantcoffee.com/products/the-windsor-sextant-coffee';
export const selectedName='The Windsor - Brazil Coffee';
export const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const sha=v=>createHash('sha256').update(v).digest('hex');
// Explicit currently selected product JSON tags are product-specific second-tier
// evidence, NOT merchant nav/SEO or an inference from "water-friendly" prose.
export function selected299OwnTags(facts){
 const row=(facts||[]).find(f=>f.label==='Published product tags'&&f.source_type==='product_json');
 let tags=[];try{tags=JSON.parse(row?.value||'[]');}catch{}
 if(!Array.isArray(tags))tags=[];
 return {
  washed:tags.some(s=>norm(s)==='washed coffee'),
  medium:tags.some(s=>norm(s)==='medium roast coffee')
 };
}
export function selected299(html){
 const own=productMarkup(String(html||''));
 const headings=selectedProductHeadings(own);
 const clean=norm(own.replace(/<(script|style|noscript|template|nav|aside|footer|header|select)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {headings,exact:headings.some(h=>norm(h)===norm(selectedName)),
  ownDescription:clean.includes('multi generational brazilian family in the minas gerais region') &&
   clean.includes('traditional water friendly processing') && clean.includes('cherry and milk chocolate'),
  literalProcess:/\b(?:washed|natural process|honey process|wet hulled|anaerobic process)\b/i.test(clean),
  literalRoast:/\b(?:roast level light|roast level medium|roast level dark|light roast|medium roast|dark roast)\b/i.test(clean),
  ownEspressoContext:clean.includes('nutty and creamy single origin espresso')};
}
if(process.env.DIC_R347_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r347';
 const errors=[],check=(ok,why)=>{if(!ok)errors.push(why);};
 let evidence={};try{evidence=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('focused_evidence_absent');}
 let bytes;try{bytes=readFileSync(join(dir,'case-299.html'));}catch{errors.push('selected_primary_html_absent');}
 const r=evidence.records?.[0]||{},f=r.current_fields||{},raw=bytes?.toString('utf8')||'',selected=selected299(raw);
 check(JSON.stringify(evidence.case_numbers)==='[299]'&&evidence.records?.length===1,'exact_original299_only');
 check(requiredFocusedSourceFailures([299],evidence.records||[]).length===0,'hard_original_source_identity_parser_and_UI');
 check(r.official_url===selectedUrl&&!r.alternate_url_attempted&&r.status==='FETCHED','original_url_not_alternate_or_cache');
 check(bytes?.length>10000&&r.html_bytes===bytes?.length&&r.html_sha256===sha(bytes||''),'actual_selected_html_bytes_SHA256');
 check(r.archived_coffee===selectedName&&selected.exact&&norm(f.name)===norm(selectedName),'current_exact_selected_H1');
 check(selected.ownDescription&&selected.ownEspressoContext,'current_selected_description_wording');
 check(!selected.literalProcess&&!selected.literalRoast,'source_did_not_silently_add_a_labeled_process_or_roast');
 const ownTags=selected299OwnTags(r.source_facts);
 check(ownTags.washed&&norm(f.process)==='washed','explicit_exact_selected_product_Washed_Coffee_tag');
 check(ownTags.medium&&norm(f.roast_level)==='medium','explicit_exact_selected_product_Medium_roast_tag');
 check(!f.producer||!/highly knowledgeable|multi.generational|brazilian family/i.test(f.producer),'unnamed_family_not_nominated_as_named_producer');
 check(['cherry','milk chocolate'].every(x=>norm(f.tasting_notes).includes(x)),'unqualified_cherry_milk_chocolate_preserved');
 check(!/north eastern brazil.*minas gerais.*brazil/i.test(norm(f.origin)),'no_concatenated_contradictory_geographic_origin');
 check(!(r.seo_fallback_fields||[]).some(k=>['name','origin','process','roast_level','tasting_notes'].includes(k)),'no_SEO_or_sibling_substitution');
 check(evidence.manual_certified===0&&evidence.original_corpus_modified===false&&evidence.production_operations===0,'frozen_corpus_and_privacy_unchanged');
 check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R347_HEAD_SHA &&
  evidence.source_sha===process.env.DIC_R347_EVENT_SHA&&process.env.GITHUB_SHA===process.env.DIC_R347_EVENT_SHA,'exact_checkout_and_event_SHA');
 check(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','unchanged_frozen603_blob');
 const p=extractPublicCoffeeFacts(raw,{source_url:r.final_url||selectedUrl});
 check(p?.ok===true&&norm(p.fields?.name)===norm(selectedName),'real_current_parser');
 check(p?.ok===true&&coffeeUrlPreviewMarkup(p).includes('coffee-url-preview')&&
  coffeeSourceReviewSnapshot({...p,source_url:r.final_url||selectedUrl})?.type==='coffee_source_review','actual_Add_Coffee_and_Source_Review_no_save');
 const out={passed:errors.length===0,errors,source_sha:process.env.DIC_R347_HEAD_SHA,event_sha:process.env.DIC_R347_EVENT_SHA,
  original_number:299,official_url:r.official_url,final_url:r.final_url||null,selected_h1:selected.headings,
  real_html_bytes:bytes?.length||0,real_html_sha256:bytes?sha(bytes):null,selected,
  fields:f,selected_product_tag_proof:selected299OwnTags(r.source_facts),conflicts:r.conflicts||[],source_facts:(r.source_facts||[]).slice(0,30),
  actual_member_save:false,present_lot_certified:false,all603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r347-original299-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R347] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
