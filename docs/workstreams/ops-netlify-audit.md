# Netlify audit remediation — Issue #508

## November 4, 2026 UTC — postrelease smoke evidence-bound correction

**Authority:** Owner's hourly Netlify read/fix request in [Issue #508](https://github.com/Schulzet3/The-Dial-In-Collective/issues/508). No permission to publish, alter provider settings/secrets or member data.

**Verified baseline:** main `a5b5c75933501d778ea01cd02e82589f51ef7cd6`; independently current Netlify production deploy `6aea62463d08ddf08e0bec7b` on `release/production` SHA `31c66832a28247e657a2bf89592ebc1e2f48dfc5` at audit time. Original smoke script pinned **older** immutable deploy `6adabcecd4a2a68e94cdc09a` and its workflow still claimed testing the actual/pinned release. Source review confirms it is a manual or file-change-triggered read-only browser check, not part of publication.

**Finding N508-006 (confirmed QA scope defect):** Without a current provider-matched immutable deploy ID, the old smoke could pass a historic deploy as if the current immutable release were tested. Preserve browser smoke, signed-out privacy and main-only workflow; remove hard-coded historical URL; an explicit Netlify deploy ID is required to include immutable testing. On automatic workflow-file-only push, test the actual live primary and print **UNVERIFIED** for immutable deploy (never silently credit it). On manual dispatch, independently verify then supply a current ID. Validate the 24-hex format; never request provider tokens. No production writes or new access.

**Changed paths:** `scripts/audit/live-postrelease-smoke.py`, `.github/workflows/dic-live-postrelease-smoke.yml`, `.github/workflows/release-controller-ci.yml`, `tests/postrelease-smoke-scope.test.mjs`, and this same-commit journal. All other Git trees preserved. Ordinary commit has `[skip netlify]`.

**Acceptance required:** Python syntax check and narrow static invariant test in exact-source main CI; PR checks must PASS and nonforce integration/readback precede VERIFIED. Do not mark READY from a PR alone; this changes ops QA only, not deployable app. If hosted browser smoke cannot run, disclose it as UNVERIFIED, not PASS. Independently verify live Netlify to establish that a caller-provided immutable ID is current.

**Next:** inspect PR/job and merged SHA, record CI and provider readback in Issue #508; continue manifest-pinned all-fields Netlify review. Preserve #417 sole Git publisher and #368 archived/inert source modules.
