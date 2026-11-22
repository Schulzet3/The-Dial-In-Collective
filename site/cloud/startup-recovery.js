// Public-only startup recovery: no session, cache, or authorization access.
export function armStartupRecovery(root,{schedule=setTimeout,cancel=clearTimeout,delay=12000}={}){
 const original=root.innerHTML;
 const timer=schedule(()=>{
  if(root.innerHTML!==original)return;
  root.innerHTML='<main class="shell welcome" role="alert"><h1>The Dial In Collective</h1><p class="helper">Opening is taking longer than expected.</p><p><a href="/">Try opening again</a></p></main>';
 },delay);
 return ()=>cancel(timer);
}
