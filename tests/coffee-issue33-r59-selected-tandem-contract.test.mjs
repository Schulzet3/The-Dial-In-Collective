import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedTandemHeroLocation} from '../scripts/audit/issue33-r59-selected-tandem-contract.mjs';
test('exact selected Heri Agena hero location is source evidence',()=>{
 assert.equal(selectedTandemHeroLocation('<main><h1>Heri Agena - Ethiopia</h1><div>Bensa, Sidama Ethiopia</div></main>',
  'Heri Agena - Ethiopia','Bensa, Sidama Ethiopia'),true);
});
test('exact selected Faver Ninco hero geography is distinct',()=>{
 assert.equal(selectedTandemHeroLocation('<h1>Faver Ninco - Colombia</h1><span>Santa Maria, Huila Colombia</span>',
  'Faver Ninco - Colombia','Santa Maria, Huila Colombia'),true);
});
test('generic SEO origin and unrelated recommended coffee cannot supply selected geography',()=>{
 assert.equal(selectedTandemHeroLocation('<meta content="Bensa, Sidama Ethiopia"><h1>Heri Agena - Ethiopia</h1><h2>Other coffee</h2><p>Bensa, Sidama Ethiopia</p>',
  'Heri Agena - Ethiopia','Bensa, Sidama Ethiopia'),false);
});
test('recycled slug, changed current H1 and two H1 headings cannot certify archived product',()=>{
 assert.equal(selectedTandemHeroLocation('<h1>Hamasho Borena - Ethiopia</h1><div>Bensa, Sidama Ethiopia</div>',
  'Heri Agena - Ethiopia','Bensa, Sidama Ethiopia'),false);
 assert.equal(selectedTandemHeroLocation('<h1>Heri Agena - Ethiopia</h1><h1>Other product</h1><p>Bensa, Sidama Ethiopia</p>',
  'Heri Agena - Ethiopia','Bensa, Sidama Ethiopia'),false);
});
