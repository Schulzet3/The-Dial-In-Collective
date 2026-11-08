// Audit-only public alternate. Never substitute a different host or product handle.
import {safeCoffeeUrl,coffeeProductHandle} from '../../src/server/coffee-url-guard.mjs';
import {selectedCoffeeNameWithoutPrice} from '../../src/server/coffee-product-identity.mjs';
export function sameHandleCollectionAlternate(original,alternative){
 const a=safeCoffeeUrl(original),b=safeCoffeeUrl(alternative);
 if(!a||!b||a.search||b.search||a.hostname!==b.hostname)return null;
 const x=a.pathname.split('/').filter(Boolean),y=b.pathname.split('/').filter(Boolean);
 if(x.length!==2||x[0]!=='products'||y.length!==4||y[0]!=='collections'||y[2]!=='products'||
 !/^[a-z0-9][a-z0-9-]{0,79}$/i.test(y[1]))return null;
 const oldHandle=coffeeProductHandle(x[1]),newHandle=coffeeProductHandle(y[3]);
 return oldHandle&&oldHandle===newHandle?b.href:null;
}
export function identicalCurrentSelectedTitle(expected,h1,parsed){
 const norm=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 // A selected commerce-price suffix is decoration, not coffee identity.
 // All three selected names must still match exactly after this one narrow
 // normalization. Wrong coffee or stale release still fails closed.
 const a=norm(expected);return !!a&&a===norm(selectedCoffeeNameWithoutPrice(h1))&&a===norm(parsed);
}
