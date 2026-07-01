CREATE TABLE IF NOT EXISTS public.topics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on topics" ON public.topics FOR SELECT USING (true);
CREATE POLICY "Allow admin full access on topics" ON public.topics FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Update questions table to reference topics
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.topics(id);

-- Update questions_for_students view
DROP VIEW IF EXISTS public.questions_for_students;
CREATE OR REPLACE VIEW public.questions_for_students
WITH (security_invoker = true) AS
SELECT
  id, text, question_images,
  option_1, option_1_image, option_2, option_2_image,
  option_3, option_3_image, option_4, option_4_image,
  options, type, difficulty, positive_marks, negative_marks,
  chapter_id, topic_id, paper_id, book_set_id, question_type_id,
  status, created_at
FROM public.questions
WHERE status = 'Published';

GRANT SELECT ON public.questions_for_students TO anon, authenticated;
