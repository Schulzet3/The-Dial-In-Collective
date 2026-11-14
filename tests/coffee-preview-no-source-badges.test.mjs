import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 coffeeUrlCompactPreviewMarkup,coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot
} from '../site/cloud/coffee-url-autofill.js';
import {matchReviewMarkup,nextCoffeeAction} from '../site/cloud/coffee-match-ui.js';

const url='https://example.org/products/costa-rica-las-lajas';
const facts={name:'Las Lajas - Finca San Isidro',roaster:'Proud Mary Coffee USA',
 origin:'Costa Rica',process:'Natural',variety:'Caturra & Catuai'};
const sourceLabel=/(?:Unverified Page|Official Source Preview|Approved Catalog|Details Found On Official Roaster Page|source-label|official source verified|verified roaster)/i;
const makeResult=(source,classification='needs_confirmation')=>({
 ok:true,source,source_url:url,fields:facts,match:{classification},
 roaster_recipe:{ratio:2.5},source_facts:[{label:'Process',value:'Natural',source_type:'html',field:'process',source_url:url}]
});
for(const source of ['unverified_public_page','official_roaster_product_metadata','approved_catalog']){
 test('New Coffee '+source+' shows neutral autofill results and no source-status badge',()=>{
  for(const mode of ['compact','diagnostic']){
   const html=mode==='compact'?coffeeUrlCompactPreviewMarkup(makeResult(source)):coffeeUrlPreviewMarkup(makeResult(source));
   assert.match(html,/Autofill Results/);
   assert.doesNotMatch(html,sourceLabel);
   assert.doesNotMatch(html,/class="coffee-source-label"|source status/i);
   assert.match(html,/roaster page|product page|saved coffee/i);
   assert.match(html,/Roaster's published espresso reference/);
   assert.match(html,/A similar coffee already exists/);
   assert.doesNotMatch(html,/<script[\s>]/i);
   if(mode==='compact'){
    assert.doesNotMatch(html,/Published source information|Download Source Review/);
    assert.doesNotMatch(html,/<dl class="coffee-url-fields">/);
   }else{
    assert.match(html,/<dl class="coffee-url-fields">/);
   }
  }
 });
}
test('metadata uncertainty stays explicit without a verified/unverified badge',()=>{
 const html=coffeeUrlCompactPreviewMarkup({...makeResult('unverified_public_page','new'),
  seo_fallback_fields:['origin'],fields:{...facts,origin:'Kenya'},
  conflicts:['process'],conflict_options:[{field:'process',values:['Natural','Washed']}]
 });
 assert.match(html,/Check metadata-only suggestions/);
 assert.match(html,/not confirmed product facts/);
 assert.doesNotMatch(html,sourceLabel);
});
test('public review evidence and catalog reuse classification stay intact internally',()=>{
 const source=makeResult('unverified_public_page');
 const snapshot=coffeeSourceReviewSnapshot(source,{checkedAt:'2026-11-14T00:00:00Z'});
 assert.equal(snapshot.verification,'unverified_public_source_suggestions');
 assert.equal(snapshot.published_source_information[0].value,'Natural');
 const exact={classification:'exact_verified',exact_id:'77777777-7777-4777-8777-777777777777'};
 assert.equal(nextCoffeeAction(exact),'reuse_verified');
 assert.equal(nextCoffeeAction({classification:'needs_confirmation',candidates:[{id:'x'}]}),'ask_user');
});
test('catalog duplicate decision UI uses neutral copy but retains explicit release choice',()=>{
 const html=matchReviewMarkup({candidates:[{
   id:'11111111-1111-4111-8111-111111111111',name:'Las Lajas',roaster:'Proud Mary',release_label:'2026'
 }]});
 assert.match(html,/may already be in the catalog/);
 assert.match(html,/Use Existing|Different Coffee/);
 assert.match(html,/Different harvests or releases/);
 assert.match(html,/stays private while its identity is reviewed/);
 assert.doesNotMatch(html,/(?:verified coffee|official roaster|unverified page)/i);
});
test('visible New Coffee and correction notices no longer claim roaster source verification',()=>{
 const main=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../site/visual.css',import.meta.url),'utf8');
 const preview=readFileSync(new URL('../site/cloud/coffee-url-autofill.js',import.meta.url),'utf8');
 assert.match(main,/coffeeUrlCompactPreviewMarkup\(found\)/);
 assert.doesNotMatch(main,/Official Source URL \(Optional\)|Official source verified|Official roaster evidence verified|existing verified coffee|original verified coffee|That verified coffee/);
 assert.doesNotMatch(preview,/Unverified Page|Official Source Preview|Approved Catalog|Details Found On Official Roaster Page/);
 assert.doesNotMatch(css,/\.coffee-source-label\s*\{/);
});
