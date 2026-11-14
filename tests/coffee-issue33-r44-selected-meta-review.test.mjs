import test from 'node:test';
import assert from 'node:assert/strict';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const base={ok:true,source:'unverified_public_page',
 source_url:'https://www.rallycoffee.co/products/mexico-chiapas-seasonal-espresso',
 fields:{name:'Mexico Chiapas Seasonal Espresso',roaster:'Rally Coffee Co.',
  origin:'Chiapas, Mexico',tasting_notes:'red apple, panels, brown sugar'},
 source_facts:[],conflicts:[]};
test('R44: only flagged identity-matched metadata fallback is explicitly marked for member review',()=>{
 const html=coffeeUrlPreviewMarkup({...base,seo_fallback_fields:['tasting_notes']});
 assert.match(html,/Check metadata-only suggestions:/);
 assert.match(html,/Tasting Notes/);
 assert.match(html,/last-resort SEO\/metadata suggestions, not confirmed product facts/i);
 assert.match(html,/Fields you already entered will not be overwritten/i);
 assert.match(html,/Add Coffee/);
});
test('R44: direct selected tasting without SEO provenance is never mislabeled as fallback',()=>{
 const html=coffeeUrlPreviewMarkup(base);
 assert.doesNotMatch(html,/Check metadata-only suggestions:/);
 assert.match(html,/red apple, panels, brown sugar/);
});
test('R44: noncanonical flagged field absent from preview cannot manufacture an SEO warning',()=>{
 const html=coffeeUrlPreviewMarkup({...base,seo_fallback_fields:['process']});
 assert.doesNotMatch(html,/Check metadata-only suggestions:/);
 assert.match(html,/Not found on this product page:/);
});
