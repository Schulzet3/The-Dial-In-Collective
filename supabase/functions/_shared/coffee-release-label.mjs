// A recurring calendar window describes when coffee is normally harvested;
// it does not identify one year's release. Share the exact bounded grammar
// between preview suggestions and trusted source verification.
const MONTH='(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?';
const SEASON='(?:spring|summer|autumn|fall|winter)';
const TOKEN='(?:'+MONTH+'|'+SEASON+')';
const WINDOW=new RegExp('^'+TOKEN+'(?:\\s*(?:[-–—−,/&+]|\\b(?:and|to|through|until)\\b)\\s*'+TOKEN+')*\\.?$','i');
const CAPTION='(?:(?:harvest|crop)(?:\\s+(?:period|season|window|year|dates?))?|season)';
const PREFIX=new RegExp('^'+CAPTION+'\\b\\s*[:：–—-]?\\s*','i');
const SUFFIX=new RegExp('\\s+'+CAPTION+'\\s*[.]?$','i');

export function isRecurringCoffeeHarvestWindow(value){
 if(typeof value!=='string'||value.length>500)return false;
 let text=value.normalize('NFKC').replace(/\s+/g,' ').trim();
 // A dated range or an explicit numbered lot remains eligible for the
 // existing, separate source-proof checks. This predicate approves nothing.
 if(!text||/\d/.test(text))return false;
 // A label delimiter can survive adjacent HTML spans as part of the value.
 // Removing only leading colons does not discard a distinctive release
 // word; the remaining complete string must still be a calendar window.
 text=text.replace(/^[:：]+\s*/u,'').replace(PREFIX,'').replace(SUFFIX,'')
  .replace(/^[:：]+\s*/u,'').replace(/^(?:from|between)\s+/i,'').trim();
 return WINDOW.test(text);
}

export function isGenericCoffeeLotLabel(value){
 if(typeof value!=='string'||value.length>500)return false;
 const text=value.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim()
  .replace(/^[:：]+\s*/u,'').replace(/^(?:lot|batch)(?:\s+(?:type|category))?\s*[:：]\s*/i,'')
  .replace(/[–—−-]/g,' ').replace(/\s+/g,' ').replace(/\.$/,'').trim();
 // Production categories are not distinctive lot names. Match only the
 // complete category: a number, letter or named qualifier must still pass
 // through the existing exact source-proof checks.
 return /^(?:lot|batch|(?:micro|nano)\s*lot|(?:communal|community|regional|single\s*origin|blend(?:ed)?)(?:\s+lot)?)$/.test(text);
}
