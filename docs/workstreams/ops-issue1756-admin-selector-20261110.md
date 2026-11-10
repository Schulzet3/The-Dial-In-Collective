# Issue #1756 — fixture attention selector exactness (November 10, 2026 UTC)

Parent `f2b22c84fc9091c48da6b5464d9d5958763c7b52`. Static verification against the live `renderAdminAttention()` markup shows its unique DOM selector is `section.admin-attention` and heading ID `admin-attention-heading`, not `#admin-attention`. Tightened synthetic Admin browser assertion to test the actual class before the new full-CI run, leaving production UI and data unchanged. Await exact-source browser completion.
