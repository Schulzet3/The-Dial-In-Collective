#!/usr/bin/env node
// Exact selected Victus product evidence. This is NOT a 603-coffee certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const norm=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
const cleaned=html=>String(html||'')
  .replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|#160);/giu,' ')
  .replace(/&amp;/giu,'&').replace(/\u00a0/gu,' ').replace(/\s+/gu,' ').trim();
const originals={
  397:{name:'Nero - Dark Roast Blend',path:'/products/nero-blend',roast:'Dark',
    note:'deep chocolatey',narrative:'Fuel your mornings with our bold dark roast blend, Nero',
    sensory:'Filled with deep chocolatey notes, this coffee has a heavy body and a sweet lingering finish'},
  398:{name:'Veloce - Light Roast Blend',path:'/products/veloce-blend',roast:'Light',
    note:'sweet chocolatey and fruity',narrative:'Boasting an intensely aromatic experience with sweet chocolatey and fruity notes',
    sensory:'our light roast blend, Veloce, offers a delightful sweetness'},
  399:{name:'Victoria - Medium Roast Blend',path:'/products/victoria-blend',roast:'Medium',
    note:'smooth milk chocolate and fruity',narrative:'Victoria is our popular medium roasted blend',
    sensory:'Full of smooth milk chocolate and fruity notes'}
};
export function selectedVictus(markup,headings,number){
  const c=originals[number];if(!c)throw Error('unknown_original603');
  const sourceWithoutTitle=String(markup||'').replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/giu,' ');
  const t=norm(cleaned(sourceWithoutTitle)),includes=v=>t.includes(norm(v));
  const names=Array.isArray(headings)?headings:[];
  return {uniqueSelected:names.length===1&&norm(names[0])===norm(c.name),
    selectedNarrative:includes(c.narrative),selectedSensory:includes(c.sensory),
    selectedTasting:includes(c.note),selectedRoast:includes(c.roast+' roast blend')||includes(c.roast+' roasted blend')};
}
if(process.env.DIC_ISSUE33_R84_VERIFY==='1'){
  const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
  mkdirSync(dir,{recursive:true});
  const failures=[],check=(ok,label)=>{if(!ok)failures.push(label)};
  let rawReport=null, report=null;
  try{rawReport=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(rawReport.toString('utf8'))}catch{}
  check(JSON.stringify(report?.case_numbers)==='[397,398,399]'&&report?.records?.length===3,'original_three');
  check(report?.source_sha===process.env.GITHUB_SHA,'exact_current_sha');
  check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_immutable');
  check(report?.manual_certified===0&&report?.production_operations===0&&report?.original_corpus_modified===false,'no_scope_overclaim');
  const receipts=[];
  for(const number of [397,398,399]){
    const c=originals[number],r=report?.records?.find(z=>z.number===number)||{};
    let raw=null;try{raw=readFileSync(join(dir,'case-'+number+'.html'))}catch{}
    const selected=productMarkup(raw?.toString('utf8')||'');
    const headings=selectedProductHeadings(selected), facts=selectedVictus(selected,headings,number);
    let u;try{u=new URL(r.final_url)}catch{}
    check(r.archived_coffee===c.name&&r.official_url==='https://victuscoffee.com'+c.path,number+'_original_identity');
    check(u?.protocol==='https:'&&['victuscoffee.com','www.victuscoffee.com'].includes(u.hostname)&&
      u.pathname.replace(/\/$/,'')===c.path&&!u.search&&!u.hash,number+'_canonical_url');
    check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,number+'_actual_parser_and_selected_h1');
    check(raw&&r.html_sha256===sha(raw)&&r.html_bytes===raw.length,number+'_raw_html_sha256');
    for(const [k,v]of Object.entries(facts))check(v,number+'_own_source_'+k);
    const f=r.current_fields||{};
    check(norm(f.name)===norm(c.name),number+'_name');
    check(norm(f.roaster)==='victus coffee',number+'_roaster');
    check(norm(f.roast_level)===norm(c.roast),number+'_own_roast');
    check(norm(f.tasting_notes).includes(norm(c.note)),number+'_own_literal_flavor');
    check(!['origin','process','producer','elevation_m','variety','decaffeination_method']
      .some(k=>f[k]),number+'_do_not_invent_unpublished_fields');
    check(!['nero','veloce','victoria'].filter(n=>n!==c.name.split(' ')[0].toLowerCase())
      .some(n=>norm(f.tasting_notes).includes(n)),number+'_no_other_product_flavor');
    check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,number+'_add_coffee_source_review');
    check(!(r.conflicts||[]).length,number+'_no_field_conflicts');
    receipts.push({number,raw_html_sha256:raw?sha(raw):null,headings,
      facts,fields:f,conflicts:r.conflicts||[],status:r.status,selected_h1_verified:r.selected_heading_identity_verified});
  }
  const verdict={source_sha:report?.source_sha,report_sha256:rawReport?sha(rawReport):null,
    original603_numbers:[397,398,399],receipts,manual_certified:0,
    production_operations:0,passed:failures.length===0,failures};
  writeFileSync(join(dir,'r84-victus-397-399-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
  console.log('[ISSUE33 R84 EXACT SOURCE AFTERPROOF] '+JSON.stringify(verdict));
  if(failures.length)process.exitCode=1;
}
