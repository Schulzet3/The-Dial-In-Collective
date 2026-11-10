import test from 'node:test';
import assert from 'node:assert/strict';
import {selected72,selected78} from '../scripts/audit/issue33-r79-72-78-check.mjs';
const a='Sumatra', b='Peace, Love & Caffeine';
const specA="Country of Origin: Sumatra Region: Mandheling Roast Level: Dark In the Cup: Baker's Chocolate, Syrupy, Dark Cherry, Sweet Lemon acidity, Earthy";
const specB="Peace, Love & Caffeine is our Vietnamese-style roast that blends earthy Robusta beans with Arabica beans for a deep rich cup with notes of long pepper, root beer, and cherry spice. Natural Notes: Long Pepper-Root Beer-Cherry Spice";
const page=(name,s)=>'<main><h1>'+name+'</h1><div><p>'+s+'</p></div></main>';
test('current source #72 five independently selected literals',()=>assert.deepEqual(Object.values(selected72(page(a,specA),[a])),Array(5).fill(true)));
test('current source #78 four independently selected literals',()=>assert.deepEqual(Object.values(selected78(page(b,specB),[b])),Array(4).fill(true)));
test('other or repeated selected heading fails identity',()=>{for(const h of [[],['Sumatra Mandheling','Sumatra'],['Ethiopia']])assert.equal(selected72(page(a,specA),h).identity,false);for(const h of [[],[b,b],['Vietnam Natural']])assert.equal(selected78(page(b,specB),h).identity,false)});
test('changed roast and process-adjacent facts cannot satisfy the chosen exact #72',()=>{const d=selected72(page(a,specA.replace('Dark','Medium').replace('Mandheling','Aceh')),[a]);assert.equal(d.explicitRoast,false);assert.equal(d.namedRegion,false)});
test('missing region is not inferred from broader Sumatra educational prose',()=>assert.equal(selected72(page(a,specA.replace('Region: Mandheling','Usually grows near Mandheling')),[a]).namedRegion,false));
test('changed #72 tasting list is not attributed to original selected coffee',()=>assert.equal(selected72(page(a,specA.replace("Baker's Chocolate",'Caramel')),[a]).explicitNotes,false));
test('related product nav/footer cannot fill selected #72 specs',()=>{const d=selected72(page(a,'')+'<nav>'+specA+'</nav><footer>'+specA+'</footer>',[a]);for(const k of ['namedCountry','namedRegion','explicitRoast','explicitNotes'])assert.equal(d[k],false,k)});
test('natural notes caption and Vietnamese style must not assert cherry processing or origin',()=>{const d=selected78(page(b,specB),[b]);assert.equal(d.naturalNotesCaption,true);assert.equal(d.namedBlend,true);});
test('other roast has a different selected product, cannot be source of #78 details',()=>{const d=selected78(page(b,'')+'<nav>'+specB+'</nav><aside>'+specB+'</aside>',[b]);assert.equal(d.namedBlend,false);assert.equal(d.directNotes,false);assert.equal(d.naturalNotesCaption,false)});
test('unrelated Indonesian or Ethiopian origins do not establish Vietnamese coffee origin',()=>assert.equal(selected78(page(b,specB.replace('Vietnamese-style','Indonesian-style')),[b]).namedBlend,false));

test('literal selected 72 note apostrophe is HTML-entity safe',()=>assert.equal(selected72(page(a,specA.replace("Baker's",'Baker&#39;s')),[a]).explicitNotes,true));
