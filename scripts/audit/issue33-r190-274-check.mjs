#!/usr/bin/env node
// Issue #33 R190: live original603 #274 only; not a 603-coffee certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.'), errors=[];
const check=(ok,reason)=>{if(!ok)errors.push(reason);};
let summary={},html=Buffer.from('');
try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch(e){errors.push('missing_evidence:'+e.message);}
try{html=readFileSync(join(dir,'case-274.html'));}catch(e){errors.push('missing_html:'+e.message);}
const official='https://readysetcoffee.com/products/copy-of-mexico-chiapas',name='Mexico Chiapas';
const r=(summary.records||[]).find(x=>x.number===274)||{};
const actual=extractPublicCoffeeFacts(html.toString('utf8'),{source_url:official});
const markup=productMarkup(html.toString('utf8'));
const headings=selectedProductHeadings(markup),f=actual.fields||{};
const notes=String(f.tasting_notes||'').toLowerCase();
const clean=String(markup||'').replace(/<[^<>]{0,1200}>/g,' ').replace(/&(?:nbsp|amp);/gi,' ').replace(/\s+/g,' ');
check(JSON.stringify(summary.case_numbers)==='[274]'&&summary.records?.length===1,'single_original274');
check(summary.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
check(summary.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_sha256');
check(summary.manual_certified===0&&summary.original_corpus_modified===false&&summary.production_operations===0,'no_corpus_or_provider_writes');
check(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===official&&r.final_url===official,'guarded_original_official_url');
check(html.length>1000&&r.html_bytes===html.length&&r.html_sha256===sha(html),'raw_html_hash');
check(headings.includes(name)&&r.selected_heading_identity_verified===true,'selected_current_product_identity');
check(actual.ok===true&&f.name===name,'real_parser_selected_name');
check(/Cupping Notes/i.test(clean)&&/Brown Sugar/i.test(clean)&&/Green Apple/i.test(clean)&&/Milk Chocolate/i.test(clean),'selected_cupping_panel');
for(const n of ['brown sugar','green apple','milk chocolate'])check(notes.includes(n),'selected_tasting_'+n.replace(/ /g,'_'));
check(f.roast_level==='Medium','selected_labeled_medium_not_light_touch');
check(/Chiapas/i.test(String(f.origin||''))&&/Mexico/i.test(String(f.origin||'')),'selected_region_country');
check(/washed/i.test(String(f.process||'')),'selected_washed');
for(const n of ['Bourbon','Caturra','Mundo Nova'])check(String(f.variety||'').includes(n),'selected_variety_'+n);
check(/3,?200\s*feet/i.test(clean),'selected_feet_elevation_literal');
check(!/Volcanes|Guatemala Antigua/i.test(String(f.name||'')+' '+notes),'other_coffee_promotional_prose_not_selected');
check(!f.decaffeination_method&&!f.espresso_recipe,'unpublished_decaf_recipe_blank');
check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'Add_Coffee_and_Source_Review');
const proof={case_number:274,source_sha:summary.source_sha,official_url:official,html_bytes:html.length,html_sha256:html.length?sha(html):null,selected_headings:headings,fields:f,errors,passed:errors.length===0,manual_certified_all603:false};
writeFileSync(join(dir,'r190-274-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
console.log('[Issue33 R190 #274 exact current proof] '+JSON.stringify(proof).slice(0,13000));
if(errors.length)throw Error('selected_current_source_274_FAIL:'+errors.join(','));
