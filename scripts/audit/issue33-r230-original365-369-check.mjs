#!/usr/bin/env node
// Original603 R230: exact current official H1/raw HTML/actual parser/preview; NOT full corpus certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('source_directory_missing');
const summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const errs=[],records=[],has=(v,s)=>String(v||'').toLowerCase().includes(s.toLowerCase());
const targets=[
 [365,'The Founder - Single Origin Ethiopian','https://sumatocoffee.com/products/the-founder-single-origin-ethiopian'],
 [366,'The Sender - Single Origin Costa Rican','https://sumatocoffee.com/products/the-sender-single-origin-costa-rican'],
 [368,'En Fuego','https://summermooncoffee.com/products/en-fuego'],
 [369,'Fireside','https://summermooncoffee.com/products/fireside']
];
if(head!==process.env.DIC_R230_HEAD)errs.push('wrong_exact_source_head');
if(JSON.stringify(summary.case_numbers)!=='[365,366,368,369]'||
 JSON.stringify(summary.negative_identity_case_numbers||[])!=='[]'||
 summary.records?.length!==4||
 summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 errs.push('wrong_original603_csv_or_source_subset');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)
 errs.push('inaccurate_corpus_or_production_status');
for(const [n,name,url] of targets){
 const r=summary.records.find(x=>x.number===n)||{},bad=[];
 let bytes=Buffer.alloc(0);
 try{bytes=readFileSync(join(dir,'case-'+n+'.html'))}catch{bad.push('missing_raw_html')}
 const hash=createHash('sha256').update(bytes).digest('hex'),raw=bytes.toString('utf8');
 const html=productMarkup(raw);
 const h1=selectedProductHeadings(html);
 const selectedText=html.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:amp|nbsp);/giu,' ').replace(/\s+/gu,' ');
 const p=bytes.length?extractPublicCoffeeFacts(raw,{source_url:r.final_url||url}):{};
 const f=p.fields||{};
 if(r.status!=='FETCHED'||r.official_url!==url||r.parser_ok!==true)bad.push('official_fetch_or_parser_incomplete');
 if(bytes.length<1000||bytes.length!==r.html_bytes||hash!==r.html_sha256)bad.push('raw_html_sha256_mismatch');
 if(!h1.some(v=>v.toLowerCase()===name.toLowerCase())||
    !has(f.name,name)||r.selected_heading_identity_verified!==true)
   bad.push('selected_identity_not_bound_to_original');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)bad.push('Add_Coffee_or_Source_Review_not_rendered');
 if((p.conflicts||[]).length)bad.push('source_conflicts_need_review');
 if(n===365){
   if(f.process!=='Natural'||f.roast_level!=='Light'||!has(f.origin,'Ethiopia')||
     !has(f.origin,'Yirgacheffe'))bad.push('selected_founder_process_roast_origin');
   for(const s of ['florals','blackberry','complex sweetness'])
     if(!has(selectedText,s)||!has(f.tasting_notes,s))bad.push('founder_flavor_'+s);
   if(f.espresso_recipe)bad.push('filter_brew_improperly_called_espresso');
   if(has(f.tasting_notes,'cinnamon')||has(f.tasting_notes,'pecan'))bad.push('other_coffee_sensory');
 }else if(n===366){
   if(f.process!=='Washed'||!has(f.origin,'Costa Rica')||f.roast_level!=='Medium-Light')
     bad.push('selected_sender_washed_origin_light_medium');
   for(const s of ['spice','balanced sweetness'])
     if(!has(selectedText,s)||!has(f.tasting_notes,s))bad.push('sender_flavor_'+s);
   if(f.espresso_recipe)bad.push('drip_french_press_falsely_espresso');
   if(has(f.tasting_notes,'blackberry')||has(f.tasting_notes,'pecans'))bad.push('borrowed_neighbor_notes');
 }else if(n===368){
   if(f.roast_level!=='Medium'||!has(f.origin,'Mexico'))bad.push('fuego_roast_origin');
   if(!has(selectedText,'Candied Roasted Pecans')||!has(f.tasting_notes,'Candied Roasted Pecans'))
      bad.push('fuego_candied_pecans_missing');
   if(f.process==='Natural'||f.process==='Washed')bad.push('oak_fire_roast_as_green_process');
   if(has(f.tasting_notes,'chocolate')||has(f.tasting_notes,'cinnamon'))bad.push('Fireside_sibling_flavor');
 }else{
   if(f.roast_level!=='Medium'||f.process!=='Washed'||!has(f.origin,'Colombia')||
      !has(f.origin,'Tolima'))bad.push('fireside_washed_origin_medium');
   if(!has(f.tasting_notes,'Cinnamon')||!has(f.tasting_notes,'chocolate'))
      bad.push('selected_fireside_flavor_missing');
   if(has(f.tasting_notes,'pecans')||has(f.tasting_notes,'blackberry'))
      bad.push('neighboring_flavor_contamination');
 }
 errs.push(...bad.map(s=>n+':'+s));
 records.push({number:n,url,raw_bytes:bytes.length,raw_sha256:hash,selected_h1:h1,
  current_fields:f,conflicts:p.conflicts||[],errors:bad});
}
const report={exact_source_sha:head,passed:errs.length===0,
 verified_current_original_cases:errs.length===0?[365,366,368,369]:[],
 unavailable367:'OLD_AUTUMN_BLEND_EXACT_SOURCE_404_UNVERIFIED_NO_SIBLING_BORROWING',
 original603_whole_individual_manual_certified:false,production_operations:0,records,errors:errs};
writeFileSync(join(dir,'r230-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R230 SOURCE + PARSER AFTERPROOF] '+JSON.stringify(report).slice(0,28000));
if(errs.length)throw Error(errs.join(','));
