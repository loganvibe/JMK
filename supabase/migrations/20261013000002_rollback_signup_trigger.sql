-- ============================================================
-- ROLLBACK: Restore handle_new_user() to production version
-- Restores exact function from 20260929000003_align_credit_reset_clock.sql
-- Includes all four inserts with their conflict-handling clauses.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.ai_usage (user_id, credits_limit)
  VALUES (NEW.id, 10)
  ON CONFLICT (user_id, month) DO NOTHING;

  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (
    NEW.id,
    'Welcome to jmk',
    'Start by completing your student profile, then create your first project and generate topic ideas with AI.',
    'info',
    '/profile'
  );

  RETURN NEW;
END;
$function$;