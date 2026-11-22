#!/usr/bin/env node
// Issue #33 R348: original #297 selected official product truth, no member save.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
export const selectedUrl='https://seldoviaroastingco.com/products/wildhaven-blend-1';
export const selectedName='Wildhaven Blend';
export const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=b=>createHash('sha256').update(b).digest('hex');
const wanted=['soft berry brightness','smooth milk chocolate body','toasted sugar warmth','cozy lingering finish'];
export function selected297(html){
 const own=productMarkup(String(html||''));
 const headings=selectedProductHeadings(own);
 const prose=norm(own.replace(/<(script|style|noscript|template|nav|aside|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {headings,exact:headings.some(h=>norm(h)===norm(selectedName)),
  direct_flavor_words:wanted.map(x=>prose.includes(x)),
  direct_roast:prose.includes('roast level medium'),
  source_excerpt:prose.slice(0,1200)};
}
if(process.env.DIC_R348_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r348';
 const errors=[],check=(ok,why)=>{if(!ok)errors.push(why);};
 let evidence={};try{evidence=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('focused_evidence_absent');}
 let bytes;try{bytes=readFileSync(join(dir,'case-297.html'));}catch{errors.push('exact_selected_html_absent');}
 const row=evidence.records?.[0]||{},f=row.current_fields||{},raw=bytes?.toString('utf8')||'',selected=selected297(raw);
 const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 check(JSON.stringify(evidence.case_numbers)==='[297]'&&evidence.records?.length===1,'only_frozen_original297');
 check(requiredFocusedSourceFailures([297],evidence.records||[]).length===0,'official_source_identity_parser_and_UI_hard_gate');
 check(row.status==='FETCHED'&&row.official_url===selectedUrl&&!row.alternate_url_attempted,'exact_selected_official_url_not_other_product');
 check(bytes?.length>10000&&row.html_bytes===bytes.length&&row.html_sha256===hash(bytes),'raw_HTML_bytes_and_SHA256');
 check(row.archived_coffee===selectedName&&selected.exact&&norm(f.name)===norm(selectedName),'same_selected_product_H1');
 check(selected.direct_flavor_words.every(Boolean)&&selected.direct_roast,'actual_current_product_direct_labeled_flavor_and_roast');
 check(norm(f.roast_level)==='medium','direct_selected_medium_autofill');
 check(['berry','milk chocolate','toasted sugar','cozy'].every(x=>norm(f.tasting_notes).includes(x)),'four_selected_seller_notes_autofill');
 check(!(row.seo_fallback_fields||[]).some(x=>['name','tasting_notes','roast_level'].includes(x)),'no_generic_SEO_or_sibling_autofill');
 check(evidence.original_corpus_modified===false&&evidence.manual_certified===0&&evidence.production_operations===0,'unchanged_original_corpus_and_no_member_production');
 check(checkout===process.env.DIC_R348_HEAD_SHA&&evidence.source_sha===process.env.DIC_R348_EVENT_SHA&&
   process.env.GITHUB_SHA===process.env.DIC_R348_EVENT_SHA,'exact_checkout_and_GitHub_event_sha');
 check(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','immutable_original_603_row_blob');
 const p=bytes?.length?extractPublicCoffeeFacts(raw,{source_url:row.final_url||selectedUrl}):{};
 check(p.ok===true&&norm(p.fields?.name)===norm(selectedName),'actual_current_parser_selected_coffee');
 check(p.ok===true&&coffeeUrlPreviewMarkup(p).includes('coffee-url-preview')&&
   coffeeSourceReviewSnapshot({...p,source_url:row.final_url||selectedUrl})?.type==='coffee_source_review',
   'Add_Coffee_and_Source_Review_without_save');
 const out={passed:errors.length===0,errors,source_sha:checkout,event_sha:process.env.DIC_R348_EVENT_SHA,
  case_number:297,original_official_url:selectedUrl,final_url:row.final_url||null,selected_h1:selected.headings,
  raw_html_bytes:bytes?.length||0,raw_html_sha256:bytes?hash(bytes):null,selected_direct:selected,
  fields:f,conflicts:row.conflicts||[],source_facts:(row.source_facts||[]).slice(0,32),
  present_lot_certified:false,all603_certified:false,member_save:false,production_operations:0};
 writeFileSync(join(dir,'r348-original297-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R348] '+JSON.stringify(out).slice(0,20000));
 if(errors.length)process.exitCode=1;
}
