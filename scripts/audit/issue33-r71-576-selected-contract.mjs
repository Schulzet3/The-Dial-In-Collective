// Original603 #576 direct source factory/grower role; not an extractor override.
const clean=markup=>String(markup||'')
 .replace(/<!--[\s\S]*?-->/gu,' ')
 .replace(/<(?:script|style|template|noscript)\b[^>]*>[\s\S]*?<\/(?:script|style|template|noscript)>/giu,' ')
 .replace(/<(?:aside|nav|footer)\b[^>]*>[\s\S]*?<\/(?:aside|nav|footer)>/giu,' ')
 .replace(/<[^>]{0,2000}>/gu,' ')
 .replace(/&(?:nbsp|amp|quot|apos|#39|#x27);/giu,' ')
 .replace(/\s+/gu,' ').trim();
export function selectedKarumandi576DirectFacts(selectedMarkup,headings){
 const heads=Array.isArray(headings)?headings:[];
 const selectedIdentity=heads.length===1&&heads[0]==='Kenya Karumandi';
 const text=clean(selectedMarkup);
 const notesAt=text.search(/\bTasting Notes\b/iu);
 const roastAt=notesAt>=0?text.slice(notesAt+1).search(/\bRoast\b/iu):-1;
 const notes=notesAt>=0&&roastAt>=0?text.slice(notesAt,notesAt+roastAt+1):'';
 const storyAt=text.search(/\bThe Story\b/iu);
 const story=storyAt>=0?text.slice(storyAt,storyAt+6500).split(/\b(?:EXPLORE MORE|Recommended For You)\b/iu)[0]:'';
 return {
  selectedIdentity,
  ownTastingNotes:/\bRed Currant\b[\s\S]{0,120}\bBlackberry\b[\s\S]{0,120}\bDark Chocolate\b/iu.test(notes),
  currentFactoryLocation:/\bKarumandi Coffee Factory sits just south of Mount Kenya\b/iu.test(story),
  countryContext:/\bthis region of Kenya\b/iu.test(story),
  cooperativeSmallholders:/\bBaragwi Farmer.s Cooperative Society\b/iu.test(story)&&/\bapproximately 3,000 smallholder producers\b/iu.test(story),
  managerNotSingleFarmer:/\bAgronomist Nicasius Ndambiri manages Karumandi\b/iu.test(story)&&/\btechnical support for Karumandi.s many producers\b/iu.test(story),
  directWashedSequence:/\bde-pulping and the wet fermentation process\b/iu.test(story)&&/\blaid to dry on a raised bed\b/iu.test(story),
  selectedStoryPresent:storyAt>=0&&story.length>350
 };
}
