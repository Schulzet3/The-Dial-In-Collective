import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeAppearance,resolveAppearance,readAppearance} from '../site/cloud/appearance.js';
import {decide} from '../scripts/netlify/should-ignore-build.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('site/visual.css');
const scopes=[...css.matchAll(/:root(?:\[data-theme=dark\])?\s*\{([^}]+)\}/g)].map(m=>Object.fromEntries([...m[1].matchAll(/--([a-z0-9-]+):\s*(#[a-f0-9]{6})/gi)].map(x=>[x[1],x[2]])));
const luminance=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
for(const [i,mode] of ['light','dark'].entries()){
 const v={...scopes[0],...scopes[i]};
 // Exact original dark-JSX badge fills and plain black text; darker blue pairs warrant contrast review.
 for(const badge of ['green','turbo','trad','ristretto','lungo','custom','pending'])test(`${mode} ${badge} uses approved theme lettering`,()=>assert.equal(v[`badge-${badge}-ink`].toLowerCase(),'#000000'));
 test(`${mode} primary action text exceeds 4.5:1 contrast`,()=>assert.ok(contrast(v['action-ink'],v.action)>=4.5));
 test(`${mode} body, muted and link text are legible on surfaces`,()=>{for(const key of ['ink','muted','accent-text'])assert.ok(contrast(v[key],v.surface)>=4.5);});
}
test('appearance supports light/dark/system and safely normalizes untrusted values',()=>{assert.equal(normalizeAppearance('<script>'),'system');assert.equal(resolveAppearance('system',true),'dark');assert.equal(resolveAppearance('system',false),'light');assert.equal(resolveAppearance('light',true),'light');assert.equal(resolveAppearance('dark',false),'dark');});
test('unavailable local storage falls back without blocking app or Admin',()=>assert.equal(readAppearance({getItem(){throw Error('denied');}}),'system'));
test('Netlify cannot deploy this review branch in any context',()=>{for(const context of ['production','deploy-preview','branch-deploy'])assert.equal(decide({context,branch:'work/visual-refresh-20261015'}).ignore,true);});
test('shared appearance is allowlisted and early theme bootstrap is used by both pages',()=>{for(const page of ['site/cloud.html','site/admin.html'])assert.match(read(page),/appearance-bootstrap\.js/);assert.match(read('build_cloud.mjs'),/cloud\/appearance\.js/);});
test('Admin reads only current-account theme after authorization',()=>{const main=read('site/admin/main.js');assert.ok(main.indexOf('!status?.admin')<main.indexOf("from('account_preferences')"));assert.match(main,/select\('theme'\)\.eq\('owner_id',identity.user.id\)/);});
test('search toggle and icon-labelled Sign Out preserve action semantics',()=>{const main=read('site/cloud/main.js');assert.match(main,/Search & Sort/);assert.match(main,/aria-controls="coffee-search-tools"/);assert.match(main,/icon\('signout',18\)/);assert.match(main,/if\(\(await this.queue.pending\(\)\).length\)/);});
test('style retains clean display ligatures and visible focus states',()=>{assert.match(css,/font-variant-ligatures:none/);assert.match(css,/:focus-visible/);assert.match(css,/prefers-reduced-motion/);});

test('New Coffee has one continuous section and preserves side-by-side optional details',()=>{
 const source=read('site/cloud/main.js'),start=source.indexOf('showAdd(){'),end=source.indexOf('async finishCoffeeAdd',start);
 const form=source.slice(start,end);
 assert.ok(start>=0 && end>start);
 assert.doesNotMatch(form,/Optional Coffee Details|<details|<summary>/);
 assert.match(form,/class="form-grid coffee-detail-grid"/);
 for(const label of ['Origin','Roast Level','Elevation','Process','Variety','Producer','Tasting Notes'])assert.ok(form.includes("'"+label+"'"));
 assert.match(css,/#new-coffee \.coffee-detail-grid\{margin-top:16px;margin-bottom:16px\}/);
});
