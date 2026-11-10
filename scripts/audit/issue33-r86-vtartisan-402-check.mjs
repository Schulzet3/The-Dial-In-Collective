#!/usr/bin/env node
// Issue33 R86: exact selected original603 #402, not a complete 603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').replace(/&(?:amp|nbsp);/giu,' ').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const clean=h=>String(h||'').replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
export function selectedVtSumatraGayo(markup,headings){
 const prose=norm(clean(String(markup||'').replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/giu,' ')));
 const has=v=>prose.includes(norm(v));
 return {
  uniqueSelected:Array.isArray(headings)&&headings.length===1&&norm(headings[0])==='sumatra gayo',
  ownGeography:has('Indonesian coffee')&&has('Gayo mountain region of Aceh'),
  ownWetHulling:has('beans are wet hulled just for us'),
  ownSensory:has('chocolaty')&&has('licorice-like')&&has('earthy undertones'),
  ownRoast:has('Roast: Medium'),
  unnamedCooperative:has('Co-op we have worked with for years'),
  sourcingNotTaste:has('Notes: Farm Direct')
 };
}
if(process.env.DIC_ISSUE33_R86_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 const failures=[],check=(ok,k)=>{if(!ok)failures.push(k)};
 let report=null,rawReport=null,html=null;
 try{rawReport=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(rawReport.toString('utf8'))}catch{}
 try{html=readFileSync(join(dir,'case-402.html'))}catch{}
 const r=report?.records?.find(x=>x.number===402)||{};
 const selected=productMarkup(html?.toString('utf8')||'');
 const headings=selectedProductHeadings(selected),facts=selectedVtSumatraGayo(selected,headings);
 let final;try{final=new URL(r.final_url)}catch{}
 check(JSON.stringify(report?.case_numbers)==='[402]'&&report?.records?.length===1,'exact_original_case_only');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original_csv_immutable');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_or_production_operation');
 check(r.archived_coffee==='Sumatra Gayo'&&r.official_url==='https://vtartisan.com/products/sumatra-gayo','original_identity');
 check(final?.protocol==='https:'&&['vtartisan.com','www.vtartisan.com'].includes(final.hostname)&&final.pathname.replace(/\/$/,'')==='/products/sumatra-gayo'&&!final.search&&!final.hash,'exact_current_final_url');
 check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'actual_parser_and_selected_identity');
 check(html&&r.html_sha256===sha(html)&&r.html_bytes===html.length,'raw_html_hash_and_length');
 for(const [k,v]of Object.entries(facts))check(v,'selected_direct_'+k);
 const f=r.current_fields||{};
 check(norm(f.name)==='sumatra gayo'&&norm(f.roaster).includes('vt artisan'),'exact_product_and_roaster');
 check(norm(f.roast_level)==='medium','own_medium_spec');
 check(['','other unknown'].includes(norm(f.process)),'wet_hulled_not_invented_washed_natural_honey');
 check(['indonesia','sumatra','gayo','aceh'].every(k=>norm(f.origin).includes(k)),'own_origin');
 check(['chocolaty','licorice','earthy'].every(k=>norm(f.tasting_notes).includes(k)),'selected_literal_sensory');
 check(!f.producer||norm(f.producer)==='co op','unnamed_coop_only');
 check(!['variety','elevation_m','decaffeination_method'].some(k=>f[k]),'unpublished_fields_blank');
 check(!norm(f.tasting_notes).includes('farm direct'),'sourcing_not_flavor');
 check(!/wilton|chiroso|benitez|microlot/i.test(JSON.stringify(f)),'no_other_selected_coffee_contamination');
 check(!(r.conflicts||[]).length,'no_conflicts');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'add_coffee_source_review');
 const receipt={source_sha:report?.source_sha,case_numbers:[402],raw_html_sha256:html?sha(html):null,evidence_sha256:rawReport?sha(rawReport):null,headings,selected_direct:facts,parsed_fields:f,conflicts:r.conflicts||[],manual_certified:0,production_operations:0,passed:failures.length===0,failures};
 writeFileSync(join(dir,'r86-vtartisan-402-afterproof.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log('[ISSUE33 R86 SELECTED SOURCE AFTERPROOF] '+JSON.stringify(receipt));
 if(failures.length)process.exitCode=1;
}
