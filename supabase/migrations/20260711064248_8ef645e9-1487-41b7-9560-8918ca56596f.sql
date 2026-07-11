
-- Extend projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS course text,
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS project_area text,
  ADD COLUMN IF NOT EXISTS project_type text,
  ADD COLUMN IF NOT EXISTS research_field text,
  ADD COLUMN IF NOT EXISTS difficulty_level text,
  ADD COLUMN IF NOT EXISTS abstract text,
  ADD COLUMN IF NOT EXISTS methodology text,
  ADD COLUMN IF NOT EXISTS objectives text,
  ADD COLUMN IF NOT EXISTS problem_statement text,
  ADD COLUMN IF NOT EXISTS research_questions text,
  ADD COLUMN IF NOT EXISTS scope text,
  ADD COLUMN IF NOT EXISTS expected_outcome text;

-- project_sections
CREATE TABLE IF NOT EXISTS public.project_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  chapter text NOT NULL,
  section_type text NOT NULL,
  title text,
  content text,
  status text NOT NULL DEFAULT 'draft',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, chapter, section_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_sections TO authenticated;
GRANT ALL ON public.project_sections TO service_role;
ALTER TABLE public.project_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own project sections" ON public.project_sections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_project_sections_project ON public.project_sections(project_id);

CREATE TRIGGER update_project_sections_updated_at
  BEFORE UPDATE ON public.project_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- project_ai_history
CREATE TABLE IF NOT EXISTS public.project_ai_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  chapter text,
  section_type text,
  action text,
  user_request text,
  ai_response text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_ai_history TO authenticated;
GRANT ALL ON public.project_ai_history TO service_role;
ALTER TABLE public.project_ai_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own project ai history" ON public.project_ai_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_project_ai_history_project ON public.project_ai_history(project_id);
