#!/usr/bin/env node
// #33 R77 exact selected #591 Vail coffee: source-bound review, NOT entire603 sign-off.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fold=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^a-z0-9]+/giu,' ').trim().toLowerCase();
const text=html=>String(html||'').replace(/<!--[\s\S]*?-->/gu,' ')
 .replace(/<(script|style|template|noscript|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
 .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|#160);/giu,' ')
 .replace(/&amp;/giu,'&').replace(/\s+/gu,' ').trim();
export function selectedVail591Facts(markup,headings){
 const t=text(markup);
 return {
  exactIdentity:Array.isArray(headings)&&headings.length===1&&fold(headings[0])===fold('Decaf Ethiopian Yirgacheffe SW'),
  selectedRoast:/\bLIGHT ROAST\b/u.test(t)&&/\bDecaf version of prized Ethiopian Yirgacheffe\b/iu.test(t),
  selectedGrower:/\bGrower:\s*Oromia Coffee Farmers Cooperative\b/iu.test(t),
  selectedRegion:/\bRegion:\s*Oromia Region,\s*Ethiopia\b/iu.test(t),
  selectedVariety:/\bVariety:\s*Indigenous heirloom\b/iu.test(t),
  selectedProfile:/\bProfile:\s*Sweet Dark Berries,\s*Jasmine,\s*Hint of Cocoa\b/iu.test(t),
  selectedElevation:/\bAltitude:\s*1550\s*-\s*2200\s*masl\b/iu.test(t),
  selectedNatural:/\bProcess:\s*Full natural\s*&\s*dried on raised beds\b/iu.test(t),
  selectedDecaf:/\bEthiopia FTO Natural Yirgacheffe Swiss Water Process Decaf\b/iu.test(t)&&
   /\bThe Swiss Water Process is an environmentally friendly,\s*chemical-free way to produce coffee\b/iu.test(t)
 };
}
if(process.env.DIC_ISSUE33_R77_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'');
 mkdirSync(dir,{recursive:true});
 const fails=[],check=(ok,k)=>{if(!ok)fails.push(k);};
 let summary={},bytes,html;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));summary=JSON.parse(bytes.toString('utf8'));}catch{}
 try{html=readFileSync(join(dir,'case-591.html'));}catch{}
 const r=summary.records?.[0]||{},f=r.current_fields||{};
 check(JSON.stringify(summary.case_numbers)==='[591]'&&summary.records?.length===1,'original_row_scope');
 check(summary.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(summary.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_csv_sha');
 check(summary.manual_certified===0&&summary.production_operations===0&&summary.real_auth===false&&summary.original_corpus_modified===false,'overclaimed_acceptance');
 check(r.number===591&&r.archived_coffee==='Decaf Ethiopian Yirgacheffe SW'&&
   r.official_url==='https://www.vailcoffee.com/products/reserve-coffee-4','original_source_identity');
 const u=(()=>{try{return new URL(r.final_url);}catch{return null;}})();
 check(u?.hostname==='www.vailcoffee.com'&&u?.pathname==='/products/reserve-coffee-4'&&u?.protocol==='https:'&&!u?.search&&!u?.hash,'current_product_redirect');
 check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'current_source_parser_identity');
 check(Boolean(html)&&html.length===r.html_bytes&&sha(html)===r.html_sha256,'current_html_sha');
 const markup=productMarkup(html?.toString('utf8')||''),headings=selectedProductHeadings(markup),direct=selectedVail591Facts(markup,headings);
 for(const [k,v] of Object.entries(direct))check(v,'direct_'+k);
 const val=k=>String(f[k]||'').toLowerCase();
 check(f.name==='Decaf Ethiopian Yirgacheffe SW','parser_name');
 check(val('origin').includes('oromia')&&val('origin').includes('ethiopia'),'parser_origin');
 check(val('producer').includes('oromia coffee farmers cooperative'),'parser_producer');
 check(val('variety').includes('indigenous')&&val('variety').includes('heirloom'),'parser_variety');
 check(['berries','jasmine','cocoa'].every(x=>val('tasting_notes').includes(x)),'parser_tasting');
 check(/\b1550\b/u.test(val('elevation_m'))&&/\b2200\b/u.test(val('elevation_m')),'parser_elevation');
 check(val('roast_level')==='light','parser_roast');
 check(val('process')==='natural','parser_green_process');
 check(val('decaffeination_method')==='water process','parser_swiss_water_decaf');
 check(!(r.conflicts||[]).some(x=>/origin|producer|variety|tasting|elevation|roast|process|decaf/iu.test(JSON.stringify(x))),'selected_conflicts');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'add_coffee_review');
 const verdict={source_sha:summary.source_sha,source_json_sha256:bytes?sha(bytes):null,html_sha256:html?sha(html):null,
  case:591,selected_headings:headings,direct,parser_fields:f,manual_certified:0,production_operations:0,passed:fails.length===0,failures:fails};
 writeFileSync(join(dir,'r77-591-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
 console.log('[DIC33 R77 #591] '+JSON.stringify(verdict));
 if(fails.length)process.exitCode=1;
}
