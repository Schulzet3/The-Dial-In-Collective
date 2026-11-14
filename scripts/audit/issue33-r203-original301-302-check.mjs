#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
mkdirSync(dir,{recursive:true});
const products=[
 {n:301,name:'Brazil - Cerrado',url:'https://shop.broadporchcoffee.com/products/brazil-medium-roast',direct:['Cerrado','Chocolate','Toasted Nuts','Natural','Medium'],notes:['chocolate','toasted nuts'],facts:{origin:/Brazil/i,process:/Natural/i,roast_level:/Medium/i}},
 {n:302,name:'Decaf - Colombian Water Process',url:'https://shop.broadporchcoffee.com/products/decaf',direct:['Colombia','Dark Chocolate','Hazelnut','Mountain Water Process'],notes:['dark chocolate','hazelnut'],facts:{origin:/Colombia/i,decaffeination_method:/Water/i}}
];
const hash=x=>createHash('sha256').update(x).digest('hex');
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),errors=[];
if(!/^[a-f0-9]{40}$/.test(process.env.DIC_R203_EXACT_CHECKOUT_SHA||'')||checkout!==process.env.DIC_R203_EXACT_CHECKOUT_SHA)errors.push('wrong_checkout_sha');
let summary={};
try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch(e){errors.push('missing_summary:'+e.message);}
if(JSON.stringify(summary.case_numbers)!=='[301,302]'||summary.records?.length!==2)errors.push('original_subset_mismatch');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('immutable_original603_changed');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('false_corpus_or_provider_claim');
const reports=[];
for(const c of products){
 const r=summary.records?.find(x=>x.number===c.n)||{},e=[];
 let bytes=Buffer.alloc(0);
 try{bytes=readFileSync(join(dir,'case-'+c.n+'.html'));}catch(err){e.push('missing_html:'+err.message);}
 const html=bytes.toString('utf8'),selected=productMarkup(html),headings=selectedProductHeadings(selected);
 const p=bytes.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||c.url}):{},f=p.fields||{};
 const sourceText=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp|quot);/giu,' ').replace(/\s+/gu,' ');
 if(r.status!=='FETCHED'||r.official_url!==c.url||r.final_url!==c.url||r.parser_ok!==true)e.push('exact_official_source_unavailable_or_parse_failed');
 if(bytes.length<1000||r.html_bytes!==bytes.length||r.html_sha256!==hash(bytes))e.push('raw_html_digest_mismatch');
 if(!headings.includes(c.name)||!r.selected_heading_identity_verified||f.name!==c.name)e.push('selected_identity_mismatch');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)e.push('add_coffee_or_review_not_rendered');
 for(const s of c.direct){if(!sourceText.toLowerCase().includes(s.toLowerCase()))e.push('direct_literal_missing:'+s);}
 for(const s of c.notes){if(!String(f.tasting_notes||'').toLowerCase().includes(s)&&(p.conflicts||[]).includes('tasting_notes')===false)e.push('direct_sensory_missing_or_not_reviewable:'+s);}
 for(const [field,re] of Object.entries(c.facts)){if(!re.test(String(f[field]||'')) && !(p.conflicts||[]).includes(field))e.push('direct_field_not_extracted_or_reviewable:'+field);}
 if(f.producer||f.elevation_m)e.push('unsupported_producer_or_elevation');
 if((p.conflicts||[]).includes('name'))e.push('selected_identity_conflict');
 errors.push(...e.map(x=>c.n+':'+x));
 reports.push({case_number:c.n,passed:e.length===0,errors:e,status:r.status,official_url:c.url,final_url:r.final_url,html_bytes:bytes.length,html_sha256:bytes.length?hash(bytes):null,headings,selected_excerpt:sourceText.slice(0,1200),fields:f,conflicts:p.conflicts||[],source_review:(p.source_facts||[]).filter(x=>['tasting_notes','origin','process','roast_level','decaffeination_method'].includes(x.field)).slice(0,14)});
}
const report={passed:errors.length===0,errors,source_sha:summary.source_sha,checkout_sha:checkout,event_sha:process.env.GITHUB_SHA,manual_certified:false,provider_writes:0,products:reports};
writeFileSync(join(dir,'r203-301-302-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R203 EXACT CURRENT BROAD PORCH AFTERPROOF] '+JSON.stringify(report).slice(0,20000));
if(errors.length)throw Error('original301_302_selected_afterproof_failed:'+errors.join(','));
