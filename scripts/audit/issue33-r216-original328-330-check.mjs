#!/usr/bin/env node
// R216 bounded current original603 source proof only, never a universal 603 PASS.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const cases=[
 {n:328,name:'Ethiopia Yirgacheffe',url:'https://singlespeedcoffeeroasters.com/products/copy-of-espresso-blend'},
 {n:329,name:'Costa Rican - Tesoros Volcanicos',url:'https://singlespeedcoffeeroasters.com/products/costa-rican-tesoros-volcanicos'},
 {n:330,name:'Sumatra Mandheling',url:'https://singlespeedcoffeeroasters.com/products/sumatra-mandheling'}
];
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.'),errors=[],products=[];
mkdirSync(dir,{recursive:true});
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('capture_missing');}
const sha=b=>createHash('sha256').update(b).digest('hex');
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(checkout!==process.env.DIC_R216_EXACT_CHECKOUT_SHA)errors.push('wrong_checkout_sha');
if(JSON.stringify(summary.case_numbers)!=='[328,329,330]'||summary.records?.length!==3)errors.push('wrong_original_cases');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('immutable_original603_changed');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('unearned_certification');
for(const c of cases){
 const r=summary.records?.find(x=>x.number===c.n)||{},e=[];
 let raw=Buffer.alloc(0);try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch{e.push('missing_raw_html');}
 const html=raw.toString('utf8'),selected=productMarkup(html),heads=selectedProductHeadings(selected);
 const visible=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/\s+/gu,' ');
 const p=raw.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||c.url}):{},f=p.fields||{},notes=String(f.tasting_notes||'');
 if(r.status!=='FETCHED'||r.official_url!==c.url||r.final_url!==c.url||r.parser_ok!==true)e.push('selected_fetch_or_parser_failed');
 if(raw.length<1000||raw.length!==r.html_bytes||sha(raw)!==r.html_sha256)e.push('raw_sha256_mismatch');
 if(!r.selected_heading_identity_verified||!heads.includes(c.name)||f.name!==c.name)e.push('selected_H1_identity_mismatch');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)e.push('preview_or_review_missing');
 if((p.conflicts||[]).includes('name')||f.decaffeination_method||f.espresso_recipe)e.push('incorrect_name_or_decaf_or_recipe');
 if(c.n===328){
  const direct=(p.source_facts||[]).filter(x=>x.source_type==='html'&&String(x.section||'').includes(c.name));
  if(!direct.some(x=>x.field==='origin'&&/Yirgacheffe/i.test(String(x.value||'')))||!direct.some(x=>x.field==='process'&&/^Washed\b/i.test(String(x.value||''))))e.push('direct_selected_region_or_process_source_changed');
  if(f.process!=='Washed'||!/Ethiopia|Yirgacheffe/i.test(String(f.origin||'')))e.push('selected_process_or_region_missing');
  if(/Guatemala|mango/i.test(notes))e.push('sibling_or_SEO_leak');
 }else if(c.n===329){
  if(!/West Valley, Brunca, Tarrazu/i.test(visible)||!/cocoa and caramel/i.test(visible))e.push('selected_region_or_description_changed');
  if(!/Costa Rica/i.test(String(f.origin||''))||f.process!=='Washed')e.push('selected_region_or_process_missing');
  if(/Guatemala|mango/i.test(notes))e.push('sibling_SEO_leak');
 }else{
  if(!/Process:\s*Wet Hulled/i.test(visible)||!/Milk Chocolate, Green Pepper, Earthy/i.test(visible))e.push('selected_wet_hull_or_notes_changed');
  if(f.process==='Washed'||!/Milk Chocolate|Green Pepper|Earthy/i.test(notes))e.push('wet_hull_or_notes_misclassified');
 }
 errors.push(...e.map(x=>'#'+c.n+':'+x));
 products.push({number:c.n,official_url:c.url,html_bytes:raw.length,html_sha256:raw.length?sha(raw):null,selected_h1:heads,fields:f,conflicts:p.conflicts||[],passed:!e.length,errors:e,selected_excerpt:visible.slice(0,700)});
}
const report={passed:!errors.length,errors,checkout_sha:checkout,full603_semantic_certification:false,production_operations:0,products};
writeFileSync(join(dir,'r216-original328-330-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R216 selected official] '+JSON.stringify(report).slice(0,18000));
if(errors.length)throw Error('r216_source_not_verified:'+errors.join(','));
