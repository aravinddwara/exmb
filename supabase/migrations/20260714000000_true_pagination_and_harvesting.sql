-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 1: TRUE PAGINATION - QUESTION COUNTS VIEW
-- Allows the frontend to build the academic tree with question counts
-- without downloading the entire 20,000+ question catalog.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.academic_question_counts
WITH (security_invoker = true) AS
SELECT
  chapter_id,
  topic_id,
  COUNT(*) as question_count
FROM public.questions
WHERE status = 'Published'
GROUP BY chapter_id, topic_id;

GRANT SELECT ON public.academic_question_counts TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 2: TRUE PAGINATION - GENERATE PRACTICE SESSION RPC
-- Moves the practice session question selection from the client browser
-- to the Postgres server. Generates the session and returns the IDs or questions.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_practice_session(p_config jsonb)
RETURNS json AS $$
DECLARE
    v_session_id uuid;
    v_questions json;
    v_query text;
    v_question_ids text[];
    v_duration_minutes integer;
BEGIN
    -- Check Rate Limits (Harvesting protection)
    -- Max 3 practice sessions per hour
    IF (SELECT COUNT(*) FROM public.test_sessions 
        WHERE user_id = auth.uid() AND started_at > now() - interval '1 hour' AND paper_id IS NULL) >= 3 THEN
        RAISE EXCEPTION 'Rate limit exceeded: Maximum 3 practice sessions per hour.';
    END IF;

    -- Max 10 practice sessions per day
    IF (SELECT COUNT(*) FROM public.test_sessions 
        WHERE user_id = auth.uid() AND started_at > now() - interval '1 day' AND paper_id IS NULL) >= 10 THEN
        RAISE EXCEPTION 'Rate limit exceeded: Maximum 10 practice sessions per day.';
    END IF;

    -- Extract duration (timeLimit is in seconds in the frontend config)
    v_duration_minutes := COALESCE((p_config->>'timeLimit')::integer / 60, 0);

    -- Build dynamic query for questions
    v_query := 'SELECT id FROM public.questions WHERE status = ''Published''';

    -- Filter by academic tree level (mutually exclusive in frontend logic)
    IF jsonb_array_length(p_config->'topicIds') > 0 THEN
        v_query := v_query || ' AND topic_id IN (SELECT (value->>0)::uuid FROM jsonb_array_elements(p_config->''topicIds''))';
    ELSIF jsonb_array_length(p_config->'chapterIds') > 0 THEN
        v_query := v_query || ' AND chapter_id IN (SELECT (value->>0)::uuid FROM jsonb_array_elements(p_config->''chapterIds''))';
    ELSIF jsonb_array_length(p_config->'subjectIds') > 0 THEN
        v_query := v_query || ' AND chapter_id IN (SELECT id FROM public.chapters WHERE subject_id IN (SELECT (value->>0)::uuid FROM jsonb_array_elements(p_config->''subjectIds'')))';
    ELSIF jsonb_array_length(p_config->'classIds') > 0 THEN
        v_query := v_query || ' AND chapter_id IN (SELECT c.id FROM public.chapters c JOIN public.subjects s ON c.subject_id = s.id WHERE s.class_id IN (SELECT (value->>0)::uuid FROM jsonb_array_elements(p_config->''classIds'')))';
    END IF;

    -- Filter by source
    IF p_config->>'sourceType' = 'PYQ' THEN
        IF p_config->>'sourceId' IS NOT NULL AND p_config->>'sourceId' <> '' THEN
            v_query := v_query || ' AND paper_id = (p_config->>''sourceId'')::uuid';
        ELSE
            v_query := v_query || ' AND paper_id IS NOT NULL AND book_set_id IS NULL';
        END IF;
    ELSIF p_config->>'sourceType' = 'BookSet' THEN
        IF p_config->>'sourceId' IS NOT NULL AND p_config->>'sourceId' <> '' THEN
            v_query := v_query || ' AND book_set_id = (p_config->>''sourceId'')::uuid';
        ELSE
            v_query := v_query || ' AND book_set_id IS NOT NULL';
        END IF;
    END IF;

    -- Order By
    IF p_config->>'questionOrder' = 'random' THEN
        v_query := v_query || ' ORDER BY random()';
    ELSE
        v_query := v_query || ' ORDER BY created_at ASC';
    END IF;

    -- Limit
    IF (p_config->>'questionCount')::integer > 0 THEN
        v_query := v_query || ' LIMIT ' || least((p_config->>'questionCount')::integer, 200);
    ELSE
        v_query := v_query || ' LIMIT 200'; -- Hard cap at 200
    END IF;

    -- Execute dynamic query to get IDs
    EXECUTE 'SELECT array_agg(id::text) FROM (' || v_query || ') as subq' 
    INTO v_question_ids 
    USING p_config;

    IF v_question_ids IS NULL OR array_length(v_question_ids, 1) = 0 THEN
        RETURN json_build_object('session_id', NULL, 'questions', '[]'::json);
    END IF;

    -- Create session
    INSERT INTO public.test_sessions (user_id, paper_id, exam_type, duration_minutes, question_ids)
    VALUES (auth.uid(), NULL, 'Practice', v_duration_minutes, v_question_ids)
    RETURNING id INTO v_session_id;

    -- Fetch the full questions for the client using the safe view
    SELECT json_agg(row_to_json(q)) INTO v_questions
    FROM public.questions_for_students q
    WHERE q.id = ANY(v_question_ids::uuid[]);

    RETURN json_build_object(
        'session_id', v_session_id,
        'questions', v_questions
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 3: TIGHTEN SESSION HARVESTING LIMITS FOR MOCK TESTS
-- Updates start_test_session to limit to 3 per hour / 10 per day.
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.start_test_session(uuid, text, integer);
DROP FUNCTION IF EXISTS public.start_test_session(uuid, text, integer, text[]);

CREATE OR REPLACE FUNCTION public.start_test_session(
    p_paper_id uuid,
    p_exam_type text,
    p_duration_minutes integer,
    p_question_ids text[] DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    v_session_id uuid;
BEGIN
    -- Rate-limit session creation per user (Harvesting protection)
    -- Max 3 mock test sessions per hour
    IF (SELECT COUNT(*) FROM public.test_sessions 
        WHERE user_id = auth.uid() AND started_at > now() - interval '1 hour' AND paper_id IS NOT NULL) >= 3 THEN
        RAISE EXCEPTION 'Rate limit exceeded: Maximum 3 mock tests per hour.';
    END IF;

    -- Max 10 mock test sessions per day
    IF (SELECT COUNT(*) FROM public.test_sessions 
        WHERE user_id = auth.uid() AND started_at > now() - interval '1 day' AND paper_id IS NOT NULL) >= 10 THEN
        RAISE EXCEPTION 'Rate limit exceeded: Maximum 10 mock tests per day.';
    END IF;

    -- Limit the number of questions to prevent abuse
    IF p_question_ids IS NOT NULL AND array_length(p_question_ids, 1) > 200 THEN
        RAISE EXCEPTION 'Too many questions in a single session';
    END IF;

    INSERT INTO public.test_sessions (user_id, paper_id, exam_type, duration_minutes, question_ids)
    VALUES (auth.uid(), p_paper_id, p_exam_type, p_duration_minutes, p_question_ids)
    RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
