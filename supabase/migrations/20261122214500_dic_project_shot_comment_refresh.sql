-- #509 R461: additive documentation correction only. Do not apply in production without new owner Publish.
-- Previous migrations stay immutable; this changes no function behavior or data.
-- Live reviewer/outlier/family worker functions exist. Previous description falsely said unbuilt.
COMMENT ON FUNCTION private.project_shot() IS
'Green shots create or refresh pending Community projections for separate quality review. Corrections update the projection; non-green edits withdraw it. Hiding personal history alone does not withdraw Community evidence. Reviewer, outlier-confirmation and personal-family routines are implemented separately.';
