import test from 'node:test';
import assert from 'node:assert/strict';
import {coffeeUrlPreviewMarkup,coffeeUrlCompactPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const cached={ok:true,source:'approved_catalog',source_url:'https://example.com/coffee',fields:{name:'Sample Coffee'}};
test('cached coffee refresh copy matches member and administrator quotas in both UI modes',()=>{
 for(const markup of [coffeeUrlCompactPreviewMarkup(cached),coffeeUrlPreviewMarkup(cached)]){
  assert.match(markup,/Check Current Roaster Page/);
  assert.match(markup,/15-second account cooldown and 12 lookups per 24 hours/);
  assert.match(markup,/Admitted, email-verified Admins: no account cooldown or daily limit/);
  assert.match(markup,/IP safeguards still apply/);
  assert.doesNotMatch(markup,/Wait 30 seconds|usual URL lookup limit applies/i);
 }
});
test('fresh noncatalog preview has no cached refresh helper or stale quota copy',()=>{
 for(const markup of [coffeeUrlCompactPreviewMarkup({...cached,source:'public_url'}),coffeeUrlPreviewMarkup({...cached,source:'public_url'})]){
  assert.doesNotMatch(markup,/Check Current Roaster Page|15-second account cooldown|Wait 30 seconds/);
 }
});
test('ordinary member server cooldown feedback remains the 15-second message',()=>{
 const html=coffeeUrlPreviewMarkup({ok:false,reason:'preview_cooldown'});
 assert.match(html,/Please wait 15 seconds between coffee URL lookups/);
});
