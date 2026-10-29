-- Issue #47: fix live Admin Pending comparison 403 from missing nested function EXECUTE.
-- The existing private SECURITY DEFINER function requires admitted member and Admin.
-- No member data, function bodies, role checks, or tables are changed.
REVOKE ALL ON FUNCTION private.dic_admin_review_candidates(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.dic_admin_review_candidates(uuid) TO authenticated;
