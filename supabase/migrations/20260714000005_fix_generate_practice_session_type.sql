-- =============================================================================
-- Fix: generate_practice_session type casting
-- The questions.id column is actually of type text, not uuid.
-- Therefore, checking q.id = ANY(v_question_ids::uuid[]) causes
-- "operator does not exist: text = uuid".
-- =============================================================================

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
        WHERE user_id = (select auth.uid()) AND started_at > now() - interval '1 hour' AND paper_id IS NULL) >= 3 THEN
        RAISE EXCEPTION 'Rate limit exceeded: Maximum 3 practice sessions per hour.';
    END IF;

    -- Max 10 practice sessions per day
    IF (SELECT COUNT(*) FROM public.test_sessions 
        WHERE user_id = (select auth.uid()) AND started_at > now() - interval '1 day' AND paper_id IS NULL) >= 10 THEN
        RAISE EXCEPTION 'Rate limit exceeded: Maximum 10 practice sessions per day.';
    END IF;

    -- Extract duration (timeLimit is in seconds in the frontend config)
    v_duration_minutes := COALESCE((p_config->>'timeLimit')::integer / 60, 0);

    -- Build dynamic query for questions
    v_query := 'SELECT id FROM public.questions WHERE status = ''Published''';

    -- Filter by academic tree level (mutually exclusive in frontend logic)
    IF jsonb_array_length(p_config->'topicIds') > 0 THEN
        v_query := v_query || ' AND topic_id IN (SELECT (value->>0)::uuid FROM jsonb_array_elements($1->''topicIds''))';
    ELSIF jsonb_array_length(p_config->'chapterIds') > 0 THEN
        v_query := v_query || ' AND chapter_id IN (SELECT (value->>0)::uuid FROM jsonb_array_elements($1->''chapterIds''))';
    ELSIF jsonb_array_length(p_config->'subjectIds') > 0 THEN
        v_query := v_query || ' AND chapter_id IN (SELECT id FROM public.chapters WHERE subject_id IN (SELECT (value->>0)::uuid FROM jsonb_array_elements($1->''subjectIds'')))';
    ELSIF jsonb_array_length(p_config->'classIds') > 0 THEN
        v_query := v_query || ' AND chapter_id IN (SELECT c.id FROM public.chapters c JOIN public.subjects s ON c.subject_id = s.id WHERE s.class_id IN (SELECT (value->>0)::uuid FROM jsonb_array_elements($1->''classIds'')))';
    END IF;

    -- Filter by source
    IF p_config->>'sourceType' = 'PYQ' THEN
        IF p_config->>'sourceId' IS NOT NULL AND p_config->>'sourceId' <> '' THEN
            v_query := v_query || ' AND paper_id = ($1->>''sourceId'')::uuid';
        ELSE
            v_query := v_query || ' AND paper_id IS NOT NULL AND book_set_id IS NULL';
        END IF;
    ELSIF p_config->>'sourceType' = 'BookSet' THEN
        IF p_config->>'sourceId' IS NOT NULL AND p_config->>'sourceId' <> '' THEN
            v_query := v_query || ' AND book_set_id = ($1->>''sourceId'')::uuid';
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
    VALUES ((select auth.uid()), NULL, 'Practice', v_duration_minutes, v_question_ids)
    RETURNING id INTO v_session_id;

    -- Fetch the full questions for the client using the safe view
    -- FIX: Removed ::uuid[] cast because q.id is text.
    SELECT json_agg(row_to_json(q)) INTO v_questions
    FROM public.questions_for_students q
    WHERE q.id = ANY(v_question_ids);

    RETURN json_build_object(
        'session_id', v_session_id,
        'questions', v_questions
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
