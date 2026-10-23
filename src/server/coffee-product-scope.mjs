import {removeElements,removeComments} from '../../supabase/functions/_shared/html-scan.mjs';
// Text parsers must share the same product scope. Structured JSON is read
// separately; scripts, navigation and recommendation cards are never facts.
export function productMarkup(html){
 if(typeof html!=='string'||html.length>2_000_000)return '';
 let page=removeElements(removeComments(html),['script','style','nav','footer','aside','template','noscript']);
 // Keep product specifications before the H1, which some storefronts use.
 // A custom element such as <main-product-selector> is NOT a <main>.
 // This function is called twice in the extraction flow; false matching
 // would discard the selected coffee's heading and flavor fields.
 const main=page.match(/<main(?=[\s>])[^<>]{0,2000}>/i);
 if(main){page=page.slice(main.index+main[0].length);const end=page.search(/<\/main\s*>/i);if(end>=0)page=page.slice(0,end);}
 for(const h of page.matchAll(/<h[2-6]\b[^<>]{0,2000}>([\s\S]{0,500}?)<\/h[2-6]\s*>/gi)){
  const text=h[1].replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
  if(/^(?:you may also like|related products|more coffees|customer reviews|recently viewed|shop similar)\b/i.test(text)){
   page=page.slice(0,h.index);break;
  }
 }
 return page;
}
