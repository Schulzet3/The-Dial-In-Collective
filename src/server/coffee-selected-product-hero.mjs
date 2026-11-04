import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {coffeeHtmlAttributes} from './coffee-product-scope.mjs';
// Literal selected-product hero facts, never navbar/related coffee data.
// A location above the exact coffee heading and its adjacent three-note
// profile are stronger than title-derived municipality names or marketing SEO.
const decode=value=>String(value||'').replace(/&amp;/gi,'&').replace(/&nbsp;/gi,' ')
 .replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
 .replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
const norm=value=>decode(value).normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const countries='Papua New Guinea|Costa Rica|El Salvador|Guatemala|Brazil|Mexico|Peru|Ethiopia|Kenya|Colombia|Honduras|Nicaragua|Rwanda|Uganda|Indonesia|Panama|Ecuador|Burundi|Tanzania|Yemen|India|Thailand|Vietnam';
const validOrigin=value=>countries.split('|').some(country=>value.toLowerCase().endsWith(', '+country.toLowerCase()));
const notesFromHero=value=>{
 const parts=decode(value).split(/\s*\|\s*/).map(x=>x.trim()).filter(Boolean);
 if(parts.length<3||parts.length>6||parts.some(x=>x.length<2||x.length>50||/\d{2,}/.test(x)))return '';
 return parts.join(', ');
};
export function selectedCoffeeHeroFacts(html,{name}={}){
 if(typeof html!=='string'||html.length>1900000||!name)return null;
 // Require the selected coffee heading to sit immediately below the country
 // banner. A related-product tile elsewhere cannot borrow these facts.
 const regex=/<p\b[^<>]{0,1800}>\s*Single[- ]Origin\s*\|\s*([^<>]{3,160})<\/p>([\s\S]{0,1700}?)<h1\b[^<>]{0,1200}>([\s\S]{1,1400}?)<\/h1>/gi;
 const rows=[];
 for(const m of html.matchAll(regex)){
  const heading=decode(m[3]).replace(/\b(?:organic|new)\b/gi,'').trim();
  const selected=norm(name),label=norm(heading);
  if(!selected||(!label.includes(selected)&&!selected.includes(label)))continue;
  const origin=decode(m[1]),current=validOrigin(origin)?origin:'';
  const near=html.slice(m.index+m[0].length,m.index+m[0].length+1800);
  const noteRow=near.match(/<p\b[^<>]{0,1400}>([^<>]{5,300})<\/p>/i);
  const tasting_notes=notesFromHero(noteRow?.[1]||'');
  if(current||tasting_notes)rows.push({origin:current,tasting_notes,raw_notes:decode(noteRow?.[1]||'')});
  if(rows.length>2)break;
 }
 if(rows.length!==1)return null;
 return rows[0];
}
export function hasIncompatibleCurrentTastingList(html,candidate){
 if(typeof html!=='string'||!candidate)return false;
 const normNotes=value=>norm(value).replace(/\band\b/g,'');
 const desired=normNotes(candidate);
 const rows=[...html.matchAll(/<(?:p|li|dd)\b[^<>]{0,900}>\s*(?:Tasting|Cupping|Flavou?r)\s+Notes?\s*:\s*([^<>]{4,240})<\/(?:p|li|dd)>/gi)].slice(0,12);
 return rows.some(m=>{
  const value=decode(m[1]);
  return value.length>4&&!/\b(?:descriptors of|for more info|learn more|never add flavoring)\b/i.test(value)&&normNotes(value)!==desired;
 });
}

// Exact selected current-origin captions outrank an uncorroborated regional
// SEO detail. This helper only identifies the directly printed country.
export function selectedCurrentOriginCaption(html,{name=''}={}){
 if(typeof html!=='string'||html.length>1900000||!name)return null;
 const {nodes,truncated}=coffeeHtmlElements(html);
 if(truncated)return null;
 const titles=nodes.filter(node=>node.tag==='h1'&&norm(html.slice(node.headEnd,node.contentEnd))===norm(name));
 if(titles.length!==1)return null;
 const ancestors=index=>{
  const out=[];
  for(let n=index,depth=0;n!==null&&depth<128;n=nodes[n]?.parent??null,depth++)out.push(n);
  return out;
 };
 const titleChain=ancestors(nodes.indexOf(titles[0]));
 const root=titleChain.find(i=>['product-sticky','article'].includes(nodes[i].tag));
 if(root===undefined)return null;
 const matches=[];
 for(let i=0;i<nodes.length;i++){
  const node=nodes[i],cls=(coffeeHtmlAttributes(node.attributes).class||'').split(/\s+/u);
  if(node.tag!=='div'||!cls.includes('coffee-fact')||!ancestors(i).includes(root))continue;
  const children=nodes.filter(child=>child.parent===i&&child.tag==='div');
  if(children.length!==2)continue;
  const roles=child=>(coffeeHtmlAttributes(child.attributes).class||'').split(/\s+/u);
  const label=children.find(child=>roles(child).includes('coffee-fact__label'));
  const value=children.find(child=>roles(child).includes('coffee-fact__value'));
  if(!label||!value||norm(html.slice(label.headEnd,label.contentEnd))!=='current origin')continue;
  const country=decode(html.slice(value.headEnd,value.contentEnd));
  if(country.length>80||!countries.split('|').some(candidate=>norm(candidate)===norm(country)))return null;
  matches.push(country);
 }
 return matches.length===1?{origin:matches[0]}:null;
}
