// Pure view: account confirmation is a dedicated page, never a transient toast.
import {e,icon,button} from '../lib/ui.js';

export function emailConfirmationView(address){
 const safeAddress=e(String(address||'').trim()||'your email address');
 return `<section class="welcome cloud-auth email-confirmation" aria-labelledby="confirmation-title">
  <div class="confirmation-icon">${icon('mail',36)}</div>
  <p class="eyebrow">One More Step</p>
  <h2 id="confirmation-title" tabindex="-1">Check your email to confirm your address</h2>
  <p class="confirmation-intro">We requested a verification link for</p>
  <p class="confirmation-address">${safeAddress}</p>
  <div class="confirmation-instructions">
   <strong>Open the email and follow the verification link.</strong>
   <p>Once your address is confirmed, return here and sign in. If the email is missing, check your spam or junk folder.</p>
  </div>
  <div class="confirmation-buttons">
   ${button('I verified my email · Sign In','auth-view','data-view="signin"','primary full')}
   ${button('Use A Different Email','auth-view','data-view="signup"','text-button')}
  </div>
 </section>`;
}
