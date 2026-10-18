import test from 'node:test';
import assert from 'node:assert/strict';
import {communityPage,communityReviewBanner} from '../site/cloud/community.js';
import {createCloudClient} from '../site/cloud/client.js';

const row={
 coffee_name:'Yirgacheffe',roaster:'Orinoco Coffee & Tea',
 style:'Turbo',observed_on:'2026-10-16',
 dose_g:18,yield_g:49.8,time_s:21.1,ratio:2.7667,
 extraction:3,body:3,clarity:5,sweetness:5,astringency:1,
 shot_count:1,contributor_count:1
};

test('Community empty state does not claim pending/private data is shared',()=>{
 const html=communityPage();
 assert.match(html,/Community data is growing/);
 assert.match(html,/Pending coffees stay private|Pending coffees stay private/i);
 assert.doesNotMatch(html,/owner_id|PRIVATE:|member email/);
});

test('Community page renders server-sanitized counts and measurements with progressive disclosure',()=>{
 const html=communityPage({shots:[row],total:1});
 assert.match(html,/Community Shot/);
 assert.match(html,/Yirgacheffe/);
 assert.match(html,/18\.0g/);
 assert.match(html,/49\.8g/);
 assert.match(html,/21\.1s/);
 assert.match(html,/1:2\.77/);
 assert.match(html,/1 qualifying shots · 1 contributors/);
 assert.match(html,/Early Data/);
 assert.match(html,/Ratings & Community Evidence/);
 assert.match(html,/aria-label="Filter Community shots by style"/);
 assert.doesNotMatch(html,/owner_id|contributor_id|shot_id|PRIVATE:/);
 const filtered=communityPage({shots:[row],total:1,style:'Traditional'});
 assert.match(filtered,/No loaded shots match these filters/);
 assert.doesNotMatch(filtered,/<article class="community-card"/);
});

test('Community page safely escapes metadata strings and never outputs source identifiers',()=>{
 const hostile={...row,coffee_name:'<img src=x onerror=alert(1)>',roaster:'A & B'};
 const html=communityPage({shots:[hostile],total:1});
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.match(html,/A &amp; B/);
 assert.doesNotMatch(html,/<img src=x/);
 assert.doesNotMatch(html,/PRIVATE:/);
});

test('Review prompt is actionable, revision-bound, and unobtrusive when empty',()=>{
 assert.equal(communityReviewBanner([]),'');
 const review={shot_id:'abc',revision:7,style:'Turbo',
  coffee_name:'Yirgacheffe',roaster:'Orinoco Coffee & Tea',
  dose_g:18,yield_g:50,time_s:62};
 const html=communityReviewBanner([review]);
 assert.match(html,/Is this extraction time correct/);
 assert.match(html,/62\.0s/);
 assert.match(html,/community-confirm-outlier/);
 assert.match(html,/community-correct-outlier/);
 assert.match(html,/community-dismiss-outlier/);
 assert.match(html,/data-revision="7"/);
 assert.equal(communityReviewBanner([review],new Set(['abc:7'])),'');
 assert.notEqual(communityReviewBanner([{...review,revision:8}],new Set(['abc:7'])),'');
});

test('Supabase adapter uses narrow RPC names without raw account identity payloads',async()=>{
 const calls=[];
 const sdk={
  auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
  rpc:async(method,args)=>{
   calls.push([method,args]);
   if(method==='dic_my_community_outliers')return {data:[],error:null};
   if(method==='dic_confirm_community_outlier')return {data:{ok:true,state:'eligible'},error:null};
   return {data:{shots:[row],total:1},error:null};
  }
 };
 const client=createCloudClient(sdk,{assertSecure:()=>{}});
 assert.deepEqual(await client.listCommunityReviews(),[]);
 assert.deepEqual(await client.confirmCommunityOutlier('abc',7),{ok:true,state:'eligible'});
 const browse=await client.browseCommunityShots({limit:20,offset:0});
 assert.equal(browse.total,1);
 assert.deepEqual(calls,[
  ['dic_my_community_outliers',undefined],
  ['dic_confirm_community_outlier',{p_shot_id:'abc',p_expected_revision:7}],
  ['dic_browse_community_shots',{p_limit:20,p_offset:0}]
 ]);
 client.dispose();
});
