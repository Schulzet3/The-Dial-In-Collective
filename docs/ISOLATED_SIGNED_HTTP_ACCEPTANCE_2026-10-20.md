# #9 / #34 / #41 — signed-HTTP disposable acceptance results — 2026-10-20 MDT

## Verified source and scope
- **Test source SHA:** `2f328a3ee8080c6ca687c81b4e5dae18c43bc7f1` on `development/backend-foundation` (private repository, GitHub Free; advisory Actions CI).
- **SQL + JWT HTTP CI:** [run 39532058139](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39532058139) **SUCCESS**. Actual job 119000010227 first validated the complete migration baseline, reapplied **30 checked-in migrations** to disposable PostgreSQL 17.11, ran existing SQL integrity regressions, then executed **32 of 32 PASS** against digest-pinned PostgREST 12.2.12 and an ephemeral per-run HMAC-signed JWT issuer. Docker containers and network were removed on exit. The runner was never given live Supabase/Auth/PostgREST secrets, production user data, or live-service API requests.
- **App Node/lint/build/privacy artifact CI:** [39532058116](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39532058116) **SUCCESS**, **477 Node tests passed / 0 failed**, zero ESLint warnings, static build + secret/leak gates passed.
- **Chromium/mobile regression CI:** [39532058117](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39532058117) **SUCCESS**; both jobs passed. The 390px synthetic Community held-shot UI exercise opens Correct/Edit and returns to mandatory confirmation, injects transient Confirm transport failure, shows error on the visible modal, reenables Confirm, retries successfully and resolves. This is **mocked browser/backend**, not an actual live held-shot session.
- **Same-commit approval/checkpoint CI:** [39532058088](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39532058088) **SUCCESS**.

## Signed HTTP isolated scenarios — 32 PASS
1. Six independent synthetic contributors naturally create one held outlier after five valid exact-coffee/style peers.
2. Distinct valid signed ordinary member/admin JWT roles authenticate over HTTP.
3. Only eligible, sanitized Community DTO returned; owner-scoped shots and private notes visible solely to their actual owner.
4. Anonymous, never-admitted signed, disabled signed identities denied private Community and personal RPCs. Server session status cannot misrepresent disabled accounts.
5. Ordinary member and forged `user_metadata`/`app_metadata` cannot read admin dashboard or access overview.
6. Administrator **mutation RPCs** `dic_admin_issue_invite` and `dic_admin_set_member_access` denied to ordinary and forged-claim members. No invitation, membership or admin audit record changed after attempts.
7. Held-shot list returned only to the rightful signed member. Foreign member cannot confirm their shot; stale revision denied and leaves held evidence unchanged.
8. Owner successfully confirms an unusual-but-plausible held shot; repeat confirmation is idempotently denied.
9. Substantive shot correction invalidates prior confirmation and restores held review; correction to an ordinary plausible time requalifies same projection.
10. Personal Hide preserves eligible anonymous contribution. Non-green correction withdraws it; restoring green requalifies it.
11. Same cryptographically valid JWT is rejected immediately after disabling that synthetic member. Invalid HMAC signature is rejected before DB authorization.
12. Private notes are still present in isolated owner data; no foreign member access or Community payload leak.

**Evidence category:** Cryptographically signed HS256 JWT verified by **isolated PostgREST** with synthetic Auth schema/identities. This is materially stronger than a simulated `request.jwt.claim.sub` transaction, but **it is not a GoTrue-issued token, a real production disabled session, or an actual production held-shot browser clickthrough**. The exact published production network/app behavior cannot be inferred from the disposable fixture alone.

## Earlier CI failures preserved (test harness, not production incidents)
- [39531635134](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39531635134): ambiguous SQL fixture variable `shot_id`; fixed in `ba605df`.
- [39531730084](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39531730084): Docker internal network prevented runner loopback health check despite healthy PostgREST; fixed in `f0d3aeb` with private bridge, no host-exposed PostgreSQL and runner-loopback API only.
- [39531926592](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39531926592): test incorrectly treated own shot as a foreign leak; expected own-only results corrected in `2f328a3ee8080c6ca687c81b4e5dae18c43bc7f1`. The four first signed assertions passed before this harness failure.
- **Final [39532058139](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39532058139) SUCCESS**, all 32 real signed-isolated assertions passed.

## Independently rechecked live providers
- **Netlify:** READY/current production deploy `6ad7be20bf672d5c8936f19a`, source `e7e16e5e13b35a6f4b6aa81db5b09b93b1aefc60`; only nonproduction Netlify SSO configured.
- **Supabase production:** 18 personal shots / 18 notes; 2 eligible, 0 held Community rows; 5 admitted enabled users / 1 administrator; 30 installed migrations. **No hosted writes, account changes, migration application, Edge/auth config, invitations, shot edits, paid resource or deployment** during this acceptance.
- **Production signed read evidence remains distinct:** existing owner-run admin v1 `32 PASS/1 mistaken test expectation` (legitimate admin coffee submission review), member v2 `33 PASS/0 FAIL`. Provider logs corroborate signed member 403 admin-read denials and 200 admitted Community reads in the actual report time windows.

## Accurate remaining closure gates
| Issue | Verified now | Still NOT verified / needs a real matching event |
|---|---|---|
| [#9](https://github.com/Schulzet3/The-Dial-In-Collective/issues/9) | Server eligibility and corrections deployed; synthetic SQL and signed-isolated ownership/confirm/correction/revision/Hide/withdrawal tests PASS; real production member Community reads PASS | Actual **production** held-shot Confirm/Correct with real member and revision/error lifecycle (no live held row exists), plus wrong-member production signed mutation attempt |
| [#34](https://github.com/Schulzet3/The-Dial-In-Collective/issues/34) | Published retry code verified by source and synthetic Chromium; real signed-isolated held RPC negative/stale/success passes | Genuine **production member** actually encounters held Confirm failure/error/retry/Correct and sees recovery on deployed interface |
| [#41](https://github.com/Schulzet3/The-Dial-In-Collective/issues/41) | Existing real production owner/nonadmin signed READ reports plus provider log corroboration, isolated signed admin-MUTATION/disabled/nonadmitted denials | Genuine GoTrue-issued **production** denied admin-MUTATION request and genuine live disabled/nonadmitted signed identity. There are none in current population. Original live requirements must not be relabeled PASS |

**Disposition:** All three remain OPEN for their original real-hosted acceptance criteria; **engineering/code/regression gaps shown by available tests are complete**. Closing them today would require a clear, **separately approved scope change** formally substituting isolated results for missing genuine production scenarios, documented in both Master Specification and Decision Ledger with exactly what is superseded, or a separately authorized, controlled real production test scenario. A blanket testing approval alone did not change the Locked requirement. Do not produce misleading acceptance receipts. No repeat of the successful real-member read reports needed.

**Next action:** Protect live history; obtain a naturally held production shot or a scoped fresh production-fixture authorization that identifies nonadmin account/shot lifecycle and backup/cleanup; for #41 a genuine revoked/never-admitted session needs similarly separately authorized account state or a naturally available session. Prefer the former when it occurs rather than making artificial production data.