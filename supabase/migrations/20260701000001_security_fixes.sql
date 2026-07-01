-- Add question_ids to test_sessions to track which questions are allowed in this session
ALTER TABLE public.test_sessions ADD COLUMN IF NOT EXISTS question_ids text[];

-- Create unique index to prevent multiple active sessions for the same paper
CREATE UNIQUE INDEX IF NOT EXISTS one_active_session_per_paper
ON public.test_sessions (user_id, paper_id)
WHERE submitted_at IS NULL AND paper_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.start_test_session(
    p_paper_id uuid,
    p_exam_type text,
    p_duration_minutes integer,
    p_question_ids text[] DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    v_session_id uuid;
    v_paper_question_ids text[];
BEGIN
    -- Rate-limit session creation per user
    IF (SELECT COUNT(*) FROM public.test_sessions 
        WHERE user_id = auth.uid() AND started_at > now() - interval '1 hour') > 10 THEN
        RAISE EXCEPTION 'Too many sessions started recently';
    END IF;

    -- Limit the number of questions to prevent abuse
    IF p_question_ids IS NOT NULL AND array_length(p_question_ids, 1) > 200 THEN
        RAISE EXCEPTION 'Too many questions in a single session';
    END IF;

    -- If a paper is provided, we could optionally fetch its questions to store, but we can also check dynamically later.
    -- Storing it here simplifies checks. Let's just store what the client sends for Practice, and for Mock we use paper_id.

    INSERT INTO public.test_sessions (user_id, paper_id, exam_type, duration_minutes, question_ids)
    VALUES (auth.uid(), p_paper_id, p_exam_type, p_duration_minutes, p_question_ids)
    RETURNING id INTO v_session_id;
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER TABLE public.question_attempts ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.test_sessions(id);
ALTER TABLE public.question_attempts ADD CONSTRAINT unique_attempt_per_session UNIQUE (user_id, question_id, session_id);

CREATE OR REPLACE FUNCTION public.submit_question_attempt(
    p_question_id text,
    p_selected_option integer,
    p_exam_type text,
    p_time_taken_seconds integer,
    p_attempt_id uuid DEFAULT NULL,
    p_session_id uuid DEFAULT NULL
) RETURNS json AS $$
DECLARE
    v_correct_option integer;
    v_explanation text;
    v_explanation_images jsonb;
    v_status text;
    v_is_correct boolean;
    v_attempt_id uuid;
    v_session_record record;
BEGIN
    -- Require session for practice tests to prevent bulk answer extraction
    IF p_session_id IS NOT NULL THEN
        SELECT * INTO v_session_record FROM public.test_sessions WHERE id = p_session_id AND user_id = auth.uid();
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Session not found or not owned by user';
        END IF;

        IF v_session_record.submitted_at IS NOT NULL THEN
            RAISE EXCEPTION 'Session already submitted';
        END IF;
        
        -- Check if question is in session's question_ids (for practice) or in the paper (for mock)
        IF v_session_record.paper_id IS NULL THEN
            IF p_question_id != ALL(v_session_record.question_ids) THEN
                RAISE EXCEPTION 'Question not part of this session';
            END IF;
        ELSE
            IF NOT EXISTS (SELECT 1 FROM public.questions WHERE id = p_question_id AND paper_id = v_session_record.paper_id) THEN
                RAISE EXCEPTION 'Question not part of this exam paper';
            END IF;
        END IF;
    ELSE
        RAISE EXCEPTION 'Session ID is required';
    END IF;

    SELECT correct_option, explanation, explanation_images, status
    INTO v_correct_option, v_explanation, v_explanation_images, v_status
    FROM public.questions
    WHERE id = p_question_id;

    IF NOT FOUND OR v_status <> 'Published' THEN
        RAISE EXCEPTION 'Question not found or not published';
    END IF;

    v_is_correct := (p_selected_option = v_correct_option);

    -- Try to insert or update existing attempt for this session
    INSERT INTO public.question_attempts (
        user_id, question_id, is_correct, exam_type, time_taken_seconds, session_id
    ) VALUES (
        auth.uid(), p_question_id, v_is_correct, p_exam_type, p_time_taken_seconds, p_session_id
    )
    ON CONFLICT (user_id, question_id, session_id) DO UPDATE
    SET is_correct = EXCLUDED.is_correct,
        time_taken_seconds = EXCLUDED.time_taken_seconds
    RETURNING id INTO v_attempt_id;

    RETURN json_build_object(
        'attempt_id', v_attempt_id,
        'is_correct', v_is_correct,
        'correct_option', v_correct_option,
        'explanation', v_explanation,
        'explanation_images', v_explanation_images
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
    
    -- Add a 5 minute grace period for submission delays if duration_minutes > 0
    IF v_session_record.duration_minutes > 0 AND now() > v_session_record.started_at + (v_session_record.duration_minutes || ' minutes')::interval + '5 minutes'::interval THEN
        RAISE EXCEPTION 'Session expired. Test took too long.';
    END IF;
    
    UPDATE public.test_sessions SET submitted_at = now() WHERE id = p_session_id;

    FOR v_attempt IN SELECT * FROM jsonb_array_elements(p_attempts)
    LOOP
        v_question_id := v_attempt->>'question_id';
        
        -- Check if question is in session's question_ids (for practice) or in the paper (for mock)
        IF v_session_record.paper_id IS NULL THEN
            IF v_question_id != ALL(v_session_record.question_ids) THEN
                CONTINUE; -- skip invalid questions instead of failing the whole batch
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

        SELECT correct_option, explanation, explanation_images, status
        INTO v_correct_option, v_explanation, v_explanation_images, v_status
        FROM public.questions
        WHERE id = v_question_id;

        IF FOUND AND v_status = 'Published' THEN
            IF v_selected_option IS NOT NULL THEN
                v_is_correct := (v_selected_option = v_correct_option);

                INSERT INTO public.question_attempts (
                    user_id,
                    question_id,
                    is_correct,
                    exam_type,
                    time_taken_seconds,
                    session_id
                ) VALUES (
                    auth.uid(),
                    v_question_id,
                    v_is_correct,
                    p_exam_type,
                    v_time_taken,
                    p_session_id
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

ALTER FUNCTION public.handle_new_user() SET search_path = public;
