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
