
-- 1. Revoke anon SELECT (GraphQL/PostgREST discoverability) on all public tables
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r','v','m','f')
      AND c.relname <> 'subscription_plans'
  LOOP
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon', r.relname);
  END LOOP;
END $$;

-- keep anon able to report errors (insert-only policy exists)
GRANT INSERT ON public.error_logs TO anon;
GRANT SELECT ON public.subscription_plans TO anon;

-- 2. SECURITY DEFINER functions: revoke direct execute from API roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_payment_status() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- has_role is used inside RLS policies evaluated as the caller: signed-in users need it
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
