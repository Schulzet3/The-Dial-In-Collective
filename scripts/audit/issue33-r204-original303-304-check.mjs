#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';

const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
const cases=[
 {n:303,name:'Guatemala - Huehuetenango',url:'https://shop.broadporchcoffee.com/products/guatemala',
  direct:['Huehuetenango','Guatemala','toffee','roasted almond','Washed','medium'],
  fields:{origin:/Guatemala/i,process:/Washed/i,roast_level:/Medium/i},
  notes:['almond','toffee']},
 {n:304,name:'Meaning of Life® Drip Coffee',url:'https://shop.caffedarte.com/products/meaning-of-life-drip-coffee',
  direct:['Well-balanced','full-bodied','supremely smooth'],
  fields:{},notes:[]}
];
const sha=b=>createHash('sha256').update(b).digest('hex'),errors=[];
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(process.env.DIC_R204_EXACT_CHECKOUT_SHA||'')||checkout!==process.env.DIC_R204_EXACT_CHECKOUT_SHA)errors.push('wrong_checkout');
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch(e){errors.push('missing_summary:'+e.message);}
if(JSON.stringify(summary.case_numbers)!=='[303,304]'||summary.records?.length!==2)errors.push('original_subset_mismatch');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('frozen603_digest_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('invalid_global_or_provider_claim');
const reports=[];
for(const c of cases){
 const r=summary.records?.find(x=>x.number===c.n)||{},e=[];
 let bytes=Buffer.alloc(0);try{bytes=readFileSync(join(dir,'case-'+c.n+'.html'));}catch(x){e.push('missing_html:'+x.message);}
 const html=bytes.toString('utf8'),selected=productMarkup(html),headings=selectedProductHeadings(selected);
 const p=bytes.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||c.url}):{},f=p.fields||{};
 const sourceText=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp|quot);/giu,' ').replace(/\s+/gu,' ');
 if(r.status!=='FETCHED'||r.official_url!==c.url||r.final_url!==c.url||r.parser_ok!==true)e.push('original_exact_official_url_unavailable');
 if(bytes.length<1000||r.html_bytes!==bytes.length||r.html_sha256!==sha(bytes))e.push('raw_html_sha256_mismatch');
 if(!headings.includes(c.name)||!r.selected_heading_identity_verified||f.name!==c.name)e.push('selected_identity_mismatch');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)e.push('missing_add_coffee_or_source_review');
 for(const literal of c.direct)if(!sourceText.toLowerCase().includes(literal.toLowerCase()))e.push('missing_direct_literal:'+literal);
 for(const [field,re] of Object.entries(c.fields))if(!re.test(String(f[field]||''))&&!(p.conflicts||[]).includes(field))e.push('unsupported_or_lost_direct_field:'+field);
 for(const note of c.notes)if(!String(f.tasting_notes||'').toLowerCase().includes(note)&&!(p.conflicts||[]).includes('tasting_notes'))e.push('missing_note_without_review:'+note);
 if(f.producer||f.elevation_m)e.push('unpublished_producer_or_elevation');
 if(c.n===304){
  if(f.origin||f.decaffeination_method||f.process)e.push('unpublished_source_field_for_drip_blend');
  if(/(?:wood fire|wood-fired|smoky|smoke|peach|Kenya)/i.test(String(f.tasting_notes||'')))e.push('generic_educational_or_other_coffee_sensory_leak');
 }
 if((p.conflicts||[]).includes('name'))e.push('false_current_product_name_conflict');
 errors.push(...e.map(x=>c.n+':'+x));
 reports.push({case_number:c.n,passed:e.length===0,errors:e,status:r.status,original_url:c.url,final_url:r.final_url,html_bytes:bytes.length,html_sha256:bytes.length?sha(bytes):null,headings,selected_excerpt:sourceText.slice(0,1400),fields:f,conflicts:p.conflicts||[],source_review:(p.source_facts||[]).filter(x=>['tasting_notes','origin','process','roast_level'].includes(x.field)).slice(0,16)});
}
const report={passed:errors.length===0,errors,source_sha:summary.source_sha,checkout_sha:checkout,event_sha:process.env.GITHUB_SHA,manual_certified:false,provider_writes:0,products:reports};
writeFileSync(join(dir,'r204-303-304-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R204 CURRENT ORIGINAL SOURCE AFTERPROOF] '+JSON.stringify(report).slice(0,22000));
if(errors.length)throw Error('r204_selected_source_afterproof_failed:'+errors.join(','));
