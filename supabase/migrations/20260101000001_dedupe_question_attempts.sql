CREATE OR REPLACE FUNCTION public.submit_question_attempt(
    p_question_id text,
    p_selected_option integer,
    p_exam_type text,
    p_time_taken_seconds integer,
    p_attempt_id uuid DEFAULT NULL
) RETURNS json AS $$
DECLARE
    v_correct_option integer;
    v_explanation text;
    v_explanation_images jsonb;
    v_is_correct boolean;
    v_attempt_id uuid;
BEGIN
    SELECT correct_option, explanation, explanation_images
    INTO v_correct_option, v_explanation, v_explanation_images
    FROM public.questions
    WHERE id = p_question_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Question not found';
    END IF;

    v_is_correct := (p_selected_option = v_correct_option);

    IF p_attempt_id IS NOT NULL THEN
        UPDATE public.question_attempts
        SET is_correct = v_is_correct,
            time_taken_seconds = p_time_taken_seconds
        WHERE id = p_attempt_id AND user_id = auth.uid() AND question_id = p_question_id
        RETURNING id INTO v_attempt_id;
    END IF;

    IF v_attempt_id IS NULL THEN
        INSERT INTO public.question_attempts (
            user_id, question_id, is_correct, exam_type, time_taken_seconds
        ) VALUES (
            auth.uid(), p_question_id, v_is_correct, p_exam_type, p_time_taken_seconds
        ) RETURNING id INTO v_attempt_id;
    END IF;

    RETURN json_build_object(
        'attempt_id', v_attempt_id,
        'is_correct', v_is_correct,
        'correct_option', v_correct_option,
        'explanation', v_explanation,
        'explanation_images', v_explanation_images
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
