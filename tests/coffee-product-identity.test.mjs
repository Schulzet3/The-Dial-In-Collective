import test from 'node:test';
import assert from 'node:assert/strict';
import {coffeeIdentityText,coffeeIdentityKey,equivalentCoffeeProductNames} from '../src/server/coffee-product-identity.mjs';

test('identity decoding reads bounded named and numeric HTML entities',()=>{
 assert.equal(coffeeIdentityText('PINK BOURBON &#8211; Washed &amp; Bright'),'PINK BOURBON – Washed & Bright');
 assert.equal(coffeeIdentityKey('Bourbon Aj&iacute;'),'bourbonaji');
 assert.equal(coffeeIdentityText('x'.repeat(1001)),'');
 assert.equal(coffeeIdentityText('&#x110000;'), '&#x110000;');
});
test('only an explicitly published separated brand may decorate an otherwise exact title',()=>{
 const name='2026 Halo Hartume; 2nd Selection - Ethiopia';
 assert.equal(equivalentCoffeeProductNames('SEY - '+name,name,{brands:['SEY','SEY COFFEE']}),true);
 assert.equal(equivalentCoffeeProductNames(name+' | Example Coffee',name,{brands:['Example Coffee']}),true);
 assert.equal(equivalentCoffeeProductNames('SEY - '+name,name),false);
 assert.equal(equivalentCoffeeProductNames('SEY '+name,name,{brands:['SEY']}),false);
 assert.equal(equivalentCoffeeProductNames('SEY - '+name,'2025 Halo Hartume; 1st Selection - Ethiopia',{brands:['SEY']}),false);
});
test('common commerce decoration can be omitted without discarding coffee identity',()=>{
 assert.equal(equivalentCoffeeProductNames('Example Lot Coffee Beans — $24.00','Example Lot'),true);
 assert.equal(equivalentCoffeeProductNames('Example Lot — $24.00','Example Lot — $25.00'),true);
 assert.equal(equivalentCoffeeProductNames('Example Lot 12','Example Lot'),false);
 assert.equal(equivalentCoffeeProductNames('Example Lot #2','Example Lot #3'),false);
 assert.equal(equivalentCoffeeProductNames('',''),false);
 assert.equal(equivalentCoffeeProductNames('Not Example Lot','Example Lot'),false);
});
