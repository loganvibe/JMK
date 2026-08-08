
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION private.can_access_project(_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
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

REVOKE ALL ON FUNCTION private.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_access_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_access_project(uuid) TO authenticated, service_role;

-- Repoint policies to the private helpers
ALTER POLICY "Members read analyses" ON public.data_analyses USING (private.can_access_project(project_id));
ALTER POLICY "Admin manage universities" ON public.universities USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
ALTER POLICY "Admin manage faculties" ON public.faculties USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
ALTER POLICY "Admin manage departments" ON public.departments USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
ALTER POLICY "Admin manage courses" ON public.courses USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
ALTER POLICY "Admin manage research fields" ON public.research_fields USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
ALTER POLICY "admin manage questions" ON public.defense_question_bank USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
ALTER POLICY "Anyone can view active plans" ON public.subscription_plans USING ((active = true) OR (auth.uid() IS NOT NULL AND private.has_role(auth.uid(),'admin')));
ALTER POLICY "Admins manage plans" ON public.subscription_plans USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
ALTER POLICY "Users view own subscriptions" ON public.user_subscriptions USING ((auth.uid() = user_id) OR private.has_role(auth.uid(),'admin'));
ALTER POLICY "Users view own transactions" ON public.payment_transactions USING ((auth.uid() = user_id) OR private.has_role(auth.uid(),'admin'));
ALTER POLICY "Users view own ai usage" ON public.ai_usage_logs USING ((auth.uid() = user_id) OR private.has_role(auth.uid(),'admin'));
ALTER POLICY "Users view own requests" ON public.service_requests USING ((auth.uid() = user_id) OR private.has_role(auth.uid(),'admin'));
ALTER POLICY "Admins update requests" ON public.service_requests USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
ALTER POLICY "Users view own orders" ON public.service_orders USING ((auth.uid() = user_id) OR private.has_role(auth.uid(),'admin'));
ALTER POLICY "Admins view all transactions" ON public.payment_transactions USING (private.has_role(auth.uid(),'admin'));
ALTER POLICY "Admins view all subscriptions" ON public.user_subscriptions USING (private.has_role(auth.uid(),'admin'));
ALTER POLICY "Admins view all ai usage" ON public.ai_usage_logs USING (private.has_role(auth.uid(),'admin'));
ALTER POLICY "Admins view all requests" ON public.service_requests USING (private.has_role(auth.uid(),'admin'));
ALTER POLICY "Admins create notifications" ON public.notifications WITH CHECK (private.has_role(auth.uid(),'admin'));
ALTER POLICY "Admins can read error logs" ON public.error_logs USING (private.has_role(auth.uid(),'admin'));
ALTER POLICY "Project members read comments" ON public.project_comments USING (private.can_access_project(project_id));
ALTER POLICY "Project members add comments" ON public.project_comments WITH CHECK ((author_id = auth.uid()) AND private.can_access_project(project_id));
ALTER POLICY "Authors and owners update comments" ON public.project_comments USING ((author_id = auth.uid()) OR private.can_access_project(project_id));
ALTER POLICY "Members read originality" ON public.originality_reports USING (private.can_access_project(project_id));
ALTER POLICY "Members read literature" ON public.literature_sources USING (private.can_access_project(project_id));

DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.can_access_project(uuid);

-- Disable the unused GraphQL API surface so tables are not discoverable there
REVOKE USAGE ON SCHEMA graphql FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA graphql FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA graphql FROM anon, authenticated;
REVOKE USAGE ON SCHEMA graphql_public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA graphql_public FROM anon, authenticated;
