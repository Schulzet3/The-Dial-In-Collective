// R215 proof uniqueness is conservative: duplicate exact-product URL meta is ambiguous.
// Exact current purchasable selected product can use H2[itemprop=name]
// inside ONE schema.org/Product offer (instead of H1). Require exact seller
// product meta URL + unique product root + cart form; never trust SEO, sibling,
// recommendations, related card or malformed unbounded document.
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {coffeeHtmlAttributes} from './coffee-product-scope.mjs';
const decode=v=>String(v).replace(/&(#(?:x[0-9a-f]+|[0-9]+)|amp|nbsp|quot|apos|ndash|mdash);/giu,(m,k)=>{
 const entities={amp:'&',nbsp:' ',quot:'"',apos:"'",ndash:'–',mdash:'—'};
 if(k[0]!=='#')return entities[k.toLowerCase()]??m;
 const hex=/^#x/iu.test(k),n=parseInt(k.slice(hex?2:1),hex?16:10);
 return Number.isInteger(n)&&n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):m;
});
export function selectedSchemaProductOfferH2(html,{source_url}={}){
 if(typeof html!=='string'||typeof source_url!=='string'||!source_url||
    html.length>2_000_000||/<h1\b/iu.test(html))return [];
 const {nodes,truncated}=coffeeHtmlElements(html);
 if(truncated)return [];
 const attrs=node=>coffeeHtmlAttributes(node.attributes);
 const contains=(outer,inner)=>inner.start>=outer.headEnd&&inner.end<=outer.contentEnd;
 const ancestors=(node,predicate)=>{
  let at=node.parent;
  for(let depth=0;at!==null&&depth<128;depth++){
   const parent=nodes[at];if(!parent)return false;
   if(predicate(parent))return true;
   at=parent.parent;
  }
  return false;
 };
 const unsafe=node=>ancestors(node,parent=>{
  const a=attrs(parent),classes=String(a.class||'').split(/\s+/u),label=[a.class,a.id,a.role,a['aria-label']].join(' ');
  return (['aside','nav','header','footer'].includes(parent.tag)&&
     !(parent.tag==='header'&&classes.includes('product-title')))||
   /\b(?:related[-_ ]?products?|recommendations?|upsell|cross[-_ ]?sell|carousel|recently[-_ ]?viewed|sidebar|faq)\b/iu.test(label);
 });
 const roots=nodes.filter(n=>n.tag==='div'&&
  /^https?:\/\/schema\.org\/Product$/iu.test(String(attrs(n).itemtype||''))&&
  String(attrs(n).class||'').split(/\s+/u).includes('product')&&
  ancestors(n,x=>x.tag==='main')&&!unsafe(n));
 if(roots.length!==1)return [];
 const root=roots[0],sub=nodes.filter(n=>contains(root,n));
 const urls=sub.filter(n=>n.tag==='meta'&&attrs(n).itemprop==='url'&&attrs(n).content===source_url);
 const forms=sub.filter(n=>n.tag==='form'&&/^\/cart\/add(?:[?#]|$)/iu.test(String(attrs(n).action||''))&&!unsafe(n));
 const headers=sub.filter(n=>n.tag==='header'&&
  String(attrs(n).class||'').split(/\s+/u).includes('product-title')&&!unsafe(n));
 if(urls.length!==1||forms.length!==1||headers.length!==1)return [];
 const titles=sub.filter(n=>n.tag==='h2'&&attrs(n).itemprop==='name'&&
  contains(headers[0],n)&&!unsafe(n));
 if(titles.length!==1)return [];
 const title=decode(html.slice(titles[0].headEnd,titles[0].contentEnd).replace(/<[^>]{0,1200}>/gu,' ')).replace(/\s+/gu,' ').trim();
 return title&&title.length<=220?[title]:[];
}
