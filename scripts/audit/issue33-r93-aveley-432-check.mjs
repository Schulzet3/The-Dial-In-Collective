#!/usr/bin/env node
// Issue #33 R93: selected current original603 #432; direct lot-elevation contradictions stay reviewable.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
export const selected432=Object.freeze({
 number:432,name:'Ethiopia Qabballe',
 url:'https://www.aveleyfarmscoffee.com/products/ethiopia-natural-halo-beriti',
 witnesses:['This coffee comes from the hills of Guji Ethiopia',
 'This lot is grown at over 2,200 meters high',
 'Cupping notes: Sweet - Blueberry - Lemon - Lime',
 'Roast Level: Light','Processing Method: Natural','Varietal: Heirloom','2000 MASL']
});
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'')
 .replace(/&(?:nbsp|amp);/giu,' ').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function cleanSelected(markup){return String(markup||'')
 .replace(/<!--[\s\S]*?-->/g,' ')
 .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
 .replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/giu,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();}
export function direct432(markup,headings){
 const text=norm(cleanSelected(markup)),hits=selected432.witnesses.map(t=>text.includes(norm(t)));
 return {uniqueSelected:Array.isArray(headings)&&headings.length===1&&norm(headings[0])===norm(selected432.name),
  directCurrentWitnesses:hits.every(Boolean),hits};
}
if(process.env.DIC_ISSUE33_R93_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 const failures=[],check=(ok,why)=>{if(!ok)failures.push(why)};
 let raw,report;try{raw=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(raw.toString('utf8'));}catch{}
 check(JSON.stringify(report?.case_numbers)==='[432]'&&report?.records?.length===1,'exact_original_subset');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_csv');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'preservation');
 const row=report?.records?.[0]||{},f=row.current_fields||{};
 let html;try{html=readFileSync(join(dir,'case-432.html'));}catch{}
 const scoped=productMarkup(html?.toString('utf8')||''),heads=selectedProductHeadings(scoped),direct=direct432(scoped,heads);
 let url;try{url=new URL(row.final_url)}catch{}
 check(row.number===432&&row.archived_coffee===selected432.name&&row.official_url===selected432.url,'original_selected_identity');
 check(url?.protocol==='https:'&&url?.hostname==='www.aveleyfarmscoffee.com'&&
  url?.pathname==='/products/ethiopia-natural-halo-beriti'&&!url?.search&&!url?.hash,'same_selected_handle');
 check(row.status==='FETCHED'&&row.parser_ok===true&&row.selected_heading_identity_verified===true,'current_product_parser');
 check(Boolean(html)&&row.html_sha256===sha(html)&&row.html_bytes===html?.length,'raw_source_integrity');
 check(direct.uniqueSelected&&direct.directCurrentWitnesses,'same_selected_product_direct_witnesses');
 check(norm(f.name)===norm(selected432.name)&&/aveley farms/i.test(f.roaster||''),'name_roaster');
 check(/ethiopia/i.test(f.origin||'')&&/guji/i.test(f.origin||''),'own_guji_ethiopia');
 check(f.roast_level==='Light'&&f.process==='Natural'&&/heirloom/i.test(f.variety||''),'own_roast_process_variety');
 check(['sweet','blueberry','lemon','lime'].every(n=>(f.tasting_notes||'').toLowerCase().includes(n)),'own_cupping_notes');
 // SAME selected product contradicts itself: strict >2200m prose versus 2000 MASL spec.
 // Neither value is safe to auto-fill, and the original literal must remain reviewable.
 check(!f.elevation_m&&(row.conflicts||[]).includes('elevation_m'),'contradictory_selected_elevation_withheld_reviewable');
 check(!f.producer&&!f.decaffeination_method,'no_unpublished_grower_or_decaf');
 check(row.add_coffee_ui_rendered===true&&row.source_review_rendered===true,'member_add_coffee_source_review');
 check(!/nevado gona|santos lopez|kirima batian/i.test(JSON.stringify(f)),'no_adjacent_coffee');
 const proof={source_sha:report?.source_sha,case_numbers:[432],source_evidence_sha256:raw?sha(raw):null,
  html_sha256:html?sha(html):null,selected_headings:heads,direct,fields:f,conflicts:row.conflicts||[],
  source_facts:(row.source_facts||[]).filter(x=>x.field==='elevation_m').slice(0,8),
  manual_certified:0,production_operations:0,passed:!failures.length,failures};
 writeFileSync(join(dir,'r93-aveley-432-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R93 Aveley selected evidence] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
