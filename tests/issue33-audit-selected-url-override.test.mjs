import test from 'node:test';
import assert from 'node:assert/strict';
import {sameHandleCollectionAlternate,identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
const a='https://www.vailcoffee.com/products/ethiopian-yirgacheff';
const b='https://www.vailcoffee.com/collections/all-coffee/products/ethiopian-yirgacheff';
test('public alternate accepts only identical selected host and handle in collection product',()=>{
 assert.equal(sameHandleCollectionAlternate(a,b),b);
 assert.equal(sameHandleCollectionAlternate(a,a),null);
 for(const wrong of [b+'?id=1',b.replace('www.vailcoffee.com','evil.example.com'),b.replace('ethiopian-yirgacheff','other-beans'),b.replace('/products/','/pages/'),b.replace('https:','http:'),b.replace('/all-coffee/','/all-coffee/extra/'),'https://127.0.0.1/collections/all-coffee/products/ethiopian-yirgacheff'])assert.equal(sameHandleCollectionAlternate(a,wrong),null,wrong);
});
test('alternate selected identity must match both published H1 and actual parser',()=>{
 const name='Ethiopian Guji Buku Sayasa Grade 1 - SUPERNATURAL';
 assert.equal(identicalCurrentSelectedTitle(name,name,name),true);
 assert.equal(identicalCurrentSelectedTitle(name,'Ethiopian Yirgacheffe',name),false);
 assert.equal(identicalCurrentSelectedTitle(name,name,'Ethiopian Yirgacheffe'),false);
 assert.equal(identicalCurrentSelectedTitle(name,name,''),false);
});
