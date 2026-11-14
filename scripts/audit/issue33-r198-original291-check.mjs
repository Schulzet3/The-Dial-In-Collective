#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
const errors=[],must=(v,id)=>{if(!v)errors.push(id);};
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch(e){errors.push('summary_missing:'+e.message);}
const url='https://roasterympls.com/products/tanzania-peaberry';
must(JSON.stringify(summary.case_numbers)==='[291]'&&summary.records?.length===1,'only_case291');
must(summary.source_sha===process.env.GITHUB_SHA,'exact_source');
must(summary.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603');
must(summary.manual_certified===0&&summary.original_corpus_modified===false&&summary.production_operations===0,'no_global_certification');
let b=Buffer.alloc(0);try{b=readFileSync(join(dir,'case-291.html'));}catch(e){errors.push('source_unavailable:'+e.message);}
const html=b.toString('utf8'),selected=productMarkup(html),h1=selectedProductHeadings(selected),r=summary.records?.find(x=>x.number===291)||{},p=b.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||url}):{},f=p.fields||{};
const raw=selected.replace(/<[^<>]{0,1500}>/g,' ').replace(/&(?:nbsp|amp);/gi,' ').replace(/\s+/g,' ');
must(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===url&&r.final_url===url,'exact_official_product');
must(b.length>1000&&r.html_bytes===b.length&&r.html_sha256===sha(b),'raw_source_hash');
must(h1.includes('Tanzania Peaberry')&&r.selected_heading_identity_verified===true,'current_selected_H1');
must(/pepper,\s*white wine,\s*and black currant/i.test(raw),'current_own_marketing_flavor');
must(/Flavor:\s*Citrus,\s*black tea,\s*sweet berries,\s*and hints of chocolate/i.test(raw),'current_own_conflicting_Flavor_label');
must(p.ok===true&&f.name==='Tanzania Peaberry'&&f.process==='Washed','real_parser_correct_identity_process');
must(!f.tasting_notes&&(p.conflicts||[]).includes('tasting_notes'),'withhold_contradictory_flavor');
must(!f.roast_level,'body_not_roast');
must(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'explicit_Add_Coffee_review');
const report={source_sha:summary.source_sha,number:291,url,h1,html_bytes:b.length,html_sha256:b.length?sha(b):null,fields:f,conflicts:p.conflicts||[],tasting_source_facts:(p.source_facts||[]).filter(x=>x.field==='tasting_notes').slice(0,10),errors,passed:errors.length===0,manual_certified:false};
writeFileSync(join(dir,'r198-291-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R198 CURRENT SELECTED #291 AFTERPROOF] '+JSON.stringify(report).slice(0,10000));
if(errors.length)throw Error('original291_current_selected_afterproof:'+errors.join(','));
