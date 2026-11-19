import test from 'node:test';
import assert from 'node:assert/strict';
import {shotCard} from '../site/cloud/shot_card.js';

// Synthetic source-bound History records only. Never use member or provider data.
const shot=(extra={})=>({
 id:'r339-original', timestamp:'2026-11-17', style:'Turbo',
 doseG:18, yieldG:36.35, timeS:24.75, grindSetting:4.25,
 feedMode:'standard', tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
 notes:'Original private notes', snapshot:{setupName:'Original setup'},
 ...extra
});
const toggle=html=>{
 const match=html.match(/<button class="shot-toggle"[\s\S]*?<\/button>/);
 assert.ok(match,'History disclosure button exists');
 return match[0];
};

test('R339 collapsed History toggle derives screen reader name from visible shot details',()=>{
 const html=toggle(shotCard(shot(),{expanded:false}));
 assert.match(html,/aria-expanded="false"/);
 assert.doesNotMatch(html,/\saria-label=/,'date-only override must not hide shot details');
 for(const visible of ['18.0g','36.35g','24.75s','Grind 4.25','11/17/2026','Turbo'])
  assert.ok(html.includes(visible),'visible text should name original '+visible);
});

test('R339 separate same-day shots expose different measured values to accessible names',()=>{
 const a=toggle(shotCard(shot(),{expanded:false}));
 const b=toggle(shotCard(shot({id:'r339-second',yieldG:41,timeS:27}),{expanded:false}));
 assert.match(a,/11\/17\/2026/);
 assert.match(b,/11\/17\/2026/);
 assert.ok(a.includes('36.35g'));
 assert.ok(b.includes('41.0g'));
 assert.ok(!b.includes('36.35g'));
 assert.doesNotMatch(a,/\saria-label=/);
 assert.doesNotMatch(b,/\saria-label=/);
});

test('R339 expanded History retains aria-expanded, five ratings and original private notes',()=>{
 const original=shot();
 const copy=structuredClone(original);
 const html=shotCard(original,{expanded:true});
 assert.match(toggle(html),/aria-expanded="true"/);
 assert.match(html,/Clarity: Distinct/);
 assert.match(html,/Dryness: None/);
 assert.match(html,/Original private notes/);
 assert.deepEqual(original,copy);
});

test('R339 missing legacy measurements remain visibly unknown, not invented in toggle name',()=>{
 const html=toggle(shotCard(shot({doseG:null,yieldG:null,timeS:null,grindSetting:null,style:'Custom',timestamp:null}),{expanded:false}));
 assert.match(html,/Date not recorded/);
 assert.match(html,/Custom/);
 assert.ok(html.includes('\u2014'),'missing measured readings are unknown');
 assert.doesNotMatch(html,/\saria-label=/);
});
