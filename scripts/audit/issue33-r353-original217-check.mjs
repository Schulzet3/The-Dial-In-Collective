#!/usr/bin/env node
// Original603 #217: selected official product only; not global 603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';

export const selectedUrl='https://mbingomountaincoffee.com/products/ethiopia-guji-g3-organic-dambi-uddo-natural';
export const selectedName='ETHIOPIA GUJI ORGANIC DAMBI UDDO NATURAL';
export const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=v=>createHash('sha256').update(v).digest('hex');

export function selected217(html){
 const own=productMarkup(String(html||''));
 const headings=selectedProductHeadings(own);
 const clean=norm(own.replace(/<(script|style|noscript|template|nav|aside|footer|header|select)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {headings,exact:headings.some(h=>norm(h)===norm(selectedName)),
  guji:clean.includes('guji zone in ethiopia'),
  farms:clean.includes('450 smallholder farms')&&clean.includes('dambi uddo station'),
  natural:clean.includes('natural dry processing method'),
  notes:['strawberry','dried fruit','rose','green tea'].every(n=>clean.includes(n)),
  ownCupping:clean.includes('cupping notes')&&clean.includes('process natural'),
  bodyAndAcidity:clean.includes('body light')&&clean.includes('acidity medium')};
}

if(process.env.DIC_R353_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r353';
 const errors=[],check=(ok,k)=>{if(!ok)errors.push(k);};
 let evidence={};try{evidence=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_focused_source_evidence');}
 let bytes;try{bytes=readFileSync(join(dir,'case-217.html'));}catch{errors.push('missing_exact_selected_raw_html');}
 const r=evidence.records?.[0]||{},f=r.current_fields||{},raw=bytes?.toString('utf8')||'',own=selected217(raw);
 check(JSON.stringify(evidence.case_numbers)==='[217]'&&evidence.records?.length===1,'only_original217');
 check(requiredFocusedSourceFailures([217],evidence.records||[]).length===0,'strict_source_identity_parser_and_UI_gate');
 check(r.official_url===selectedUrl&&!r.alternate_url_attempted&&r.status==='FETCHED','exact_original_official_URL_only');
 check(bytes?.length>10000&&r.html_bytes===bytes?.length&&r.html_sha256===hash(bytes||''),'raw_official_HTML_SHA256');
 check(r.archived_coffee===selectedName&&own.exact&&norm(f.name)===norm(selectedName),'actual_exact_selected_H1');
 check(own.guji&&own.farms&&own.natural&&own.notes&&own.ownCupping,'direct_selected_literal_facts');
 check(norm(f.origin).includes('ethiopia')&&norm(f.origin).includes('guji'),'direct_guji_ethiopia_origin');
 check(norm(f.process)==='natural','direct_selected_natural_not_floating_or_drying_only');
 check(['strawberry','dried fruit','rose','green tea'].every(n=>norm(f.tasting_notes).includes(n)),'four_selected_cupping_literals');
 // Seller offers distinct roast choices. Without a chosen option, do not default from
 // Body: Light, Acidity: Medium, or the first sale variant.
 check(!f.roast_level,'no_inferred_roast_from_body_acidity_or_unselected_roast_variants');
 check(!f.producer||norm(f.producer).includes('smallholder')||norm(f.producer).includes('farms'),'unnamed_farms_not_invented_individual_producer');
 check(!f.decaffeination_method,'no_invented_decaf_method');
 check(!(r.seo_fallback_fields||[]).some(k=>['name','origin','process','tasting_notes'].includes(k)),'no_SEO_navigation_or_other_coffee');
 check(evidence.manual_certified===0&&evidence.original_corpus_modified===false&&evidence.production_operations===0,'corpus_and_provider_unchanged');
 check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R353_HEAD_SHA&&
   evidence.source_sha===process.env.DIC_R353_EVENT_SHA&&process.env.GITHUB_SHA===process.env.DIC_R353_EVENT_SHA,'exact_PR_head_or_merged_event_checkout');
 check(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','immutable_original603_CSV');
 const parsed=extractPublicCoffeeFacts(raw,{source_url:r.final_url||selectedUrl});
 check(parsed?.ok===true&&norm(parsed.fields?.name)===norm(selectedName),'actual_current_parser_exact_identity');
 check(parsed?.ok===true&&coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview')&&
   coffeeSourceReviewSnapshot({...parsed,source_url:r.final_url||selectedUrl})?.type==='coffee_source_review','Add_Coffee_Source_Review_no_save');
 const out={passed:errors.length===0,errors,source_sha:process.env.DIC_R353_HEAD_SHA,
  event_sha:process.env.DIC_R353_EVENT_SHA,number:217,official_url:r.official_url,
  final_url:r.final_url||null,H1:own.headings,html_bytes:bytes?.length||0,
  html_sha256:bytes?hash(bytes):null,selected:own,fields:f,conflicts:r.conflicts||[],
  source_facts:(r.source_facts||[]).slice(0,28),original603_all_manually_certified:false,
  selected_roast_variant_unselected:true,member_save:false,production_operations:0};
 writeFileSync(join(dir,'r353-original217-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R353] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
