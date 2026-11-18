#!/usr/bin/env node
// R286 strict current selected original #92 source byte-hash and actual extractor/preview afterproof.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r286';
const hash=x=>createHash('sha256').update(x).digest('hex');
const errors=[],need=(ok,key)=>{if(!ok)errors.push(key)};
let report;
try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){errors.push('missing_focused_report_'+(e.code||e.message))}
const original='https://darkcanyon-coffee.com/collections/best-sellers/products/highlander-grogg';
const alternate='https://darkcanyon-coffee.com/collections/flavored-coffees/products/highlander-grogg';
const name='Highlander Grogg';
need(JSON.stringify(report?.case_numbers)==='[92]'&&report?.records?.length===1,'only_original_92');
need(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_csv_hash');
need(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_global_or_provider_certification');
need(report?.source_sha===process.env.DIC_R286_EVENT_SHA,'same_event_sha');
need(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R286_CHECKOUT_SHA,'exact_checkout_sha');
need(requiredFocusedSourceFailures([92],report?.records||[]).length===0,'source_identity_parser_editable_preview');
const rec=report?.records?.[0]||{},f=rec.current_fields||{};
let raw;
try{raw=readFileSync(join(dir,'case-92.html'))}catch(e){errors.push('no_raw_current_html_'+(e.code||e.message))}
let final;try{final=new URL(rec.final_url)}catch{}
const text=productMarkup(raw?.toString('utf8')||'');
const h1=selectedProductHeadings(text);
const visible=text.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
const notes=String(f.tasting_notes||'').toLowerCase();
need(rec.official_url===original&&rec.archived_coffee===name,'immutable_selected_original');
need(rec.status==='FETCHED'&&rec.parser_ok===true,'bounded_real_source_parsed');
need(final?.protocol==='https:'&&final.hostname==='darkcanyon-coffee.com'&&final.pathname.endsWith('/products/highlander-grogg'),'same_original_selected_product_handle');
need([original,alternate].includes(rec.final_url),'original_or_only_allowed_same_handle_collection');
need(raw?.length>0&&raw.length===rec.html_bytes&&hash(raw)===rec.html_sha256,'independent_raw_source_sha');
need(h1.length===1&&h1[0]===name&&f.name===name&&rec.selected_heading_identity_verified===true,'exact_current_h1_and_parser_name');
for(const literal of ['butterscotch','french vanilla','irish cr'])need(visible.includes(literal),'own_visible_literal_'+literal.replace(/ /g,'_'));
for(const note of ['butterscotch','french vanilla','irish cr'])need(notes.includes(note),'canonical_direct_flavor_'+note.replace(/ /g,'_'));
need(notes.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim()==='butterscotch, french vanilla, irish creme','canonical_three_descriptors_without_bridge_prose');
need(!/graham cracker|hazelnut|cinnamon|jingle bell|frosty/i.test(notes),'no_related_coffee_sensory');
need(!f.decaffeination_method,'unselected_decaf_option_is_not_method');
need(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'editable_add_coffee_source_review');
const out={passed:errors.length===0,errors,event_sha:process.env.DIC_R286_EVENT_SHA,checkout_sha:process.env.DIC_R286_CHECKOUT_SHA,manual_certified:0,production_operations:0,records:[{number:92,original_url:original,current_url:rec.final_url,raw_bytes:rec.html_bytes,raw_sha256:rec.html_sha256,h1,fields:f,conflicts:rec.conflicts||[],seo_fallback_fields:rec.seo_fallback_fields||[]}]};
writeFileSync(join(dir,'r286-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R286 AFTERPROOF] '+JSON.stringify(out));
if(errors.length)process.exitCode=1;
