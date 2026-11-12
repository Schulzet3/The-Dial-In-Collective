#!/usr/bin/env node
// Exact selected real current Gnosis Mina Rica regional specificity; no corpus-wide claims.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {selectedIconCountryRegion} from '../../src/server/coffee-selected-icon-geography.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const norm=v=>String(v??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
const clean=(s,n=220)=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim().slice(0,n);
if(process.env.DIC_ISSUE33_R140_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes,e,raw;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-136.html'));}catch{}
 const failures=[],ck=(yes,id)=>{if(!yes)failures.push(id);};
 const rec=e?.records?.find(x=>x.number===136)||{},f=rec.current_fields||{};
 const direct=selectedIconCountryRegion(raw?.toString('utf8')||'',{clean});
 ck(JSON.stringify(e?.case_numbers)==='[136]'&&e?.records?.length===1,'only_original136');
 ck(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 ck(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_unchanged');
 ck(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'no_global_or_production');
 ck(rec.status==='FETCHED'&&rec.parser_ok===true,'current_guarded_source_and_parser');
 ck(rec.official_url==='https://gnosiscoffee.com/products/colombia'&&rec.final_url===rec.official_url,'exact_chosen_url');
 ck(rec.selected_heading_identity_verified===true&&rec.selected_h1?.includes('Colombia Mina Rica'),'chosen_h1');
 ck(!!raw&&sha(raw)===rec.html_sha256&&raw.length===rec.html_bytes,'current_html_byte_hash');
 ck(norm(direct)===norm('Antioquia, Colombia'),'direct_adjacent_country_region_icons');
 ck(norm(f.origin)===norm('Antioquia, Colombia'),'actual_parser_preserves_direct_region');
 ck(norm(f.producer).includes('mina rica')&&norm(f.process)==='washed'&&norm(f.variety)==='castillo','existing_producer_process_variety');
 ck(norm(f.elevation_m).includes('1700')&&norm(f.roast_level)==='medium','existing_elevation_roast');
 ck(['Butterscotch','Brown Sugar','Dark Chocolate','Citrus','Cherry'].every(x=>norm(f.tasting_notes).includes(norm(x)),'existing_selected_notes');
 ck(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_and_review');
 ck(Array.isArray(rec.conflicts)&&rec.conflicts.length===0,'no_unresolved_conflicts');
 ck(Array.isArray(rec.seo_fallback_fields)&&rec.seo_fallback_fields.length===0,'no_seo_leakage');
 const proof={case:136,source_sha:e?.source_sha||null,passed:!failures.length,failures,
  selected_url:rec.official_url,source_sha256:rec.html_sha256||null,html_bytes:rec.html_bytes||null,
  evidence_sha256:bytes?sha(bytes):null,paired_icons:direct,actual_fields:f,
  no_global603_certification:true,production_operations:0};
 writeFileSync(join(dir,'r140-136-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R140] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
