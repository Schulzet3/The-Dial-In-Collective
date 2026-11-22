#!/usr/bin/env node
// #33 original603 #39: selected Kenya AA wording cannot certify historical AB/Nyeri/Kiangundo lot.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
export const selectedUrl='https://brewtusroasting.com/products/kenya-ab-nyeri-kiangundo';
export const selectedName='Kenya';
export const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const sha=x=>createHash('sha256').update(x).digest('hex');
export function selected39(html){
 const own=productMarkup(String(html||''));
 const h1=selectedProductHeadings(own);
 const prose=norm(own.replace(/<(script|style|noscript|nav|aside|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]{0,2000}>/g,' '));
 return {h1,identity:h1.length===1&&norm(h1[0])===norm(selectedName),
   selectedNowAA:prose.includes('newest selection at brewtus roasting kenya aa'),
   explicitMountKenya:prose.includes('hills surrounding mount kenya'),
   styleNotRoastScale:prose.includes('nordic roasting style'),
   directSensory:prose.includes('wine lemon grapefruit and cherry'),
   directWashed:prose.includes('this lot is fully washed'),
   directVarieties:prose.includes('sl28 sl34 and ruiru 11')};
}
export function unsafe39Fields(f={}){
 const notes=norm(f.tasting_notes),origin=norm(f.origin),method=norm(f.process);
 return norm(f.name)!==norm(selectedName)||!origin.includes('kenya')||
   !method.includes('washed')||
   !['wine','lemon','grapefruit','cherry'].every(x=>notes.includes(x))||
   Boolean(f.roast_level||f.producer||f.farm||f.release_label||f.harvest_year||
           f.decaffeination_method||f.espresso_recipe);
}
if(process.env.DIC_R368_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r368';
 const errors=[],ck=(ok,name)=>{if(!ok)errors.push(name)};
 let data={},bytes;
 try{data=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch{errors.push('evidence_json_missing')}
 try{bytes=readFileSync(join(dir,'case-39.html'))}catch{errors.push('selected_official_html_missing')}
 const r=data.records?.[0]||{},raw=bytes?.toString('utf8')||'',direct=selected39(raw);
 ck(JSON.stringify(data.case_numbers)==='[39]'&&data.records?.length===1,'exact_original39_only');
 ck(requiredFocusedSourceFailures([39],data.records||[]).length===0,'selected_H1_parser_and_two_no_save_UIs');
 ck(r.official_url===selectedUrl&&r.status==='FETCHED'&&!r.alternate_url_attempted,'exact_original_official_URL_fetched');
 ck(bytes?.length>1000&&r.html_bytes===bytes?.length&&r.html_sha256===sha(bytes||''),'raw_official_bytes_and_SHA256');
 ck(direct.identity&&direct.selectedNowAA&&direct.explicitMountKenya&&direct.styleNotRoastScale&&
    direct.directSensory&&direct.directWashed&&direct.directVarieties,'selected_current_AA_direct_primary_evidence');
 ck(r.selected_heading_identity_verified&&norm(r.current_fields?.name)===norm(selectedName),'selected_current_title');
 ck(!unsafe39Fields(r.current_fields||{}),'collector_current_fields_without_invention');
 ck(data.manual_certified===0&&!data.original_corpus_modified&&data.production_operations===0,'frozen_original_untouched');
 ck(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R368_HEAD_SHA&&
    process.env.GITHUB_SHA===process.env.DIC_R368_EVENT_SHA&&data.source_sha===process.env.DIC_R368_EVENT_SHA,'exact_current_source');
 ck(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','frozen_original_CSV_blob');
 let parsed={};try{parsed=extractPublicCoffeeFacts(raw,{source_url:r.final_url||selectedUrl})}catch{errors.push('current_parser_exception')}
 ck(parsed?.ok&&norm(parsed.fields?.name)===norm(selectedName)&&
    coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview')&&
    coffeeSourceReviewSnapshot({...parsed,source_url:r.final_url||selectedUrl})?.type==='coffee_source_review','actual_parser_and_readonly_Add_Coffee_Source_Review');
 ck(!unsafe39Fields(parsed.fields||{}),'actual_parser_current_AA_facts_no_invented_roast');
 const out={passed:errors.length===0,errors,source_sha:process.env.DIC_R368_HEAD_SHA,event_sha:process.env.DIC_R368_EVENT_SHA,
   official_url:selectedUrl,selected_direct:direct,raw_html_bytes:bytes?.length||0,raw_html_sha256:bytes?sha(bytes):null,
   current_fields:r.current_fields||{},parser_fields:parsed.fields||{},conflicts:r.conflicts||[],
   historical_original_lot_AB_Nyeri_Kiangundo_certified:false,current_selected_AA_only:true,
   full603_manual_certification:false,member_save:false};
 writeFileSync(join(dir,'r368-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R368 original39] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
