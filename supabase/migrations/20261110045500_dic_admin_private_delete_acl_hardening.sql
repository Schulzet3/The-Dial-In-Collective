-- #509: Normalize two older private admin-delete SECURITY DEFINER grants.
-- Live catalog: these were the ONLY 2 of 68 app SECURITY DEFINER functions
-- with default PUBLIC EXECUTE. Their public invoker wrappers and internal
-- admin/require_member guards remain unchanged. Preserve authenticated
-- admin browser execution and service-role compatibility explicitly.
-- Development-only until separately owner-authorized publication.
REVOKE EXECUTE ON FUNCTION private.dic_admin_delete_preview(text,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.dic_admin_delete_record(text,uuid,bigint,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.dic_admin_delete_preview(text,uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION private.dic_admin_delete_record(text,uuid,bigint,jsonb) TO authenticated,service_role;
