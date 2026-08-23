-- Allow admin panel to manage core tables without requiring a Supabase auth session.
-- The admin UI already gates access via sessionStorage, so these policies allow all operations.

DO $$
BEGIN
  -- app_settings
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Admins manage app settings') THEN
    ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins manage app settings" ON public.app_settings;
    ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
  END IF;

  -- universities
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'universities' AND policyname = 'Admin manage universities') THEN
    ALTER TABLE public.universities DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admin manage universities" ON public.universities;
    ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
  END IF;

  -- departments
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'departments' AND policyname = 'Admin manage departments') THEN
    ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admin manage departments" ON public.departments;
    ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
  END IF;

  -- research_fields
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'research_fields' AND policyname = 'Admin manage research fields') THEN
    ALTER TABLE public.research_fields DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admin manage research fields" ON public.research_fields;
    ALTER TABLE public.research_fields ENABLE ROW LEVEL SECURITY;
  END IF;

  -- service_requests
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_requests' AND policyname = 'Admins update requests') THEN
    ALTER TABLE public.service_requests DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins update requests" ON public.service_requests;
    ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
  END IF;

  -- subscription_plans
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Admins manage plans') THEN
    ALTER TABLE public.subscription_plans DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins manage plans" ON public.subscription_plans;
    ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

CREATE POLICY "Allow all manage app settings"
  ON public.app_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all manage universities"
  ON public.universities
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all manage departments"
  ON public.departments
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all manage research fields"
  ON public.research_fields
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all manage service requests"
  ON public.service_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all manage subscription plans"
  ON public.subscription_plans
  FOR ALL
  USING (true)
  WITH CHECK (true);
