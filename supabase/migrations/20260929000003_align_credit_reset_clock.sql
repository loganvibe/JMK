-- ============================================================
-- Align the credit reset clock with the edge function.
--
-- Why: entitlements.ts computed the next daily reset as "now + 1 day at the
-- runtime's local midnight" and compared it with a raw string comparison, while
-- this trigger used a rolling "now() + interval '1 day'" and UTC. Two clocks
-- writing the same ai_credit_balances row.
--
-- The rolling window is the one that silently hands credits back: this trigger
-- is a BEFORE UPDATE trigger, so the moment daily_reset_at is in the past it
-- overwrites daily_credits with the full plan allowance - including on the very
-- UPDATE that deductCredits() issues.
-- ============================================================

CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  plan_limit integer;
  plan_ai_limits jsonb;
BEGIN
  -- Get plan credit limit from subscription
  SELECT s.ai_limits INTO plan_ai_limits
  FROM public.user_subscriptions us
  JOIN public.subscription_plans s ON us.plan_id = s.id
  WHERE us.user_id = NEW.user_id
    AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;

  IF plan_ai_limits IS NULL THEN
    plan_ai_limits := '{"credits": 10}'::jsonb;
  END IF;

  plan_limit := COALESCE((plan_ai_limits->>'credits')::integer, 10);

  -- Reset daily credits if reset time has passed (next UTC midnight)
  IF NEW.daily_reset_at IS NULL OR NEW.daily_reset_at < now() THEN
    NEW.daily_credits := plan_limit;
    NEW.daily_reset_at := date_trunc('day', now()) + interval '1 day';
  END IF;

  -- Reset monthly credits if reset time has passed
  IF NEW.monthly_reset_at IS NULL OR NEW.monthly_reset_at < now() THEN
    NEW.monthly_credits := plan_limit * 30;
    NEW.monthly_reset_at := date_trunc('month', now()) + interval '1 month';
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- Repair the signup trigger.
--
-- public.ai_usage is UNIQUE (user_id, month); handle_new_user() declared
-- ON CONFLICT (user_id), which matches no unique index and raises
-- "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification" on every new signup.
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
