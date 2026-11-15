#!/usr/bin/env node
// R221 public current selected original603 case #341 afterproof; never full603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';

const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
mkdirSync(dir,{recursive:true});
const errors=[],url='https://sodality.coffee/products/qunqana-honey';
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}
catch{errors.push('missing_focused_source_summary');}
let raw=Buffer.alloc(0);try{raw=readFileSync(join(dir,'case-341.html'));}
catch{errors.push('missing_current_official_html');}
const r=summary.records?.find(x=>x.number===341)||{};
const digest=createHash('sha256').update(raw).digest('hex');
const selected=productMarkup(raw.toString('utf8'));
const heads=selectedProductHeadings(selected);
const parsed=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:r.final_url||url}):{};
const f=parsed.fields||{},fact=parsed.source_facts||[];
const source=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:nbsp|#0*160|#x0*a0);/giu,' ').replace(/&amp;/giu,'&').replace(/\s+/gu,' ');
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(checkout!==process.env.DIC_R221_EXACT_CHECKOUT_SHA)errors.push('wrong_checkout_sha');
if(JSON.stringify(summary.case_numbers)!=='[341]'||summary.records?.length!==1||summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 errors.push('original603_identity_or_register_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)
 errors.push('unearned_frozen_or_provider_claim');
if(r.status!=='FETCHED'||r.official_url!==url||r.final_url!==url||!r.parser_ok)
 errors.push('official_url_or_parser_unavailable');
if(raw.length<1000||raw.length!==r.html_bytes||digest!==r.html_sha256)
 errors.push('selected_source_sha256_bytes_mismatch');
if(!r.selected_heading_identity_verified||!heads.includes('Qunqana Honey')||f.name!=='Qunqana Honey')
 errors.push('wrong_selected_current_product');
if(!r.add_coffee_ui_rendered||!r.source_review_rendered)errors.push('Add_Coffee_or_Source_Review_missing');
for(const x of ['Margarita','Lemon','Lime','White Wine','Cooked Fruit','Toffee']){
 if(!String(f.tasting_notes||'').toLowerCase().includes(x.toLowerCase()))errors.push('own_note_missing:'+x);
}
if(f.process!=='Honey')errors.push('honey_green_process_missing');
if(!/small.holder/i.test(String(f.producer||''))||/Dukamo|Daye Bensa/i.test(String(f.producer||'')))
 errors.push('producer_role_stolen_from_station_owners');
if(!/Sidama|Bensa|Ethiopia/i.test(String(f.origin||''))||!/1900/.test(String(f.elevation_m||''))||!/Heirloom/i.test(String(f.variety||'')))
 errors.push('own_geography_variety_altitude_missing');
if(f.espresso_recipe||f.roast_level||f.decaffeination_method)
 errors.push('unsourced_espresso_roast_or_decaf');
if((parsed.conflicts||[]).includes('name')||(parsed.conflicts||[]).includes('process'))
 errors.push('false_selected_identity_or_process_conflict');
if(!/Producer\s*:\s*Multiple local small-holder farmers/i.test(source)||!/Process\s*:\s*Honey/i.test(source))
 errors.push('current_official_direct_spec_changed');
if(!fact.some(x=>x.field==='process'&&x.source_type==='html'&&/Honey/i.test(String(x.value||''))))
 errors.push('missing_direct_html_process_provenance');
const report={passed:!errors.length,source_sha:checkout,raw_sha256:digest,raw_bytes:raw.length,official_url:url,selected_h1:heads,fields:f,conflicts:parsed.conflicts||[],errors,original603_manually_certified:false,production_operations:0};
writeFileSync(join(dir,'r221-original341-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R221 current original341 afterproof] '+JSON.stringify(report).slice(0,18000));
if(errors.length)throw Error('r221_selected_source_unverified:'+errors.join(','));
