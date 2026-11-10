# Your First Espresso Shot

*The Dial In Collective · Beginner Guide*

New to the app? Follow these **six simple steps** to set up your equipment, save your first espresso shot, and see what to try next.

> **Historical deployment:** The in-app Getting Started guide and captioned first-shot video were published in Release 13 (October 30, 2026); the owner confirmed both on November 3, 2026. This guide's updated signup section is **source-only for Issue #1756** and not yet released. The prior live invitation flow remains until a separately owner-authorized production release. The in-app guide is implemented in `site/cloud/help.js`.

## Start Here: Your First Shot

### Step 1 — Create an account or sign in

- **Already have an account?** Choose **Sign In**.
- **New here?** Select **Create An Account**, verify your email, then sign in.
- After verifying your email, new accounts show **Account Approval Pending** until an administrator approves the request. Choose **Check Approval Status** to refresh your access.
- **Account Request Declined** means the administrator rejected the signup; the original Auth identity is retained. Contact support if you believe this is a mistake.

Keep your password private. Once released, new registration does not require an invitation code; existing admitted members keep their same accounts and history.

### Step 2 — Set up your equipment

Choose **Set Up My Workspace** and enter these required details:

- **Setup Name** — for example, Home.
- **Basket Dose (g)** — the dose your basket is designed to hold.
- **Grinder Espresso Range** — your **Finest Espresso Setting** and **Coarsest Espresso Setting**.

Use the grinder numbers you actually use for espresso, not its full adjustment range. The finest number must be below the coarsest number.

Your **Machine**, **Grinder**, **Burr Set**, and **Basket Model** are under **Equipment Details (Optional)**. Add them if you'd like, then choose **Create Setup**.

### Step 3 — Add your coffee

From **Coffees**, select **Add Coffee**.

1. Enter **Coffee Name** and **Roaster**.
2. Optionally paste the official product link into **Roaster Page URL** and choose **Autofill From URL**.
3. Review suggested roast, origin, process, tasting notes, and any conflicts against the actual coffee you purchased.
4. Correct any mistakes, leave uncertain information blank, and select **Add Coffee**.

**Good to know:** Autofill only suggests information; it does not automatically verify the coffee. A **Pending** coffee can still be used for your private shots while its identity is reviewed.

### Step 4 — Pick a starting shot style

Open your coffee card. You'll see either:

- **Starting Shot Style** with **Log First Shot** (a one-time first-shot suggestion), or
- **Starting Recommendation** with **Log A Shot**.

To choose a different approach, use **Change Style**. The available styles are **Traditional, Turbo, Fast-Flow, Ristretto, and Lungo**.

These are helpful starting points, not strict rules.

### Step 5 — Measure and rate your shot

In **Log A Shot**, record what you *actually measured*:

- **Dose (g)** — coffee in.
- **Yield (g)** — espresso out.
- **Time (s)** — how long the shot ran.
- **Grind Setting** — the setting you used.

**Yield and time deliberately start blank.** Dose or grind may reuse a previous real measurement. **Use Recommendation** is a separate optional action for a suggested grind or temperature; it does not mean you already used those settings.

Under **How did it taste?**, rate **all five** scales:

- **Extraction**
- **Body**
- **Clarity**
- **Sweetness**
- **Astringency / Dryness** (less dryness is better)

Temperature, when enabled, and **Notes (Optional · Private)** are optional.

### Step 6 — Save and get your next recommendation

Choose **Save Shot & Get Suggestion**.

The logging sheet closes and returns you automatically to the **expanded coffee card**. Look for **Next Shot Recommendation** or **Shot Feedback**.

The app may suggest changing one controllable setting while keeping others steady. Time and taste are measurements, not controls the app can change for you. Try the suggestion—or your own adjustment—and log another shot.

## How Do I Know When I'm “Dialed In”?

A shot is marked **Dialed In** when **all five taste ratings are green**. Select the green option in each row of the app; the selected choice also displays a checkmark.

| Taste rating | Preferred selection in the app |
| --- | --- |
| Extraction | 🟢 Green — Balanced |
| Body | 🟢 Green — Balanced |
| Clarity | 🟢 Green — Distinct |
| Sweetness | 🟢 Green — Exceptional |
| Astringency / Dryness | 🟢 Green — None |

An unusual but plausible time or espresso ratio does **not** disqualify your successful shot. Every other saved shot remains in your personal history, too.

## Explore More When You're Ready

### Review or edit previous shots

Open **Shot History** inside a coffee card. Expand any saved shot to see its measurements, taste ratings, notes, and radar chart.

Choose **Edit** when available. **Make Current Recipe** can select an eligible previously successful shot on your current setup without deleting the other shots.

### Enable Slow Feed or temperature tracking

Go to **Settings → Advanced Setup Options**. Enable **Track Slow Feeding** or **Track Brew Temperature**, then choose **Save Advanced Options**.

When Slow Feed tracking is enabled, a **Slow Feed** choice appears on new shot forms. Don't assume the same grind setting works equally well for standard and slow feeding.

To switch equipment, select your setup name near the top of **Coffees**.

### Understand recommendations and Community

A **Starting Recommendation** is an estimate, not a measurement you made. **Community** shows eligible, validated, anonymized **Dialed In** observations when online—not other members' private notes.

Your notes are private from other members. **Authorized administrators** have a separate, limited ability to review account-linked records and notes.

### Keep your shots safe when offline

The app may show **Synced**, **Offline**, or **Pending**. Open **Cloud Sync Details** to inspect unfinished changes.

**Offline logging** is only available to a previously admitted, locally recognized account. Adding a coffee, URL lookups, and Community require a connection. Don't erase browser storage while shots are waiting to sync.

### Check missing coffee information

Open **Coffee Details**. Don't guess missing or conflicting facts. If the coffee is **Pending**, you may see **Check For A Verified Match**, **Retry Automatic Approval**, or **Retry Official Source Check**. Results depend on the source, and verification isn't guaranteed.

## If You Get Stuck

- **Can't find Log A Shot?** Open the coffee card first.
- **Can't add a coffee?** Reconnect to the internet. Adding a new coffee requires a connection.
- **Shot won't save?** Check your dose, yield, time, grind setting, and all five taste ratings.
- **Access denied?** Reconnect and sign in. New accounts must verify their email and receive an administrator's explicit approval; existing admitted accounts remain unchanged.
- **Something didn't sync?** Open **Cloud Sync Details** and check for **Pending** changes before trying again.

**Still need help? Email [support@dialincollective.com](mailto:support@dialincollective.com).** Tell us what you were trying to do and what happened. Never include a password or authentication link.

## Privacy and Accessibility

You can operate the taste rating controls without relying on color alone. Notes and personal measurements are not published to Community as personal records. Don't share private account details in screenshots.

---

*Delivery: **DEPLOYED and owner live-app accepted**. Published Release 13 (October 30, 2026); the older October 29 source and draft markers were pre-release history. Physical-device, named screen-reader, complete first-shot and direct instrumented HTTP Range checks are not independently certified.*

*Accepted and closed under [Issue #37](https://github.com/Schulzet3/The-Dial-In-Collective/issues/37). [Validation register](ISSUE37_VALIDATION_REGISTER.md) · [Historical video storyboard](ISSUE37_VIDEO_STORYBOARD.md). Any future app-content revision follows the separately authorized release process; this Markdown update does not itself publish app assets.*
