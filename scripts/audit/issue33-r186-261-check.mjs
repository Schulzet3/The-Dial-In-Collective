#!/usr/bin/env node
// Original603 #261: current exact selected Guji Kercha; never substitute a corpus inventory for semantic proof.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fold=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').replace(/\s+/gu,' ').trim();
export const original261=Object.freeze({number:261,name:'Ethiopia Guji Kercha',url:'https://preludecoffeeroasters.com/products/ethiopia-guji-kercha'});
export function selected261(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 // These merchant H1s introduce editorial sections, not three distinct coffees.
 const products=headings.filter(h=>!/^(?:about the producer|about the process|what you(?:'|’)?ll find in the cup):?$/iu.test(String(h).trim()));
 const body=fold(removeElements(scoped,['script','style','noscript','template','nav','aside','footer','header','select'])
   .replace(/<[^>]{0,3000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' '));
 return {headings,identity:products.length===1&&fold(products[0])===fold(original261.name),
  cup:['strawberries','agave nectar','granny smith apples'].every(x=>body.includes(x)),
  generic_region:body.includes('guji region')&&body.includes('oromo'),
  generic_climate:body.includes('volcanic soil')&&body.includes('cherries'),
  natural_analogy:body.includes('natural ethiopian coffees'),
  mouthfeel:body.includes('buttery mouthfeel')};
}
if(process.env.DIC_ISSUE33_R186_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 const errors=[],check=(v,label)=>{if(!v)errors.push(label);};
 let summary={},record={},evidenceBytes;
 try{evidenceBytes=readFileSync(join(dir,'focused-current-evidence.json'));summary=JSON.parse(evidenceBytes.toString('utf8'));record=(summary.records||[]).find(x=>x.number===261)||{};}
 catch(e){errors.push('missing_current_evidence:'+e.message);}
 let html;
 try{html=readFileSync(join(dir,'case-261.html'));}
 catch(e){errors.push('missing_raw_official_html:'+e.message);}
 const current=selected261(html?.toString('utf8')||'');
 const parsed=html?extractPublicCoffeeFacts(html.toString('utf8'),{source_url:original261.url}):{};
 const f=record.current_fields||{};
 check(JSON.stringify(summary.case_numbers)==='[261]'&&summary.records?.length===1,'exact_original261_only');
 check(summary.source_sha===process.env.GITHUB_SHA,'checked_out_exact_git_sha');
 check(summary.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_frozen_register');
 check(summary.original_corpus_modified===false&&summary.manual_certified===0&&summary.production_operations===0,'no_frozen_or_provider_changes');
 check(record.official_url===original261.url&&record.status==='FETCHED'&&record.parser_ok===true,'actual_guarded_official_selected_parser');
 check(!!html&&record.html_sha256===sha(html)&&record.html_bytes===html.length,'official_raw_bytes_sha256');
 check(current.identity&&record.selected_heading_identity_verified===true,'exact_selected_product_h1');
 check(current.cup&&current.generic_region&&current.generic_climate&&current.natural_analogy&&current.mouthfeel,'direct_selected_cup_and_qualified_section_evidence');
 check(fold(f.name)===fold(original261.name)&&fold(f.roaster).includes('prelude'),'exact_selected_name_roaster');
 check(['strawberr','agave','granny smith apple'].every(x=>fold(f.tasting_notes).includes(x)),'selected_published_sensory_not_truncated');
 check(!f.process,'natural_ethiopean_coffee_analogy_not_selected_lot_process');
 check(!f.producer,'generic_guji_oromo_not_named_producer');
 check(!f.roast_level&&!f.decaffeination_method&&!f.espresso_recipe,'unpublished_roast_decaf_recipe_blank');
 check(!record.seo_fallback_fields?.some(x=>['name','tasting_notes','process','producer','roast_level'].includes(x)),'no_seo_for_selected_claims');
 check(record.add_coffee_ui_rendered===true&&record.source_review_rendered===true,'explicit_add_coffee_source_review');
 const report={case:261,source_sha:summary.source_sha||null,passed:errors.length===0,errors,selected:current,fields:f,
  source_facts:(parsed.source_facts||[]).filter(x=>['tasting_notes','roast_level','process','producer','decaffeination_method'].includes(x.field)).slice(0,36),
  conflicts:record.conflicts||[],seo_fallback_fields:record.seo_fallback_fields||[],
  raw_sha256:html?sha(html):null,raw_bytes:html?.length||0,evidence_sha256:evidenceBytes?sha(evidenceBytes):null,
  individual_certification:errors.length===0,whole603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r186-261-afterproof.json'),JSON.stringify(report,null,2)+'\n');
 console.log('[DIC33 R186 #261] '+JSON.stringify(report).slice(0,19000));
 if(errors.length)throw Error('R186 current selected source/parser failures: '+errors.join(', '));
}
