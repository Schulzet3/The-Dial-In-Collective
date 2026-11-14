#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
mkdirSync(dir,{recursive:true});
const cases=[
 {n:292,url:'https://seedscoffee.com/products/ethiopia-getachew-zekele',name:'Ethiopia Guji Getachew',taste:['Citrus','Black Tea','Honeysuckle'],exclude:'Habtamu'},
 {n:293,url:'https://seedscoffee.com/products/ethiopia-guji-getachew-copy',name:'Ethiopia Yirgacheffe Habtamu',taste:['Cherry','Papaya','Lime Candy'],exclude:'Getachew Zekele'}
];
const hash=x=>createHash('sha256').update(x).digest('hex'),errors=[],evidence=[];
let summary={};
try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}
catch(e){errors.push('missing_current_source_summary:'+e.message);}
if(JSON.stringify(summary.case_numbers)!=='[292,293]'||summary.records?.length!==2)errors.push('source_subset_mismatch');
if(summary.source_sha!==process.env.GITHUB_SHA)errors.push('source_sha_mismatch');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')errors.push('original_frozen_identity_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)errors.push('audit_overstates_manual_certification');
for(const c of cases){
 const r=summary.records?.find(x=>x.number===c.n)||{};
 let b=Buffer.alloc(0);
 try{b=readFileSync(join(dir,'case-'+c.n+'.html'))}catch(e){errors.push(c.n+':missing_raw_html:'+e.message)}
 const html=b.toString('utf8'),p=b.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||c.url}):{},f=p.fields||{};
 const h1=selectedProductHeadings(productMarkup(html));
 const own={number:c.n,url:c.url,current_final_url:r.final_url||null,raw_bytes:b.length,sha256:b.length?hash(b):null,h1,fields:f,conflicts:p.conflicts||[],source_facts:(p.source_facts||[]).filter(x=>['tasting_notes','producer','origin','process'].includes(x.field)).slice(0,12)};
 evidence.push(own);
 if(r.status!=='FETCHED'||r.official_url!==c.url||r.final_url!==c.url||r.parser_ok!==true)errors.push(c.n+':exact_url_or_parser');
 if(b.length<1000||r.html_bytes!==b.length||r.html_sha256!==hash(b))errors.push(c.n+':raw_hash');
 if(!h1.includes(c.name)||r.selected_heading_identity_verified!==true||f.name!==c.name)errors.push(c.n+':selected_identity');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)errors.push(c.n+':Add_Coffee_source_review');
 const ownText=productMarkup(html).replace(/<[^<>]{0,2000}>/g,' ').replace(/&(?:nbsp|amp);/gi,' ').replace(/\s+/g,' ');
 if(!c.taste.every(t=>ownText.toLowerCase().includes(t.toLowerCase())))errors.push(c.n+':direct_labeled_flavor_absent');
 if(!c.taste.every(t=>String(f.tasting_notes||'').toLowerCase().includes(t.toLowerCase())) && !(p.conflicts||[]).includes('tasting_notes'))errors.push(c.n+':flavor_not_retained_or_reviewable');
 if(String(f.producer||'').includes(c.exclude))errors.push(c.n+':cross_product_producer');
 if(f.process||f.roast_level)errors.push(c.n+':unpublished_roast_or_process');
}
const output={source_sha:summary.source_sha,scope:'original603 292-293, NOT universal 603 certification',passed:errors.length===0,errors,evidence,manual_certified:false,provider_writes:0};
writeFileSync(join(dir,'r199-292-293-afterproof.json'),JSON.stringify(output,null,2)+'\n');
console.log('[DIC33 R199 EXACT SELECTED CURRENT SOURCE AFTERPROOF] '+JSON.stringify(output).slice(0,12000));
if(errors.length)throw Error('r199_exact_current_selected_fail:'+errors.join(','));
