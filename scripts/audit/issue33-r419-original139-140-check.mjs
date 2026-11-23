#!/usr/bin/env node
// Issue33 R419 exact first-party selected originals 139/140. Never certify whole original603.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'', expectedSha=process.env.DIC_EXPECTED_SHA||'';
if(!dir||!/^[a-f0-9]{40}$/.test(expectedSha))throw Error('r419_required_source_and_artifact');
const source=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex'),failures=[],inspected=[];
const requireFact=(yes,why)=>{if(!yes)failures.push(why);};
requireFact(source.source_sha===expectedSha,'wrong_immutable_source');
requireFact(JSON.stringify(source.case_numbers)==='[139,140]'&&source.records?.length===2,'wrong_cohort');
requireFact(source.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_register_changed');
requireFact(source.original_corpus_modified===false&&source.manual_certified===0&&source.production_operations===0,'original_or_provider_integrity');
for(const [n,name,notes] of [[139,'Costa Rica',['Cocoa','Toasted Almond','Golden Sugar']],[140,'Ethiopia',['Raspberry','Cane Sugar','Lemon Zest']]]){
 const url='https://grindinggearscoffee.com/products/'+name.toLowerCase().replace(' ','-');
 const r=source.records?.find(x=>x.number===n);
 if(!r){failures.push('missing_original_'+n);continue;}
 requireFact(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true&&
 r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'official_H1_parser_UI_unverified_'+n);
 let html='';
 try{html=readFileSync(join(dir,'case-'+n+'.html'),'utf8');}catch{failures.push('no_raw_current_HTML_'+n);continue;}
 const digest=sha(html),fields=r.current_fields||{};
 requireFact(digest===r.html_sha256&&/^[a-f0-9]{64}$/.test(digest),'raw_HTML_SHA_mismatch_'+n);
 requireFact(r.official_url===url&&r.final_url?.replace(/\/$/,'')===url&&
 fields.name===name&&r.selected_h1?.includes(name),'selected_H1_or_identity_changed_'+n);
 const own=productMarkup(html).replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
 requireFact(own.includes(notes.join(', ').toLowerCase()),'first_direct_selected_notes_missing_'+n);
 const parsed=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
 requireFact(parsed?.ok===true&&parsed?.fields?.name===fields.name&&
 parsed?.fields?.tasting_notes===fields.tasting_notes,'real_parser_replay_mismatch_'+n);
 requireFact(!parsed?.roaster_recipe?.dose_g&&!parsed?.roaster_recipe?.yield_g,'invented_espresso_recipe_'+n);
 if(n===139){
  requireFact(fields.roast_level==='Medium'&&fields.process==='Washed'&&
   /costa rica/i.test(fields.origin||''),'wrong_costa_rica_roast_origin_process');
  requireFact(notes.every(x=>String(fields.tasting_notes||'').toLowerCase().includes(x.toLowerCase())),'costa_rica_labeled_notes_omitted');
  requireFact(!fields.producer&&!fields.decaffeination_method,'costa_rica_unpublished_producer_or_decaf');
 }else{
  const other=['Ripe Berries','Florals','Sugarcane'];
  requireFact(own.includes(other.join(', ').toLowerCase()),'second_direct_selected_notes_missing_140');
  const conflict=(r.conflicts||[]).some(x=>(typeof x==='string'?x:x?.field||x?.key)==='tasting_notes');
  requireFact(conflict&&!fields.tasting_notes,'two_direct_selected_sensory_claims_silently_resolved_140');
  const facts=(parsed?.source_facts||[]).filter(x=>x.field==='tasting_notes'&&x.source_type==='html'&&
   x.source_url?.replace(/\/$/,'')===url).map(x=>String(x.value||'').toLowerCase());
  requireFact(facts.some(x=>notes.every(v=>x.includes(v.toLowerCase())))&&
   facts.some(x=>other.every(v=>x.includes(v.toLowerCase()))),'both_selected_sensory_alternatives_not_reviewable_140');
  requireFact(fields.roast_level==='Medium-Light'&&fields.process==='Natural'&&
   /ethiopia/i.test(fields.origin||'')&&/mengeche derso/i.test(fields.producer||''),
   'wrong_ethiopia_selected_producer_process_roast');
  requireFact(!/costa rica/i.test([fields.name,fields.origin,fields.producer,fields.tasting_notes].join(' ')),
   'cross_coffee_contamination_140');
 }
 inspected.push({number:n,url,raw_html_sha256:digest,selected_h1:r.selected_h1,
  fields,conflicts:r.conflicts||[],unsaved_add_coffee:r.add_coffee_ui_rendered===true,
  source_review:r.source_review_rendered===true});
}
const verdict={source_sha:source.source_sha,originals:[139,140],raw_official_html_independently_hashed:true,
 manual_certified:0,provider_writes:0,failures,inspected};
writeFileSync(join(dir,'r419-strict-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[ISSUE33 R419 CURRENT SOURCE] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
