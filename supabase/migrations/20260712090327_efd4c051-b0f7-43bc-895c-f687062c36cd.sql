
-- project_documents
CREATE TABLE public.project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  extracted_content text,
  analysis jsonb,
  upload_status text NOT NULL DEFAULT 'uploaded',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_documents TO authenticated;
GRANT ALL ON public.project_documents TO service_role;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own project_documents" ON public.project_documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER project_documents_updated_at BEFORE UPDATE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- project_refinement_requests
CREATE TABLE public.project_refinement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.project_documents(id) ON DELETE CASCADE,
  user_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  refinement_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_refinement_requests TO authenticated;
GRANT ALL ON public.project_refinement_requests TO service_role;
ALTER TABLE public.project_refinement_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own refinement_requests" ON public.project_refinement_requests
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER project_refinement_requests_updated_at BEFORE UPDATE ON public.project_refinement_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- project_section_versions
CREATE TABLE public.project_section_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.project_sections(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  old_content text,
  new_content text,
  change_summary text,
  source text DEFAULT 'ai_refinement',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_section_versions TO authenticated;
GRANT ALL ON public.project_section_versions TO service_role;
ALTER TABLE public.project_section_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own section_versions" ON public.project_section_versions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
