import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {walkthroughMarkup,gettingStartedMarkup,WALKTHROUGH_SHA256} from '../site/cloud/help.js';
import {fileAllowlist} from '../scripts/audit/site-integrity.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('first-use and Settings offer keyboard-operable help routes',()=>{
 const app=read('site/cloud/main.js');
 assert.match(app,/Help &amp; Getting Started/);
 for(const a of ['watch-walkthrough','getting-started-guide'])assert.ok(app.includes("if(a==='"+a+"')"),a);
 assert.match(app,/if\(!setup\)return[^\n]+Watch Walkthrough/);
 const guide=gettingStartedMarkup();
 for(const x of ['Log A Shot','Save Shot &amp; Get Suggestion','Shot History','Astringency','support@dialincollective.com'])assert.ok(guide.includes(x),x);
 assert.doesNotMatch(guide,/<script|onclick=|onerror=/i);
});
test('video controls, caption and readable layout',()=>{
 const h=walkthroughMarkup();
 assert.match(h,/<video[^>]*controls[^>]*playsinline[^>]*preload="metadata"/);
 assert.doesNotMatch(h,/autoplay/);
 assert.match(h,/kind="captions"/);
 assert.match(h,/data-walkthrough-error/);
 assert.match(h,/Transcript and accessible alternative/);
 assert.match(read('site/visual.css'),/object-fit:contain/);
 assert.match(WALKTHROUGH_SHA256,/^[a-f0-9]{64}$/);
 for(const p of ['cloud/help.js','media/first-shot.en.vtt','media/first-shot-transcript.txt','media/first-shot-poster.svg'])assert.ok(fileAllowlist().has(p),p);
});
