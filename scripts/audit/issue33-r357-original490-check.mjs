#!/usr/bin/env node
// Original603 #490: one current exact selected official Great Circle product.
// The old CSV, retail navigation, SEO and customer reviews are NOT certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {selectedCurrentCoffeeReleaseBadge} from '../../src/server/coffee-selected-source-evidence.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';

export const selectedUrl='https://www.greatcirclecoffee.com/products/la-josefina-sudan-rume';
export const selectedName='La Josefina Sudán Rumé / Natural Extended Fermentation';
export const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=v=>createHash('sha256').update(v).digest('hex');

export function selected490(html){
 const own=productMarkup(String(html||''));
 const headings=selectedProductHeadings(own);
 const clean=norm(own.replace(/<(script|style|noscript|template|nav|aside|footer|header|select)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 const badge=selectedCurrentCoffeeReleaseBadge(own,{name:selectedName});
 return {headings,exact:headings.some(h=>norm(h)===norm(selectedName)),badge,
  ownOrigin:clean.includes('ecuador'),ownGrowers:clean.includes('leopoldo andrade')&&clean.includes('ligia merizalde'),
  ownVariety:clean.includes('sudan rume'),
  ownProcess:clean.includes('anaerobic natural')||clean.includes('extended fermentation natural'),
  ownNotes:['natural wine','cacao','cherry cordial'].every(s=>clean.includes(s)),
  ownRoast:clean.includes('roast level')&&clean.includes('light')};
}

if(process.env.DIC_R357_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r357';
 const errors=[],check=(ok,key)=>{if(!ok)errors.push(key);};
 let evidence={};try{evidence=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_focused_source_evidence');}
 let bytes;try{bytes=readFileSync(join(dir,'case-490.html'));}catch{errors.push('missing_raw_selected_HTML');}
 const r=evidence.records?.[0]||{},f=r.current_fields||{},raw=bytes?.toString('utf8')||'',own=selected490(raw);
 check(JSON.stringify(evidence.case_numbers)==='[490]'&&evidence.records?.length===1,'only_original490');
 check(requiredFocusedSourceFailures([490],evidence.records||[]).length===0,'strict_official_identity_parser_UI_and_badge_gate');
 check(r.official_url===selectedUrl&&!r.alternate_url_attempted&&r.status==='FETCHED','registered_official_exact_URL_only');
 check(bytes?.length>10000&&r.html_bytes===bytes?.length&&r.html_sha256===hash(bytes||''),'actual_raw_HTML_sha256');
 check(own.exact&&norm(f.name)===norm(selectedName)&&r.selected_heading_identity_verified===true,'exact_current_selected_product_H1');
 check(own.ownOrigin&&own.ownGrowers&&own.ownVariety&&own.ownProcess&&own.ownNotes,'own_primary_selected_literal_facts');
 // The selected release label must come from THIS coffee's immediately
 // adjacent price badge, not menus, other products, SEO or review text.
 check(own.badge==='Next Level'&&r.selected_price_badge==='Next Level'&&
    f.release_label==='Next Level'&&r.selected_price_badge_accepted===true,'selected_price_badge_to_release_field');
 check(norm(f.origin).includes('ecuador'),'direct_selected_ecuador');
 check(norm(f.process).includes('natural'),'current_source_natural_process');
 check(['natural wine','cacao','cherry cordial'].every(s=>norm(f.tasting_notes).includes(s)),'all_direct_selected_sensory_notes');
 check(!f.decaffeination_method,'no_invented_decaf');
 check(!(r.seo_fallback_fields||[]).some(k=>['release_label','name','origin','process','tasting_notes'].includes(k)),'no_meta_menu_related_product_backfill');
 check(evidence.manual_certified===0&&evidence.original_corpus_modified===false&&evidence.production_operations===0,'no_frozen_or_member_provider_changes');
 check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R357_HEAD_SHA&&
  evidence.source_sha===process.env.DIC_R357_EVENT_SHA&&process.env.GITHUB_SHA===process.env.DIC_R357_EVENT_SHA,'exact_checkout_and_event_sha');
 check(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','original603_frozen_CSV_blob_unchanged');
 const parsed=extractPublicCoffeeFacts(raw,{source_url:r.final_url||selectedUrl});
 check(parsed?.ok===true&&norm(parsed.fields?.name)===norm(selectedName),'actual_current_parser_same_selected_identity');
 check(parsed?.ok===true&&coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview')&&
  coffeeSourceReviewSnapshot({...parsed,source_url:r.final_url||selectedUrl})?.type==='coffee_source_review','Add_Coffee_Source_Review_without_auto_save');
 const out={passed:errors.length===0,errors,source_sha:process.env.DIC_R357_HEAD_SHA,event_sha:process.env.DIC_R357_EVENT_SHA,
  number:490,official_url:r.official_url,final_url:r.final_url||null,H1:own.headings,
  html_bytes:bytes?.length||0,html_sha256:bytes?hash(bytes):null,selected:own,
  fields:f,conflicts:r.conflicts||[],source_facts:(r.source_facts||[]).slice(0,35),
  certified_all_603:false,member_save:false,production_operations:0};
 writeFileSync(join(dir,'r357-original490-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R357] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
