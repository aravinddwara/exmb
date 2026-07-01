-- Database Enums
DO $$ BEGIN
    CREATE TYPE exam_type AS ENUM ('JEE_MAIN', 'JEE_ADVANCED', 'NEET');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE question_type AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'NUMERICAL', 'INTEGER', 'MATRIX_MATCH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS public.custom_list_items CASCADE;
DROP TABLE IF EXISTS public.custom_lists CASCADE;
DROP TABLE IF EXISTS public.mistakes CASCADE;
DROP TABLE IF EXISTS public.bookmarks CASCADE;
DROP TABLE IF EXISTS public.question_attempts CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.papers CASCADE;
DROP TABLE IF EXISTS public.exams CASCADE;
DROP TABLE IF EXISTS public.chapters CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;

-- 1. Classes
CREATE TABLE IF NOT EXISTS public.classes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(name, class_id)
);

-- 3. Chapters
CREATE TABLE IF NOT EXISTS public.chapters (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(name, subject_id)
);

-- 4. Exams
CREATE TABLE IF NOT EXISTS public.exams (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL UNIQUE,
    name text NOT NULL,
    class_ids jsonb DEFAULT '[]'::jsonb,
    subject_ids jsonb DEFAULT '[]'::jsonb,
    duration_minutes integer DEFAULT 180,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Papers
CREATE TABLE IF NOT EXISTS public.papers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    year integer,
    status text NOT NULL DEFAULT 'Published' CHECK (status IN ('Published', 'Draft')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5a. Question Types
CREATE TABLE IF NOT EXISTS public.question_types (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5b. Books Sets
CREATE TABLE IF NOT EXISTS public.books_sets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Questions
DROP TABLE IF EXISTS public.questions CASCADE;
CREATE TABLE IF NOT EXISTS public.questions (
    id text PRIMARY KEY,
    text text NOT NULL,
    question_images jsonb DEFAULT '[]'::jsonb,
    option_1 text,
    option_1_image text,
    option_2 text,
    option_2_image text,
    option_3 text,
    option_3_image text,
    option_4 text,
    option_4_image text,
    options jsonb NOT NULL DEFAULT '[]'::jsonb,
    correct_option integer,
    explanation text,
    explanation_images jsonb DEFAULT '[]'::jsonb,
    type question_type NOT NULL DEFAULT 'SINGLE_CHOICE',
    difficulty text NOT NULL DEFAULT 'Medium',
    positive_marks integer NOT NULL DEFAULT 4,
    negative_marks integer NOT NULL DEFAULT -1,
    chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    paper_id uuid REFERENCES public.papers(id) ON DELETE SET NULL,
    book_set_id uuid REFERENCES public.books_sets(id) ON DELETE SET NULL,
    question_type_id uuid REFERENCES public.question_types(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'Published' CHECK (status IN ('Published', 'Draft')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User Progress & Analytics

DROP TABLE IF EXISTS public.question_attempts CASCADE;
CREATE TABLE IF NOT EXISTS public.question_attempts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    question_id text REFERENCES public.questions(id) ON DELETE CASCADE,
    is_correct boolean NOT NULL,
    exam_type text,
    time_taken_seconds integer NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bookmarks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    question_id text REFERENCES public.questions(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.mistakes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    question_id text REFERENCES public.questions(id) ON DELETE CASCADE,
    mistake_count integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.custom_lists (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.custom_list_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    list_id uuid REFERENCES public.custom_lists(id) ON DELETE CASCADE,
    question_id text REFERENCES public.questions(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(list_id, question_id)
);

-- Enable RLS and setup base policies
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_list_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    is_admin boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow admins to view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Allow admins to update profiles" ON public.profiles FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Public Read Policies
CREATE POLICY "Allow public read access on classes" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Allow public read access on subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Allow public read access on chapters" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Allow public read access on exams" ON public.exams FOR SELECT USING (true);
CREATE POLICY "Allow public read access on papers" ON public.papers FOR SELECT USING (true);
CREATE POLICY "Allow public read access on question_types" ON public.question_types FOR SELECT USING (true);
CREATE POLICY "Allow public read access on books_sets" ON public.books_sets FOR SELECT USING (true);
CREATE POLICY "Allow public read access on questions" ON public.questions FOR SELECT USING (true);

-- Admin Write Policies
CREATE POLICY "Allow admin full access on classes" ON public.classes USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin full access on subjects" ON public.subjects USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin full access on chapters" ON public.chapters USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin full access on exams" ON public.exams USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin full access on papers" ON public.papers USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin full access on question_types" ON public.question_types USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin full access on books_sets" ON public.books_sets USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin full access on questions" ON public.questions USING (public.is_admin()) WITH CHECK (public.is_admin());

-- User Policies
CREATE POLICY "Allow users to insert their own attempts" ON public.question_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to view their own attempts" ON public.question_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow admin to view all attempts" ON public.question_attempts FOR SELECT USING (public.is_admin());

CREATE POLICY "Allow users to insert their own bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to view their own bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to delete their own bookmarks" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own mistakes" ON public.mistakes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to view their own mistakes" ON public.mistakes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to delete their own mistakes" ON public.mistakes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Allow users to update their own mistakes" ON public.mistakes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow users full access to own custom lists" ON public.custom_lists USING (auth.uid() = user_id);
CREATE POLICY "Allow users full access to own custom list items" ON public.custom_list_items USING (
   EXISTS (
      SELECT 1 FROM public.custom_lists cl WHERE cl.id = list_id AND cl.user_id = auth.uid()
   )
);


-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON public.subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON public.chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_papers_exam_id ON public.papers(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_chapter_id ON public.questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_paper_id ON public.questions(paper_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_user_id ON public.question_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_question_id ON public.question_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_user_id ON public.mistakes(user_id);

-- Live Activity Tracking Function (RPC)
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    active_users integer;
    questions_solved integer;
    chapter_accuracy json;
    recent_users json;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT COUNT(DISTINCT user_id) INTO active_users
    FROM public.question_attempts
    WHERE created_at >= NOW() - INTERVAL '24 hours';

    SELECT COUNT(*) INTO questions_solved
    FROM public.question_attempts
    WHERE created_at >= CURRENT_DATE;

    SELECT json_agg(row_to_json(t)) INTO chapter_accuracy
    FROM (
        SELECT 
            tn.name as chapter_name,
            COUNT(qa.id) as total_attempts,
            ROUND(SUM(CASE WHEN qa.is_correct THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(qa.id), 0) * 100, 2) as accuracy_rate
        FROM public.question_attempts qa
        JOIN public.questions q ON qa.question_id = q.id
        JOIN public.chapters tn ON q.chapter_id = tn.id
        GROUP BY tn.id, tn.name
        ORDER BY accuracy_rate ASC
        LIMIT 10
    ) t;

    SELECT json_agg(row_to_json(u)) INTO recent_users
    FROM (
        SELECT 
            user_id,
            COUNT(id) as attempts_count,
            MAX(created_at) as last_active
        FROM public.question_attempts
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY user_id
        ORDER BY last_active DESC
        LIMIT 10
    ) u;

    RETURN json_build_object(
        'active_users_24h', active_users,
        'questions_solved_today', questions_solved,
        'chapter_accuracy', COALESCE(chapter_accuracy, '[]'::json),
        'recent_users', COALESCE(recent_users, '[]'::json)
    );
END;
$$;

-- Dynamic Difficulty View
CREATE OR REPLACE VIEW public.question_difficulty_stats WITH (security_invoker = true) AS
SELECT 
    qa.question_id,
    q.text as question_text,
    q.chapter_id,
    COUNT(qa.id) as total_attempts,
    (1 - (SUM(CASE WHEN qa.is_correct THEN 1 ELSE 0 END)::float / NULLIF(COUNT(qa.id), 0))) * 100 as failure_rate_percent,
    CASE 
        WHEN (1 - (SUM(CASE WHEN qa.is_correct THEN 1 ELSE 0 END)::float / NULLIF(COUNT(qa.id), 0))) * 100 < 30 THEN 'Easy'
        WHEN (1 - (SUM(CASE WHEN qa.is_correct THEN 1 ELSE 0 END)::float / NULLIF(COUNT(qa.id), 0))) * 100 <= 70 THEN 'Medium'
        ELSE 'Hard'
    END as dynamic_difficulty,
    AVG(qa.time_taken_seconds) as avg_time_taken_seconds
FROM public.question_attempts qa
JOIN public.questions q ON qa.question_id = q.id
GROUP BY qa.question_id, q.text, q.chapter_id;

-- Time-Drain Analytics Query View
CREATE OR REPLACE VIEW public.bottleneck_questions WITH (security_invoker = true) AS
SELECT 
    qa.question_id,
    q.text as question_text,
    qa.exam_type,
    q.chapter_id,
    AVG(qa.time_taken_seconds) as avg_time_taken,
    COUNT(qa.id) as total_attempts
FROM public.question_attempts qa
JOIN public.questions q ON qa.question_id = q.id
WHERE qa.time_taken_seconds <= 1800
GROUP BY qa.question_id, q.text, qa.exam_type, q.chapter_id
ORDER BY avg_time_taken DESC
LIMIT 50;

-- MIGRATION: Add order_index column to existing tables for drag-and-drop reordering
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;
ALTER TABLE public.question_types ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;
ALTER TABLE public.books_sets ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- Planner and Timer Tables
DROP TABLE IF EXISTS public.pomodoro_sessions CASCADE;
DROP TABLE IF EXISTS public.study_plans CASCADE;

CREATE TABLE IF NOT EXISTS public.study_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
    subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
    chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
    custom_class text,
    custom_subject text,
    custom_chapter text,
    date date NOT NULL,
    status text NOT NULL DEFAULT 'not-started',
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pomodoro_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    study_plan_id uuid REFERENCES public.study_plans(id) ON DELETE CASCADE,
    duration_seconds integer NOT NULL,
    session_type text NOT NULL,
    completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own study plans" ON public.study_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to manage their own pomodoro sessions" ON public.pomodoro_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON public.study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON public.pomodoro_sessions(user_id);

-- Backfill admin accounts if they already exist in auth.users (scrubbed)

-- RPC for secure server-side grading
CREATE OR REPLACE FUNCTION public.submit_question_attempt(
    p_question_id text,
    p_selected_option integer,
    p_exam_type text,
    p_time_taken_seconds integer
) RETURNS json AS $$
DECLARE
    v_correct_option integer;
    v_explanation text;
    v_explanation_images jsonb;
    v_is_correct boolean;
    v_attempt_id uuid;
BEGIN
    -- Fetch the correct option and explanation
    SELECT correct_option, explanation, explanation_images
    INTO v_correct_option, v_explanation, v_explanation_images
    FROM public.questions
    WHERE id = p_question_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Question not found';
    END IF;

    -- Calculate correctness
    v_is_correct := (p_selected_option = v_correct_option);

    -- Insert attempt (enforces user identity via auth.uid())
    INSERT INTO public.question_attempts (
        user_id,
        question_id,
        is_correct,
        exam_type,
        time_taken_seconds
    ) VALUES (
        auth.uid(),
        p_question_id,
        v_is_correct,
        p_exam_type,
        p_time_taken_seconds
    ) RETURNING id INTO v_attempt_id;

    -- Return the correct answer and explanation to the client only after submission
    RETURN json_build_object(
        'attempt_id', v_attempt_id,
        'is_correct', v_is_correct,
        'correct_option', v_correct_option,
        'explanation', v_explanation,
        'explanation_images', v_explanation_images
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC for batch grading Mock Tests
CREATE OR REPLACE FUNCTION public.submit_mock_test_attempts(
    p_attempts jsonb,
    p_exam_type text
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
BEGIN
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
