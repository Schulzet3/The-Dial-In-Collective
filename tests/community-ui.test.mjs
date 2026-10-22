import test from 'node:test';
import assert from 'node:assert/strict';
import {communityPage,communityReviewBanner,communityCoffeeKey,communityReleaseKey,communityReleaseDetails} from '../site/cloud/community.js';
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
 const found=await client.searchCommunityShots({query:'Yirgacheffe',style:'Turbo',limit:20,offset:20});
 assert.equal(found.total,1);
 await assert.rejects(()=>client.searchCommunityShots({query:'x'.repeat(81)}),/Invalid Community search/);
 assert.deepEqual(calls,[
  ['dic_my_community_outliers',undefined],
  ['dic_confirm_community_outlier',{p_shot_id:'abc',p_expected_revision:7}],
  ['dic_edit_my_coffee',{p_library_entry:'coffee-lib',p_expected_revision:3,p_details:{name:'Coffee',roaster:'Roaster'},p_source_url:'https://roaster.invalid/coffee'}],
  ['dic_browse_community_shots',{p_limit:20,p_offset:0}],
  ['dic_search_community_shots',{p_query:'Yirgacheffe',p_style:'Turbo',p_limit:20,p_offset:20}]
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

test('two distinct canonical releases stay within one named coffee but never share a release subgroup',()=>{
 const r2025={...row,release_key:'a'.repeat(64),release_label:'2025 Harvest',
  release_origin:'Ethiopia, Yirgacheffe',release_process:'Washed',shot_count:2,contributor_count:1};
 const r2026={...row,release_key:'b'.repeat(64),release_label:'2026 Harvest',
  release_origin:'Ethiopia, Yirgacheffe',release_process:'Natural',observed_on:'2026-10-18',
  shot_count:1,contributor_count:1};
 const html=communityPage({shots:[r2025,{...r2025,observed_on:'2026-10-17'},r2026],total:3,revision:8});
 assert.equal((html.match(/class="coffee-card community-coffee-card"/g)||[]).length,1);
 assert.equal((html.match(/class="community-release"/g)||[]).length,2);
 assert.equal((html.match(/class="shot community-shot"/g)||[]).length,3);
 assert.match(html,/2025 Harvest · Ethiopia, Yirgacheffe · Washed/);
 assert.match(html,/2026 Harvest · Ethiopia, Yirgacheffe · Natural/);
 const sections=html.split('<section class="community-release"').slice(1);
 assert.equal((sections[0].match(/class="shot community-shot"/g)||[]).length,2);
 assert.equal((sections[1].match(/class="shot community-shot"/g)||[]).length,1);
 assert.match(sections[0],/2 qualifying shots · 1 contributors/);
 assert.match(sections[1],/1 qualifying shots · 1 contributors/);
 assert.doesNotMatch(html,/class="community-release"[^>]*\sopen[\s>]/);
 assert.doesNotMatch(html,/class="shot community-shot"[^>]*\sopen[\s>]/);
 assert.doesNotMatch(html,/data-id="a{64}"|data-id="b{64}"/);
});
test('single canonical release keeps one-tap compact rows without extra release header',()=>{
 const sh={...row,release_key:'c'.repeat(64),release_label:'2025 Harvest'};
 const html=communityPage({shots:[sh,{...sh,observed_on:'2026-10-17'}],total:2});
 assert.equal((html.match(/class="community-release"/g)||[]).length,0);
 assert.equal((html.match(/class="shot community-shot"/g)||[]).length,2);
 assert.equal((html.match(/class="coffee-card community-coffee-card"/g)||[]).length,1);
});
test('verified facts display instead of invented release date, and unknown dates remain unknown',()=>{
 const sh={...row,release_key:'d'.repeat(64),release_origin:'Guji, Ethiopia',
  release_process:'Natural',release_producer:'A Farm',release_variety:'Heirloom'};
 assert.equal(communityReleaseDetails(sh),'Guji, Ethiopia · Natural · A Farm · Heirloom');
 assert.equal(communityReleaseDetails({...sh,release_origin:null,release_process:null,
  release_producer:null,release_variety:null}),'Release details unavailable');
 const html=communityPage({shots:[sh,{...sh,release_key:'e'.repeat(64),
  release_origin:null,release_process:null,release_producer:null,release_variety:null}],
  total:2});
 assert.match(html,/Guji, Ethiopia · Natural · A Farm · Heirloom/);
 assert.match(html,/Release 2 · Release details unavailable/);
 assert.doesNotMatch(html,/Harvest 2026|released on 2026-10-16/);
 assert.match(html,/2026-10-16/,'shot observation date remains on compact shot only');
});
test('canonical identity never depends on mutable release text, dates or grouping label',()=>{
 const same={...row,release_key:'c'.repeat(64),release_label:'Harvest 2025'};
 const renamed={...same,release_label:'Lot X',release_origin:'Other'};
 const different={...same,release_key:'d'.repeat(64)};
 assert.equal(communityReleaseKey(same),communityReleaseKey(renamed));
 assert.notEqual(communityReleaseKey(same),communityReleaseKey(different));
 assert.equal(communityCoffeeKey(same),communityCoffeeKey(different));
 assert.equal(communityReleaseKey({...same,release_key:'malicious\" onmouseover=\"alert(1)'}),null);
 const hostile={...same,release_key:'d'.repeat(64),release_label:'<img src=x onerror=alert(1)>'};
 const html=communityPage({shots:[same,hostile],total:2});
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(html,/<img src=x/);
});
test('legacy DTO absent release key fails closed on release identity without inventing source fields',()=>{
 const known={...row,release_key:'a'.repeat(64)};
 const old={...row,release_key:null,observed_on:'2026-10-17'};
 const html=communityPage({shots:[known,old],total:2});
 assert.equal((html.match(/class="community-release"/g)||[]).length,2);
 assert.match(html,/Release identity unavailable/);
 assert.doesNotMatch(html,/2026 Harvest|2025 Harvest/);
 const onlyOld=communityPage({shots:[row,{...row,observed_on:'2026-10-17'}],total:2});
 assert.equal((onlyOld.match(/class="community-release"/g)||[]).length,0,
  'legacy single-family feed still shows compact rows, without pretending release boundaries are verified');
});
test('release sections honor style/coffee filtering, pagination and independent private identity',()=>{
 const rows=[
 {...row,release_key:'a'.repeat(64),style:'Turbo',release_label:'2024 Lot'},
 {...row,release_key:'b'.repeat(64),style:'Traditional',release_label:'2025 Lot',
  owner_id:'SECRET-OWNER',private_notes:'SECRET-NOTE',contributor_id:'SECRET-PERSON'},
 {...row,release_key:'b'.repeat(64),style:'Turbo',release_label:'2025 Lot'},
 {...row,release_key:'a'.repeat(64),style:'Turbo',release_label:'2024 Lot',observed_on:'2026-10-15'}
 ];
 const html=communityPage({shots:rows,total:20,style:'Turbo',coffee:communityCoffeeKey(row),revision:2});
 assert.equal((html.match(/class="community-release"/g)||[]).length,2);
 assert.equal((html.match(/class="shot community-shot"/g)||[]).length,3);
 assert.match(html,/3 shots loaded/);
 assert.match(html,/1 shot loaded/);
 assert.doesNotMatch(html,/SECRET-OWNER|SECRET-NOTE|SECRET-PERSON|private_notes|contributor_id/);
});

test('Community search UI escapes input and shows a meaningful filtered-empty state',()=>{
 const html=communityPage({shots:[],total:0,search:'<script>alert(1)</script>',style:'Turbo'});
 assert.match(html,/id="community-search"/);
 assert.match(html,/aria-label="Search Community coffees and roasters"/);
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/No matching Community shots/);
 assert.match(html,/community-search-clear/);
 assert.match(html,/option value="Turbo" selected/);
 const historic=communityPage({shots:[row],total:20,search:'roaster'});
 assert.match(historic,/Load More Shots/);
 assert.match(historic,/Showing 1 of 20 qualifying shots/);
});
