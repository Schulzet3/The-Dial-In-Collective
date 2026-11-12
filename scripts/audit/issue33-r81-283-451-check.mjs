#!/usr/bin/env node
// #33 R81 bounded current selected official sources; NOT 603-coffee certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fold=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
const clean=html=>String(html||'')
 .replace(/<!--[\s\S]*?-->/gu,' ')
 .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
 .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|#160);/giu,' ')
 .replace(/&amp;/giu,'&').replace(/&#(?:8217|x2019);/giu,"'")
 .replace(/\s+/gu,' ').trim();
const unique=(h,title)=>Array.isArray(h)&&h.length===1&&fold(h[0])===fold(title);
export function selected283(markup,headings){
 const t=clean(markup);
 return {
  identity:unique(headings,'Microlot: Honduras | Fair Trade | Organic Coffee'),
  selectedRoast:/ROAST LEVEL:\s*Medium\b/iu.test(t),
  ownFarm:/Honduras\s*-\s*Finca La Fortuna\b/iu.test(t),
  ownGrowers:/Regalado family of Finca La Fortuna\b/iu.test(t),
  ownTaste:/Tasting notes:\s*milk chocolate,\s*subtle nuttiness\b/iu.test(t)
 };
}
export function selected451(markup,headings){
 const t=clean(markup);
 return {
  identity:unique(headings,'Parainema Reunión'),
  ownGrower:/Rosalio Ventura['’]s Parainema harvest from Finca Elizabeth in Honduras\b/iu.test(t),
  washedComponent:/Washed processing delivers clarity and crispness\b/iu.test(t),
  dryComponent:/Dry process adds viscosity,\s*vibrancy,\s*and deep sweetness\b/iu.test(t),
  honeyCarbonicComponent:/Honey carbonic maceration turns up the complexity\b/iu.test(t),
  blendedMethods:/Blended together,\s*these individual tracks become something bigger\b/iu.test(t),
  selectedVariety:/\bParainema harvest\b/iu.test(t)
 };
}
if(process.env.DIC_ISSUE33_R81_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});
 const failures=[],check=(yes,label)=>{if(!yes)failures.push(label)};
 let report=null,bytes=null;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'))}catch{}
 check(JSON.stringify(report?.case_numbers)==='[283,451]'&&report?.records?.length===2,'exact_original_subset');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_ci_source_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','unchanged_frozen603');
 check(report?.manual_certified===0&&report?.production_operations===0&&report?.original_corpus_modified===false,'preservation');
 const cases={
  283:{name:'Microlot: Honduras | Fair Trade | Organic Coffee',url:'https://riseupcoffee.com/products/microlot-honduras-fair-trade-organic-coffee',host:'riseupcoffee.com',path:'/products/microlot-honduras-fair-trade-organic-coffee'},
  451:{name:'Parainema Reunión',url:'https://www.chromaticcoffee.com/products/parainema-reunion-2026',host:'www.chromaticcoffee.com',path:'/products/parainema-reunion-2026'}
 };
 const evidence=[];
 for(const n of [283,451]){
  const c=cases[n],r=report?.records?.find(x=>x.number===n)||{},f=r.current_fields||{};
  let raw=null;try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch{}
  let url=null;try{url=new URL(r.final_url)}catch{}
  check(r.official_url===c.url&&r.archived_coffee===c.name,'immutable_selected_identity_'+n);
  check(url?.protocol==='https:'&&url.hostname===c.host&&url.pathname.replace(/\/$/,'')===c.path&&!url.search&&!url.hash,'same_product_redirect_'+n);
  check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'live_selected_and_parser_'+n);
  check(!!raw&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'current_html_bytes_sha_'+n);
  const selected=productMarkup(raw?.toString('utf8')||''),headings=selectedProductHeadings(selected);
  const facts=n===283?selected283(selected,headings):selected451(selected,headings);
  for(const [k,v] of Object.entries(facts))check(v,'own_direct_source_'+n+'_'+k);
  check(fold(f.name)===fold(c.name),'actual_parser_selected_name_'+n);
  check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'explicit_add_coffee_and_review_'+n);
  check(!(r.conflicts||[]).some(x=>/name|origin|process|roast|tasting|producer|variety/iu.test(JSON.stringify(x))),'no_current_conflicting_field_'+n);
  if(n===283){
   check(String(f.roast_level||'').toLowerCase()==='medium','own_medium_roast_283');
   check(/honduras/i.test(f.origin||''),'own_honduras_origin_283');
   check(/Regalado/i.test(f.producer||''),'own_grower_283');
   check(['milk chocolate','subtle nuttiness'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x)),'own_notes_283');
   check(!f.process&&!f.variety&&!f.elevation_m,'no_unsupported_283_process_variety_altitude');
  }else{
   check(/Parainema/i.test(f.variety||''),'own_parainema_451');
   check(/Rosalio Ventura/i.test(f.producer||''),'own_grower_451');
   check(/Honduras/i.test(f.origin||''),'own_origin_451');
   check(!f.process||f.process==='Other/Unknown','no_single_process_from_three_components_451');
   check(!f.roast_level,'no_unsupported_roast_451');
   check(['chocolate','tamarind','hibiscus'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x)),'own_literal_taste_451');
  }
  evidence.push({number:n,status:r.status,source_sha256:r.html_sha256,headings,facts,parsed:f,conflicts:r.conflicts||[]});
 }
 const verdict={source_sha:report?.source_sha,report_sha256:bytes?sha(bytes):null,manual_certified:0,production_operations:0,evidence,passed:failures.length===0,failures};
 writeFileSync(join(dir,'r81-283-451-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
 console.log('[ISSUE33 R81 SELECTED AFTERPROOF] '+JSON.stringify(verdict));
 if(failures.length)process.exitCode=1;
}