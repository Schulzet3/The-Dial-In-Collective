import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');
const css = read('site/visual.css');
const reference = JSON.parse(read('docs/BADGE_PALETTE_SOURCE.json'));
const scopes = [...css.matchAll(/:root(?:\[data-theme=dark\])?\s*\{([^}]+)\}/g)]
 .map(m => Object.fromEntries([...m[1].matchAll(/--([a-z0-9-]+):\s*(#[a-f0-9]{6})/gi)]
 .map(x => [x[1],x[2].toUpperCase()])));
const original = {
 green:['#6CBB58','#1A120D'], turbo:['#92B6D3','#1A120D'],
 trad:['#3E7098','#FFFFFF'], ristretto:['#2C506D','#FFFFFF'],
 lungo:['#BED3E4','#1A120D'], custom:['#588FBB','#1A120D'],
 pending:['#E5BC6B','#1A120D']
};
for (const [index,mode] of ['Light','Dark'].entries()) {
 const effective = {...scopes[0],...scopes[index]};
 for (const [name,[fill,ink]] of Object.entries(original)) {
  test(`${mode} ${name} keeps original JSX dark fill with approved theme lettering`, () => {
   assert.equal(effective[`badge-${name}`],fill);
   assert.equal(effective[`badge-${name}-ink`],index===0?'#000000':'#FFFFFF');
   assert.equal(reference.badges[name].background,fill);
   assert.equal(reference.badges[name].color,ink);
  });
 }
 test(`${mode} taste chips use the original dark five-color ramp`, () => {
  assert.deepEqual([0,1,2,3,4].map(i=>effective[`s${i}`]),reference.taste_ramp);
 });
}
test('theme changes preserve badge fills and borders but override lettering', () => {
 assert.equal(scopes.length,2);
 assert.deepEqual(Object.keys(scopes[1]).filter(k=>k.startsWith('badge-')).sort(),Object.keys(original).map(k=>`badge-${k}-ink`).sort());
});
test('source reference identifies the project JSX and distinguishes new status colors', () => {
 assert.equal(reference.source_file,'dial-in-collective.jsx');
 assert.equal(reference.source_sha256,'54971f6286175aba7554351096c6d3640fec0211b4cef78fa13503d3c18ee980');
 assert.match(reference.notes.join(' '),/no badge counterpart/);
 assert.match(reference.notes.join(' '),/not copied legacy borders/);
});
test('badge outline width and shared source colors are applied to component selectors', () => {
 assert.match(css,/\.status-badge,\.style-badge,\.preview-pill,\.admin-state\{border:1\.5px solid;/);
 for (const [selector,name] of [['traditional','trad'],['ristretto','ristretto'],['lungo','lungo'],['custom','custom']]) {
  assert.ok(css.includes(`.style-${selector}{background:var(--badge-${name});color:var(--badge-${name}-ink);border-color:var(--badge-${name}-line)}`));
 }
});
test('taste chip lettering preserves original ink and white on the darkest red', () => {
 assert.match(css,/\.taste-chip\{[^}]*color:#1a120d\}/);
 assert.match(css,/\.taste-chip\.severity-4\{color:#fff\}/);
});

test('all badge and pending-sync lettering is clean, without blurred halos, strokes or shadows',()=>{
 assert.match(css,/\.status-badge,\.style-badge,\.preview-pill,\.admin-state,\.sync-indicator\[data-sync-state=pending\]\{text-shadow:none\}/);
 assert.doesNotMatch(css, /text-shadow:(?!none)[^;}]+/i);
 assert.doesNotMatch(css, /(?:-webkit-)?text-stroke\s*:/i);
 assert.match(css, /\*,\*::before,\*::after\{text-shadow:none!important\}/);
});
