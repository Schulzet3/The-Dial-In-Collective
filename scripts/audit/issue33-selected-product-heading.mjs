// Issue #33: exact selected product headings from bounded public product markup.
// Some official storefronts animate headings as individual character spans; a
// 1,800-character H1 cap falsely reports no identity. Never infer identity
// from a product URL, stale SEO, recommendation card or a different coffee.
const entities={amp:'&',nbsp:' ',quot:'"',apos:"'",lt:'<',gt:'>',ndash:'–',mdash:'—'};
function decode(value){
 return String(value||'').replace(/&(#(?:x[0-9a-f]+|[0-9]+)|[a-z]+);/gi,(m,key)=>{
  if(key[0]!=='#')return entities[key.toLowerCase()]??m;
  const hex=/^#x/i.test(key),n=Number.parseInt(key.slice(hex?2:1),hex?16:10);
  return Number.isInteger(n)&&n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)
    ?String.fromCodePoint(n):m;
 });
}
export function selectedProductHeadings(markup){
 const headings=[];
 for(const hit of String(markup||'').matchAll(/<h1\b[^>]{0,500}>([\s\S]{0,16000}?)<\/h1>/gi)){
  const inner=hit[1],chars=[...inner.matchAll(/<span\b[^>]{0,450}\bclass=(['"])[^'"]*\bchar-clip(?=\s|["'])[^'"]*\1[^>]{0,450}>\s*<span\b[^>]{0,450}>([\s\S]{0,20}?)<\/span>\s*<\/span>/gi)];
  const total=(inner.match(/<span\b[^>]{0,450}\bclass=(['"])[^'"]*\bchar-clip\b/gi)||[]).length;
  let title='';
  if(total){
   // Fail closed for partial/ambiguous animated titles, never use fragments.
   if(total===chars.length&&total<=240)
    title=decode(chars.map(m=>m[2]).join('')).replace(/\s+/g,' ').trim();
  }else title=decode(inner.replace(/<[^>]{0,1000}>/g,' ').replace(/\s+/g,' ').trim());
  if(title&&title.length<=220)headings.push(title);
  if(headings.length===4)break;
 }
 return headings;
}


// Audit-only alternate-URL identity: a current product page without H1 may
// put the EXACT purchasable coffee H2 inside its direct purchase form. This
// cannot certify another coffee or supply missing extraction fields; caller
// must still match archived name, parsed selected name AND same-host/handle URL.
import {coffeeHtmlElements} from '../../src/server/coffee-html-structure.mjs';
import {coffeeHtmlAttributes} from '../../src/server/coffee-product-scope.mjs';
export function selectedProductFormH2(markup){
 if(typeof markup!=='string'||markup.length>2_000_000||/<h1\b/iu.test(markup))return [];
 const tree=coffeeHtmlElements(markup);
 if(tree.truncated)return [];
 const nodes=tree.nodes,matched=[];
 for(let i=0;i<nodes.length;i++){
  const form=nodes[i],a=coffeeHtmlAttributes(form.attributes);
  if(form.tag!=='form'||!String(a.class||'').split(/\s+/u).includes('product-form'))continue;
  // A similarly shaped purchase form in recommendations is NOT selected.
  let unsafe=false,ancestorIndex=form.parent;
  for(let depth=0;ancestorIndex!==null&&depth<128;depth++){
   const ancestor=nodes[ancestorIndex];
   if(!ancestor)break;
   const ctx=coffeeHtmlAttributes(ancestor.attributes);
   const labels=[ctx.class,ctx.id,ctx.role,ctx['aria-label']].join(' ');
   if(['aside','nav','header','footer'].includes(ancestor.tag)||
      /\b(?:related[-_ ]?products?|recommendations?|upsell|cross[-_ ]?sell|carousel|recently[-_ ]?viewed|sidebar|faq)\b/iu.test(labels)){
    unsafe=true;break;
   }
   ancestorIndex=ancestor.parent;
  }
  if(unsafe)continue;
  const parts=nodes.filter(n=>n.start>=form.headEnd&&n.end<=form.contentEnd);
  const heads=parts.filter(n=>n.tag==='h2');
  if(heads.length!==1)continue;
  const name=decode(markup.slice(heads[0].headEnd,heads[0].contentEnd)
    .replace(/<[^>]{0,1200}>/gu,' ')).replace(/\s+/gu,' ').trim();
  if(!name||name.length>220)continue;
  const ownDesc=parts.some(n=>{
   if(n.tag!=='h3'||n.contentEnd-n.headEnd>1200)return false;
   const content=decode(markup.slice(n.headEnd,n.contentEnd)
     .replace(/<[^>]{0,1200}>/gu,' ')).replace(/\s+/gu,' ').trim();
   if(content.length<35||content.length>900)return false;
   let at=n.parent;
   for(let depth=0;at!==null&&depth<18;depth++){
    const ancestor=nodes[at];if(!ancestor||ancestor.start<form.start||ancestor.end>form.end)break;
    if(String(coffeeHtmlAttributes(ancestor.attributes).class||'')
       .split(/\s+/u).includes('product-form--block--description'))return true;
    if(at===i)break;
    at=ancestor.parent;
   }
   return false;
  });
  if(ownDesc)matched.push(name);
 }
 // Multiple distinct selected H2s on one document are not one chosen coffee.
 return matched.length&&matched.every(x=>x===matched[0])?[matched[0]]:[];
}
