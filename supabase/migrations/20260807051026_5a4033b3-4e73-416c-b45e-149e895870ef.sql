-- preferred model on profile
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_model TEXT NOT NULL DEFAULT 'google/gemini-3.6-flash';

-- collaborators (supervisors / peers)
CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'supervisor',
  status TEXT NOT NULL DEFAULT 'invited',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, email)
);

CREATE OR REPLACE FUNCTION public.can_access_project(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id AND p.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.project_collaborators c
    WHERE c.project_id = _project_id
      AND lower(c.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_project(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_project(UUID) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.project_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_email TEXT,
  chapter TEXT,
  section_type TEXT,
  body TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.originality_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter TEXT,
  section_type TEXT,
  originality_score INTEGER NOT NULL DEFAULT 0,
  ai_likelihood INTEGER NOT NULL DEFAULT 0,
  verdict TEXT,
  flagged JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.literature_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  authors TEXT,
  year TEXT,
  venue TEXT,
  summary TEXT,
  relevance TEXT,
  citation TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Analysis',
  method TEXT,
  raw_input TEXT,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  tables JSONB NOT NULL DEFAULT '[]'::jsonb,
  narrative TEXT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_collaborators TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.originality_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.literature_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_analyses TO authenticated;
GRANT ALL ON public.project_collaborators TO service_role;
GRANT ALL ON public.project_comments TO service_role;
GRANT ALL ON public.originality_reports TO service_role;
GRANT ALL ON public.literature_sources TO service_role;
GRANT ALL ON public.data_analyses TO service_role;

ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.originality_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.literature_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage collaborators" ON public.project_collaborators
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Collaborators see their invites" ON public.project_collaborators
  FOR SELECT TO authenticated
  USING (lower(email) = lower(coalesce((auth.jwt() ->> 'email'), '')));

CREATE POLICY "Project members read comments" ON public.project_comments
  FOR SELECT TO authenticated USING (public.can_access_project(project_id));
CREATE POLICY "Project members add comments" ON public.project_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.can_access_project(project_id));
CREATE POLICY "Authors and owners update comments" ON public.project_comments
  FOR UPDATE TO authenticated USING (author_id = auth.uid() OR public.can_access_project(project_id));
CREATE POLICY "Authors delete own comments" ON public.project_comments
  FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE POLICY "Members read originality" ON public.originality_reports
  FOR SELECT TO authenticated USING (public.can_access_project(project_id));
CREATE POLICY "Owners write originality" ON public.originality_reports
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members read literature" ON public.literature_sources
  FOR SELECT TO authenticated USING (public.can_access_project(project_id));
CREATE POLICY "Owners write literature" ON public.literature_sources
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members read analyses" ON public.data_analyses
  FOR SELECT TO authenticated USING (public.can_access_project(project_id));
CREATE POLICY "Owners write analyses" ON public.data_analyses
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_orig_project ON public.originality_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_lit_project ON public.literature_sources(project_id);
CREATE INDEX IF NOT EXISTS idx_analyses_project ON public.data_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_project ON public.project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_collab_project ON public.project_collaborators(project_id);