#!/usr/bin/env node
// Current exact original603 #136 selected Gnosis Mina Rica; never count synthetic tests as official evidence.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const norm=v=>String(v??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const chosen136=Object.freeze({number:136,name:'Colombia Mina Rica',url:'https://gnosiscoffee.com/products/colombia',
 notes:['Butterscotch','Brown Sugar','Dark Chocolate','Citrus','Cherry']});
export function selected136Source(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const visible=norm(removeElements(scoped,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' '));
 const has=v=>visible.includes(norm(v));
 return {headings,exactH1:headings.length===1&&norm(headings[0])===norm(chosen136.name),
  direct:{producer:has('Producer: Mina Rica Farm, San Gabriel'),colombia:has('Colombia'),antioquia:has('Antioquia'),
   castillo:has('Castillo'),washed:has('Washed'),height:has('1700 masl'),
   medium:has('Roast Level: Medium'),tastes:has(chosen136.notes.join(', '))},
  html_sha256:sha(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R139_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes,e,raw;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-136.html'));}catch{}
 const failures=[],ck=(ok,id)=>{if(!ok)failures.push(id);};
 const rec=e?.records?.find(x=>x.number===136)||{},f=rec.current_fields||{};
 const direct=selected136Source(raw?.toString('utf8')||'');
 ck(JSON.stringify(e?.case_numbers)==='[136]'&&e?.records?.length===1,'only_original136');
 ck(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 ck(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_unchanged');
 ck(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'no_global_certification');
 ck(rec.status==='FETCHED'&&rec.parser_ok===true,'guarded_official_fetch_and_real_parser');
 ck(rec.official_url===chosen136.url&&rec.final_url===chosen136.url&&norm(rec.archived_coffee)===norm(chosen136.name),'exact_selected_url_name');
 ck(!!raw&&sha(raw)===rec.html_sha256&&raw.length===rec.html_bytes,'official_raw_hash');
 ck(direct.exactH1&&rec.selected_heading_identity_verified===true,'selected_current_h1');
 ck(Object.values(direct.direct).every(Boolean),'selected_current_direct_spec_facts');
 ck(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_review');
 ck(norm(f.name)===norm(chosen136.name)&&norm(f.origin).includes('colombia'),'parser_identity_origin');
 ck(norm(f.producer).includes('mina rica'),'parser_direct_producer');
 ck(norm(f.variety)==='castillo'&&norm(f.process)==='washed','parser_variety_process');
 ck(norm(f.elevation_m).includes('1700')&&norm(f.roast_level)==='medium','parser_altitude_roast');
 ck(chosen136.notes.every(n=>norm(f.tasting_notes).includes(norm(n))),'parser_five_notes');
 ck(Array.isArray(rec.conflicts)&&rec.conflicts.length===0,'no_conflicts');
 ck(Array.isArray(rec.seo_fallback_fields)&&rec.seo_fallback_fields.length===0,'no_seo_transfer');
 const proof={case_number:136,source_sha:e?.source_sha||null,passed:!failures.length,failures,chosen:chosen136,
  html_sha256:rec.html_sha256||null,html_bytes:rec.html_bytes||null,evidence_sha256:bytes?sha(bytes):null,
  direct,actual_parser_fields:f,no_global603_certification:true,production_operations:0};
 writeFileSync(join(dir,'r139-136-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R139] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
