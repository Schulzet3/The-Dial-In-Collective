// Public, source-reviewed Issue #37 help content. No account data or third-party requests.
export const WALKTHROUGH_VIDEO='/media/first-shot-walkthrough.mp4';
export const WALKTHROUGH_CAPTIONS='/media/first-shot.en.vtt';
export const WALKTHROUGH_POSTER='/media/first-shot-poster.svg';
export const WALKTHROUGH_SHA256='e8235c3c03f17541f07e0a3f0f9907f61c90c748586f069dfb93b7d49591b2aa';
export function walkthroughMarkup(){
 return [
"<section class=\"help-walkthrough\" aria-label=\"First espresso shot video\">",
"<p class=\"helper help-lead\">A guided first shot, from setting up your grinder through reviewing the next recommendation. About 2 minutes 16 seconds.</p>",
"<figure class=\"help-video-frame\">",
"<video data-walkthrough-player controls playsinline preload=\"metadata\" width=\"1600\" height=\"900\" aria-label=\"The Dial In Collective first espresso shot walkthrough\" poster=\"/media/first-shot-poster.svg\">",
"<source src=\"/media/first-shot-walkthrough.mp4\" type=\"video/mp4\">",
"<track kind=\"captions\" srclang=\"en\" label=\"English captions\" src=\"/media/first-shot.en.vtt\" default>",
"Your browser does not support video playback. Use the written guide below.",
"</video>",
"<figcaption class=\"helper\">Example app interactions use synthetic coffee and account data; no real member records are shown.</figcaption>",
"</figure>",
"<p class=\"help-video-error helper\" data-walkthrough-error role=\"status\" hidden>Video is unavailable. Check your connection or use the written guide below.</p>",
"<div class=\"help-actions\"><button type=\"button\" class=\"secondary full\" data-action=\"getting-started-guide\">Read Getting Started Guide</button>",
"<a class=\"help-transcript-link\" href=\"/media/first-shot-transcript.txt\" download>Download video transcript</a></div>",
"<details class=\"help-transcript\"><summary>Transcript and accessible alternative</summary>",
"<ol><li>Sign in to your invited account.</li><li>Set up your espresso equipment.</li><li>Add your coffee and review its source details.</li><li>Choose a starting shot style.</li><li>Record the measurements you actually took.</li><li>Rate all five taste scales.</li><li>Save the shot and review one suggested next change.</li><li>All five green ratings indicate Dialed In.</li><li>Explore saved Shot History.</li></ol>",
"</details></section>",
 ].join('');
}
export function gettingStartedMarkup(){
 return [
"<section class=\"help-guide\" aria-label=\"Getting started with espresso\">",
"<p class=\"helper help-lead\">Follow these six steps to log your first shot, rate it, and see your next recommendation.</p>",
"<ol class=\"help-steps\">",
"<li><h3>Create an account or sign in</h3><p>Choose <strong>Sign In</strong> or <strong>Create An Account</strong>. Verify your email when creating an account. If prompted for <strong>Your Invitation</strong>, enter your personal invitation code. Never share your password or code.</p></li>",
"<li><h3>Set up your equipment</h3><p>Choose <strong>Set Up My Workspace</strong>. Enter your <strong>Setup Name</strong>, <strong>Basket Dose (g)</strong>, and <strong>Finest Espresso Setting</strong> / <strong>Coarsest Espresso Setting</strong> within your normal espresso range. Optional equipment details can be added later. Select <strong>Create Setup</strong>.</p></li>",
"<li><h3>Add a coffee</h3><p>Choose <strong>Add Coffee</strong>. Enter coffee name and roaster, optionally paste the official <strong>Roaster Page URL</strong>, and select <strong>Autofill From URL</strong>. Review any suggestions, correct mistakes, leave unknown facts blank, and save. Pending coffees still allow private shot logging.</p></li>",
"<li><h3>Choose a shot style</h3><p>Open the coffee card. Review the <strong>Starting Recommendation</strong> or one-time <strong>Starting Shot Style</strong> and use <strong>Change Style</strong> if you prefer another approach. The styles are starting guidelines, not pass/fail rules.</p></li>",
"<li><h3>Log and rate the shot</h3><p>Choose <strong>Log A Shot</strong> or <strong>Log First Shot</strong>. Record actual <strong>Dose (g)</strong>, <strong>Yield (g)</strong>, <strong>Time (s)</strong>, and <strong>Grind Setting</strong>. Yield and time are blank for a new shot. <strong>Use Recommendation</strong> copies a suggestion only when you select it. Rate all five: Extraction, Body, Clarity, Sweetness and Astringency / Dryness. Notes and optional tracked temperature do not need to be filled in.</p></li>",
"<li><h3>Save and see your next recommendation</h3><p>Select <strong>Save Shot &amp; Get Suggestion</strong>. The sheet closes and the expanded coffee card displays <strong>Next Shot Recommendation</strong> or <strong>Shot Feedback</strong>. You can make your own adjustments. Use <strong>Shot History</strong> to inspect and edit measurements and ratings later.</p></li>",
"</ol>",
"<section class=\"help-dialed\" aria-labelledby=\"help-dialed-title\"><h3 id=\"help-dialed-title\">When is a shot Dialed In?</h3>",
"<p>All five taste choices must be <strong>green</strong>: Extraction <strong>Balanced</strong>, Body <strong>Balanced</strong>, Clarity <strong>Distinct</strong>, Sweetness <strong>Exceptional</strong>, and Dryness <strong>None</strong>. Selected choices show a checkmark, so color is never the only cue.</p></section>",
"<details class=\"help-more\"><summary>More ways to use the app</summary>",
"<p>In <strong>Settings → Advanced Setup Options</strong>, you can enable <strong>Track Slow Feeding</strong> and <strong>Track Brew Temperature</strong>. Slow Feed can require a different grind setting.</p>",
"<p><strong>Community</strong> displays eligible anonymized Dialed-In shots, not members’ private notes. An authorized administrator may review account-linked records and notes separately.</p>",
"<p>Previously admitted accounts can log personal shots offline. Watch the <strong>Synced</strong>, <strong>Offline</strong> and <strong>Pending</strong> status, and use <strong>Cloud Sync Details</strong> before clearing browser data. Adding coffees, source checks and Community require an internet connection.</p>",
"</details>",
"<p class=\"help-support\">Need help? <a href=\"mailto:support@dialincollective.com\">support@dialincollective.com</a>. Never send passwords or invitation codes.</p>",
"</section>",
 ].join('');
}
