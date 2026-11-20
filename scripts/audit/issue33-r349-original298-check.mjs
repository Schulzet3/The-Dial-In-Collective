#!/usr/bin/env node
// Original603 #298: selected seller identity, present lot/notes/method and no-save source review.
// Live merchant unavailable or changed identity is a failure, never an invitation to invent facts.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
export const selectedUrl='https://sextantcoffee.com/products/plandanas-reserve-sextant-coffee';
export const selectedName='Walia Ibex - Organic Decaf Coffee';
export const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const sha=v=>createHash('sha256').update(v).digest('hex');
export function selected298(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const clean=norm(selected.replace(/<(script|style|noscript|template|nav|aside|footer|header|select)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {headings,exact:headings.some(x=>norm(x)===norm(selectedName)),
  directlyColombian:clean.includes('decaffeinated at origin in colombia') &&
    clean.includes('department of tolima') && clean.includes('planadas'),
  sellerSugarProcess:clean.includes('sugar process'),
  directTastes:['almonds','brown sugar','tart cherry'].every(x=>clean.includes(x)),
  conflictingBroadReference:clean.includes('central american coffee'),
  associationOf39:clean.includes('39 small coffee growers')
 };
}
if(process.env.DIC_R349_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r349';
 const errors=[],check=(v,k)=>{if(!v)errors.push(k);};
 let evidence={};try{evidence=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('selected_evidence_missing');}
 let bytes;try{bytes=readFileSync(join(dir,'case-298.html'));}catch{errors.push('selected_html_missing');}
 const r=evidence.records?.[0]||{},f=r.current_fields||{},html=bytes?.toString('utf8')||'',s=selected298(html);
 check(JSON.stringify(evidence.case_numbers)==='[298]'&&evidence.records?.length===1,'only_original298');
 check(r.official_url===selectedUrl&&!r.alternate_url_attempted&&r.status==='FETCHED','original_exact_first_party_url_fetched');
 check(requiredFocusedSourceFailures([298],evidence.records||[]).length===0,'required_exact_original_identity_parser_and_UI');
 check(!!bytes&&bytes.length>10000&&r.html_bytes===bytes.length&&r.html_sha256===sha(bytes),'raw_selected_HTML_hash');
 check(r.archived_coffee===selectedName&&s.exact&&norm(f.name)===norm(selectedName),'selected_current_H1_matches_original_identity');
 check(s.directlyColombian&&s.sellerSugarProcess&&s.directTastes&&s.associationOf39,'current_exact_selected_description');
 check(s.conflictingBroadReference,'current_broad_Central_America_context_preserved_for_review');
 check(norm(f.origin).includes('colombia')&&!norm(f.origin).includes('central america')&&
    !/\b(?:guatemala|nicaragua|honduras|costa rica|el salvador)\b/.test(norm(f.origin)),
    'Colombian_selected_origin_not_overridden_by_generic_Central_America_sensory');
 check(!['washed','natural','honey','wet hulled'].includes(norm(f.process)),
    'decaf_sugar_process_not_misclassified_as_cherry_processing');
 check(!f.roast_level,'roast_not_inferred_without_a_selected_roast_label');
 check(!f.producer||!/39 small coffee growers|spanish learning roaster/i.test(f.producer),
    'collective_not_a_fabricated_individual_producer');
 check(['almond','brown sugar','cherry'].every(x=>norm(f.tasting_notes).includes(x)),
    'current_direct_three_tasting_phrases_preserved');
 check(norm(f.decaffeination_method)==='sugar process',
    'selected_seller_sugar_process_method_distinct_from_cherry_processing');
 check(!(r.seo_fallback_fields||[]).some(k=>['name','origin','process','tasting_notes','decaffeination_method'].includes(k)),
    'no_SEO_unrelated_product_fact_backfill');
 check(evidence.manual_certified===0&&evidence.original_corpus_modified===false&&evidence.production_operations===0,
    'original_frozen603_and_member_data_unmodified');
 check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R349_HEAD_SHA &&
    evidence.source_sha===process.env.DIC_R349_EVENT_SHA&&process.env.GITHUB_SHA===process.env.DIC_R349_EVENT_SHA,
    'exact_event_checkout_SHA');
 check(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6',
    'frozen603_original_blob');
 const p=extractPublicCoffeeFacts(html,{source_url:r.final_url||selectedUrl});
 check(p?.ok===true&&norm(p.fields?.name)===norm(selectedName),'real_current_parser_selected_name');
 check(p?.ok===true&&coffeeUrlPreviewMarkup(p).includes('coffee-url-preview')&&
    coffeeSourceReviewSnapshot({...p,source_url:r.final_url||selectedUrl})?.type==='coffee_source_review',
    'Add_Coffee_Source_Review_no_save');
 const out={passed:errors.length===0,errors,event_sha:process.env.DIC_R349_EVENT_SHA,
  checkout_sha:process.env.DIC_R349_HEAD_SHA,case_number:298,official_url:r.official_url,final_url:r.final_url||null,
  archived_name:r.archived_coffee||null,selected_h1:s.headings,source:s,raw_html_bytes:bytes?.length||0,
  raw_html_sha256:bytes?sha(bytes):null,fields:f,conflicts:r.conflicts||[],source_facts:(r.source_facts||[]).slice(0,35),
  manual_semantic_certified:false,all603_certified:false,member_saved:false,production_operations:0};
 writeFileSync(join(dir,'r349-original298-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R349] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
