-- ============================================================
-- DIAGNOSTIC: Reduce handle_new_user() to profiles insert only
-- Purpose: Isolate whether ai_usage, subscriptions, or notifications
--          inserts cause the 10s timeout / 504 on signup.
-- NOT a root cause fix. Reversible via rollback migration.
-- ============================================================

-- Store current function definition for rollback reference
-- (rollback migration restores this exact version)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only profiles insert for diagnostic
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Note: Trigger on_auth_user_created on auth.users remains unchanged.
-- It still calls handle_new_user() AFTER INSERT ON auth.users.

-- IMPORTANT: With this diagnostic version:
-- - NO subscription row is created (user has no tier/status)
-- - NO ai_usage row is created (no credit tracking)
-- - NO welcome notification is created
-- - User CAN sign up and receive confirmation email
-- - Subsequent features requiring these tables will fail until rollback