#!/usr/bin/env node
// Issue #33 R232: independent current official selected source verification, not a 603-case certificate.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('source_directory_missing');
const summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const cases=[
 {n:371,name:'Uraga',url:'https://sweetbloomcoffee.com/products/uraga',
  process:'Natural',origin:'Ethiopia',notes:['guava','raspberry','milk chocolate']},
 {n:372,name:'Wuri',url:'https://sweetbloomcoffee.com/products/wuri',
  process:'Washed',origin:'Ethiopia',notes:['citra hops','mandarin','sugarcane']}
];
const errs=[],records=[];
const has=(v,s)=>String(v||'').toLowerCase().includes(s.toLowerCase());
if(head!==process.env.DIC_R232_HEAD)errs.push('wrong_exact_source_head');
if(JSON.stringify(summary.case_numbers)!=='[371,372]'||
 JSON.stringify(summary.negative_identity_case_numbers||[])!=='[]'||
 summary.records?.length!==2||
 summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 errs.push('wrong_immutable_original603_or_target_selection');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)
 errs.push('inaccurate_full_corpus_or_production_status');
for(const {n,name,url,process,origin,notes} of cases){
 const row=summary.records.find(x=>x.number===n)||{},bad=[];
 let bytes=Buffer.alloc(0);
 try{bytes=readFileSync(join(dir,'case-'+n+'.html'))}catch{bad.push('missing_selected_html')}
 const hash=createHash('sha256').update(bytes).digest('hex');
 const raw=bytes.toString('utf8'),selected=productMarkup(raw);
 const h1=selectedProductHeadings(selected);
 const p=bytes.length?extractPublicCoffeeFacts(raw,{source_url:row.final_url||url}):{};
 const f=p.fields||{},facts=p.source_facts||[];
 if(row.status!=='FETCHED'||row.official_url!==url||row.parser_ok!==true)
  bad.push('official_selected_source_or_parser_not_fetched');
 if(bytes.length<1000||bytes.length!==row.html_bytes||hash!==row.html_sha256)
  bad.push('raw_html_sha256_mismatch');
 if(!h1.some(x=>x.toLowerCase()===name.toLowerCase())||
    f.name?.toLowerCase()!==name.toLowerCase()||
    row.selected_heading_identity_verified!==true)
  bad.push('selected_product_identity_mismatch');
 if(!row.add_coffee_ui_rendered||!row.source_review_rendered)
  bad.push('Add_Coffee_or_Source_Review_not_rendered');
 if(f.process!==process||!has(f.origin,origin))
  bad.push('selected_geography_or_green_process_missing_or_wrong');
 for(const note of notes)if(!has(f.tasting_notes,note))bad.push('selected_sensory_missing_'+note.replace(/\s/g,'_'));
 if(notes.some(note=>!has(selected.replace(/<[^<>]{0,2000}>/gu,' '),note)))
  bad.push('selected_primary_notes_not_correlated');
 if(f.release_label&&/\b2026\b/.test(f.release_label))
  bad.push('relationship_since_2026_improperly_made_release');
 if(f.producer&&(/since\s+2026/i.test(f.producer)||
  /\bwashing\s+station\b/i.test(f.producer)))
  bad.push('facility_or_relationship_improperly_made_grower');
 // Roaster prints Light/Medium scale endpoints, not a chosen single roast.
 if(f.roast_level)bad.push('ambiguous_visual_roast_autofilled');
 // This parser exposes the optional published recommendation as TOP-LEVEL
 // roaster_recipe, not as a canonical coffee field. Missing recipe remains
 // visible for separate investigation rather than a fabricated runtime error.
 const recipe=p.roaster_recipe||null;
 if(recipe&&(/305\\s*g|2:30|origami/i.test(JSON.stringify(recipe))||
   Number(recipe.dose_g)!==18.5||Number(recipe.yield_g)!==36))
  bad.push('filter_recipe_or_wrong_espresso_measurement');
 if((p.conflicts||[]).length)bad.push('current_selected_conflict_requires_review');
 if(n===371&&(has(f.tasting_notes,'citra hops')||has(f.tasting_notes,'mandarin')))
  bad.push('borrowed_wuri_sensory');
 if(n===372&&(has(f.tasting_notes,'guava')||has(f.tasting_notes,'raspberry')))
  bad.push('borrowed_uraga_sensory');
 errs.push(...bad.map(x=>n+':'+x));
 records.push({number:n,official_url:url,raw_bytes:bytes.length,raw_sha256:hash,
   selected_h1:h1,current_fields:f,roaster_recipe:p.roaster_recipe||null,conflicts:p.conflicts||[],
   source_facts:facts.filter(x=>['release_label','producer','roast_level','espresso_recipe'].includes(x.field)).slice(0,15),
   failures:bad});
}
const report={exact_source_sha:head,passed:errs.length===0,
 verified_current_original_cases:errs.length===0?[371,372]:[],
 whole_original603_certified:false,production_operations:0,records,errors:errs};
writeFileSync(join(dir,'r232-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R232 CURRENT SELECTED SOURCE/PARSER AFTERPROOF] '+JSON.stringify(report).slice(0,28000));
if(errs.length)throw Error(errs.join(','));
