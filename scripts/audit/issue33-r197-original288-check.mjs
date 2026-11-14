#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
const errors=[],check=(v,label)=>{if(!v)errors.push(label);};
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}
catch(e){errors.push('missing_summary:'+e.message);}
const url='https://roadmapcoffeeworks.com/products/peru-german-carranza-gesha';
check(JSON.stringify(summary.case_numbers)==='[288]'&&summary.records?.length===1,'only_original288');
check(summary.source_sha===process.env.GITHUB_SHA,'exact_PR_or_merged_SHA');
check(summary.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','untouched_original603');
check(summary.manual_certified===0&&summary.original_corpus_modified===false&&summary.production_operations===0,'no_global_certification');
let bytes=Buffer.alloc(0);try{bytes=readFileSync(join(dir,'case-288.html'));}catch(e){errors.push('missing_html:'+e.message);}
const html=bytes.toString('utf8'),selected=productMarkup(html),h1=selectedProductHeadings(selected);
const raw=selected.replace(/<[^<>]{0,1200}>/g,' ').replace(/&(?:nbsp|amp);/gi,' ').replace(/\s+/g,' ');
const rec=summary.records?.find(x=>x.number===288)||{};
const parsed=bytes.length?extractPublicCoffeeFacts(html,{source_url:rec.final_url||url}):{},f=parsed.fields||{};
check(rec.status==='FETCHED'&&rec.parser_ok===true&&rec.official_url===url&&rec.final_url===url,'exact_official_fetch');
check(bytes.length>1000&&rec.html_bytes===bytes.length&&rec.html_sha256===hash(bytes),'actual_current_HTML_hash');
check(h1.includes('Peru German Carranza Gesha')&&rec.selected_heading_identity_verified===true,'current_selected_H1');
check(/Farm:\s*El Bebedero/i.test(raw)&&/Producer German Carranza works/i.test(raw)&&/Carranza['’]s El Bebedero/i.test(raw),'named_grower_and_separate_farm_direct_source');
check(parsed.ok===true&&f.name==='Peru German Carranza Gesha','actual_parser_identity');
check(f.producer==='German Carranza','current_named_grower_not_farm');
check(f.process==='Natural'&&f.roast_level==='Light'&&/Honeysuckle/i.test(String(f.tasting_notes||'')),'own_spec_and_full_flavor');
check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'Add_Coffee_and_Source_Review');
const report={source_sha:summary.source_sha,case:288,official_url:url,h1,html_bytes:bytes.length,html_sha256:bytes.length?hash(bytes):null,fields:f,producer_facts:(parsed.source_facts||[]).filter(x=>x.field==='producer').slice(0,6),errors,passed:errors.length===0,original603_certified:false};
writeFileSync(join(dir,'r197-288-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R197 ORIGINAL288 EXACT SOURCE AFTERPROOF] '+JSON.stringify(report).slice(0,11000));
if(errors.length)throw Error('r197_original288_source_mismatch:'+errors.join(','));
