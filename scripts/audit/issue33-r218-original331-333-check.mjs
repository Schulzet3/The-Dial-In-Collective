#!/usr/bin/env node
// Bounded exact selected current originals #331–333; NEVER full 603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const cases=[
 {n:331,name:'Colombia - Narino',url:'https://skcoffeeplease.com/products/colombia-narino',country:'Colombia',notes:['Chocolate Truffle','Cranberry','Cara Cara Orange'],process:'Washed',producer:/FUDAM/i},
 {n:332,name:'Mexico - Chiapas',url:'https://skcoffeeplease.com/products/mexico-chiapas',country:'Mexico',notes:['Hazelnut','Chocolate','Marzipan'],process:'Washed',producer:/GRAPOS/i},
 {n:333,name:'Rwanda - Gishamwana',url:'https://skcoffeeplease.com/products/rwanda',country:'Rwanda',notes:['Butter Cookies','Pecan','Pear'],process:'Washed',producer:/Gishamwana/i}
];
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.'),errors=[],products=[];
mkdirSync(dir,{recursive:true});
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('capture_missing');}
const sha=b=>createHash('sha256').update(b).digest('hex');
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(checkout!==process.env.DIC_R218_EXACT_CHECKOUT_SHA)errors.push('wrong_checkout_sha');
if(JSON.stringify(summary.case_numbers)!=='[331,332,333]'||summary.records?.length!==3)errors.push('wrong_original_cases');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('immutable_original603_changed');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('unearned_certification');
for(const c of cases){
 const r=summary.records?.find(x=>x.number===c.n)||{},e=[];
 let raw=Buffer.alloc(0);try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch{e.push('missing_raw_html');}
 const html=raw.toString('utf8'),selected=productMarkup(html),heads=selectedProductHeadings(selected);
 // Decode only HTML nonbreaking-space entities in selected literal labels; do NOT relax source/H1/parser identity or raw hash checks.
const visible=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:nbsp|#0*160|#x0*a0);/giu,' ').replace(/\s+/gu,' ');
 const p=raw.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||c.url}):{},f=p.fields||{},notes=String(f.tasting_notes||'');
 if(r.status!=='FETCHED'||r.official_url!==c.url||r.final_url!==c.url||r.parser_ok!==true)e.push('selected_fetch_or_parser_failed');
 if(raw.length<1000||raw.length!==r.html_bytes||sha(raw)!==r.html_sha256)e.push('raw_sha256_mismatch');
 if(!r.selected_heading_identity_verified||!heads.includes(c.name)||f.name!==c.name)e.push('selected_H1_identity_mismatch');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)e.push('preview_or_review_missing');
 if((p.conflicts||[]).includes('name')||f.decaffeination_method||f.espresso_recipe)e.push('incorrect_name_or_decaf_or_recipe');
 // The current seller uses nested text/attributes for display labels; flattening HTML
 // can lose label boundaries. Require exact primary URL/H1, raw SHA, chosen parser,
 // and its own direct HTML source facts for BOTH green process and tasting notes.
 const ownFacts=(p.source_facts||[]).filter(x=>x.source_type==='html'&&x.source_url===c.url&&x.conflicting!==true);
 const ownProcess=ownFacts.some(x=>x.field==='process'&&/^Washed$/i.test(String(x.value||'').trim()));
 const ownNotes=ownFacts.some(x=>x.field==='tasting_notes'&&c.notes.every(n=>String(x.value||'').toLowerCase().includes(n.toLowerCase())));
 if(!ownProcess||!ownNotes)e.push('direct_selected_html_process_or_tasting_facts_missing');
 for(const note of c.notes){
  if(!visible.toLowerCase().includes(note.toLowerCase()))e.push('selected_literally_published_note_missing:'+note);
  if(!notes.toLowerCase().includes(note.toLowerCase()))e.push('parser_tasting_note_missing:'+note);
 }
 if(f.process!==c.process||!String(f.origin||'').includes(c.country)||!c.producer.test(String(f.producer||'')))e.push('direct_source_fields_missing');
 if(/Guatemala|mango/i.test(notes)||f.roast_level==='Dark')e.push('unrelated_SEO_or_sibling_leak');
 if(c.n===331&&(!/La Union.*Narino.*Colombia/i.test(visible)||!/1500-2200/i.test(visible)))e.push('colombia_region_elevation_source_changed');
 if(c.n===332&&(!/GRAPOS/i.test(visible)||!/900-1600/i.test(visible)))e.push('mexico_coop_elevation_source_changed');
 if(c.n===333&&(!/Gishamwana Island Farm/i.test(visible)||!/1500-1650/i.test(visible)))e.push('rwanda_farm_elevation_source_changed');
 errors.push(...e.map(x=>'#'+c.n+':'+x));
 products.push({number:c.n,official_url:c.url,html_bytes:raw.length,html_sha256:raw.length?sha(raw):null,selected_h1:heads,fields:f,conflicts:p.conflicts||[],passed:!e.length,errors:e});
}
const report={passed:!errors.length,errors,checkout_sha:checkout,full603_semantic_certification:false,production_operations:0,products};
writeFileSync(join(dir,'r218-original331-333-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R218 selected official] '+JSON.stringify(report).slice(0,18000));
if(errors.length)throw Error('r218_source_not_verified:'+errors.join(','));
