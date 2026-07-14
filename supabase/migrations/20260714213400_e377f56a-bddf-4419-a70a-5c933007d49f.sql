
-- Defense summaries
CREATE TABLE public.defense_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  summary_type TEXT NOT NULL, -- '5min' | '10min' | 'slides'
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, summary_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.defense_summaries TO authenticated;
GRANT ALL ON public.defense_summaries TO service_role;
ALTER TABLE public.defense_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own defense summaries" ON public.defense_summaries FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_ds_updated BEFORE UPDATE ON public.defense_summaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Defense sessions (mock defense)
CREATE TABLE public.defense_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  score NUMERIC,
  feedback JSONB,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.defense_sessions TO authenticated;
GRANT ALL ON public.defense_sessions TO service_role;
ALTER TABLE public.defense_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own defense sessions" ON public.defense_sessions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_dsess_updated BEFORE UPDATE ON public.defense_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Question bank (admin-managed, readable by all authenticated)
CREATE TABLE public.defense_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  question TEXT NOT NULL,
  sample_answer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.defense_question_bank TO authenticated;
GRANT ALL ON public.defense_question_bank TO service_role;
ALTER TABLE public.defense_question_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read questions" ON public.defense_question_bank FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage questions" ON public.defense_question_bank FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_dqb_updated BEFORE UPDATE ON public.defense_question_bank
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Project checklist
CREATE TABLE public.project_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  checklist_item TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_checklists TO authenticated;
GRANT ALL ON public.project_checklists TO service_role;
ALTER TABLE public.project_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checklists" ON public.project_checklists FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_pc_updated BEFORE UPDATE ON public.project_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed question bank
INSERT INTO public.defense_question_bank (department, category, difficulty, question) VALUES
(NULL, 'introduction', 'easy', 'Why did you choose this topic?'),
(NULL, 'introduction', 'easy', 'What problem are you solving?'),
(NULL, 'introduction', 'medium', 'What motivated your interest in this research area?'),
(NULL, 'methodology', 'medium', 'Why did you choose this research method?'),
(NULL, 'methodology', 'medium', 'Justify your research design.'),
(NULL, 'methodology', 'hard', 'What are the limitations of your methodology?'),
(NULL, 'technical', 'medium', 'Explain your system/design in detail.'),
(NULL, 'technical', 'medium', 'What tools and technologies did you use and why?'),
(NULL, 'analysis', 'medium', 'What are your major findings?'),
(NULL, 'analysis', 'hard', 'How did you validate your results?'),
(NULL, 'conclusion', 'easy', 'What are your recommendations?'),
(NULL, 'conclusion', 'medium', 'What is the contribution of your work to the field?'),
('Computer Science', 'technical', 'medium', 'Explain the architecture of your system.'),
('Computer Science', 'technical', 'hard', 'How does your solution scale?'),
('Business Administration', 'analysis', 'medium', 'What business implications do your findings have?'),
('Education', 'methodology', 'medium', 'How did you ensure validity of your instruments?'),
('Mass Communication', 'analysis', 'medium', 'How do your findings align with communication theories?');
