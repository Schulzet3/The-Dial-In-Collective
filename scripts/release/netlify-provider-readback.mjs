// Pure fail-closed provider readback. Does not call Netlify or publish anything.
const SHA=/^[a-f0-9]{40}$/;
const SITE='153277f2-e19e-4862-b9a6-f2e18ccde271';
const ORIGIN='https://app.dialincollective.com';
export function assertNetlifyPublishedSource({deploy,project,expectedReleaseSha,expectedDeployId}={}){
 if(!SHA.test(expectedReleaseSha||'')||!deploy||!project)
  throw Error('Missing exact release SHA or provider readback');
 if(deploy.site_id!==SITE||project.id!==SITE)
  throw Error('Wrong Netlify site');
 if(deploy.state!=='ready'||deploy.branch!=='release/production'||
  deploy.context!=='production'||deploy.commit_ref!==expectedReleaseSha)
  throw Error('Netlify deployment is not READY for exact approved release SHA');
 if(!deploy.id||deploy.id!==expectedDeployId||
  project._enrichedFields?.currentDeploy?.currentDeploy?.id!==deploy.id||
  project._enrichedFields?.currentDeploy?.currentDeploy?.state!=='ready'||
  project._enrichedFields?.currentDeploy?.state!=='current')
  throw Error('Netlify deployment is not current or receipt mismatch');
 if(deploy.ssl_url!==ORIGIN||project._enrichedFields?.urls?.primarySiteUrl!==ORIGIN)
  throw Error('Unexpected production hostname');
 return {status:'PROVIDER_READY_CURRENT_EXACT_SHA',release_sha:expectedReleaseSha,
  deploy_id:deploy.id,site_id:SITE,production_origin:ORIGIN};
}
