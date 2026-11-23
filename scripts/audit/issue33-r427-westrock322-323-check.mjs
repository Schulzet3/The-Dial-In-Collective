#!/usr/bin/env node
// #33 R427: original frozen603 Westrock #322/#323, exact current source only.
// This is NOT a 603-row certification, not a released or member-data operation.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';

const hash=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
  .replace(/\s+/gu,' ').trim();
const decode=x=>String(x??'').replace(/&(?:amp|#0*38|#x0*26);/giu,'&')
  .replace(/&(?:nbsp|#0*160|#x0*a0);/giu,' ');
const selectedText=html=>decode(productMarkup(html).replace(/<[^>]*>/gu,' '))
  .replace(/\s+/gu,' ').trim();

/** Identity-bound selected Shopify ProductJson only; unrelated product cards never count. */
export function selectedWestrockProductJsonRoast(html,{name='',roaster='',source_url=''}={}){
  if(typeof html!=='string'||html.length>2_000_000)return null;
  let handle;
  try{
    const u=new URL(source_url);
    if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
    handle=u.pathname.match(/^\/products\/([a-z0-9][a-z0-9-]{1,120})\/?$/iu)?.[1];
  }catch{return null}
  if(!handle||!name||!roaster)return null;
  const matched=[];
  for(const m of html.matchAll(/<script\b([^>]{0,600})>([\s\S]{0,200000}?)<\/script>/giu)){
    const attr=m[1],sid=attr.match(/\bid\s*=\s*["']ProductJson-(\d+)["']/iu);
    if(!sid||!/\btype\s*=\s*["']application\/json["']/iu.test(attr))continue;
    let product;try{product=JSON.parse(m[2].trim())}catch{return null}
    if(!product||!Number.isSafeInteger(product.id)||String(product.id)!==sid[1]||
       norm(product.title)!==norm(name)||String(product.handle||'').toLowerCase()!==handle.toLowerCase()||
       norm(product.vendor)!==norm(roaster))continue;
    matched.push(product);
  }
  if(matched.length!==1||!Array.isArray(matched[0].tags))return null;
  const product=matched[0],roasts=product.tags.filter(x=>typeof x==='string'&&
    /^(?:light|medium|dark|medium-light|medium-dark) roast$/iu.test(x.trim()));
  if(roasts.length!==1||roasts[0].trim().toLowerCase()!=='medium roast')return null;
  return {value:'Medium',source:'exact_selected_shopify_ProductJson_id_title_handle_vendor_tags',
    product_id:product.id};
}

const products={
  322:{name:'Raiz Campo Sur Whole Bean Coffee Pack',
    url:'https://shop.westrockcoffee.com/products/raiz-campo-sur-whole-bean-coffee'},
  323:{name:'Raiz Palmera Whole Bean Coffee Pack',
    url:'https://shop.westrockcoffee.com/products/raiz-palmera-whole-bean-coffee'}
};
// A complete chosen seller statement is required; SEO, the catalog and
// neighboring product prose do not qualify. No interpretation from recycled SKU.
export function selectedWestrockFailures(number,selected,fields={}){
  const p=products[number];if(!p)return ['unknown_original603_case'];
  const s=norm(selected), f=norm(fields.tasting_notes),errors=[];
  if(norm(fields.name)!==norm(p.name)||!s.includes(norm(p.name)))
    errors.push('selected_product_identity_not_proven');
  if(number===322){
    if(!/campo sur is inspired by the brazilian countryside/iu.test(s)||
       !/warm cup of rich coffee/iu.test(s))
      errors.push('selected_campo_sur_marketing_context_not_confirmed');
    if(/\bbrazil\b|\bbrazilian\b/iu.test(String(fields.origin||'')))
      errors.push('brazilian_inspiration_falsely_mapped_as_bean_origin');
    if(fields.producer||fields.process||fields.variety||fields.elevation_m||
       fields.decaffeination_method||fields.release_label)
      errors.push('unpublished_campo_sur_selected_coffee_spec_invented');
    if(f&&/\b(?:brazil|chocolate|caramel|nutty|fruity|almond|citrus|rich coffee)\b/iu.test(f))
      errors.push('foreign_flavor_or_adjective_as_campo_sur_tasting_notes');
    if(fields.roast_level!=='Medium')
      errors.push('selected_campo_sur_exact_product_tag_roast_omitted_or_wrong');
    // Verify the selected Shopify ProductJson id/title/handle/vendor/Medium Roast
    // identity separately against raw HTML; never inherit frozen medium alone.
  }else{
    if(!/100% central\s*\/\s*south american arabica/iu.test(s)||
       !/blended for a medium roast and body/iu.test(s)||
       !/sweet caramel flavor/iu.test(s)||
       !/nutty lingering finish/iu.test(s))
      errors.push('selected_palmera_region_roast_or_sensory_description_missing');
    if(fields.roast_level!=='Medium')
      errors.push('direct_selected_medium_roast_omitted_or_wrong');
    if(!/\bcaramel\b/iu.test(f)||!/\bnutty\b/iu.test(f))
      errors.push('direct_selected_caramel_or_nutty_finish_omitted');
    const origin=norm(fields.origin);
    if(!origin.includes('central america')||!origin.includes('south america')||
       /\b(?:brazil|guatemala|colombia|peru|mexico|hawaii)\b/iu.test(origin))
      errors.push('selected_multi_region_origin_lost_or_country_invented');
    if(fields.producer||fields.process||fields.variety||fields.elevation_m||
       fields.decaffeination_method||fields.release_label)
      errors.push('unpublished_palmera_producer_process_lot_or_elevation');
  }
  if(/\b(?:reviewer|customer review|recommended products|another coffee)\b/iu.test(f))
    errors.push('other_product_or_review_as_selected_tasting');
  return errors;
}

if(process.env.DIC_ISSUE33_R427_RUN==='1'){
  const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR,head=process.env.DIC_EXPECTED_SHA;
  if(!dir||!/^[a-f0-9]{40}$/u.test(head||''))throw Error('missing_exact_source_sha_or_dir');
  const report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
  const failures=[],out=[];
  const need=(ok,reason)=>{if(!ok)failures.push(reason)};
  need(report.source_sha===head,'actual_checked_out_source_sha_mismatch');
  need(JSON.stringify(report.case_numbers)==='[322,323]'&&report.records?.length===2,
    'not_exact_original322_323_case_set');
  need(report.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353',
    'immutable_original603_csv_drift');
  need(report.original_corpus_modified===false&&report.manual_certified===0&&
    report.production_operations===0,'frozen_data_or_provider_mutation');
  for(const number of [322,323]){
    const expected=products[number],r=report.records?.find(x=>x.number===number);
    if(!r){failures.push('missing_original_'+number);continue}
    need(r.official_url===expected.url&&r.final_url?.replace(/\/$/u,'')===expected.url,
      'changed_official_selected_product_'+number);
    need(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true&&
      r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,
      'required_selected_html_parser_and_unsaved_ui_'+number);
    let html;try{html=readFileSync(join(dir,'case-'+number+'.html'),'utf8')}
    catch{failures.push('missing_first_party_raw_html_'+number);continue}
    const digest=hash(html);
    need(r.html_sha256===digest&&/^[a-f0-9]{64}$/u.test(digest),
      'html_hash_or_source_integrity_mismatch_'+number);
    const parser=extractPublicCoffeeFacts(html,{source_url:r.final_url||expected.url});
    need(parser?.ok===true&&norm(parser.fields?.name)===norm(expected.name)&&
      norm(r.current_fields?.name)===norm(expected.name),
      'selected_current_parser_name_mismatch_'+number);
    for(const key of ['name','roaster','origin','producer','variety','process',
      'tasting_notes','roast_level','elevation_m','decaffeination_method','release_label'])
      need(String(parser?.fields?.[key]??'')===String(r.current_fields?.[key]??''),
        'raw_html_reparse_field_parity_'+number+'_'+key);
    const exactRoast=selectedWestrockProductJsonRoast(html,{
      name:r.current_fields?.name||'',roaster:r.current_fields?.roaster||'',
      source_url:r.final_url||expected.url});
    need(exactRoast?.value==='Medium'&&r.current_fields?.roast_level==='Medium',
      'missing_matching_selected_shopify_productjson_medium_roast_'+number);
    for(const err of selectedWestrockFailures(number,selectedText(html),r.current_fields||{}))
      failures.push(number+'_'+err);
    need(!parser?.roaster_recipe?.dose_g&&!parser?.roaster_recipe?.yield_g,
      'unpublished_espresso_recipe_'+number);
    out.push({number,url:expected.url,raw_html_sha256:digest,
      raw_html_bytes:Buffer.byteLength(html),selected_h1:r.selected_h1,
      fields:r.current_fields,conflicts:r.conflicts||[],
      add_coffee_unsaved:r.add_coffee_ui_rendered,source_review:r.source_review_rendered,
      // Audit uncertainty, not an asserted seller-backed fixed roast:
      selected_medium_roast_product_json:exactRoast});
  }
  const result={source_sha:head,cases:[322,323],manual_certified:0,provider_writes:0,
    failures,records:out};
  writeFileSync(join(dir,'r427-selected-afterproof.json'),JSON.stringify(result,null,2)+'\n');
  console.log('[DIC33 R427 EXACT WESTROCK SOURCE AFTERPROOF] '+JSON.stringify(result));
  if(failures.length)process.exitCode=1;
}
