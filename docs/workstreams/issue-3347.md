# Issue #3347 — READY must be publish-prevalidated [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=023f9cbd0ecc3779fff3f65ab441865fa1ef43b9 preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d
Owner expressly approves nonpublishing proactive READY source isolation and exact five-check candidate pre-certification, superseding only #457 prohibition on automatic candidate preparation. Single guarded Publisher, new explicit Publish requirement, one-use grants, privacy, Auth, SQL, encrypted backups, history and credits unchanged.

Current observed gap: development approval run 44460771215 SUCCESS for 39 individually source-certified READY queue rows, of which 29 had newer source drift. That audit is NOT proof of a combined tested immutable release. Main PR #3351 adds deterministic source-only freeze on Ready queue updates plus bounded hourly recovery; candidate runner must pass exact official CI and provider remains NOT_APPLICABLE before Publish. Historical #2837 unfinished PRs share same main scripts; preserve and reconcile, never blindly merge stale patches.

Acceptance remaining: prove main PR CI/merge; prove current READY-only candidate isolation/CI; reject prospective READY promotion lacking immutable candidate receipt; correct any actual source incompatibility; document exact five checks or HOLD. No publication authorized.\n