-- =============================================================================
-- Database Linter Fixes (Part 2)
-- Covers: Search path mutable, Anon execution of SECURITY DEFINER functions
-- =============================================================================

-- 1. Fix Mutable Search Path for is_admin
ALTER FUNCTION public.is_admin() SET search_path = public;

-- 2. Revoke Anon / Public Execution of SECURITY DEFINER functions
-- By default, Postgres grants EXECUTE on functions to PUBLIC.
-- We want these strictly for authenticated API calls or admins.

-- generate_practice_session
REVOKE EXECUTE ON FUNCTION public.generate_practice_session(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_practice_session(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_practice_session(jsonb) TO authenticated;

-- get_admin_dashboard_stats
REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;

-- get_question_review
REVOKE EXECUTE ON FUNCTION public.get_question_review(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_question_review(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_question_review(text) TO authenticated;

-- is_admin
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- rls_auto_enable (should ideally be admin-only, but is_admin() check might be inside)
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO authenticated;

-- start_test_session
REVOKE EXECUTE ON FUNCTION public.start_test_session(uuid, text, integer, text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.start_test_session(uuid, text, integer, text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.start_test_session(uuid, text, integer, text[]) TO authenticated;

-- submit_mock_test_attempts
REVOKE EXECUTE ON FUNCTION public.submit_mock_test_attempts(jsonb, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_mock_test_attempts(jsonb, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_mock_test_attempts(jsonb, text, uuid) TO authenticated;

-- submit_question_attempt
REVOKE EXECUTE ON FUNCTION public.submit_question_attempt(text, integer, text, integer, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_question_attempt(text, integer, text, integer, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_question_attempt(text, integer, text, integer, uuid, uuid) TO authenticated;
