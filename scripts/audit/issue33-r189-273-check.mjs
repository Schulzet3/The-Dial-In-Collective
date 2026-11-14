#!/usr/bin/env node
// Issue #33 R189: original603 #273 exact selected public Quills page, NOT all603.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {productCoffeeProse} from '../../src/server/coffee-product-prose.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.'),errors=[];
const check=(ok,reason)=>{if(!ok)errors.push(reason);};
let summary={},html=Buffer.from('');
try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch(e){errors.push('missing_evidence:'+e.message);}
try{html=readFileSync(join(dir,'case-273.html'));}catch(e){errors.push('missing_html:'+e.message);}
const official='https://quillscoffee.com/products/guatemala-quetzal',name='Guatemala | Quetzal';
const r=(summary.records||[]).find(x=>x.number===273)||{};
const actual=extractPublicCoffeeFacts(html.toString('utf8'),{source_url:official});
const markup=productMarkup(html.toString('utf8')),heads=selectedProductHeadings(markup);
const clean=v=>String(v||'').replace(/<[^<>]{0,1200}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ').replace(/\s+/gu,' ').trim();
const prose=productCoffeeProse(markup,clean).filter(x=>!x.educational).map(x=>x.text).join(' ');
const f=actual.fields||{},notes=String(f.tasting_notes||'').toLowerCase();
check(JSON.stringify(summary.case_numbers)==='[273]'&&summary.records?.length===1,'single_original_273');
check(summary.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
check(summary.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_sha256');
check(summary.manual_certified===0&&summary.original_corpus_modified===false&&summary.production_operations===0,'no_corpus_or_production_changes');
check(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===official&&r.final_url===official,'guarded_exact_public_selected_url');
check(html.length>1000&&r.html_bytes===html.length&&r.html_sha256===sha(html),'real_raw_html_digest');
check(heads.length===1&&heads[0]===name&&r.selected_heading_identity_verified===true,'actual_selected_H1');
check(actual.ok===true&&f.name===name,'actual_parser_selected_identity');
check(/(?:we(?:'|’)?re\s+tasting)\s+molasses\s*,\s*pecan\s*,?\s*&\s*red grape/i.test(prose),'own_labeled_tasting_panel');
for(const n of ['molasses','pecan','red grape'])check(notes.includes(n),'selected_literal_note_'+n.replace(/\s/g,'_'));
check(!notes.includes('toffee'),'generic_guatemala_toffee_not_selected_note');
check(/Quetzal.*Program/i.test(prose)&&/toffee sweetness/i.test(prose),'general_program_and_guatemala_context_visible');
check(!f.producer,'generic_buying_program_not_current_lot_farmer');
check(!f.release_label,'harvest_months_not_specific_release');
check(!f.roast_level&&!f.decaffeination_method,'unpublished_roast_and_decaf_blank');
check(String(f.origin||'').includes('Guatemala')&&/washed/i.test(String(f.process||'')),'independent_origin_process');
check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'Add_Coffee_and_review_rendered');
const proof={source_sha:summary.source_sha,case_number:273,official_url:official,raw_html_sha256:html.length?sha(html):null,raw_html_bytes:html.length,selected_headings:heads,fields:f,review_facts:(actual.source_facts||[]).filter(x=>/toffee|Quetzal Program/i.test(String(x.value||''))).slice(0,8),errors,passed:errors.length===0,full_603_certified:false};
writeFileSync(join(dir,'r189-273-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
console.log('[Issue33 R189 #273 current selected] '+JSON.stringify(proof).slice(0,13000));
if(errors.length)throw Error('selected proof FAIL '+errors.join(','));
