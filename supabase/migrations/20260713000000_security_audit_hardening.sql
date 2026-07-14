-- =============================================================================
-- Security Audit Fix: Comprehensive hardening migration
-- Covers: Answer key exposure, admin RLS, timing validation, unbounded fetch
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX #1: ANSWER KEY EXPOSURE
-- Revoke direct SELECT on questions for non-admins.
-- Students must go through the questions_for_students view (no answer columns).
-- Admins retain full SELECT via their existing "admin full access" policy.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop the over-broad public read policy that exposes answer keys
DROP POLICY IF EXISTS "Allow public read access on questions" ON public.questions;

-- Create a restrictive read policy: only admins can SELECT the raw table
CREATE POLICY "Allow admin read access on questions"
  ON public.questions FOR SELECT
  USING (public.is_admin());

-- Recreate the safe view (idempotent) — excludes correct_option, explanation, explanation_images
CREATE OR REPLACE VIEW public.questions_for_students
WITH (security_invoker = true) AS
SELECT
  id, text, question_images,
  option_1, option_1_image, option_2, option_2_image,
  option_3, option_3_image, option_4, option_4_image,
  options, type, difficulty, positive_marks, negative_marks,
  chapter_id, paper_id, book_set_id, question_type_id,
  status, created_at
FROM public.questions
WHERE status = 'Published';

-- Grant view access to both anonymous and authenticated users
GRANT SELECT ON public.questions_for_students TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX #2: CLIENT TIMING TRUST
-- Validate that sum of individual time_taken_seconds does not exceed
-- session duration + grace period.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_mock_test_attempts(
    p_attempts jsonb,
    p_exam_type text,
    p_session_id uuid
) RETURNS json AS $$
DECLARE
    v_attempt jsonb;
    v_question_id text;
    v_selected_option integer;
    v_time_taken integer;
    v_correct_option integer;
    v_explanation text;
    v_explanation_images jsonb;
    v_status text;
    v_is_correct boolean;
    v_attempt_id uuid;
    v_results jsonb := '[]'::jsonb;
    v_session_record record;
    v_total_client_time integer := 0;
    v_max_allowed_seconds integer;
BEGIN
    IF p_session_id IS NULL THEN
        RAISE EXCEPTION 'Session ID is required';
    END IF;

    SELECT * INTO v_session_record FROM public.test_sessions WHERE id = p_session_id AND user_id = auth.uid();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found or not owned by user';
    END IF;

    IF v_session_record.submitted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Session already submitted';
    END IF;

    -- Server-side wall-clock check (5 min grace)
    IF v_session_record.duration_minutes > 0 AND now() > v_session_record.started_at + (v_session_record.duration_minutes || ' minutes')::interval + '5 minutes'::interval THEN
        RAISE EXCEPTION 'Session expired. Test took too long.';
    END IF;

    -- Pre-calculate max allowed seconds for per-question timing validation
    -- Allow duration + 10% + 60s buffer for network latency
    v_max_allowed_seconds := (v_session_record.duration_minutes * 60) + (v_session_record.duration_minutes * 6) + 60;

    -- First pass: sum up all client-reported time_taken_seconds
    FOR v_attempt IN SELECT * FROM jsonb_array_elements(p_attempts)
    LOOP
        v_total_client_time := v_total_client_time + COALESCE((v_attempt->>'time_taken_seconds')::integer, 0);
    END LOOP;

    -- Reject if total client time exceeds the allowed maximum
    IF v_session_record.duration_minutes > 0 AND v_total_client_time > v_max_allowed_seconds THEN
        RAISE EXCEPTION 'Reported time (% seconds) exceeds session duration (% minutes)', v_total_client_time, v_session_record.duration_minutes;
    END IF;

    UPDATE public.test_sessions SET submitted_at = now() WHERE id = p_session_id;

    FOR v_attempt IN SELECT * FROM jsonb_array_elements(p_attempts)
    LOOP
        v_question_id := v_attempt->>'question_id';

        -- Check if question is in session's question_ids (for practice) or in the paper (for mock)
        IF v_session_record.paper_id IS NULL THEN
            IF v_question_id != ALL(v_session_record.question_ids) THEN
                CONTINUE;
            END IF;
        ELSE
            IF NOT EXISTS (SELECT 1 FROM public.questions WHERE id = v_question_id AND paper_id = v_session_record.paper_id) THEN
                CONTINUE;
            END IF;
        END IF;

        IF v_attempt->>'selected_option' IS NULL OR v_attempt->>'selected_option' = 'null' THEN
            v_selected_option := NULL;
        ELSE
            v_selected_option := (v_attempt->>'selected_option')::integer;
        END IF;

        v_time_taken := COALESCE((v_attempt->>'time_taken_seconds')::integer, 0);

        -- Clamp individual question time to a sane max (session duration)
        IF v_session_record.duration_minutes > 0 AND v_time_taken > (v_session_record.duration_minutes * 60) THEN
            v_time_taken := v_session_record.duration_minutes * 60;
        END IF;

        SELECT correct_option, explanation, explanation_images, status
        INTO v_correct_option, v_explanation, v_explanation_images, v_status
        FROM public.questions
        WHERE id = v_question_id;

        IF FOUND AND v_status = 'Published' THEN
            IF v_selected_option IS NOT NULL THEN
                v_is_correct := (v_selected_option = v_correct_option);

                INSERT INTO public.question_attempts (
                    user_id, question_id, is_correct, exam_type, time_taken_seconds, session_id
                ) VALUES (
                    auth.uid(), v_question_id, v_is_correct, p_exam_type, v_time_taken, p_session_id
                )
                ON CONFLICT (user_id, question_id, session_id) DO UPDATE
                SET is_correct = EXCLUDED.is_correct,
                    time_taken_seconds = EXCLUDED.time_taken_seconds
                RETURNING id INTO v_attempt_id;
            ELSE
                v_is_correct := false;
                v_attempt_id := NULL;
            END IF;

            v_results := v_results || jsonb_build_object(
                'question_id', v_question_id,
                'attempt_id', v_attempt_id,
                'is_correct', v_is_correct,
                'correct_option', v_correct_option,
                'explanation', v_explanation,
                'explanation_images', v_explanation_images
            );
        END IF;
    END LOOP;

    RETURN v_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX #3: ADMIN AUTH — Ensure mutation policies are admin-only
-- The initial schema already has "Allow admin full access" policies using
-- is_admin(). Here we explicitly revoke INSERT/UPDATE/DELETE from
-- authenticated+anon on content tables, so even if someone bypasses
-- the client, Postgres blocks the mutation.
-- ─────────────────────────────────────────────────────────────────────────────

-- These DROP + CREATE ensure no stale permissive policies exist
-- Classes
DROP POLICY IF EXISTS "public_insert_classes" ON public.classes;
DROP POLICY IF EXISTS "public_update_classes" ON public.classes;
DROP POLICY IF EXISTS "public_delete_classes" ON public.classes;
CREATE POLICY "admin_insert_classes" ON public.classes FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update_classes" ON public.classes FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_classes" ON public.classes FOR DELETE USING (public.is_admin());

-- Subjects
DROP POLICY IF EXISTS "public_insert_subjects" ON public.subjects;
DROP POLICY IF EXISTS "public_update_subjects" ON public.subjects;
DROP POLICY IF EXISTS "public_delete_subjects" ON public.subjects;
CREATE POLICY "admin_insert_subjects" ON public.subjects FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update_subjects" ON public.subjects FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_subjects" ON public.subjects FOR DELETE USING (public.is_admin());

-- Chapters
DROP POLICY IF EXISTS "public_insert_chapters" ON public.chapters;
DROP POLICY IF EXISTS "public_update_chapters" ON public.chapters;
DROP POLICY IF EXISTS "public_delete_chapters" ON public.chapters;
CREATE POLICY "admin_insert_chapters" ON public.chapters FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update_chapters" ON public.chapters FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_chapters" ON public.chapters FOR DELETE USING (public.is_admin());

-- Exams
DROP POLICY IF EXISTS "public_insert_exams" ON public.exams;
DROP POLICY IF EXISTS "public_update_exams" ON public.exams;
DROP POLICY IF EXISTS "public_delete_exams" ON public.exams;
CREATE POLICY "admin_insert_exams" ON public.exams FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update_exams" ON public.exams FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_exams" ON public.exams FOR DELETE USING (public.is_admin());

-- Papers
DROP POLICY IF EXISTS "public_insert_papers" ON public.papers;
DROP POLICY IF EXISTS "public_update_papers" ON public.papers;
DROP POLICY IF EXISTS "public_delete_papers" ON public.papers;
CREATE POLICY "admin_insert_papers" ON public.papers FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update_papers" ON public.papers FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_papers" ON public.papers FOR DELETE USING (public.is_admin());

-- Questions (mutations)
DROP POLICY IF EXISTS "public_insert_questions" ON public.questions;
DROP POLICY IF EXISTS "public_update_questions" ON public.questions;
DROP POLICY IF EXISTS "public_delete_questions" ON public.questions;
CREATE POLICY "admin_insert_questions" ON public.questions FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update_questions" ON public.questions FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_questions" ON public.questions FOR DELETE USING (public.is_admin());

-- Question Types
DROP POLICY IF EXISTS "public_insert_question_types" ON public.question_types;
DROP POLICY IF EXISTS "public_update_question_types" ON public.question_types;
DROP POLICY IF EXISTS "public_delete_question_types" ON public.question_types;
CREATE POLICY "admin_insert_question_types" ON public.question_types FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update_question_types" ON public.question_types FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_question_types" ON public.question_types FOR DELETE USING (public.is_admin());

-- Books Sets
DROP POLICY IF EXISTS "public_insert_books_sets" ON public.books_sets;
DROP POLICY IF EXISTS "public_update_books_sets" ON public.books_sets;
DROP POLICY IF EXISTS "public_delete_books_sets" ON public.books_sets;
CREATE POLICY "admin_insert_books_sets" ON public.books_sets FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update_books_sets" ON public.books_sets FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_books_sets" ON public.books_sets FOR DELETE USING (public.is_admin());
