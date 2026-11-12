#!/usr/bin/env node
// Issue33 R141: exact CURRENT selected radiate product, never historic component transfer.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const norm=v=>String(v??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const chosen119=Object.freeze({
 number:119,name:'radiate',url:'https://epiphanycoffee.co/products/radiate',
 components:[
  'Colombia FTO La Jacoba (Washed Process)',
  'Guatemala - Antigua Volcanes (Washed Process)',
  'Sumatra - Gayo Triple Picked (Semi-Washed Process)'
 ],
 tastes:['Brown Ale','Tobacco Smoke','Molasses']
});
export function selected119Source(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const visible=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' '));
 const has=s=>visible.includes(norm(s));
 return {headings,exactH1:headings.length===1&&norm(headings[0])===norm(chosen119.name),
  direct:{
   colombiaWashed:has(chosen119.components[0]),
   guatemalaWashed:has(chosen119.components[1]),
   sumatraSemiWashed:has(chosen119.components[2]),
   exactOrderedComposition:has(chosen119.components.join(', and '))||
    has(chosen119.components.join(', '))||
    has(chosen119.components[0]+', '+chosen119.components[1]+', and '+chosen119.components[2]),
   dark:has('Dark Roast'),
   brownAle:has(chosen119.tastes[0]),
   tobaccoSmoke:has(chosen119.tastes[1]),
   molasses:has(chosen119.tastes[2])
  },
  source_sha256:sha(Buffer.from(html||'')),selected_visible_length:visible.length};
}
if(process.env.DIC_ISSUE33_R141_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes,e,raw;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-119.html'));}catch{}
 const failures=[],ck=(yes,id)=>{if(!yes)failures.push(id);};
 const rec=e?.records?.find(r=>r.number===119)||{},f=rec.current_fields||{};
 const direct=selected119Source(raw?.toString('utf8')||'');
 ck(JSON.stringify(e?.case_numbers)==='[119]'&&e?.records?.length===1,'only_original119');
 ck(e?.source_sha===process.env.GITHUB_SHA,'exact_checkout_sha');
 ck(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_unchanged');
 ck(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'not_global_certification');
 ck(rec.status==='FETCHED'&&rec.parser_ok===true,'real_guarded_official_and_parser');
 ck(rec.official_url===chosen119.url&&rec.final_url===chosen119.url&&norm(rec.archived_coffee)===norm(chosen119.name),'original_exact_selected_identity');
 ck(!!raw&&sha(raw)===rec.html_sha256&&raw.length===rec.html_bytes,'official_raw_byte_sha');
 ck(direct.exactH1&&rec.selected_heading_identity_verified===true,'selected_visible_h1');
 ck(Object.values(direct.direct).every(Boolean),'current_selected_composition_dark_tastes');
 ck(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_source_review');
 ck(norm(f.name)===norm(chosen119.name),'actual_parser_selected_identity');
 ck(norm(f.origin).includes('colombia')&&norm(f.origin).includes('guatemala')&&
   (norm(f.origin).includes('sumatra')||norm(f.origin).includes('indonesia'))&&
   !norm(f.origin).includes('nicaragua'),'all_current_origins_no_historical_nicaragua');
 ck(!f.process||norm(f.process)===norm('Other/Unknown'),'not_false_single_washed_process');
 ck(norm(f.roast_level)==='dark','selected_current_dark_roast');
 ck(chosen119.tastes.every(t=>norm(f.tasting_notes).includes(norm(t))),'three_direct_current_notes');
 ck(!f.producer&&!f.variety&&!f.elevation_m&&!f.decaffeination_method,'unpublished_fields_not_invented');
 ck(Array.isArray(rec.conflicts)&&rec.conflicts.length===0,'no_unadjudicated_conflicts');
 ck(Array.isArray(rec.seo_fallback_fields)&&rec.seo_fallback_fields.length===0,'no_old_seo_fallback');
 const proof={case_number:119,source_sha:e?.source_sha||null,passed:!failures.length,failures,chosen:chosen119,
  html_sha256:rec.html_sha256||null,html_bytes:rec.html_bytes||null,evidence_sha256:bytes?sha(bytes):null,
  direct,actual_parser_fields:f,no_global603_certification:true,production_operations:0};
 writeFileSync(join(dir,'r141-119-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R141] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
