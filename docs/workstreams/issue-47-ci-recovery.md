# Issue 47 CI recovery - October 29 2026

The first new Chromium fixture failed because its test locator matched both Edit Details and Cancel. The corrected selector uses the exact visible button label. An intermediate file-update commit lacked a same-commit journal and failed the approval gate; it is explicitly excluded from this replacement branch. This non-force commit carries both the corrected synthetic test and a contemporaneous journal. CI and integration are pending; no provider, authentication, member, database, or production deployment changes.

Second Chromium run 40929722886 reached synthetic edit/save but failed an imprecise get_by_text count; use the actual record h3 text and print its value on failure. Also scope note verification to .admin-record-note instead of matching arbitrary descendants. No production app or member changes. Full CI pending this same-commit test/journal correction.
