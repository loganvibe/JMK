CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  scope text not null,
  source text,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  severity text not null default 'error',
  created_at timestamptz not null default now()
);

GRANT INSERT ON public.error_logs TO authenticated, anon;
GRANT SELECT ON public.error_logs TO authenticated;
GRANT ALL ON public.error_logs TO service_role;

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can report an error" ON public.error_logs
  FOR INSERT TO authenticated, anon
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Admins can read error logs" ON public.error_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_error_logs_created ON public.error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_scope ON public.error_logs (scope, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_user_updated ON public.projects (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_sections_project ON public.project_sections (project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created ON public.ai_usage_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON public.ai_usage_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_txn_user_created ON public.payment_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_txn_status_created ON public.payment_transactions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_subs_user_status ON public.user_subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_created ON public.activity_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_documents_user_created ON public.project_documents (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_status_created ON public.service_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles (department);
CREATE INDEX IF NOT EXISTS idx_defense_sessions_project ON public.defense_sessions (project_id, created_at DESC);