#!/usr/bin/env node
// #33 R85: exact selected VT Artisan Dark Decaf, not universal 603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/&amp;/gi,'and').replace(/[^a-z0-9]+/g,' ').trim();
const clean=h=>String(h||'').replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/&amp;/gi,'&').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
export function selectedVtDarkDecaf(markup,headings){
 const prose=norm(clean(String(markup||'').replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/giu,' ')));
 const has=v=>prose.includes(norm(v));
 return {uniqueSelected:Array.isArray(headings)&&headings.length===1&&norm(headings[0])==='dark decaf',
  sameProductRegions:has('Central American')&&has('African beans'),
  ownWaterDecaf:has('naturally decaffeinated')&&has('Mountain Water'),
  ownCaffeineRange:has('97 - 99% caffeine free'),
  directRoast:has('Roast: Medium Dark'),
  sourcingNotTaste:has('Notes: Farm-Direct')};
}
if(process.env.DIC_ISSUE33_R85_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 const failures=[],check=(v,k)=>{if(!v)failures.push(k)};
 let report=null,reportRaw=null,html=null;
 try{reportRaw=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(reportRaw.toString())}catch{}
 try{html=readFileSync(join(dir,'case-400.html'))}catch{}
 const r=report?.records?.find(x=>x.number===400)||{};
 const selected=productMarkup(html?.toString('utf8')||'');
 const headings=selectedProductHeadings(selected),facts=selectedVtDarkDecaf(selected,headings);
 let u;try{u=new URL(r.final_url)}catch{}
 check(JSON.stringify(report?.case_numbers)==='[400]'&&report?.records?.length===1,'original_400_only');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_head');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_unchanged');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'boundaries');
 check(r.archived_coffee==='Dark Decaf'&&r.official_url==='https://vtartisan.com/products/dark-decaf','exact_original_url');
 check(u?.protocol==='https:'&&['vtartisan.com','www.vtartisan.com'].includes(u.hostname)&&u.pathname.replace(/\/$/,'')==='/products/dark-decaf'&&!u.search&&!u.hash,'same_official_url');
 check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'selected_actual_parser');
 check(html&&r.html_sha256===sha(html)&&r.html_bytes===html.length,'actual_raw_html_hash');
 for(const [k,v]of Object.entries(facts))check(v,'own_selected_'+k);
 const f=r.current_fields||{};
 check(norm(f.name)==='dark decaf','selected_name');
 check(norm(f.roaster).includes('vt artisan'),'roaster');
 check(norm(f.roast_level)==='medium dark','selected_roast');
 check(f.decaffeination_method==='Water Process','selected_mountain_water');
 check(!f.process,'no_inferred_green_process');
 check(!f.tasting_notes||!norm(f.tasting_notes).includes('farm direct'),'farm_direct_not_flavor');
 check(!['producer','variety','elevation_m'].some(k=>f[k]),'no_unpublished_farm');
 check(!/\b(?:guatemala|ethiopia|colombia|honduras|kenya|mexico)\b/i.test(f.origin||''),'no_invented_countries');
 check(!(r.conflicts||[]).length,'no_conflict');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'real_add_coffee_review');
 const verdict={source_sha:report?.source_sha,case_numbers:[400],raw_html_sha256:html?sha(html):null,
  evidence_sha256:reportRaw?sha(reportRaw):null,headings,facts,fields:f,conflicts:r.conflicts||[],
  manual_certified:0,production_operations:0,passed:failures.length===0,failures};
 writeFileSync(join(dir,'r85-vtartisan-400-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
 console.log('[ISSUE33 R85 AFTERPROOF] '+JSON.stringify(verdict));
 if(failures.length)process.exitCode=1;
}
