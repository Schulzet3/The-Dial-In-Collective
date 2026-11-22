#!/usr/bin/env node
// Issue #33 R407: strict current selected primary product evidence only.
// This is NOT a frozen603 replay, a manual-certification flag, or a save.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'';
if(!dir||!process.env.DIC_EXPECTED_SHA)throw Error('r407_exact_source_and_artifact_required');
const source=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const failures=[];
const sha=value=>createHash('sha256').update(value).digest('hex');
if(source.source_sha!==process.env.DIC_EXPECTED_SHA)failures.push('exact_source_sha_mismatch');
if(JSON.stringify(source.case_numbers)!=='[119,123]'||source.records?.length!==2)
 failures.push('required_119_123_case_set_missing');
const inspected=[];
for(const n of [119,123]){
 const r=source.records?.find(x=>x.number===n);
 if(!r){failures.push('missing_'+n);continue;}
 if(r.status!=='FETCHED'||r.parser_ok!==true||r.selected_heading_identity_verified!==true||
    r.add_coffee_ui_rendered!==true||r.source_review_rendered!==true)
  failures.push('required_official_identity_parser_unsaved_ui_'+n);
 const h=readFileSync(join(dir,'case-'+n+'.html'),'utf8');
 const actual=sha(h);
 if(!/^[a-f0-9]{64}$/.test(r.html_sha256||'')||actual!==r.html_sha256)
  failures.push('source_raw_html_sha256_mismatch_'+n);
 const own=productMarkup(h).replace(/<[^>]{0,1600}>/g,' ')
   .replace(/&(?:nbsp|amp|quot|#39);/gi,' ').replace(/\s+/g,' ').trim();
 const facts=r.current_fields||{};
 const expectedUrl=n===119?'https://epiphanycoffee.co/products/radiate':
   'https://favor.coffee/products/the-token-dark-blend';
 const expectedTitle=n===119?'radiate':'The Token Dark Blend';
 if(r.official_url!==expectedUrl||facts.name!==expectedTitle||
    !r.selected_h1?.some(x=>x.trim()===expectedTitle))
  failures.push('exact_original_selected_identity_'+n);
 if(n===119){
   // This November 22 first-party page shows a DIFFERENT Guatemala component
   // from the frozen Nicaragua capture, and a Semi-Washed Sumatra component.
   // Neither a historical blend recipe nor a single Washed process is safe.
   if(!/Guatemala[\s\S]{0,250}Washed Process/i.test(own)||
      !/Sumatra[\s\S]{0,180}Semi.Washed Process/i.test(own))
    failures.push('selected_changed_components_not_in_own_product_119');
   if(/\bNicaragua\b/i.test(facts.origin||''))
    failures.push('stale_archived_nicaragua_promoted_into_current_origin_119');
   if(/^\s*(?:Washed|Semi-Washed)\s*$/i.test(facts.process||''))
    failures.push('nonhomogeneous_component_process_promoted_to_single_119');
   for(const note of ['Brown Ale','Tobacco Smoke','Molasses'])
    if(!String(facts.tasting_notes||'').toLowerCase().includes(note.toLowerCase()))
     failures.push('selected_direct_tasting_missing_119_'+note);
 }else{
   if(!/Producer\s*:\s*Miriam Monteiro de Aguiar/i.test(own)||
      !/Process\s*:\s*Natural/i.test(own)||!/We Taste\s*:\s*Hazelnut/i.test(own))
     failures.push('token_selected_direct_specs_missing_123');
   if(facts.producer!=='Miriam Monteiro de Aguiar'||
      facts.process!=='Natural')
     failures.push('token_direct_producer_or_process_not_retained_123');
   if(!/Hazelnut/i.test(facts.tasting_notes||''))
     failures.push('token_direct_taste_not_retained_123');
 }
 inspected.push({number:n,original_url:r.official_url,source_sha256:actual,
   selected_h1:r.selected_h1,fields:facts,conflicts:r.conflicts||[],
   selected_own_excerpt:own.slice(0,900),
   parser_ok:r.parser_ok,selected_identity:r.selected_heading_identity_verified,
   add_coffee_unsaved_ui:r.add_coffee_ui_rendered,source_review:r.source_review_rendered});
}
const verdict={source_sha:source.source_sha,case_numbers:[119,123],
 first_party_raw_html_rehashed:true,manual_certified:0,
 no_member_write:true,failures,inspected};
writeFileSync(join(dir,'r407-strict-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R407 EXACT SELECTED SOURCE] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
