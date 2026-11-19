#!/usr/bin/env node
// R233 independent original selected product raw-HTML + current actual extractor afterproof.
// These three records are NOT a 603-row manual certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('missing_focused_original_source_dir');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const cases=[
 {n:373,name:'Decaf Nicaragua Jinotega Micro Lot',url:'https://talkingcrowcoffeeroasters.com/products/decaf-nicaragua-jinotega-micro-lot',country:'Nicaragua',green:'Natural',other:['mango','nougat']},
 {n:374,name:'Decaf Peru Cajamarca',url:'https://talkingcrowcoffeeroasters.com/products/decaf-peru-swiss-water-process',country:'Peru',green:'Washed',other:['grilled pineapple','red wine']},
 {n:375,name:'Decaf Brazil Whiskey Barrel Aged',url:'https://talkingcrowcoffeeroasters.com/products/decaf-whiskey-barrel-aged-brazil',country:'Brazil',green:'Natural',other:['grilled pineapple','nougat']}
];
const errs=[],records=[],has=(s,term)=>String(s||'').toLowerCase().includes(term.toLowerCase());
if(head!==process.env.DIC_R233_HEAD)errs.push('wrong_exact_source_commit');
if(JSON.stringify(summary.case_numbers)!=='[373,374,375]'||
 JSON.stringify(summary.negative_identity_case_numbers||[])!=='[]'||
 summary.records?.length!==3||
 summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 errs.push('protected_original603_or_target_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||
 summary.production_operations!==0)errs.push('invalid_scope_claim');
for(const c of cases){
 const row=summary.records.find(x=>x.number===c.n)||{},bad=[];
 let bytes=Buffer.alloc(0);
 try{bytes=readFileSync(join(dir,'case-'+c.n+'.html'))}catch{bad.push('raw_selected_html_missing')}
 const hash=createHash('sha256').update(bytes).digest('hex');
 const raw=bytes.toString('utf8');
 const scope=productMarkup(raw);
 const headings=selectedProductHeadings(scope);
 const p=bytes.length?extractPublicCoffeeFacts(raw,{source_url:row.final_url||c.url}):{};
 const f=p.fields||{},conflicts=p.conflicts||[],facts=p.source_facts||[];
 if(row.status!=='FETCHED'||row.official_url!==c.url||row.parser_ok!==true)
  bad.push('exact_official_selected_source_unavailable');
 if(bytes.length<1000||bytes.length!==row.html_bytes||hash!==row.html_sha256)
  bad.push('raw_html_hash_length_mismatch');
 if(!headings.some(x=>x.toLowerCase()===c.name.toLowerCase())||
  String(f.name||'').toLowerCase()!==c.name.toLowerCase()||
  row.selected_heading_identity_verified!==true)bad.push('selected_identity_not_proven');
 if(row.add_coffee_ui_rendered!==true||row.source_review_rendered!==true)
  bad.push('missing_Add_Coffee_or_Source_Review');
 const selectedText=scope.replace(/<[^<>]{0,1500}>/gu,' ').replace(/\s+/gu,' ');
 if(!has(selectedText,'Swiss Water')||!has(selectedText,'Milling'))
  bad.push('current_selected_decaf_processing_primary_missing_or_moved');
 if(!has(f.origin,c.country))bad.push('country_origin_missing_or_changed');
 if(f.process!==c.green)bad.push('green_processing_confused_with_decaf_or_barrel');
 if(f.decaffeination_method!=='Water Process')bad.push('selected_Swiss_Water_method_missing_or_wrong');
 if(f.roast_level!=='Medium')bad.push('explicit_selected_Medium_roast_missing');
 if((f.tasting_notes||'')&&c.other.some(note=>has(f.tasting_notes,note)))
  bad.push('related_coffee_tasting_notes_contamination');
 if(!f.tasting_notes&&!conflicts.includes('tasting_notes'))
  bad.push('selected_tasting_notes_missing_without_review');
 if(f.release_label&&/\b(?:november|march|august|october|july|september)\b/iu.test(f.release_label))
  bad.push('undated_recurring_harvest_months_made_unique_lot');
 if(c.n===375&&(!has(selectedText,'barrel')||!has(selectedText,'natural')))
  bad.push('barrel_and_green_processing_source_moved');
 if(f.decaffeination_method==='Water Process'&&!facts.some(x=>
   x.field==='decaffeination_method'&&has(x.value,'Swiss Water')))
  bad.push('missing_selected_decaf_source_fact');
 errs.push(...bad.map(x=>c.n+':'+x));
 records.push({number:c.n,official_url:c.url,bytes:bytes.length,sha256:hash,
  h1:headings,fields:f,conflicts,decaf_evidence:facts.filter(x=>x.field==='decaffeination_method').slice(0,8),
  errors:bad});
}
const report={exact_git_sha:head,passed:errs.length===0,
 bounded_current_cases:errs.length===0?[373,374,375]:[],
 full_original603_certified:false,production_operations:0,records,errors:errs};
writeFileSync(join(dir,'r233-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R233 CURRENT OFFICIAL SOURCE AFTERPROOF] '+JSON.stringify(report).slice(0,27000));
if(errs.length)throw Error(errs.join(','));
