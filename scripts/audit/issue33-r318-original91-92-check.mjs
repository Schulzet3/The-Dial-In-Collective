#!/usr/bin/env node
// Issue33 R318: two exact selected original URLs; source and parser readback, not 603-wide certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {selectedSellerNativeRoastTag} from './issue33-r318-selected-shopify-tag.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r318', errors=[];
const cases=[{number:91,name:'Fireside Favorite',url:'https://darkcanyon-coffee.com/collections/best-sellers/products/fireside-favorite',tokens:['graham cracker','cinnamon','vanilla','hazelnut']},
 {number:92,name:'Highlander Grogg',url:'https://darkcanyon-coffee.com/collections/best-sellers/products/highlander-grogg',tokens:['butterscotch','french vanilla','irish']}];
const must=(v,code)=>{if(!v)errors.push(code)};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){errors.push('missing_report_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[91,92]'&&report?.records?.length===2,'two_original_cases');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'original_and_production_untouched');
must(report?.source_sha===process.env.DIC_R318_EVENT_SHA,'exact_event_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R318_CHECKOUT_SHA,'exact_checkout_sha');
must(requiredFocusedSourceFailures([91,92],report?.records||[]).length===0,'required_original_selected_acceptance');
const readings=[];
for(const c of cases){
 const r=report?.records?.find(x=>x.number===c.number)||{},f=r.current_fields||{};
 must(r.official_url===c.url&&!r.alternate_url_attempted,'exact_original_url_'+c.number);
 let bytes;try{bytes=readFileSync(join(dir,'case-'+c.number+'.html'))}catch{errors.push('missing_raw_'+c.number)}
 const html=bytes?.toString('utf8')||'',selected=productMarkup(html),heads=selectedProductHeadings(selected);
 const body=selected.replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
  .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp|#39);/gi,' ').replace(/\s+/g,' ').toLowerCase();
 must(r.status==='FETCHED'&&r.parser_ok===true,'guarded_fetch_parse_'+c.number);
 must(bytes?.length>0&&r.html_bytes===bytes.length&&r.html_sha256===sha(bytes),'raw_source_digest_'+c.number);
 must(r.archived_coffee===c.name&&f.name===c.name&&heads.some(h=>identicalCurrentSelectedTitle(c.name,h,f.name)),'exact_selected_heading_'+c.number);
 must(r.selected_heading_identity_verified&&r.add_coffee_ui_rendered&&r.source_review_rendered,'add_coffee_source_review_'+c.number);
 for(const token of c.tokens)must(body.includes(token),'own_selected_literal_'+c.number+'_'+token.replace(/ /g,'_'));
 must(!f.origin&&!f.process&&!f.producer&&!f.variety&&!f.elevation_m&&!f.release_label,'unpublished_origin_process_farm_lot_'+c.number);
 must(!f.decaffeination_method,'available_decaf_variant_not_method_'+c.number);
 must(!/blueberry|peach|cranberry|mango/i.test(String(f.tasting_notes||'')),'sibling_flavors_excluded_'+c.number);
 must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_seo_tasting_'+c.number);
 // The selected Shopify native Product ID/title/vendor/handle must join to the
 // merchant's OWN same-ID _ALConfig.product roast tag (not sibling/menu/gift).
 // The visible Light/Medium/Dark ruler alone is ambiguous, but the native
 // seller's product-owned literal "Medium Roast" is an explicit source claim.
 const ownedTag=selectedSellerNativeRoastTag(html,{
  name:c.name,roaster:'Dark Canyon Coffee Company',source_url:c.url});
 must(ownedTag?.value==='Medium'&&f.roast_level==='Medium',
  'same_selected_shopify_medium_roast_source_contract_'+c.number);
 const replay=extractPublicCoffeeFacts(html,{source_url:r.final_url||c.url});
 must(replay?.ok===true&&replay.fields?.name===f.name,'actual_source_replay_'+c.number);
 readings.push({number:c.number,url:c.url,final_url:r.final_url,bytes:r.html_bytes,sha256:r.html_sha256,
  headings:heads,fields:f,selected_shopify_product_roast_evidence:ownedTag,
  conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]});
}
const verdict={passed:errors.length===0,errors,event_sha:process.env.DIC_R318_EVENT_SHA,
 checkout_sha:process.env.DIC_R318_CHECKOUT_SHA,manual_certified:0,production_operations:0,records:readings};
writeFileSync(join(dir,'r318-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R318 AFTERPROOF] '+JSON.stringify(verdict));
if(errors.length)process.exitCode=1;
