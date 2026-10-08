-- Fix project_sections RLS ownership policy
-- The original policy referenced project_sections.user_id which doesn't exist in production.
-- Ownership is determined via project_id -> projects.user_id = auth.uid()

-- Drop the broken policy
DROP POLICY IF EXISTS "Users manage own project sections" ON public.project_sections;

-- Create corrected policies using project ownership
CREATE POLICY "Users can view own project sections" ON public.project_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_sections.project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own project sections" ON public.project_sections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_sections.project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project sections" ON public.project_sections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_sections.project_id
        AND p.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_sections.project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project sections" ON public.project_sections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_sections.project_id
        AND p.user_id = auth.uid()
    )
  );