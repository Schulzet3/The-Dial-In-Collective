#!/usr/bin/env node
// Issue #33 R346: bounded original603 #296 selected product source. Never 603 certification or a member save.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
export const selectedUrl='https://seldoviaroastingco.com/products/house-blend-beans';
export const selectedName='House Blend';
export const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=v=>createHash('sha256').update(v).digest('hex');
export function selected296(html){
 const own=productMarkup(String(html||''));
 const headings=selectedProductHeadings(own);
 const clean=norm(own.replace(/<(script|style|noscript|template|nav|aside|footer|header|select)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
   .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {headings,exact:headings.some(h=>norm(h)===norm(selectedName)),
  ownLabeledNotes:['flavor notes','smooth medium body','light fruit sweet lift','soft cocoa and toasted nut','clean balanced finish'].every(s=>clean.includes(s)),
  explicitMedium:clean.includes('roast level medium'), adjectiveLight:clean.includes('light fruit sweet lift'),
  genericShopCare:clean.includes('materials care')};
}
if(process.env.DIC_R346_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r346';
 const errors=[],check=(ok,label)=>{if(!ok)errors.push(label);};
 let evidence={};try{evidence=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_focused_evidence');}
 let bytes;try{bytes=readFileSync(join(dir,'case-296.html'));}catch{errors.push('missing_official_raw_html');}
 const r=evidence.records?.[0]||{},f=r.current_fields||{},raw=bytes?.toString('utf8')||'',selected=selected296(raw);
 check(JSON.stringify(evidence.case_numbers)==='[296]'&&evidence.records?.length===1,'exact_original296_only');
 check(requiredFocusedSourceFailures([296],evidence.records||[]).length===0,'required_exact_selected_fetched_parser_and_UI');
 check(r.official_url===selectedUrl&&!r.alternate_url_attempted&&r.status==='FETCHED','exact_original_selected_first_party_URL');
 check(bytes?.length>10000&&r.html_bytes===bytes?.length&&r.html_sha256===hash(bytes||''),'real_official_html_sha_and_bytes');
 check(r.archived_coffee===selectedName&&selected.exact&&norm(f.name)===norm(selectedName),'same_selected_H1_identity');
 check(selected.ownLabeledNotes&&selected.explicitMedium&&selected.adjectiveLight,'direct_selected_own_flavor_and_roast');
 check(norm(f.roast_level)==='medium','medium_roast_not_light_flavor_adjective');
 check(['smooth medium body','light fruit sweet lift','soft cocoa and toasted nut','clean balanced finish'].every(x=>norm(f.tasting_notes).includes(x)),'labeled_selected_flavors');
 check(!f.process&&!f.producer&&!f.variety&&!f.decaffeination_method,'no_unsourced_bean_process_grower_variety_decaf');
 check(!(r.seo_fallback_fields||[]).some(k=>['name','roast_level','tasting_notes'].includes(k)),'no_seo_substitution');
 check(evidence.manual_certified===0&&evidence.original_corpus_modified===false&&evidence.production_operations===0,'original603_not_rewritten_and_no_provider_ops');
 check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R346_HEAD_SHA &&
   evidence.source_sha===process.env.DIC_R346_EVENT_SHA&&process.env.GITHUB_SHA===process.env.DIC_R346_EVENT_SHA,'exact_checkout_event_SHA');
 check(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','unchanged_original603_CSV');
 const parsed=extractPublicCoffeeFacts(raw,{source_url:r.final_url||selectedUrl});
 check(parsed?.ok===true&&norm(parsed.fields?.name)===norm(selectedName),'actual_current_parser');
 check(parsed?.ok===true&&coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview')&&
   coffeeSourceReviewSnapshot({...parsed,source_url:r.final_url||selectedUrl})?.type==='coffee_source_review','current_Add_Coffee_and_review_no_save');
 const out={passed:errors.length===0,errors,source_sha:process.env.DIC_R346_HEAD_SHA,event_sha:process.env.DIC_R346_EVENT_SHA,
  original_number:296,official_url:r.official_url,final_url:r.final_url||null,selected_h1:selected.headings,
  real_html_bytes:bytes?.length||0,real_html_sha256:bytes?hash(bytes):null,selected,fields:f,
  conflicts:r.conflicts||[],source_facts:(r.source_facts||[]).slice(0,20),seo:r.seo_fallback_fields||[],
  present_sale_lot_certified:false,original603_semantic_certification:false,production_operations:0};
 writeFileSync(join(dir,'r346-original296-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R346] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
