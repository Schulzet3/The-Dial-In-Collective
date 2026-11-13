#!/usr/bin/env node
// Original603 #176 exact purchasable source; does NOT certify the 603-case corpus.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/&amp;|&/giu,' and ').replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen176=Object.freeze({number:176,name:'Mexico Finca Santa Cruz Geisha',
 url:'https://kingspeakcoffee.com/products/mexico-nayarit-anaerobic-process',
 notes:['Sweet berries','Honey','Fig']});
export function selected176Source(html){
 const own=productMarkup(String(html||''));
 const headings=selectedProductHeadings(own);
 const stripped=removeElements(own,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,3000}>/gu,' ');
 const visible=norm(stripped),has=x=>visible.includes(norm(x));
 return {headings,exactSelectedTitle:headings.length===1&&norm(headings[0])===norm(chosen176.name),
  direct:{chiapas:has('Single Origin: Chiapas Region'),
   grower:has('Producer: José Argüello'),
   selected_tastes:has('Tasting Notes: Sweet berries, Honey & Fig'),
   own_farm:has('producer José Argüello of Finca Santa Cruz in the Chiapas region of Mexico'),
   own_fermentation:has('ferment in cherry for up to 200 hours before being washed and dried on patios'),
   exact_flavors:chosen176.notes.map(has)},
  html_sha256:sha(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R155_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,bytes,e;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'))}catch{}
 try{raw=readFileSync(join(dir,'case-176.html'))}catch{}
 const rec=e?.records?.find(x=>x.number===176)||{},f=rec.current_fields||{},source=selected176Source(raw?.toString('utf8')||'');
 const failures=[],check=(ok,id)=>{if(!ok)failures.push(id)};
 check(JSON.stringify(e?.case_numbers)==='[176]'&&e?.records?.length===1,'single_original176');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_ci_source');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603');
 check(e?.original_corpus_modified===false&&e?.manual_certified===0&&e?.production_operations===0,'bounded_no_production');
 check(rec.official_url===chosen176.url&&String(rec.final_url||'').replace(/\/+$/u,'')===chosen176.url,'exact_selected_official_url');
 check(rec.status==='FETCHED'&&rec.parser_ok===true,'guarded_https_real_parser');
 check(!!raw&&sha(raw)===rec.html_sha256&&raw.length===rec.html_bytes,'raw_html_byte_hash');
 check(source.exactSelectedTitle&&rec.selected_heading_identity_verified===true,'exact_current_selected_h1');
 check(Object.values(source.direct).every(x=>Array.isArray(x)?x.every(Boolean):x),'direct_selected_product_facts');
 check(norm(f.name)===norm(chosen176.name),'parsed_current_name');
 check(norm(f.roaster).includes('kings peak'),'parsed_roaster');
 check(norm(f.origin).includes('chiapas')&&norm(f.origin).includes('mexico'),'parsed_selected_chiapas');
 check(norm(f.producer).includes(norm('José Argüello')),'parsed_selected_producer');
 check(norm(f.variety).includes('geisha'),'parsed_selected_variety');
 check(norm(f.process)==='washed','selected_washed_not_assumed_anaerobic');
 check(chosen176.notes.every(x=>norm(f.tasting_notes).includes(norm(x))),'complete_current_literal_tasting_notes');
 check(!f.roast_level&&!f.decaffeination_method&&!f.elevation_m&&!f.release_label,'no_unpublished_fields');
 check((rec.conflicts||[]).length===0&&(!rec.seo_fallback_fields||rec.seo_fallback_fields.length===0),'no_conflict_or_seo_fill');
 check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_source_review');
 const result={case_number:176,source_sha:e?.source_sha||null,passed:failures.length===0,failures,
  direct_current:source,parser_fields:f,raw_html_sha256:raw?sha(raw):null,
  focused_evidence_sha256:bytes?sha(bytes):null,html_bytes:raw?.length||0,
  caution:'Historical product URL slug says Nayarit/anaerobic; current selected H1/body say Chiapas Finca Santa Cruz Geisha. No stale URL/SEO inheritance. Washed after 200h in-cherry fermentation is not proof of anaerobic classification.',
  all603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r155-176-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R155 #176 STRICT OFFICIAL AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
