// #33 R67: diagnostic selected first-party Oneska estate geography only.
// Both the current selected hero and named current farm prose are required;
// old SKU, indexed SEO, third-party listing and other coffees are never proof.
import {selectedTandemHeroLocation} from './issue33-r59-selected-tandem-contract.mjs';
const plain=v=>String(v||'').replace(/<script\b[\s\S]*?<\/script>/giu,' ')
 .replace(/<style\b[\s\S]*?<\/style>/giu,' ')
 .replace(/<[^<>]{0,2500}>/gu,' ').replace(/&(?:nbsp|amp|#39);/giu,' ')
 .replace(/\s+/gu,' ').trim();
export function selectedOneskaEmbuEvidence(scoped){
 const html=String(scoped||'');
 if(!html||html.length>1900000)return {hero:false,currentEstate:false,producer:false,process:false};
 const matchedHero=selectedTandemHeroLocation(html,'Oneska - Kenya','Embu Kenya');
 const titles=[...html.matchAll(/<h1\b[^<>]{0,1500}>[\s\S]{0,2500}?<\/h1>/giu)];
 if(titles.length!==1||!matchedHero)return {hero:false,currentEstate:false,producer:false,process:false};
 const after=html.slice((titles[0].index||0)+titles[0][0].length);
 const heroText=plain(after.split(/<h[1-6]\b|<script\b|<section\b[^>]*class=["'][^"']*(?:related|recommend)/iu)[0]).slice(0,250);
 const index=heroText.indexOf('Embu Kenya');
 const prefix=index<0?'':heroText.slice(0,index);
 const hero=index>=0&&index<=100&&!/\b(?:last year|previous(?:ly)?|formerly|historic(?:al)?|other coffee|different coffee|related|recommended|no longer|not from|old lot)\b/iu.test(prefix);
 if(!hero)return {hero:false,currentEstate:false,producer:false,process:false};
 const own=after.split(/<section\b[^>]*class=["'][^"']*(?:related|recommend)|<h1\b/iu)[0].slice(0,30000);
 const prose=plain(own);
 const currentEstate=/\bOneska is the small estate farm of Onesmus Njagi\b.{0,320}?\bon the slopes of Mount Kenya in Embu County\b/iu.test(prose);
 const producer=/\bProducer\s+Onesmus and Karen Njagi\b/iu.test(prose);
 const process=/\bProcessing\s+Washed\b/iu.test(prose);
 return {hero,currentEstate,producer,process};
}
