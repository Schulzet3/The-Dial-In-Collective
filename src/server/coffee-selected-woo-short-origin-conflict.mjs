// Source-bound, review-only disagreement between a selected WooCommerce
// producer/location H5 and the same bag's printed Location specification.
// Never correct either spelling via SEO, a gazetteer, or historical captures.
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {coffeeHtmlAttributes} from './coffee-product-scope.mjs';
const key=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const geography=/^([\p{L}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}][\p{L}\p{M}'’.-]*){0,3}),\s*([\p{L}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}][\p{L}\p{M}'’.-]*){0,3})$/u;
function pair(x){
 const s=String(x||'').trim(),m=s.length>=9&&s.length<=120?s.match(geography):null;
 return m&&m[1].length>=3&&m[2].length>=3?{region:m[1],country:m[2]}:null;
}
function visible(node){
 const a=coffeeHtmlAttributes(node.attributes);
 return !Object.hasOwn(a,'hidden')&&a['aria-hidden']!=='true';
}
// Only an exact unique current H1, its immediate Woo short-description
// sibling, unique direct H5 with selected producer, and two direct typed
// selected product facts (Producer + Location) can establish this conflict.
// Require same country and comparable single named region on both sides.
export function selectedWooShortOriginConflict(html,{name='',origin='',producer='',source_facts=[],clean}={}){
 if(typeof html!=='string'||html.length>2_000_000||typeof clean!=='function'||
  typeof name!=='string'||name.length<3||name.length>170||
  typeof producer!=='string'||producer.length<3||producer.length>140||
  !Array.isArray(source_facts))return null;
 const spec=pair(origin);if(!spec)return null;
 if(!source_facts.some(f=>f.field==='origin'&&f.source_type==='html'&&
  /^location$/iu.test(String(f.label||'').trim())&&key(f.value)===key(origin)))return null;
 if(!source_facts.some(f=>f.field==='producer'&&f.source_type==='html'&&
  /^(?:producer|farmer|grower)$/iu.test(String(f.label||'').trim())&&
  key(f.value)===key(producer)))return null;
 const scanned=coffeeHtmlElements(html);if(scanned.truncated)return null;
 const nodes=scanned.nodes;
 const titles=nodes.filter(n=>n.tag==='h1'&&visible(n)&&
  key(clean(html.slice(n.headEnd,n.contentEnd),170))===key(name));
 if(titles.length!==1)return null;
 const title=titles[0];
 const shorts=nodes.filter(n=>n.tag==='div'&&visible(n)&&n.parent===title.parent&&
  String(coffeeHtmlAttributes(n.attributes).class||'').split(/\s+/u)
   .includes('woocommerce-product-details__short-description')&&
  n.start>title.end&&n.start-title.end<14000&&
  n.contentEnd-n.headEnd<40000);
 if(shorts.length!==1)return null;
 const idx=nodes.indexOf(shorts[0]);
 const heads=nodes.filter(n=>n.parent===idx&&n.tag==='h5'&&visible(n));
 if(heads.length!==1||heads[0].contentEnd-heads[0].headEnd>500)return null;
 const raw=html.slice(heads[0].headEnd,heads[0].contentEnd);
 const m=raw.match(/^\s*([^<>]{3,160}?)\s*<br\s*\/?>\s*([^<>]{3,160}?)\s*$/iu);
 if(!m||key(clean(m[1],170))!==key(producer))return null;
 const hero=clean(m[2],170),shown=pair(hero);
 if(!shown||key(shown.country)!==key(spec.country)||
  key(shown.region)===key(spec.region))return null;
 return {spec:origin,hero,quote:clean(raw,400)};
}
