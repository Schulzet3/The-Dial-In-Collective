#!/usr/bin/env node
// Issue #33 original603 #285-287: source-bound current selected proof, NOT universal certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
const targets={
 285:{url:'https://riseupcoffee.com/products/single-origin-select-sumatra-fair-trade-organic',name:'Single Origin Select: Sumatra | Fair Trade | Organic Coffee'},
 286:{url:'https://roadmapcoffeeworks.com/products/ethiopia-worka-sakaro-anaerobic',name:'Ethiopia Worka Sakaro'},
 287:{url:'https://roadmapcoffeeworks.com/products/mexico-cesmach',name:'Mexico Angel Albino Corzo'}
};
const errors=[],expect=(v,l)=>{if(!v)errors.push(l);};
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}
catch(e){errors.push('missing_summary:'+e.message);}
expect(JSON.stringify(summary.case_numbers)==='[285,286,287]'&&summary.records?.length===3,'bounded_original_cases_only');
expect(summary.source_sha===process.env.GITHUB_SHA,'exact_merged_or_PR_source_SHA');
expect(summary.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_csv');
expect(summary.manual_certified===0&&summary.original_corpus_modified===false&&summary.production_operations===0,'no_universal_or_production_claim');
const report={source_sha:summary.source_sha,original603_certified:false,cases:[],errors};
for(const [key,t] of Object.entries(targets)){
 const n=Number(key),rec=(summary.records||[]).find(x=>x.number===n)||{};
 let buf=Buffer.alloc(0);try{buf=readFileSync(join(dir,'case-'+n+'.html'));}catch(e){errors.push('missing_current_html_'+n+':'+e.message);}
 const html=buf.toString('utf8'),product=productMarkup(html);
 const h1=selectedProductHeadings(product),actual=buf.length?extractPublicCoffeeFacts(html,{source_url:rec.final_url||t.url}):{};
 const fields=actual.fields||{},raw=product.replace(/<[^<>]{0,1200}>/g,' ').replace(/&(?:nbsp|amp);/gi,' ').replace(/\s+/g,' ');
 expect(rec.status==='FETCHED'&&rec.parser_ok===true&&rec.official_url===t.url,'guarded_original_fetch_'+n);
 expect(rec.final_url===t.url,'same_exact_product_url_'+n);
 expect(buf.length>1000&&rec.html_bytes===buf.length&&rec.html_sha256===hash(buf),'raw_current_html_hash_'+n);
 expect(h1.includes(t.name)&&rec.selected_heading_identity_verified===true,'exact_current_selected_h1_'+n);
 expect(actual.ok===true&&fields.name===t.name,'actual_parser_identity_'+n);
 expect(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'explicit_add_coffee_source_review_'+n);
 if(n===285){
  expect(/Gayo Mountain/i.test(raw)&&/Aceh region/i.test(raw),'285_current_selected_Gayo_Aceh');
  expect(/rich,\s*malty,\s*earthy/i.test(raw),'285_own_flavor_literal');
  expect(/Medium\+/i.test(raw),'285_merchant_literal_medium_plus');
  expect(/sumatra|indonesia/i.test(String(fields.origin||'')),'285_selected_origin');
  expect(/malty/i.test(String(fields.tasting_notes||''))&&/earthy/i.test(String(fields.tasting_notes||'')),'285_tasting_from_own_prose');
  expect(!fields.producer,'285_no_named_grower');
 }else if(n===286){
  expect(/Farm:\s*400 smallholder farms/i.test(raw),'286_literal_unnamed_farm_quantity');
  expect(/Worka Sakaro Washing Station/i.test(raw),'286_current_own_station');
  expect(/Anaerobic Natural/i.test(raw),'286_current_selected_processing_literal');
  expect(!fields.producer,'286_count_is_not_producer');
  expect(fields.roast_level==='Light','286_own_light_roast');
  expect(/macerated strawberry/i.test(String(fields.tasting_notes||''))&&/yogurt/i.test(String(fields.tasting_notes||''))&&/dark chocolate/i.test(String(fields.tasting_notes||'')),'286_full_direct_selected_four_note_flavor');
 }else{
  expect(/Farm:\s*FFESICH Cooperative/i.test(raw),'287_named_cooperative');
  expect(/Angel Albino Corzo is the region/i.test(raw),'287_selected_region_not_producer');
  expect(/Washed/i.test(raw),'287_own_washed_method');
  expect(/FFESICH/i.test(String(fields.producer||'')),'287_named_grower_collective');
  expect(!/Angel Albino Corzo/i.test(String(fields.producer||'')),'287_region_not_grower');
  expect(fields.process==='Washed','287_own_washed');
  expect(/dark chocolate/i.test(String(fields.tasting_notes||''))&&/hazelnut/i.test(String(fields.tasting_notes||'')),'287_full_direct_selected_four_note_flavor');
 }
 report.cases.push({number:n,official_url:t.url,final_url:rec.final_url,h1,html_bytes:buf.length,sha256:buf.length?hash(buf):null,fields,conflicts:actual.conflicts||[],selected_preview:raw.slice(0,1300)});
}
report.passed=errors.length===0;
writeFileSync(join(dir,'r196-285-287-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R196 CURRENT SOURCE AFTERPROOF] '+JSON.stringify(report).slice(0,17000));
if(errors.length)throw Error('R196_source_or_parser_failure:'+errors.join(','));
