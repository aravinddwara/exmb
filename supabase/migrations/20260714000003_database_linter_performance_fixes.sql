-- =============================================================================
-- Database Linter Fixes (Part 3)
-- Covers: Auth RLS Initplan performance, Multiple Permissive Policies
-- =============================================================================

-- 1. Fix Auth RLS Initplan (Wrap auth.uid() in a subselect for performance)

-- question_attempts
DROP POLICY IF EXISTS "Allow users to insert their own attempts" ON public.question_attempts;
CREATE POLICY "Allow users to insert their own attempts" ON public.question_attempts FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Allow users to view their own attempts" ON public.question_attempts;
CREATE POLICY "Allow users to view their own attempts" ON public.question_attempts FOR SELECT USING ((select auth.uid()) = user_id);

-- bookmarks
DROP POLICY IF EXISTS "Allow users to insert their own bookmarks" ON public.bookmarks;
CREATE POLICY "Allow users to insert their own bookmarks" ON public.bookmarks FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Allow users to view their own bookmarks" ON public.bookmarks;
CREATE POLICY "Allow users to view their own bookmarks" ON public.bookmarks FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Allow users to delete their own bookmarks" ON public.bookmarks;
CREATE POLICY "Allow users to delete their own bookmarks" ON public.bookmarks FOR DELETE USING ((select auth.uid()) = user_id);

-- mistakes
DROP POLICY IF EXISTS "Allow users to insert their own mistakes" ON public.mistakes;
CREATE POLICY "Allow users to insert their own mistakes" ON public.mistakes FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Allow users to view their own mistakes" ON public.mistakes;
CREATE POLICY "Allow users to view their own mistakes" ON public.mistakes FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Allow users to delete their own mistakes" ON public.mistakes;
CREATE POLICY "Allow users to delete their own mistakes" ON public.mistakes FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Allow users to update their own mistakes" ON public.mistakes;
CREATE POLICY "Allow users to update their own mistakes" ON public.mistakes FOR UPDATE USING ((select auth.uid()) = user_id);

-- custom_lists
DROP POLICY IF EXISTS "Allow users full access to own custom lists" ON public.custom_lists;
CREATE POLICY "Allow users full access to own custom lists" ON public.custom_lists USING ((select auth.uid()) = user_id);

-- custom_list_items
DROP POLICY IF EXISTS "Allow users full access to own custom list items" ON public.custom_list_items;
CREATE POLICY "Allow users full access to own custom list items" ON public.custom_list_items USING (EXISTS (SELECT 1 FROM public.custom_lists cl WHERE cl.id = list_id AND cl.user_id = (select auth.uid())));

-- study_plans
DROP POLICY IF EXISTS "Allow users to manage their own study plans" ON public.study_plans;
CREATE POLICY "Allow users to manage their own study plans" ON public.study_plans FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- pomodoro_sessions
DROP POLICY IF EXISTS "Allow users to manage their own pomodoro sessions" ON public.pomodoro_sessions;
CREATE POLICY "Allow users to manage their own pomodoro sessions" ON public.pomodoro_sessions FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- test_sessions
DROP POLICY IF EXISTS "Users manage their own sessions" ON public.test_sessions;
CREATE POLICY "Users manage their own sessions" ON public.test_sessions FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);


-- 2. Drop Duplicate Admin Policies
-- We previously had a generic "Allow admin full access on [table]" (ALL operations) from the initial schema,
-- AND explicit "admin_[action]_[table]" policies from the hardening schema.
-- This was causing the "Multiple Permissive Policies" warning. Removing the explicit ones.

DROP POLICY IF EXISTS "admin_insert_classes" ON public.classes;
DROP POLICY IF EXISTS "admin_update_classes" ON public.classes;
DROP POLICY IF EXISTS "admin_delete_classes" ON public.classes;

DROP POLICY IF EXISTS "admin_insert_subjects" ON public.subjects;
DROP POLICY IF EXISTS "admin_update_subjects" ON public.subjects;
DROP POLICY IF EXISTS "admin_delete_subjects" ON public.subjects;

DROP POLICY IF EXISTS "admin_insert_chapters" ON public.chapters;
DROP POLICY IF EXISTS "admin_update_chapters" ON public.chapters;
DROP POLICY IF EXISTS "admin_delete_chapters" ON public.chapters;

DROP POLICY IF EXISTS "admin_insert_exams" ON public.exams;
DROP POLICY IF EXISTS "admin_update_exams" ON public.exams;
DROP POLICY IF EXISTS "admin_delete_exams" ON public.exams;

DROP POLICY IF EXISTS "admin_insert_papers" ON public.papers;
DROP POLICY IF EXISTS "admin_update_papers" ON public.papers;
DROP POLICY IF EXISTS "admin_delete_papers" ON public.papers;

DROP POLICY IF EXISTS "admin_insert_questions" ON public.questions;
DROP POLICY IF EXISTS "admin_update_questions" ON public.questions;
DROP POLICY IF EXISTS "admin_delete_questions" ON public.questions;

DROP POLICY IF EXISTS "admin_insert_question_types" ON public.question_types;
DROP POLICY IF EXISTS "admin_update_question_types" ON public.question_types;
DROP POLICY IF EXISTS "admin_delete_question_types" ON public.question_types;

DROP POLICY IF EXISTS "admin_insert_books_sets" ON public.books_sets;
DROP POLICY IF EXISTS "admin_update_books_sets" ON public.books_sets;
DROP POLICY IF EXISTS "admin_delete_books_sets" ON public.books_sets;
