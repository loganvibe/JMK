
-- =========================
-- ROLES
-- =========================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- =========================
-- ACADEMIC KNOWLEDGE BASE
-- =========================
CREATE TABLE IF NOT EXISTS public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  short_name TEXT,
  country TEXT DEFAULT 'Nigeria',
  city TEXT,
  type TEXT,
  formatting_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.universities TO authenticated;
GRANT ALL ON public.universities TO service_role;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Any auth can read universities" ON public.universities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage universities" ON public.universities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.faculties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  university_id UUID REFERENCES public.universities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, university_id)
);
GRANT SELECT ON public.faculties TO authenticated;
GRANT ALL ON public.faculties TO service_role;
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Any auth can read faculties" ON public.faculties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage faculties" ON public.faculties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  faculty_id UUID REFERENCES public.faculties(id) ON DELETE SET NULL,
  description TEXT,
  specializations TEXT[] DEFAULT '{}',
  common_methodologies TEXT[] DEFAULT '{}',
  ai_guidance TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, faculty_id)
);
GRANT SELECT ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Any auth can read departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage departments" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Any auth can read courses" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage courses" ON public.courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.research_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  department_hint TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.research_fields TO authenticated;
GRANT ALL ON public.research_fields TO service_role;
ALTER TABLE public.research_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Any auth can read research fields" ON public.research_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage research fields" ON public.research_fields FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================
-- SUPERVISOR FEEDBACK
-- =========================
CREATE TABLE IF NOT EXISTS public.supervisor_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  source TEXT DEFAULT 'paste',
  raw_feedback TEXT NOT NULL,
  analysis JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervisor_feedback TO authenticated;
GRANT ALL ON public.supervisor_feedback TO service_role;
ALTER TABLE public.supervisor_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own feedback" ON public.supervisor_feedback FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- CITATIONS
-- =========================
CREATE TABLE IF NOT EXISTS public.project_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  style TEXT NOT NULL DEFAULT 'APA7',
  source_type TEXT,
  formatted TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_citations TO authenticated;
GRANT ALL ON public.project_citations TO service_role;
ALTER TABLE public.project_citations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own citations" ON public.project_citations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- PROJECT MEMORY
-- =========================
CREATE TABLE IF NOT EXISTS public.project_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  citation_style TEXT DEFAULT 'APA7',
  formatting_preference TEXT,
  notes TEXT,
  memory JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_memory TO authenticated;
GRANT ALL ON public.project_memory TO service_role;
ALTER TABLE public.project_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own project memory" ON public.project_memory FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_project_memory_updated
  BEFORE UPDATE ON public.project_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- SEED DATA
-- =========================
INSERT INTO public.universities (name, short_name, city, type) VALUES
  ('University of Lagos', 'UNILAG', 'Lagos', 'Federal'),
  ('University of Ibadan', 'UI', 'Ibadan', 'Federal'),
  ('Ahmadu Bello University', 'ABU', 'Zaria', 'Federal'),
  ('Obafemi Awolowo University', 'OAU', 'Ile-Ife', 'Federal'),
  ('University of Nigeria, Nsukka', 'UNN', 'Nsukka', 'Federal'),
  ('Covenant University', 'CU', 'Ota', 'Private'),
  ('Babcock University', 'BU', 'Ilishan-Remo', 'Private'),
  ('Lagos State University', 'LASU', 'Lagos', 'State')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.research_fields (name, department_hint, description) VALUES
  ('Artificial Intelligence', 'Computer Science', 'Machine learning, deep learning, NLP, computer vision'),
  ('Software Engineering', 'Computer Science', 'System design, architecture, development lifecycle'),
  ('Cybersecurity', 'Computer Science', 'Network security, cryptography, ethical hacking'),
  ('Data Science', 'Computer Science', 'Analytics, big data, statistical modeling'),
  ('Networking', 'Computer Science', 'Network design, protocols, wireless systems'),
  ('Marketing', 'Business Administration', 'Consumer behaviour, digital marketing, brand strategy'),
  ('Finance', 'Business Administration', 'Corporate finance, investment, banking'),
  ('Human Resources', 'Business Administration', 'HR management, org behaviour, workforce planning'),
  ('Entrepreneurship', 'Business Administration', 'Startups, SME growth, business innovation'),
  ('Teaching Methods', 'Education', 'Pedagogy, instructional design'),
  ('Curriculum Studies', 'Education', 'Curriculum development and evaluation'),
  ('Journalism', 'Mass Communication', 'News writing, investigative reporting'),
  ('Broadcasting', 'Mass Communication', 'Radio/TV production'),
  ('Public Relations', 'Mass Communication', 'Corporate communication, crisis management'),
  ('Advertising', 'Mass Communication', 'Creative strategy, media planning')
ON CONFLICT (name) DO NOTHING;

-- Seed a common faculty + departments (unattached to specific universities for reuse)
INSERT INTO public.departments (name, description, specializations, common_methodologies, ai_guidance) VALUES
  ('Computer Science',
   'Study of computation, algorithms, and information systems.',
   ARRAY['Software Engineering','Artificial Intelligence','Machine Learning','Networking','Cybersecurity','Database Systems'],
   ARRAY['Design and Implementation','System Development (SDLC)','Comparative Analysis','Experimental Evaluation','Case Study'],
   'Emphasize technical rigor: precise problem definition, algorithm choice, evaluation metrics (accuracy, latency), reproducible experiments, and system diagrams (use case, ERD, architecture).'),
  ('Business Administration',
   'Study of management, strategy, and organizational behaviour.',
   ARRAY['Marketing','Finance','Human Resources','Entrepreneurship','Operations'],
   ARRAY['Survey Research','Case Study','Regression Analysis','Qualitative Interviews','SWOT/PESTLE'],
   'Emphasize hypotheses, sampling technique, Likert-scale questionnaires, chi-square/regression analysis, and managerial implications.'),
  ('Education',
   'Study of teaching, learning, and curriculum.',
   ARRAY['Teaching Methods','Curriculum','Classroom Research','Educational Psychology'],
   ARRAY['Quasi-experimental Design','Action Research','Descriptive Survey','Case Study'],
   'Emphasize learning theories (Piaget, Vygotsky, Bloom), pre-test/post-test design, population/sample of students/teachers, and pedagogical recommendations.'),
  ('Mass Communication',
   'Study of media, communication, and public discourse.',
   ARRAY['Journalism','Broadcasting','Public Relations','Advertising','Media Studies'],
   ARRAY['Content Analysis','Survey Research','Focus Group Discussion','Framing Analysis'],
   'Emphasize communication theories (Agenda Setting, Uses & Gratifications, Framing), audience sampling, and media content coding sheets.')
ON CONFLICT (name, faculty_id) DO NOTHING;
