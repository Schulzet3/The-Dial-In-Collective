// #33 R59: source-only validation. Never turn a regional heading or other
// product's metadata into an automatic canonical growing-origin assertion.
const clean=value=>String(value||'').replace(/<script\b[\s\S]*?<\/script>/giu,' ')
 .replace(/<style\b[\s\S]*?<\/style>/giu,' ')
 .replace(/<[^>]{0,3000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
 .replace(/\s+/gu,' ').trim();
export function selectedTandemHeroLocation(scopedHtml,expectedName,exactHeroLocation){
 const markup=String(scopedHtml||'');
 const headings=[...markup.matchAll(/<h1\b[^>]*>([\s\S]{0,2500}?)<\/h1>/giu)];
 if(headings.length!==1||clean(headings[0][1])!==expectedName)return false;
 const after=markup.slice((headings[0].index||0)+headings[0][0].length);
 // Verify only the selected hero adjacent to the H1, not body storytelling,
 // menu, SEO, other coffees, other H1 headings or related-product cards.
 const primary=after.split(/<h[1-6]\b|<script\b|<section\b[^>]*class=["'][^"']*(?:related|recommend)/iu)[0].slice(0,2200);
 return clean(primary).includes(exactHeroLocation);
}
