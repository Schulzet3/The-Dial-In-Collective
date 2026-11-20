#!/usr/bin/env node
// R345: original603 #295 selected product only. Not global or sale-lot certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
export const selectedUrl='https://seldoviaroastingco.com/products/gentle-cove';
export const selectedName='Gentle Cove';
export const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=v=>createHash('sha256').update(v).digest('hex');
export function selected295(html){
 const own=productMarkup(String(html||''));
 const headings=selectedProductHeadings(own);
 const clean=norm(own.replace(/<(script|style|noscript|template|nav|aside|footer|header|select)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {
  headings,exact:headings.some(h=>norm(h)===norm(selectedName)),
  selectedDecaf:clean.includes('gentle cove decaf') && clean.includes('full flavor no caffeine'),
  ownLabeledNotes:['flavor notes','light caramel sweetness','gentle cocoa finish','smooth body with a soft rounded feel','balanced and comforting from start to finish'].every(s=>clean.includes(s)),
  explicitMedium:clean.includes('roast level medium'),
  ownBroadOrigin:clean.includes('south american beans'),
  genericShopCare:clean.includes('materials care')
 };
}
if(process.env.DIC_R345_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r345';
 const errors=[],check=(ok,label)=>{if(!ok)errors.push(label);};
 let evidence={};try{evidence=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_focused_evidence');}
 let bytes;try{bytes=readFileSync(join(dir,'case-295.html'));}catch{errors.push('missing_official_raw_html');}
 const r=evidence.records?.[0]||{},f=r.current_fields||{},raw=bytes?.toString('utf8')||'',selected=selected295(raw);
 check(JSON.stringify(evidence.case_numbers)==='[295]'&&evidence.records?.length===1,'exact_original295_only');
 check(requiredFocusedSourceFailures([295],evidence.records||[]).length===0,'required_exact_selected_fetched_parser_and_UI');
 check(r.official_url===selectedUrl&&!r.alternate_url_attempted&&r.status==='FETCHED','original_exact_first_party_selected_URL');
 check(bytes?.length>10000&&r.html_bytes===bytes?.length&&r.html_sha256===hash(bytes||''),'raw_official_html_bytes_sha256');
 check(r.archived_coffee===selectedName&&selected.exact&&norm(f.name)===norm(selectedName),'selected_current_H1_identity');
 check(selected.selectedDecaf&&selected.ownLabeledNotes&&selected.explicitMedium&&selected.ownBroadOrigin,'direct_selected_notes_roast_decaf_origin');
 check(norm(f.origin)==='south america','two_unnamed_south_american_beans_no_country_invention');
 check(norm(f.roast_level)==='medium','published_medium_not_adjectival_light_roast');
 check(['light caramel sweetness','gentle cocoa finish','soft rounded feel'].every(x=>norm(f.tasting_notes).includes(x)),'source_labeled_sensory_fields');
 check(!f.decaffeination_method&&!f.process&&!f.producer&&!f.variety,'no_speculative_decaf_method_process_producer_variety');
 check(!(r.seo_fallback_fields||[]).some(k=>['name','origin','roast_level','tasting_notes'].includes(k)),'no_metadata_backfill_of_current_selected');
 check(evidence.manual_certified===0&&evidence.original_corpus_modified===false&&evidence.production_operations===0,'no_global_certification_or_provider_ops');
 check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R345_HEAD_SHA &&
  evidence.source_sha===process.env.DIC_R345_EVENT_SHA&&process.env.GITHUB_SHA===process.env.DIC_R345_EVENT_SHA,'exact_checkout_and_event_sha');
 check(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','frozen_original603_blob');
 const parsed=extractPublicCoffeeFacts(raw,{source_url:r.final_url||selectedUrl});
 check(parsed?.ok===true&&norm(parsed.fields?.name)===norm(selectedName),'actual_current_parser');
 check(parsed?.ok===true&&coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview')&&
  coffeeSourceReviewSnapshot({...parsed,source_url:r.final_url||selectedUrl})?.type==='coffee_source_review','actual_UI_preview_and_review_no_save');
 const out={passed:errors.length===0,errors,source_sha:process.env.DIC_R345_HEAD_SHA,event_sha:process.env.DIC_R345_EVENT_SHA,
  number:295,original_url:r.official_url,final_url:r.final_url||null,selected_h1:selected.headings,
  raw_html_bytes:bytes?.length||0,raw_html_sha256:bytes?hash(bytes):null,selected,fields:f,
  source_facts:(r.source_facts||[]).slice(0,12),conflicts:r.conflicts||[],seo:r.seo_fallback_fields||[],
  current_sale_lot_certified:false,all603_individually_certified:false,production_operations:0};
 writeFileSync(join(dir,'r345-original295-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R345] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
