-- =============================================================================
-- Database Linter Fixes
-- Covers: Security Definer Views, Unindexed Foreign Keys
-- =============================================================================

-- 1. Security Definer Views (Ensure they enforce RLS of the caller)
ALTER VIEW public.question_difficulty_stats SET (security_invoker = true);
ALTER VIEW public.bottleneck_questions SET (security_invoker = true);

-- 2. Unindexed Foreign Keys (Performance Optimization)
CREATE INDEX IF NOT EXISTS idx_bookmarks_question_id ON public.bookmarks(question_id);
CREATE INDEX IF NOT EXISTS idx_custom_list_items_question_id ON public.custom_list_items(question_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_question_id ON public.mistakes(question_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_study_plan_id ON public.pomodoro_sessions(study_plan_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON public.pomodoro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_session_id ON public.question_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_book_set_id ON public.questions(book_set_id);
CREATE INDEX IF NOT EXISTS idx_questions_question_type_id ON public.questions(question_type_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON public.questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_chapter_id ON public.study_plans(chapter_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_class_id ON public.study_plans(class_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_subject_id ON public.study_plans(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON public.study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_paper_id ON public.test_sessions(paper_id);
CREATE INDEX IF NOT EXISTS idx_topics_chapter_id ON public.topics(chapter_id);

-- Note: We are explicitly ignoring the "Unused Index" warnings for foreign keys 
-- (e.g., idx_subjects_class_id, idx_questions_chapter_id). While they haven't been used yet 
-- on your fresh database, dropping them would simply cause the linter to flag them as 
-- "Unindexed Foreign Keys" on its next run.
