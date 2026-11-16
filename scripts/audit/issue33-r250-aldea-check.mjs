#!/usr/bin/env node
// Issue #33 R250: source-bound selected coffee evidence, not a global 603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const clean=x=>String(x||'').replace(/<(script|style|nav|aside|footer|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
export const cases={
 424:{name:'Flow State Decaf',url:'https://www.aldeacoffee.com/products/flow_state_decaf',words:['E.A. Process','Huila','Caturra','Castillo','RED BERRY']},
 425:{name:'Gracias A Dios',url:'https://www.aldeacoffee.com/products/gracias-a-dios-single-origin-communal-lot',words:['Medium-Dark','DARK CHOCOLATE','STONEFRUIT','Honduras']},
 426:{name:'Ruth Reyes - Naturally Processed',url:'https://www.aldeacoffee.com/products/ruth-reyes-naturally-processed',words:['Ruth Reyes','Lempira','Finca El Joconal','MILK CHOCOLATE']}
};
export function direct(number,html,heads) {
 const c=cases[number];if(!c)throw Error('unknown_case');
 const body=norm(clean(productMarkup(html)));
 const hits=c.words.map(w=>body.includes(norm(w)));
 return {identity:Array.isArray(heads)&&heads.length===1&&norm(heads[0])===norm(c.name),
   own_facts:hits.every(Boolean),hits};
}
export function fieldChecks(number,f,conflicts=[]) {
 if(number===424)return {sugar_method:f.decaffeination_method==='Sugar Process',
  not_green_processing:!f.process||f.process==='Other/Unknown',
  own_origin:/huila/i.test(f.origin||'')&&/colombia/i.test(f.origin||'')};
 if(number===425)return {not_secondary_medium:f.roast_level==='Medium-Dark'||
  (!f.roast_level&&conflicts.includes('roast_level')),
  own_origin:/honduras/i.test(f.origin||''),
  own_flavor:/dark chocolate/i.test(f.tasting_notes||'')&&/stonefruit/i.test(f.tasting_notes||'')};
 if(number===426)return {natural:f.process==='Natural',light:f.roast_level==='Light',
  named_producer:norm(f.producer)==='ruth reyes',not_ramon:!/ramon/i.test(f.producer||''),
  own_origin:/honduras/i.test(f.origin||'')};
 throw Error('unknown_case');
}
if(process.env.DIC_R250_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});
 const failures=[],ok=(v,why)=>{if(!v)failures.push(why);};
 let bytes,report;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'))}catch{}
 ok(JSON.stringify(report?.case_numbers)==='[424,425,426]'&&report.records?.length===3,'exact_cohort');
 ok(report?.source_sha===process.env.DIC_R250_EVENT_SHA,'report_event_sha');
 ok(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R250_SOURCE_SHA,'exact_checked_out_source_sha');
 ok(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_csv_sha256');
 ok(report?.original_corpus_modified===false&&report?.production_operations===0&&report?.manual_certified===0,'preserve_frozen_and_boundaries');
 const evidence=[];
 for(const n of [424,425,426]){
  const c=cases[n],r=report?.records?.find(x=>x.number===n)||{},f=r.current_fields||{};
  let raw;try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch{}
  const heads=raw?selectedProductHeadings(productMarkup(raw.toString('utf8'))):[];
  const source=direct(n,raw?.toString('utf8')||'',heads);
  let final;try{final=new URL(r.final_url)}catch{}
  const requested=new URL(c.url);
  ok(r.archived_coffee===c.name&&r.official_url===c.url,n+'_unchanged_original_identity');
  ok(final?.protocol==='https:'&&final.hostname===requested.hostname&&final.pathname.replace(/\/$/,'')===requested.pathname&&!final.search&&!final.hash,n+'_exact_url');
  ok(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,n+'_real_parser_identity');
  ok(raw?.length>0&&r.html_sha256===hash(raw)&&r.html_bytes===raw.length,n+'_raw_html_integrity');
  ok(source.identity&&source.own_facts,n+'_direct_current_source');
  ok(norm(f.name)===norm(c.name)&&/aldea/i.test(f.roaster||''),n+'_own_product');
  ok(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,n+'_ui_and_review');
  const checks=fieldChecks(n,f,r.conflicts||[]);for(const [k,v] of Object.entries(checks))ok(v,n+'_'+k);
  evidence.push({number:n,url:r.final_url,h1:heads,source,sha256:raw?hash(raw):null,
   fields:f,conflicts:r.conflicts||[],checks});
 }
 const out={source_sha:report?.source_sha,cases:[424,425,426],source_evidence_sha256:bytes?hash(bytes):null,
   evidence,failures,passed:!failures.length,manual_certified:0};
 writeFileSync(join(dir,'r250-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[R250 selected official afterproof] '+JSON.stringify(out));
 if(failures.length)process.exitCode=1;
}