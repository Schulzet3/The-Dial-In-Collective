# Notification evidence correction

The initial Issue70 audit overinterpreted task-level notifications_enabled=false and email_enabled=false. Issue28 already records the SAME discrepancy despite the owner's repeatedly accepted proof that global Tasks Push and Email are enabled. No current evidence proves that those settings changed or notification delivery was disabled.

Current disposition: retain accepted owner-setting and Apps Script alert/trigger evidence; do not ask for another screenshot, settings check or reconfirmation. Natural condition-alert receipt remains unverified. Do not create a duplicate monitor, deliberately break backups, or make this discrepancy a release blocker. Exposed tools do not explain or modify these flags, which is an evidence limit rather than proof of a user configuration problem.

The earlier disabled-channel wording in this audit's initial commits/comments is explicitly corrected. Issue title/comment, active matrix/status/report and operations records are corrected; history remains available. A regression assertion prevents reclassifying metadata alone as proven disabled delivery or requiring owner reconfirmation. No task/provider setting was changed.
