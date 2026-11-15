#!/usr/bin/env node
// Issue #33 R212: exact original603 #319-321 chosen merchant HTML + live parser proof.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';

const cases=[
 {n:319,name:'Brazil Oberon',url:'https://shop.ohenryscoffee.com/products/brazil-oberon'},
 {n:320,name:'Costa Rica Sonora Honey',url:'https://shop.ohenryscoffee.com/products/costa-rica-sonora-honey'},
 {n:321,name:'Ethiopia Yirgacheffe',url:'https://shop.ohenryscoffee.com/products/ethiopia-yirgacheffe'}
];
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.'),errors=[],products=[];
mkdirSync(dir,{recursive:true});
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_focused_evidence');}
const sha=x=>createHash('sha256').update(x).digest('hex');
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(checkout!==process.env.DIC_R212_EXACT_CHECKOUT_SHA)errors.push('checkout_not_exact');
if(JSON.stringify(summary.case_numbers)!=='[319,320,321]'||summary.records?.length!==3)errors.push('wrong_original_subset');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('original603_changed');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('unearned_full_corpus_claim');
for(const c of cases){
 const r=summary.records?.find(x=>x.number===c.n)||{},e=[];
 let raw=Buffer.alloc(0);try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch{e.push('raw_missing');}
 const html=raw.toString('utf8'),selected=productMarkup(html),h1=selectedProductHeadings(selected);
 const visible=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/\s+/gu,' ');
 const p=raw.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||c.url}):{},f=p.fields||{},notes=String(f.tasting_notes||'');
 if(r.status!=='FETCHED'||r.official_url!==c.url||r.final_url!==c.url||r.parser_ok!==true)e.push('current_official_selected_fetch_or_parser_failed');
 if(raw.length<1000||raw.length!==r.html_bytes||sha(raw)!==r.html_sha256)e.push('raw_digest_unverified');
 if(!r.selected_heading_identity_verified||!h1.includes(c.name)||f.name!==c.name)e.push('chosen_identity_changed');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)e.push('member_preview_or_review_missing');
 if((p.conflicts||[]).includes('name')||f.decaffeination_method||f.espresso_recipe)e.push('unsupported_identity_decaf_or_recipe');
 if(c.n===319){
  if(!/Grown in the famed Cerrado region/iu.test(visible))e.push('selected_cerrado_source_missing');
  if(!/Cerrado/iu.test(String(f.origin||''))||!/Brazil/iu.test(String(f.origin||'')))e.push('chosen_cerrado_region_not_parsed');
  if(!/chocolate/iu.test(notes)||!/citrus/iu.test(notes))e.push('seller_selected_notes_missing');
  if(f.roast_level)e.push('unpublished_roast_inferred');
 }else if(c.n===320){
  if(!/blend of honey and natural process coffees/iu.test(visible))e.push('source_mixed_process_disappeared');
  if(!/Central Valley.*Costa Rica/iu.test(String(f.origin||'')))e.push('selected_central_valley_origin_missing');
  if(['Honey','Natural'].includes(String(f.process||'')))e.push('single_process_inferred_from_mixed_blend');
  if(!['cherry','chocolate','hazelnut','baking spice'].every(x=>notes.toLowerCase().includes(x)))e.push('selected_flavor_notes_incomplete');
  if(f.roast_level)e.push('unsupported_roast_inferred');
 }else{
  if(!/Ethiopia Yirgacheffe Mamo Kacha/iu.test(visible)||!/roasted light/iu.test(visible))e.push('selected_roast_source_missing');
  if(f.roast_level!=='Light')e.push('selected_light_roast_missing');
  if(!/floral/iu.test(notes)||!/citrus/iu.test(notes))e.push('selected_notes_missing');
  if(/Mamo Kacha/iu.test(String(f.producer||'')))e.push('unverified_person_role');
 }
 errors.push(...e.map(x=>'#'+c.n+':'+x));
 products.push({number:c.n,official_url:c.url,raw_bytes:raw.length,raw_sha256:raw.length?sha(raw):null,heading:h1,fields:f,conflicts:p.conflicts||[],passed:!e.length,errors:e,selected_excerpt:visible.slice(0,650)});
}
const report={passed:!errors.length,errors,checkout_sha:checkout,full603_semantic_certification:false,production_operations:0,products};
writeFileSync(join(dir,'r212-original319-321-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R212 EXACT OFFICIAL SELECTED] '+JSON.stringify(report).slice(0,16000));
if(errors.length)throw Error('r212_selected_source_not_verified:'+errors.join(','));
