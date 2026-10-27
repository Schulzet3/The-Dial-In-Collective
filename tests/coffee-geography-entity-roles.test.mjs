import test from 'node:test';
import assert from 'node:assert/strict';
import {extractCoffeeGeographyEntityRoles,cleanCoffeeGeographyEntityPrefix} from '../src/server/coffee-geography-entity-roles.mjs';
import {compatibleCoffeeOrigins} from '../src/server/coffee-fact-compatibility.mjs';
const clean=(value,max=6000)=>value.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().slice(0,max);
const claim='La Prosperidad de Chirinos is a cooperative long known for producing exceptional quality coffee.';
const fragment='<p>Peru is a country with many different coffee producing pockets. This coffee comes from the northern region of the country, near the border with Ecuador. '+claim+
 ' Dedicated producer members separate out their coffee and offer it as a micro lot, meaning the coffee is not mixed with other producers\' coffee to make a bulk lot.</p>';

test('literal Idyll cooperative statement resolves an entity prefix without guessing a region hierarchy',()=>{
 const roles=extractCoffeeGeographyEntityRoles(fragment,{clean});
 assert.deepEqual(roles,[{name:'La Prosperidad de Chirinos',role:'cooperative',quote:claim}]);
 const raw='La Prosperidad de Chirinos Cajamarca, San Ignacio Province';
 assert.equal(compatibleCoffeeOrigins(raw,'Cajamarca, San Ignacio Province'),null);
 const region=cleanCoffeeGeographyEntityPrefix(raw,roles);
 assert.equal(region,'Cajamarca, San Ignacio Province');
 assert.equal(compatibleCoffeeOrigins(region,'Cajamarca, San Ignacio Province'),region);
 assert.equal(raw,'La Prosperidad de Chirinos Cajamarca, San Ignacio Province');
});
test('an independently attested named farm or estate uses exact word boundaries and accent equivalents',()=>{
 for(const role of ['farm','estate']){
  const roles=extractCoffeeGeographyEntityRoles('<p>Finca El Paraíso is a '+role+' producing this coffee.</p>',{clean});
  assert.equal(cleanCoffeeGeographyEntityPrefix('FINCA EL PARAISO Cauca, Colombia',roles),'Cauca, Colombia');
  assert.equal(cleanCoffeeGeographyEntityPrefix('Finca El Paraisos Cauca, Colombia',roles),'Finca El Paraisos Cauca, Colombia');
 }
});
test('comma-delimited places, unattested names, lone places and exact entity-only values remain intact',()=>{
 const roles=extractCoffeeGeographyEntityRoles(fragment,{clean});
 for(const value of ['La Prosperidad de Chirinos, Cajamarca, Peru','La Prosperidad de Chirinos Cajamarca',
  'La Prosperidad de Chirinos','Other Cooperative Cajamarca, Peru','Cajamarca, La Prosperidad de Chirinos',
  'La Prosperidad de Chirinos: Cajamarca, Peru'])
  assert.equal(cleanCoffeeGeographyEntityPrefix(value,roles),value,value);
});
test('negation, comparison, generic education and another coffee never establish a role for cleanup',()=>{
 for(const body of ['<p>La Prosperidad de Chirinos is not a cooperative.</p>',
  '<p>Unlike La Prosperidad de Chirinos, this is a cooperative.</p>',
  '<p>For another coffee, La Prosperidad de Chirinos is a cooperative.</p>',
  '<p>La Prosperidad de Chirinos is a cooperative in this hypothetical example.</p>',
  '<section><h2>What is a cooperative?</h2><p>'+claim+'</p></section>',
  '<section class="related-products"><p>'+claim+'</p></section>',
  '<script>'+claim+'</script>'])
  assert.deepEqual(extractCoffeeGeographyEntityRoles(body,{clean}),[],body);
});
test('a geography prefix alone and a name in a heading do not create independent entity proof',()=>{
 for(const body of ['<p>Region: La Prosperidad de Chirinos Cajamarca, San Ignacio Province</p>',
  '<h2>'+claim+'</h2>','<p>La Prosperidad de Chirinos coffee cooperative</p>'])
  assert.deepEqual(extractCoffeeGeographyEntityRoles(body,{clean}),[],body);
});
test('nested emphasis preserves a literal source role and duplicate representations do not multiply proof',()=>{
 const body='<div><p><strong>La Prosperidad de Chirinos</strong> is a cooperative long known for producing exceptional quality coffee.</p></div>';
 assert.equal(extractCoffeeGeographyEntityRoles(body+body,{clean}).length,1);
});
test('role and measurement bounds fail closed without altering unsupported input',()=>{
 assert.deepEqual(extractCoffeeGeographyEntityRoles('x'.repeat(2_000_001),{clean}),[]);
 assert.deepEqual(extractCoffeeGeographyEntityRoles(fragment),[]);
 assert.equal(cleanCoffeeGeographyEntityPrefix('x'.repeat(501),[]),'x'.repeat(501));
 assert.equal(cleanCoffeeGeographyEntityPrefix('Current Place, Peru',null),'Current Place, Peru');
 const roles=extractCoffeeGeographyEntityRoles(Array.from({length:40},(_,index)=>'<p>Cooperative Name'+index+' is a cooperative producing coffee.</p>').join(''),{clean});
 assert.equal(roles.length,32);
});
