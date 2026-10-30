import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
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

test('exact approved video bytes exist and are playable MP4 format',()=>{
 const p=new URL('../site/media/first-shot-walkthrough.mp4',import.meta.url),bytes=readFileSync(p);
 assert.equal(bytes.length,2320714);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'e8235c3c03f17541f07e0a3f0f9907f61c90c748586f069dfb93b7d49591b2aa');
 assert.equal(bytes.toString('ascii',4,8),'ftyp');
 assert.ok(bytes.includes(Buffer.from('moov')),'MP4 requires indexed metadata for seeking');
 assert.ok(bytes.includes(Buffer.from('mdat')),'MP4 has actual media samples');
 const build=read('build_cloud.mjs');
 assert.ok(build.includes("'media/first-shot-walkthrough.mp4'"));
 assert.match(build,/walkthrough video missing or SHA-256 does not match approved source/i);
 assert.match(build,/!file\.endsWith\('\.mp4'\)/,'PWA must not cache video as a static shell resource');
});
test('approved English captions are valid ordered WebVTT and stay within runtime',()=>{
 const vtt=read('site/media/first-shot.en.vtt');
 assert.match(vtt,/^WEBVTT\s*\n/);
 const pairs=[...vtt.matchAll(/(\d\d:\d\d:\d\d\.\d\d\d) --> (\d\d:\d\d:\d\d\.\d\d\d)/g)];
 assert.equal(pairs.length,20);
 const seconds=s=>{const h=s.split(':');return Number(h[0])*3600+Number(h[1])*60+Number(h[2])};
 let previous=0;
 for(const [,a,b] of pairs){assert.ok(seconds(a)>=previous-0.005);assert.ok(seconds(b)>seconds(a));previous=seconds(b)}
 assert.ok(previous<=135.57);
});
