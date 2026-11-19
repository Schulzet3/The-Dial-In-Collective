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
 const a=norm(expected),h=norm(selectedCoffeeNameWithoutPrice(h1)),p=norm(parsed);
 if(!a||!h||h!==p)return false;
 if(a===h)return true;
 // A current H1 may append the literal commerce descriptor "Coffee Beans".
 // Admit ONLY when both actual selected H1 and parser agree EXACTLY, and
 // the archived identity is otherwise identical. No arbitrary suffixes,
 // changed lot names, SEO title or partial-name fallbacks.
 return a.length>=9&&!a.endsWith('coffee beans')&&h===a+' coffee beans';
}
