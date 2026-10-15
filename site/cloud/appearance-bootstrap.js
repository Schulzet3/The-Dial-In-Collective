// Runs before first paint. Only a non-sensitive display preference is stored.
(()=>{let mode='system';try{mode=localStorage.getItem('dic_appearance_v1')||'system';}catch{}
const dark=mode==='dark'||(mode!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light';})();
