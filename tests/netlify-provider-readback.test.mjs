import test from 'node:test';
import assert from 'node:assert/strict';
import {assertNetlifyPublishedSource as verify} from '../scripts/release/netlify-provider-readback.mjs';
const SHA='a'.repeat(40),ID='deploy-1',SITE='153277f2-e19e-4862-b9a6-f2e18ccde271';
const deploy={id:ID,site_id:SITE,state:'ready',branch:'release/production',context:'production',
 commit_ref:SHA,ssl_url:'https://app.dialincollective.com'};
const project={id:SITE,_enrichedFields:{currentDeploy:{state:'current',currentDeploy:{id:ID,state:'ready'}},
 urls:{primarySiteUrl:'https://app.dialincollective.com'}}};
const check=(d=deploy,p=project)=>verify({deploy:d,project:p,expectedReleaseSha:SHA,expectedDeployId:ID});
test('Netlify provider proof requires exact current READY production source',()=>{
 assert.equal(check().status,'PROVIDER_READY_CURRENT_EXACT_SHA');
 for(const changed of [{state:'building'},{commit_ref:'b'.repeat(40)},{branch:'development/backend-foundation'},
  {context:'deploy-preview'},{site_id:'wrong'},{id:'wrong'},{ssl_url:'https://wrong.example'}])
  assert.throws(()=>check({...deploy,...changed}));
 for(const changed of [{id:'wrong'},{_enrichedFields:{...project._enrichedFields,currentDeploy:{state:'current',currentDeploy:{id:'old',state:'ready'}}}},
  {_enrichedFields:{...project._enrichedFields,currentDeploy:{state:'stale',currentDeploy:{id:ID,state:'ready'}}}}])
  assert.throws(()=>check(deploy,{...project,...changed}));
 assert.throws(()=>verify({deploy,project,expectedReleaseSha:'bad',expectedDeployId:ID}));
});
