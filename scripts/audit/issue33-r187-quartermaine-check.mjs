#!/usr/bin/env node
// Issue #33: three exact original603 Quartermaine selections, not global corpus certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fold=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').replace(/\s+/gu,' ').trim();
export const quartermaineCases=Object.freeze({
 262:Object.freeze({name:'Colombia',url:'https://quartermaine.com/products/colombia',origin:'colombia',
  direct:['huila region','100 typica','caramel','deep signature roast'],notes:['caramel'],variety:'typica'}),
 263:Object.freeze({name:'Costa Rica',url:'https://quartermaine.com/products/costa-rica-special-estate',origin:'costa rica',
  direct:['tarrazu region','floral aroma','medium body','baking chocolate','citrus rind'],notes:['baking chocolate','citrus rind']}),
 264:Object.freeze({name:'Sumatra',url:'https://quartermaine.com/products/sumatra',origin:'sumatra',
  direct:['earthy spicy notes','sometimes described','dark chocolate or tobacco'],notes:['earthy','spicy']})
});
export function quartermaineSelected(html,number){
 const expected=quartermaineCases[number];if(!expected)throw Error('case_not_in_r187');
 const scoped=productMarkup(String(html||'')),headings=selectedProductHeadings(scoped);
 const rawH1Count=[...scoped.matchAll(/<h1\b/giu)].length;
 const body=fold(removeElements(scoped,['script','style','noscript','template','nav','aside','footer','header','select'])
   .replace(/<[^>]{0,3000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' '));
 return {headings,rawH1Count,
  identity:rawH1Count===headings.length&&headings.length===1&&fold(headings[0])===fold(expected.name),
  direct:expected.direct.every(x=>body.includes(fold(x))),
  matched:expected.direct.filter(x=>body.includes(fold(x))),
  unreviewedH1:rawH1Count!==headings.length};
}
if(process.env.DIC_ISSUE33_R187_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 const errors=[],check=(ok,msg)=>{if(!ok)errors.push(msg);};
 let summary={},evidence;
 try{evidence=readFileSync(join(dir,'focused-current-evidence.json'));summary=JSON.parse(evidence.toString('utf8'));}
 catch(e){errors.push('missing_current_evidence:'+e.message);}
 check(JSON.stringify(summary.case_numbers)==='[262,263,264]'&&summary.records?.length===3,'exact_three_original_cases');
 check(summary.source_sha===process.env.GITHUB_SHA,'checked_out_exact_commit');
 check(summary.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_source_register');
 check(summary.original_corpus_modified===false&&summary.manual_certified===0&&summary.production_operations===0,'no_frozen_or_provider_mutations');
 const cases=[];
 for(const [numberString,expected] of Object.entries(quartermaineCases)){
  const number=Number(numberString),r=(summary.records||[]).find(x=>x.number===number)||{};
  let html;
  try{html=readFileSync(join(dir,'case-'+number+'.html'));}
  catch(e){errors.push('missing_raw_'+number+':'+e.message);}
  const selected=quartermaineSelected(html?.toString('utf8')||'',number);
  const parsed=html?extractPublicCoffeeFacts(html.toString('utf8'),{source_url:expected.url}):{};
  const f=r.current_fields||{};
  check(r.official_url===expected.url&&r.status==='FETCHED'&&r.parser_ok===true,'guarded_selected_'+number);
  check(!!html&&r.html_sha256===sha(html)&&r.html_bytes===html.length,'raw_sha_bytes_'+number);
  check(selected.identity&&r.selected_heading_identity_verified===true,'exact_product_identity_'+number);
  check(selected.direct,'selected_primary_literal_words_'+number);
  check(fold(f.name)===fold(expected.name)&&fold(f.roaster).includes('quartermaine'),'own_name_roaster_'+number);
  check(fold(f.origin).includes(expected.origin),'origin_supported_'+number);
  for(const note of expected.notes)check(fold(f.tasting_notes).includes(fold(note)),'selected_note_'+number+'_'+note);
  if(expected.variety)check(fold(f.variety).includes(expected.variety),'selected_typica_'+number);
  if(number===263){
   const own=(parsed.source_facts||[]).filter(x=>x.field==='sensory_context'&&
    x.label==='Selected current product intrinsic aroma (review only)'&&x.source_url===expected.url);
   check(own.length===1&&own[0].value==='floral aroma','selected_floral_aroma_source_review');
   check(!fold(f.tasting_notes).includes('floral'),'canonical_notes_not_overwritten');
  }
  check(!f.process&&!f.producer&&!f.decaffeination_method,'no_unpublished_process_producer_decaf_'+number);
  check(!f.roast_level,'body_or_signature_is_not_labeled_roast_tier_'+number);
  check(!r.seo_fallback_fields?.some(x=>['name','origin','tasting_notes','process','roast_level','producer','variety'].includes(x)),
   'no_metadata_fallback_for_direct_selected_facts_'+number);
  check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'explicit_add_and_review_'+number);
  cases.push({number,selected,fields:f,conflicts:r.conflicts||[],seo:r.seo_fallback_fields||[],
   raw_bytes:html?.length||0,raw_sha256:html?sha(html):null,
   source_notes:(parsed.source_facts||[]).filter(x=>['tasting_notes','sensory_context'].includes(x.field)).slice(0,12)});
 }
 const result={source_sha:summary.source_sha||null,cases,errors,passed:errors.length===0,
  evidence_sha256:evidence?sha(evidence):null,original603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r187-quartermaine-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[Issue33 R187 #262-264] '+JSON.stringify(result).slice(0,26000));
 if(errors.length)throw Error('R187 selected official source/parser acceptance: '+errors.join(', '));
}
