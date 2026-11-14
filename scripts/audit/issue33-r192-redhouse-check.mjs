#!/usr/bin/env node
// Issue33 R192: bounded raw selected source checks; a 3-row inventory never certifies 603.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
const errs=[],check=(v,label)=>{if(!v)errs.push(label);};
const cases=[
 {n:277,url:'https://redhouseroasters.com/products/gesha-el-paraiso-narino',h1:'Geisha El Paraiso Nariño 8 oz',notes:['fruity','hibiscus'],roast:'Medium'},
 {n:278,url:'https://redhouseroasters.com/products/mexican-oaxaca',h1:'Mexican Oaxaca',notes:['cocoa','honey','caramel']},
 {n:279,url:'https://redhouseroasters.com/products/sumatra',h1:'Sumatra',notes:['molasses','floral','spice'],roast:'Medium-Dark'}
];
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch(e){errs.push('missing_summary:'+e.message)}
check(JSON.stringify(summary.case_numbers)==='[277,278,279]'&&summary.records?.length===3,'three_selected_original_cases');
check(summary.source_sha===process.env.GITHUB_SHA,'exact_git_source');
check(summary.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_immutable');
check(summary.manual_certified===0&&summary.original_corpus_modified===false&&summary.production_operations===0,'no_false_universal_or_provider_claim');
const result=[];
for(const c of cases){
 let bytes=Buffer.alloc(0);try{bytes=readFileSync(join(dir,'case-'+c.n+'.html'))}catch(e){errs.push('missing_html_'+c.n+':'+e.message)}
 const rec=(summary.records||[]).find(x=>x.number===c.n)||{};
 const html=bytes.toString('utf8'),actual=extractPublicCoffeeFacts(html,{source_url:c.url});
 const selected=productMarkup(html),h1=selectedProductHeadings(selected),f=actual.fields||{};
 const norm=selected.replace(/<[^<>]{0,1200}>/g,' ').replace(/&(?:nbsp|amp);/gi,' ').replace(/\s+/g,' ');
 const notes=String(f.tasting_notes||'').toLowerCase();
 check(rec.status==='FETCHED'&&rec.official_url===c.url&&rec.final_url===c.url&&rec.parser_ok===true,'selected_public_fetch_'+c.n);
 check(bytes.length>1000&&rec.html_bytes===bytes.length&&rec.html_sha256===sha(bytes),'current_raw_html_hash_'+c.n);
 check(h1.includes(c.h1)&&rec.selected_heading_identity_verified===true,'true_current_H1_'+c.n);
 check(actual.ok===true&&String(f.name||'')===c.h1,'actual_parser_selected_name_'+c.n);
 check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'explicit_add_coffee_source_review_'+c.n);
 for(const x of c.notes)check(notes.includes(x),'direct_cupping_'+c.n+'_'+x);
 if(c.roast)check(f.roast_level===c.roast,'current_roast_'+c.n);
 if(c.n===277){
  check(/Jose Gomez Lopez/i.test(String(f.producer||'')),'named_selected_farmer_277');
  check(/\b1900\s*Meters\b/i.test(norm),'current_literal_elevation_277');
  check(/notes of jasmine, lemon/i.test(norm),'same_current_description_jasmine_lemon_277');
  check(/hibiscus/i.test(norm),'contrasting_selected_cupping_hibiscus_277');
  const ownContext=(actual.source_facts||[]).filter(x=>
   x.field==='sensory_context'&&x.label==='Selected current unlabeled tasting pair (review only)');
  check(ownContext.length===1&&/jasmine/i.test(ownContext[0]?.value||'')&&
   /lemon/i.test(ownContext[0]?.value||'')&&ownContext[0]?.source_url===c.url,
   'exact_selected_review_only_jasmine_lemon_277');
  check(!/jasmine|lemon/i.test(notes),'printed_cupping_notes_not_replaced_277');
  check(!f.process,'unpublished_process_blank_277');
 }else{
  check(/\bPROCESSING:\s*Wet-Hulled\b/i.test(norm),'selected_wet_hulled_literal_'+c.n);
  check(!/^Washed$/i.test(String(f.process||'')),'wet_hulled_not_washed_'+c.n);
  if(c.n===278){check(!f.roast_level,'unpublished_roast_blank_278');check(!f.producer,'unpublished_grower_blank_278');}
  if(c.n===279){check(/\bROAST:\s*Full City/i.test(norm),'full_city_selected_literal_279');check(!f.producer,'unpublished_grower_blank_279');}
 }
 check(!f.espresso_recipe&&!f.decaffeination_method,'grind_not_recipe_or_decaf_'+c.n);
 result.push({number:c.n,status:rec.status,url:c.url,html_bytes:bytes.length,sha256:bytes.length?sha(bytes):null,h1,fields:f,conflicts:actual.conflicts||[]});
}
const proof={source_sha:summary.source_sha,original603_full_certification:false,cases:result,errors:errs,passed:errs.length===0};
writeFileSync(join(dir,'r192-redhouse-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
console.log('[DIC33 R192 RAW SELECTED PROOF] '+JSON.stringify(proof).slice(0,22000));
if(errs.length)throw Error('r192_selected_277_279_FAIL:'+errs.join(','));
