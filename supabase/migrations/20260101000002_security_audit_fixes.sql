-- Finding 1: Remove over-broad public policy
DROP POLICY IF EXISTS "Allow public read access on questions" ON public.questions;

-- Give students/anon a column-safe view instead of the raw table
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

GRANT SELECT ON public.questions_for_students TO anon, authenticated;

-- Gate the answer key behind proof-of-attempt (or admin)
CREATE OR REPLACE FUNCTION public.get_question_review(p_question_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT public.is_admin() AND NOT EXISTS (
    SELECT 1 FROM public.question_attempts
    WHERE user_id = auth.uid() AND question_id = p_question_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to view this answer yet';
  END IF;

  SELECT json_build_object(
    'correct_option', correct_option,
    'explanation', explanation,
    'explanation_images', explanation_images
  ) INTO v_result
  FROM public.questions
  WHERE id = p_question_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_question_review(text) TO authenticated;

-- Finding 2: Unrestricted direct writes to question_attempts
REVOKE INSERT, UPDATE ON public.question_attempts FROM authenticated;
REVOKE INSERT, UPDATE ON public.question_attempts FROM anon;

-- Finding 3: Exam Timer Enforced Only Client-Side
CREATE TABLE IF NOT EXISTS public.test_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_id uuid REFERENCES public.papers(id),
  exam_type text,
  started_at timestamptz NOT NULL DEFAULT now(),
  duration_minutes integer NOT NULL,
  submitted_at timestamptz
);

ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own sessions" ON public.test_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.start_test_session(
    p_paper_id uuid,
    p_exam_type text,
    p_duration_minutes integer
) RETURNS uuid AS $$
DECLARE
    v_session_id uuid;
BEGIN
    INSERT INTO public.test_sessions (user_id, paper_id, exam_type, duration_minutes)
    VALUES (auth.uid(), p_paper_id, p_exam_type, p_duration_minutes)
    RETURNING id INTO v_session_id;
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update submit_mock_test_attempts to accept session ID
CREATE OR REPLACE FUNCTION public.submit_mock_test_attempts(
    p_attempts jsonb,
    p_exam_type text,
    p_session_id uuid DEFAULT NULL
) RETURNS json AS $$
DECLARE
    v_attempt jsonb;
    v_question_id text;
    v_selected_option integer;
    v_time_taken integer;
    v_correct_option integer;
    v_explanation text;
    v_explanation_images jsonb;
    v_is_correct boolean;
    v_attempt_id uuid;
    v_results jsonb := '[]'::jsonb;
    v_session_record record;
BEGIN
    IF p_session_id IS NOT NULL THEN
        SELECT * INTO v_session_record FROM public.test_sessions WHERE id = p_session_id AND user_id = auth.uid();
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Session not found or not owned by user';
        END IF;
        
        -- Add a 5 minute grace period for submission delays
        IF now() > v_session_record.started_at + (v_session_record.duration_minutes || ' minutes')::interval + '5 minutes'::interval THEN
            RAISE EXCEPTION 'Session expired. Test took too long.';
        END IF;
        
        UPDATE public.test_sessions SET submitted_at = now() WHERE id = p_session_id;
    END IF;

    FOR v_attempt IN SELECT * FROM jsonb_array_elements(p_attempts)
    LOOP
        v_question_id := v_attempt->>'question_id';
        
        IF v_attempt->>'selected_option' IS NULL OR v_attempt->>'selected_option' = 'null' THEN
            v_selected_option := NULL;
        ELSE
            v_selected_option := (v_attempt->>'selected_option')::integer;
        END IF;
        
        v_time_taken := COALESCE((v_attempt->>'time_taken_seconds')::integer, 0);

        SELECT correct_option, explanation, explanation_images
        INTO v_correct_option, v_explanation, v_explanation_images
        FROM public.questions
        WHERE id = v_question_id;

        IF FOUND THEN
            IF v_selected_option IS NOT NULL THEN
                v_is_correct := (v_selected_option = v_correct_option);

                INSERT INTO public.question_attempts (
                    user_id,
                    question_id,
                    is_correct,
                    exam_type,
                    time_taken_seconds
                ) VALUES (
                    auth.uid(),
                    v_question_id,
                    v_is_correct,
                    p_exam_type,
                    v_time_taken
                ) RETURNING id INTO v_attempt_id;
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

-- Finding 7: SECURITY DEFINER functions missing search_path
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.get_admin_dashboard_stats() SET search_path = public;
