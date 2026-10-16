# DNS-provider portability and safe recovery — 2026-10-16

**Current conclusion: A new DNS provider is NOT required before deleting the completed disposable Supabase/Netlify recovery test.** The owner successfully signed into a fully rebuilt hosted Supabase+Netlify application with exact archived Auth/admin, 4 coffees and 14 shots. A registrar nameserver move is a **distinct, higher-risk failover test, not part of that verified core hosted recovery**. Do not change production nameservers, Cloudflare rules, existing inbound email, production Netlify/Supabase configuration, Resend keys, or the apex redirect merely to test migration.

## Portable documentation artifact (sanitized)

Prepared a private conversation ZIP **`DIC_DNS_Recovery_Readiness_2026-10-16.zip`** (6,147 bytes, SHA-256 `ca545693c628b06b7e15f0ccbdb53ac7a007f8198d4ec703feb969733fffae20`) containing:
- `READ_ME_FIRST.md`: Cloudflare-to-other-provider dependency and failover steps, protection and cleanup instructions.
- `records.json`: 11 documented DNS record types/names, observed values with **null** for truncated keys and unknown MX priorities; Cloudflare-specific redirect/email forwarding configuration and replacement requirements.
- `validate.py`: no-network standard-library checks for the 11 known records, Netlify CNAME, Resend send CNAMEs, SPF, Cloudflare MX names, nonportable redirect placeholder, 302 and catch-all-off behavior. Test **PASS** for internal consistency. **It explicitly reports “NOT VERIFIED”** for source full keys and a live provider cutover. No syntax-only validator can prove failover.

**No BIND DNS import file is offered until a real Cloudflare zone export supplies full record data.** The package must never be deployed as an incomplete or provider-portable zone.

## Observed records from prior project evidence

| Type | Name | Observed value / honest gap | Scope |
|---|---|---|---|
| A | apex `@` | `192.0.2.1`, **Cloudflare PROXIED ONLY** | NOT portable; reserved documentation address enables Cloudflare redirect rule |
| CNAME | `app` | `the-dial-in-collective.netlify.app` | DNS only; portable (site must still own domain in Netlify) |
| CNAME | `rsend.auth` | `rsend.forge.rmta.net` | DNS only; Resend outbound auth |
| CNAME | `send.auth` | `send.forge.rmta.net` | DNS only; Resend outbound auth |
| MX ×3 | apex `@` | `route1.mx.cloudflare.net`, `route2.mx.cloudflare.net`, `route3.mx.cloudflare.net`; **priorities not visible** | Cloudflare Email Routing service dependency |
| TXT | `cf2024-1._domainkey` | DKIM `v=DKIM1; h=sha256; k=rsa; p=…` **truncated** | Cloudflare forwarding DKIM |
| TXT | apex `@` | `v=spf1 include:_spf.mx.cloudflare.net ~all` | Cloudflare mail routing |
| TXT | `resend._domainkey.auth` | Resend DKIM `p=MIGfMA0GCSq…` **truncated** | Resend outgoing verification |
| TXT | `subdomain-owner-verification` | present, exact token **not transcribed** | Provider ownership |
 
Root rule independently owner-accepted in `Build Web App.pdf`: **`Main domain to app`**, wildcard source `http*://dialincollective.com/*`, target `https://app.dialincollective.com/${2}`, **302**, preserve query ON. Status 302 is intentional because apex is reserved for a future public homepage. Cloudflare supports the proxied reserved-address A record only while its proxy/redirect rule is active; ordinary DNS alone cannot produce an HTTP redirect.

Inbound forwarding owner-accepted: `support@dialincollective.com`, **catch-all OFF**, destination a **private Apple relay address**, prior real message delivered. The address has not been added to the repository. If moving DNS away from Cloudflare, the new provider must establish an alternative inbound forwarding service or prove the existing Cloudflare Email Routing still functions; simply copying MX/SPF/DKIM is not a verified mail-service migration. Do not repoint MX until replacement mailbox delivery is demonstrably working.

The 11-record screenshot contains **no visible `_dmarc` TXT**; review this separately as optional security hardening, not as proof current Resend or Cloudflare mail routing is broken. There is no reason to add new DNS changes as a prerequisite to cleanup.

## Recommended **one-time, read-only export** before future failover

From logged-in Cloudflare account: select `dialincollective.com` → DNS → Records → Import and Export → **Export**, download **original BIND zone file**. Store privately alongside the owner's encrypted backup and `~/.dic-backup/` recovery-key escrow. This supplies full DKIM TXT strings, exact MX priorities, and verification text missing from screenshots. Treat owner-uploaded export as reference; do not commit any long provider-specific verification token into public docs unnecessarily. The export **does not capture Redirect Rules or Email Routing's target/catch-all**: back those up separately in secure recovery instructions.

To actually migrate later:
1. Check registrar custody, nameserver authority and **DNSSEC DS** at parent before switch.
2. Prepare new DNS zone from unmodified export **without changing delegation**. Replace Cloudflare-only apex `192.0.2.1` with a **real HTTPS 302 path/query-preserving redirect hosting solution**; keep app Netlify CNAME.
3. Replace/independently validate Cloudflare inbound `support@` forwarding and its provider-specific MX/SPF/DKIM. Preserve Resend sender records for outgoing auth, or reverify if Resend domain/key changes.
4. Validate new provider nameservers directly and external resolvers, HTTPS/TLS, Netlify domain ownership, Supabase Auth callback and DNSSEC.
5. Obtain **explicit new owner approval** before registrar NS/DS switch, watch login/302 path+query/inbound email/outbound Auth, and have rollback ready.

**Status boundaries:** owner-tested original redirect, DNS and forwarding **PASS for current Cloudflare configuration**; application/backend hosted reconstruction **PASS**; offline 11-record inventory/consistency **PASS**; full TXT values/MX priority backup **PENDING actual export**; entirely separate alternate provider/registrar delegation and failover **NOT TESTED**. No second DNS provider was provisioned; no additional charges or production writes.

## Scope of temporary recovery teardown

Already authorized for removal after core hosted recovery success:
- **Temporary Supabase:** `DIC Isolated Recovery Drill 2026-10-16`, ref `bgstplvefumsnplhqpvd` (pause requested successfully and was `PAUSING` at initial check). Manual Delete project is an irreversible owner dashboard step.
- **Temporary Netlify:** `dic-recovery-20261016`, site `fd4a4dba-0c71-4b06-be63-9f5f689aba1b`. Manual Delete project through Project configuration → Danger zone. Do not delete production `the-dial-in-collective`.
- **Temporary Resend:** only separately created `DIC Recovery Test` sending API token; revoke remotely in Resend then remove its saved local copy. Never revoke original production SMTP key or sending-domain setup.
- Downloaded Mac one-time rewrap/helper/ciphertext/website ZIPs can be discarded, but **never remove** owner's permanent private recovery identity in `~/.dic-backup/`, second offline escrow, normal nightly encrypted artifacts, Google Drive originals, or the recovery workflow/docs.

Source-of-truth product decisions (including the temporarily-302 apex reserved for future homepage) remain unchanged. Sources: [Cloudflare DNS export](https://developers.cloudflare.com/dns/manage-dns-records/how-to/import-and-export/), [Cloudflare redirects](https://developers.cloudflare.com/fundamentals/manage-domains/redirect-domain/), [Cloudflare email routing domains](https://developers.cloudflare.com/email-service/configuration/domains/), [Netlify external DNS](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/). For prior owner screenshot/acceptance evidence, see [hosted provider inventory](HOSTED_PROVIDER_RECOVERY_INVENTORY_2026-10-16.md). For exact administered/Auth restore results see [managed hosted restoration report](HOSTED_RECOVERY_MANAGED_SUPABASE_DRILL_2026-10-16.md).
