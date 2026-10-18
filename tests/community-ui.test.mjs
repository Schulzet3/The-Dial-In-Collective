import test from 'node:test';
import assert from 'node:assert/strict';
import {communityPage,communityReviewBanner,communityCoffeeKey} from '../site/cloud/community.js';
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
 assert.match(html,/community-rating-grid/);
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
 assert.match(html,/Are these shot measurements correct/);
 assert.match(html,/62\.0s/);
 assert.match(html,/community-confirm-outlier/);
 assert.match(html,/community-correct-outlier/);
 assert.doesNotMatch(html,/community-dismiss-outlier|data-action="Later"|>Later</);
 assert.match(html,/Required Measurement Check/);
 assert.match(html,/data-revision="7"/);
 assert.match(communityReviewBanner([{...review,revision:8}]),/data-revision="8"/);
});

test('Supabase adapter uses narrow RPC names without raw account identity payloads',async()=>{
 const calls=[];
 const sdk={
  auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
  rpc:async(method,args)=>{
   calls.push([method,args]);
   if(method==='dic_my_community_outliers')return {data:[],error:null};
   if(method==='dic_confirm_community_outlier')return {data:{ok:true,state:'eligible'},error:null};
   if(method==='dic_edit_my_coffee')return {data:{ok:true,kind:'updated_pending'},error:null};
   return {data:{shots:[row],total:1},error:null};
  }
 };
 const client=createCloudClient(sdk,{assertSecure:()=>{}});
 assert.deepEqual(await client.listCommunityReviews(),[]);
 assert.deepEqual(await client.confirmCommunityOutlier('abc',7),{ok:true,state:'eligible'});
 assert.deepEqual(await client.editCoffeeDetails('coffee-lib',3,{name:'Coffee',roaster:'Roaster'},'https://roaster.invalid/coffee'),{ok:true,kind:'updated_pending'});
 const browse=await client.browseCommunityShots({limit:20,offset:0});
 assert.equal(browse.total,1);
 assert.deepEqual(calls,[
  ['dic_my_community_outliers',undefined],
  ['dic_confirm_community_outlier',{p_shot_id:'abc',p_expected_revision:7}],
  ['dic_edit_my_coffee',{p_library_entry:'coffee-lib',p_expected_revision:3,p_details:{name:'Coffee',roaster:'Roaster'},p_source_url:'https://roaster.invalid/coffee'}],
  ['dic_browse_community_shots',{p_limit:20,p_offset:0}]
 ]);
 client.dispose();
});


test('Community privacy disclosure explains durable anonymous evidence after account deletion',()=>{
 const html=communityPage({shots:[row],total:1});
 assert.match(html,/may persist if personal shot history or the account is deleted/);
 assert.match(html,/private notes/);
});

test('Community groups shots by public coffee identity into collapsed coffee cards with compact nested shot rows',()=>{
 const same={...row,observed_on:'2026-10-17',yield_g:50.1,shot_count:2};
 const other={...row,roaster:'Sweet Bloom',coffee_name:'Wuri',style:'Traditional'};
 const html=communityPage({shots:[row,same,other],total:3,revision:3});
 assert.equal((html.match(/class="coffee-card community-coffee-card"/g)||[]).length,2);
 assert.equal((html.match(/class="shot community-shot"/g)||[]).length,3);
 assert.equal((html.match(/class="community-coffee-count">2 shots/g)||[]).length,1);
 assert.doesNotMatch(html,/class="coffee-card community-coffee-card"[^>]*\sopen[\s>]/);
 assert.doesNotMatch(html,/class="shot community-shot"[^>]*\sopen[\s>]/);
 assert.match(html,/community-coffee:3:/);
 assert.match(html,/community-shot:3:0:/);
 assert.match(html,/community-shot:3:1:/);
 assert.match(html,/community-shot:3:2:/);
 assert.match(html,/Community Shot/);
 assert.match(html,/community-rating-grid/); // Ratings are nested in each closed native disclosure.
 assert.doesNotMatch(html,/data-action="shot-expand"|data-action="make-current"|data-action="edit"/);
});
test('Community filters apply before grouping and only loaded shots count toward coffee cards',()=>{
 const other={...row,style:'Traditional',coffee_name:'Other'};
 const similar={...row,observed_on:'2026-10-17'};
 const rows=[row,similar,other];
 const coffee=communityCoffeeKey(row);
 assert.equal(communityCoffeeKey(row),communityCoffeeKey(similar));
 const html=communityPage({shots:rows,total:40,coffee,style:'Turbo',revision:4});
 assert.equal((html.match(/class="coffee-card community-coffee-card"/g)||[]).length,1);
 assert.equal((html.match(/class="shot community-shot"/g)||[]).length,2);
 assert.match(html,/2 shots loaded/);
 assert.match(html,/Showing 3 of 40 qualifying shots/);
 assert.match(html,/Load More Shots/);
 assert.match(html,/Filter Community shots by coffee/);
 const again=communityPage({shots:rows,total:40,coffee,style:'Turbo',revision:4});
 assert.equal(html,again,'same revision and rows preserve stable data-retain tokens across append rerenders');
 assert.notEqual(html,communityPage({shots:rows,total:40,coffee,style:'Turbo',revision:5}),
  'refresh revision deliberately invalidates stale open details');
});
test('Community grouping uses unambiguous public pairs and never renders raw private fields',()=>{
 const a={...row,roaster:'A · B',coffee_name:'C',owner_id:'SECRET-OWNER',notes:'SECRET-NOTE'};
 const b={...row,roaster:'A',coffee_name:'B · C',shot_id:'SECRET-SHOT'};
 assert.notEqual(communityCoffeeKey(a),communityCoffeeKey(b));
 const html=communityPage({shots:[a,b],total:2});
 assert.equal((html.match(/class="coffee-card community-coffee-card"/g)||[]).length,2);
 assert.doesNotMatch(html,/SECRET-OWNER|SECRET-NOTE|SECRET-SHOT|owner_id|shot_id/);
 assert.doesNotMatch(html,/contributor_id|setup_name/);
});
