#!/usr/bin/env node
// R344: one exact first-party original603 #289 product; not global certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
export const selectedUrl='https://roasterympls.com/products/guatemala-geisha-limited-edition';
export const selectedName='Guatemala Geisha Limited Edition';
const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=v=>createHash('sha256').update(v).digest('hex');
export function selected289(html){
 const own=productMarkup(String(html||'')),headings=selectedProductHeadings(own);
 const clean=norm(own.replace(/<(script|style|noscript|template|nav|aside|footer|header|select)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
   .replace(/<!--[\\s\\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {headings,exact:headings.length===1&&norm(headings[0])===norm(selectedName),
  labeledFlavor:clean.includes('flavor jasmine bergamot and stone fruit'),
  selectedSpecs:clean.includes('origin guatemala')&&clean.includes('process washed')&&clean.includes('variety geisha'),
  ownDistinctContext:clean.includes('honeysuckle'),
  genericBody:clean.includes('tea like body')};
}
if(process.env.DIC_R344_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r344';
 const errors=[],check=(ok,label)=>{if(!ok)errors.push(label);};
 let evidence={};try{evidence=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_focused_evidence');}
 let bytes;try{bytes=readFileSync(join(dir,'case-289.html'));}catch{errors.push('missing_official_raw_html');}
 const r=evidence.records?.[0]||{},f=r.current_fields||{},raw=bytes?.toString('utf8')||'',selected=selected289(raw);
 check(JSON.stringify(evidence.case_numbers)==='[289]'&&evidence.records?.length===1,'exact_original289_only');
 check(requiredFocusedSourceFailures([289],evidence.records||[]).length===0,'required_fetched_selected_identity_parser_and_UI');
 check(r.official_url===selectedUrl&&!r.alternate_url_attempted&&r.status==='FETCHED','registered_exact_first_party_url');
 check(bytes?.length>10000&&r.html_bytes===bytes?.length&&r.html_sha256===hash(bytes||''),'raw_html_sha256_bytes');
 check(r.archived_coffee===selectedName&&selected.exact&&norm(f.name)===norm(selectedName),'selected_exact_H1_and_coffee');
 check(selected.labeledFlavor&&selected.selectedSpecs&&selected.ownDistinctContext&&selected.genericBody,'direct_selected_own_source_not_metadata');
 check(norm(f.origin)==='guatemala','direct_selected_origin');
 check(f.process==='Washed','direct_selected_washed');
 check(/geisha|gesha/i.test(f.variety||''),'direct_selected_geisha_variety');
 check(['jasmine','bergamot','stone fruit'].every(x=>norm(f.tasting_notes).includes(x)),'direct_selected_labeled_flavors');
 check(!f.roast_level&&!f.producer&&!f.decaffeination_method,'no_tea_body_to_roast_or_unpublished_producer_decaf');
 check(!(r.seo_fallback_fields||[]).some(k=>['name','origin','process','variety','tasting_notes'].includes(k)),'no_SEO_backfill_of_selected_facts');
 check(evidence.manual_certified===0&&evidence.original_corpus_modified===false&&evidence.production_operations===0,'no_global_certification_or_provider_ops');
 check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.GITHUB_SHA&&evidence.source_sha===process.env.GITHUB_SHA,'exact_checkout_and_evidence_sha');
 check(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','frozen_csv_git_blob');
 const parsed=extractPublicCoffeeFacts(raw,{source_url:r.final_url||selectedUrl});
 check(parsed?.ok===true&&norm(parsed.fields?.name)===norm(selectedName),'actual_current_parser');
 check(parsed?.ok===true&&coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview')&&
   coffeeSourceReviewSnapshot({...parsed,source_url:r.final_url||selectedUrl})?.type==='coffee_source_review','Add_Coffee_Source_Review_without_save');
 const out={passed:errors.length===0,errors,source_sha:process.env.GITHUB_SHA,number:289,
  exact_selected_h1:selected.headings,official_url:r.official_url,final_url:r.final_url||null,
  raw_html_bytes:bytes?.length||0,raw_html_sha256:bytes?hash(bytes):null,
  selected,canonical_fields:f,conflicts:r.conflicts||[],seo:r.seo_fallback_fields||[],
  narrative_honeysuckle_for_human_source_review:true,manual_semantic_certified:false,full603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r344-original289-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R344] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
