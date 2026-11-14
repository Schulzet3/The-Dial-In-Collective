#!/usr/bin/env node
// Issue #33 R191: two EXACT selected original603 official coffees, not full-corpus certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.'), errors=[],cases=[
 {n:275,url:'https://readysetcoffee.com/products/guatemala-antigua-los-volcanes-copy',h1:'Guatemala Antigua Los Volcanes',
 notes:['black currant','toffee','toasted almond'],country:'Guatemala',process:'Washed',roast:'Medium',feet:'5,000',metres:'1524',variety:['Bourbon','Typica']},
 {n:276,url:'https://readysetcoffee.com/products/honduras-manos-de-mujer-organic-fair-trade',h1:'Honduras Manos de Mujer, Organic, Fair Trade',
 notes:['hazelnut','orange blossom','agave'],country:'Honduras',process:'Honey',roast:'Medium',feet:'4,000',metres:'1219',variety:['Bourbon','Catuai','Caturra','Typica']}
];
mkdirSync(dir,{recursive:true});
const check=(yes,reason)=>{if(!yes)errors.push(reason);};
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch(e){errors.push('missing_evidence:'+e.message)}
check(JSON.stringify(summary.case_numbers)==='[275,276]'&&summary.records?.length===2,'two_selected_cases_only');
check(summary.source_sha===process.env.GITHUB_SHA,'exact_source_SHA');
check(summary.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_frozen_immutable');
check(summary.manual_certified===0&&summary.original_corpus_modified===false&&summary.production_operations===0,'no_full_corpus_or_provider_write');
const results=[];
for(const c of cases){
 let html=Buffer.from('');try{html=readFileSync(join(dir,'case-'+c.n+'.html'))}catch(e){errors.push('missing_html_'+c.n+':'+e.message)}
 const rec=(summary.records||[]).find(x=>x.number===c.n)||{};
 const actual=extractPublicCoffeeFacts(html.toString('utf8'),{source_url:c.url});
 const selected=productMarkup(html.toString('utf8'));
 const headings=selectedProductHeadings(selected),f=actual.fields||{};
 const clean=String(selected).replace(/<[^<>]{0,1200}>/g,' ').replace(/&(?:nbsp|amp);/gi,' ').replace(/\s+/g,' ');
 const note=String(f.tasting_notes||'').toLowerCase(), producer=String(f.producer||'');
 check(rec.status==='FETCHED'&&rec.parser_ok===true&&rec.official_url===c.url&&rec.final_url===c.url,'official_fetch_selected_'+c.n);
 check(html.length>1000&&rec.html_bytes===html.length&&rec.html_sha256===sha(html),'raw_html_hash_'+c.n);
 check(headings.includes(c.h1)&&rec.selected_heading_identity_verified===true,'current_selected_h1_'+c.n);
 check(actual.ok===true&&String(f.name||'').includes(c.n===276?'Manos de Mujer':'Guatemala Antigua Los Volcanes'),'real_parser_name_'+c.n);
 for(const x of c.notes)check(note.includes(x),'selected_tasting_'+c.n+'_'+x);
 check(f.roast_level===c.roast,'selected_roast_'+c.n);
 check(new RegExp(c.process,'i').test(String(f.process||'')),'selected_process_'+c.n);
 check(new RegExp(c.country,'i').test(String(f.origin||'')),'selected_origin_'+c.n);
 check(new RegExp(c.feet.replace(',','[,]?')+String.raw`\s*Feet`,'i').test(clean),'selected_feet_literal_'+c.n);
 check(String(f.elevation_m||'').includes(c.metres),'converted_feet_not_metres_'+c.n);
 for(const v of c.variety)check(String(f.variety||'').includes(v),'selected_variety_'+c.n+'_'+v);
 check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'explicit_Add_Coffee_Source_Review_'+c.n);
 check(!f.decaffeination_method&&!f.espresso_recipe,'unpublished_decaf_recipe_blank_'+c.n);
 if(c.n===275){
  check(!producer,'anonymous_farms_are_not_verified_named_producer');
  check(!/brown sugar|green apple|milk chocolate/.test(note),'other_coffee_notes_not_borrowed_275');
 }else{
  check(/manos de mujer/i.test(producer),'named_female_collective_producer_276');
  check(!/62 farmers|2000/.test(producer),'COMSA_general_history_not_selected_grower_276');
  check(!/brown sugar|green apple|milk chocolate/.test(note),'other_coffee_notes_not_borrowed_276');
 }
 results.push({number:c.n,official_url:c.url,bytes:html.length,sha256:html.length?sha(html):null,h1:headings,fields:f,conflicts:actual.conflicts||[],status:rec.status});
}
const proof={source_sha:summary.source_sha,cases:results,errors,passed:errors.length===0,original603_individually_fully_certified:false};
writeFileSync(join(dir,'r191-275-276-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
console.log('[DIC33 R191 selected official proof] '+JSON.stringify(proof).slice(0,15000));
if(errors.length)throw Error('r191_selected_live_parser_FAIL:'+errors.join(','));
