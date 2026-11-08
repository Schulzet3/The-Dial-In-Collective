import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {recommendation} from '../site/lib/engine.js';
import {recipeGrid} from '../site/lib/ui.js';
import {CONFIG} from '../site/lib/constants.js';

// Only locally constructed synthetic state. No production accounts, data or provider writes.
function fixture({dose=5,preferences='',roast='Dark'}={}) {
 const s=hydrate(rawFixture());
 s.preferences=preferences;
 s.coffees.find(c=>c.id==='coffee').roastLevel=roast;
 activeVersion(s).baskets.find(b=>b.id==='basketv').doseG=dose;
 return s;
}
const card=s=>recommendation(s,'coffee',{style:'Ristretto',basketId:'basketv',feedMode:'standard'});

test('R111: valid 5 g dark-roast Ristretto center has loggable displayed lower endpoint',()=>{
 const s=fixture(),original=structuredClone(s),rec=card(s);
 assert.equal(rec.source,'Starting recommendation');
 assert.deepEqual(rec.yield,{low:CONFIG.bounds.yieldG[0],center:5.5,high:6.1});
 assert.ok(Math.abs(rec.ratio.low-.98)<1e-10,'approved starting ratio prior remains unchanged within floating-point precision');
 assert.equal(rec.ratio.center,1.1);
 const html=recipeGrid(rec);
 assert.ok(html.includes('5.0<span class="range-dash">'),'rendered yield band starts at valid 5 g');
 assert.ok(html.includes('Center 5.5 g'),'valid starting center is preserved');
 assert.deepEqual(s,original,'no original coffee, basket, shot, note or five-rating history mutation');
});

test('R111: ordinary 18 g Ristretto and 5 g Turbo baseline displays are unchanged',()=>{
 const s=fixture({dose:18}),before=structuredClone(s),r=card(s);
 assert.deepEqual(r.yield,{low:17.6,center:19.8,high:22});
 assert.equal(r.ratio.center,1.1);
 const t=fixture(),original=structuredClone(t);
 const turbo=recommendation(t,'coffee',{style:'Turbo',basketId:'basketv',feedMode:'standard'});
 assert.deepEqual(turbo.yield,{low:10.4,center:11,high:11.6});
 assert.equal(turbo.style,'Turbo');
 assert.deepEqual(s,before);assert.deepEqual(t,original);
});

test('R111: non-crossing 5 g clarity-preference band is unchanged; no style or taste threshold changed',()=>{
 const s=fixture({preferences:'clarity'}),original=structuredClone(s),r=card(s);
 assert.deepEqual(r.yield,{low:5.6,center:6.3,high:6.9});
 assert.equal(r.ratio.center,1.25);
 assert.equal(r.style,'Ristretto');
 assert.equal(s.shots.length,0);
 assert.deepEqual(s,original);
});
