#!/usr/bin/env node
// #33 R195 — current selected original #282 recycled source and #284 own literal source.
// Any mismatch is a failed case, not a substitute original603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const dig=b=>createHash('sha256').update(b).digest('hex');
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
const targets={
 282:{url:'https://ridleyroasthouse.com/products/ridley-roasthouse-founders-roast-coffee',name:'Bold Betty'},
 284:{url:'https://riseupcoffee.com/products/single-origin-nicaragua-honey-arabica-coffee',name:'Single Origin: Nicaragua | Honey Arabica | Organic Coffee'}
};
const errors=[],expect=(a,b)=>{if(!a)errors.push(b);};
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}
catch(e){errors.push('missing_summary:'+e.message);}
expect(JSON.stringify(summary.case_numbers)==='[282,284]'&&summary.records?.length===2,'bounded_original_282_284_only');
expect(summary.source_sha===process.env.GITHUB_SHA,'exact_source_commit');
expect(summary.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_csv_unchanged');
expect(summary.manual_certified===0&&summary.original_corpus_modified===false&&summary.production_operations===0,'no_universal_or_production_claim');
const output={source_sha:summary.source_sha,original603_certified:false,cases:[],errors};
for(const [k,t] of Object.entries(targets)){
 const n=Number(k),rec=(summary.records||[]).find(r=>r.number===n)||{};
 let buf=Buffer.alloc(0);try{buf=readFileSync(join(dir,'case-'+n+'.html'));}
 catch(e){errors.push('missing_current_html_'+n+':'+e.message);}
 const html=buf.toString('utf8'),selected=productMarkup(html),headings=selectedProductHeadings(selected);
 const actual=buf.length?extractPublicCoffeeFacts(html,{source_url:rec.final_url||t.url}):{};
 const fields=actual.fields||{},raw=selected.replace(/<[^<>]{0,1200}>/g,' ').replace(/&(?:nbsp|amp);/gi,' ').replace(/\s+/g,' ');
 expect(rec.status==='FETCHED'&&rec.parser_ok===true&&rec.official_url===t.url,'original_guarded_fetch_'+n);
 expect(rec.final_url===t.url,'no_cross_product_redirect_'+n);
 expect(rec.html_sha256===dig(buf)&&rec.html_bytes===buf.length&&buf.length>1000,'current_source_bytes_sha_'+n);
 expect(headings.includes(t.name)&&rec.selected_heading_identity_verified===true,'selected_h1_identity_'+n);
 expect(actual.ok===true&&fields.name===t.name,'exact_selected_parser_name_'+n);
 expect(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_source_review_'+n);
 if(n===282){
  expect(/origin:\s*columbia/i.test(raw),'282_current_literal_columbia');
  expect(/process:\s*washed/i.test(raw)&&/roast:\s*dark/i.test(raw),'282_current_process_roast');
  expect(/apricot/i.test(raw)&&/honey/i.test(raw)&&/pear/i.test(raw),'282_current_direct_flavor');
  expect(/^columbia$/i.test(fields.origin||''),'282_preserve_literal_country_spelling');
  expect(fields.process==='Washed'&&fields.roast_level==='Dark','282_current_washed_dark');
  expect(['apricot','honey','pear'].every(v=>String(fields.tasting_notes||'').toLowerCase().includes(v)),'282_current_selected_tasting');
  expect(!fields.producer,'282_unnamed_family_not_individual_grower');
 }else{
  expect(/Byron Corrales/i.test(raw)&&/Finca Los Pinos/i.test(raw),'284_exact_direct_named_farmer');
  expect(/Aranjuez/i.test(raw)&&/Mataglapa/i.test(raw),'284_direct_farm_geography');
  expect(/honey process/i.test(raw)&&/subtle fruit/i.test(raw),'284_direct_method_and_taste');
  expect(/byron corrales/i.test(fields.producer||''),'284_direct_named_producer');
  expect(/nicaragua/i.test(fields.origin||''),'284_current_origin');
  expect(fields.process==='Honey','284_current_process_honey');
  expect(/subtle fruit/i.test(fields.tasting_notes||''),'284_current_flavor');
  expect(fields.roast_level!=='Dark'&&!fields.decaffeination_method,'284_no_sibling_roast_or_decaf');
 }
 output.cases.push({number:n,official_url:t.url,final_url:rec.final_url,h1:headings,
  html_bytes:buf.length,sha256:buf.length?dig(buf):null,parsed_fields:fields,
  conflicts:actual.conflicts||[],source_preview:raw.slice(0,1400)});
}
output.passed=errors.length===0;
writeFileSync(join(dir,'r195-282-284-afterproof.json'),JSON.stringify(output,null,2)+'\n');
console.log('[DIC33 R195 SELECTED AFTERPROOF] '+JSON.stringify(output).slice(0,14500));
if(errors.length)throw Error('R195_source_or_parser_failure:'+errors.join(','));
