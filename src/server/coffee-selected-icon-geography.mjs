// Paired exact-selected country/region icon captions, not SEO or surrounding coffee.
import {productMarkup} from './coffee-product-scope.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const country=/^(?:Colombia|Ethiopia|Kenya|Brazil|Guatemala|Costa Rica|Honduras|El Salvador|Nicaragua|Panama|Peru|Rwanda|Burundi|Mexico|Ecuador|Bolivia|Indonesia|Uganda|Tanzania|Yemen|India|Thailand|Vietnam|Laos|United States|Jamaica|Papua New Guinea)$/iu;
const region=/^[\p{L}\p{M}][\p{L}\p{M} .,'’/-]{1,80}$/u;
function iconCaption(body,clean){
 const image=body.match(/<img\b[^<>]{0,1000}>/iu)?.[0]||'';
 const src=image.match(/\bsrc\s*=\s*(["'])([^"']{1,800})\1/iu)?.[2]||'';
 const file=src.split(/[?#]/u)[0].split('/').at(-1)||'';
 const kind=/^origin_[\w-]{1,55}\.(?:png|jpe?g|svg|webp)$/iu.test(file)?'country':
  /^region_[\w-]{1,55}\.(?:png|jpe?g|svg|webp)$/iu.test(file)?'region':null;
 if(!kind)return null;
 const value=clean(body.replace(/<img\b[^<>]{0,1000}>/giu,' '),95);
 if(value.length>85||(kind==='country'&&!country.test(value))||(kind==='region'&&(!region.test(value)||country.test(value))))
  return null;
 return {kind,value};
}
export function selectedIconCountryRegion(html,{clean}){
 if(typeof clean!=='function')return null;
 const scoped=removeElements(productMarkup(String(html||'')),['nav','aside','footer','header','script','style','noscript','template']);
 const headings=[...scoped.matchAll(/<h([2-6])\b[^<>]{0,600}>([\s\S]{0,1200}?)<\/h\1\s*>/giu)].slice(0,100)
  .map(m=>({start:m.index,end:m.index+m[0].length,level:m[1],...iconCaption(m[2],clean)}));
 const combined=[];
 for(let i=1;i<headings.length;i++){
  const a=headings[i-1],b=headings[i];
  if(a.level!==b.level||b.start-a.end>160||!/^\s*$/u.test(scoped.slice(a.end,b.start)))continue;
  if(!a.kind||!b.kind||a.kind===b.kind)continue;
  const c=a.kind==='country'?a:b,reg=a.kind==='region'?a:b;
  combined.push(reg.value+', '+c.value);
 }
 const unique=[...new Set(combined)];
 return unique.length===1?unique[0]:null;
}
