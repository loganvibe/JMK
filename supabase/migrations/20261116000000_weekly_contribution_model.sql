-- Weekly contribution model: N1,500 / 7 days / 50 AI credits.
-- Preserves historical subscription/payment records.

-- 1) Canonical weekly contribution plan (configurable by admins)
INSERT INTO public.subscription_plans (slug, name, price, currency, description, features, ai_limits, sort_order, active)
VALUES (
  'weekly_support',
  'Support JMK',
  1500,
  'NGN',
  'Support JMK and get 7 days of access to all AI features.',
  jsonb_build_array(
    '50 AI credits',
    '7 days of access',
    'All JMK AI features',
    'Your saved projects remain available after access expires'
  ),
  jsonb_build_object('credits', 50, 'duration_days', 7, 'all_ai_features', true),
  0,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  ai_limits = EXCLUDED.ai_limits,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  updated_at = now();

-- Hide legacy student-facing plans (keep rows/history intact)
UPDATE public.subscription_plans
SET active = false, updated_at = now()
WHERE slug IN ('free', 'student', 'premium_plus', 'custom')
  AND slug <> 'weekly_support';

-- 2) Credit balances: add explicit access window fields for weekly model.
ALTER TABLE public.ai_credit_balances
  ADD COLUMN IF NOT EXISTS access_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS credits_total integer NOT NULL DEFAULT 0;

-- Backfill: treat existing daily balance as an expiring window if possible
UPDATE public.ai_credit_balances
SET
  access_expires_at = COALESCE(access_expires_at, daily_reset_at, now()),
  credits_total = GREATEST(credits_total, COALESCE(daily_credits, 0))
WHERE access_expires_at IS NULL OR credits_total = 0;

-- 3) Replace refill trigger with expiry-safe normalization.
-- Weekly contributions grant a fixed credit bucket until access_expires_at; the
-- trigger must never refill spent credits.
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  active_expiry timestamptz;
BEGIN
  SELECT us.expiry_date INTO active_expiry
  FROM public.user_subscriptions us
  WHERE us.user_id = NEW.user_id
    AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;

  IF active_expiry IS NOT NULL THEN
    NEW.access_expires_at := active_expiry;
  END IF;

  IF NEW.access_expires_at IS NOT NULL AND NEW.access_expires_at <= now() THEN
    NEW.daily_credits := 0;
    NEW.monthly_credits := 0;
  END IF;

  IF NEW.daily_credits < 0 THEN NEW.daily_credits := 0; END IF;
  IF NEW.monthly_credits < 0 THEN NEW.monthly_credits := 0; END IF;
  IF NEW.daily_reset_at IS NULL THEN NEW.daily_reset_at := COALESCE(NEW.access_expires_at, now()); END IF;
  IF NEW.monthly_reset_at IS NULL THEN NEW.monthly_reset_at := COALESCE(NEW.access_expires_at, now()); END IF;
  IF NEW.credits_total < 0 THEN NEW.credits_total := 0; END IF;

  RETURN NEW;
END;
$$;

-- 4) New users should not receive implicit free AI access.
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
  VALUES (NEW.id, 'free', 'inactive')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.ai_usage (user_id, credits_limit, credits_used)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id, month) DO NOTHING;

  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (
    NEW.id,
    'Welcome to jmk',
    'Complete your profile and make a weekly contribution to access JMK AI features. Your saved projects are always kept.',
    'info',
    '/billing'
  );

  RETURN NEW;
END;
$function$;
