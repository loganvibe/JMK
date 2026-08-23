-- ============================================================
-- PHASE 1: AI Provider + Credit Control System (Database Foundation)
-- ============================================================

-- ============================================================
-- 1. Expand ai_providers table
-- ============================================================

ALTER TABLE public.ai_providers
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'google',
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.ai_providers.type IS 'Provider type: ollama | openrouter | gemini | openai';
COMMENT ON COLUMN public.ai_providers.config IS 'Provider-specific config: { base_url, ... }';
COMMENT ON COLUMN public.ai_providers.priority IS 'Lower number = higher priority when auto-selecting';

-- ============================================================
-- 2. Create ai_models table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  model_id text NOT NULL,
  label text NOT NULL,
  tier text NOT NULL DEFAULT 'standard',
  input_price_per_1k numeric NOT NULL DEFAULT 0,
  output_price_per_1k numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON public.ai_models(provider_id);

GRANT SELECT ON public.ai_models TO anon, authenticated;
GRANT ALL ON public.ai_models TO service_role;

ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active models"
  ON public.ai_models FOR SELECT
  USING (active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage models"
  ON public.ai_models FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ai_models_updated
  BEFORE UPDATE ON public.ai_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. Create ai_feature_settings table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_feature_settings (
  feature_key text PRIMARY KEY,
  provider_id uuid REFERENCES public.ai_providers(id),
  model_id uuid REFERENCES public.ai_models(id),
  enabled boolean NOT NULL DEFAULT true,
  credits integer NOT NULL DEFAULT 1,
  max_input_tokens integer NOT NULL DEFAULT 8000,
  max_output_tokens integer NOT NULL DEFAULT 4096,
  daily_limit integer,
  monthly_limit integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_feature_settings TO anon, authenticated;
GRANT ALL ON public.ai_feature_settings TO service_role;

ALTER TABLE public.ai_feature_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feature settings"
  ON public.ai_feature_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins manage feature settings"
  ON public.ai_feature_settings FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ai_feature_settings_updated
  BEFORE UPDATE ON public.ai_feature_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. Create ai_provider_pricing table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_provider_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model text NOT NULL,
  input_price_per_1k numeric NOT NULL DEFAULT 0,
  output_price_per_1k numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, model, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_pricing_provider_model
  ON public.ai_provider_pricing(provider, model, effective_from DESC);

GRANT SELECT ON public.ai_provider_pricing TO anon, authenticated;
GRANT ALL ON public.ai_provider_pricing TO service_role;

ALTER TABLE public.ai_provider_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pricing"
  ON public.ai_provider_pricing FOR SELECT
  USING (true);

CREATE POLICY "Admins manage pricing"
  ON public.ai_provider_pricing FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ai_provider_pricing_updated
  BEFORE UPDATE ON public.ai_provider_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. Create ai_credit_balances table (replaces old ai_usage for tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_credit_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_credits integer NOT NULL DEFAULT 0,
  daily_reset_at timestamptz NOT NULL DEFAULT now(),
  monthly_credits integer NOT NULL DEFAULT 0,
  monthly_reset_at timestamptz NOT NULL DEFAULT date_trunc('month', now()) + interval '1 month',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.ai_credit_balances TO authenticated;
GRANT ALL ON public.ai_credit_balances TO service_role;

ALTER TABLE public.ai_credit_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own credit balance"
  ON public.ai_credit_balances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users update own credit balance"
  ON public.ai_credit_balances FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert credit balances"
  ON public.ai_credit_balances FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE TRIGGER trg_ai_credit_balances_updated
  BEFORE UPDATE ON public.ai_credit_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6. Create ai_credit_usage table (detailed ledger)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_credit_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  feature_key text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  estimated_cost numeric NOT NULL DEFAULT 0,
  credits_used integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  error text,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_usage_user_created
  ON public.ai_credit_usage(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_credit_usage_feature
  ON public.ai_credit_usage(feature_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_credit_usage_provider
  ON public.ai_credit_usage(provider, created_at DESC);

GRANT SELECT ON public.ai_credit_usage TO authenticated;
GRANT ALL ON public.ai_credit_usage TO service_role;

ALTER TABLE public.ai_credit_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own credit usage"
  ON public.ai_credit_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service inserts credit usage"
  ON public.ai_credit_usage FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================
-- 7. Create ai_provider_usage table (daily/provider aggregations)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_provider_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model text NOT NULL,
  date date NOT NULL DEFAULT current_date,
  requests integer NOT NULL DEFAULT 0,
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  estimated_cost numeric NOT NULL DEFAULT 0,
  unique_users integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, model, date)
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_usage_date
  ON public.ai_provider_usage(date DESC);

GRANT SELECT ON public.ai_provider_usage TO anon, authenticated;
GRANT ALL ON public.ai_provider_usage TO service_role;

ALTER TABLE public.ai_provider_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view provider usage"
  ON public.ai_provider_usage FOR SELECT
  USING (true);

CREATE POLICY "Service manages provider usage"
  ON public.ai_provider_usage FOR ALL
  TO service_role
  WITH CHECK (true);

CREATE TRIGGER trg_ai_provider_usage_updated
  BEFORE UPDATE ON public.ai_provider_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 8. Create ai_provider_budgets table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_provider_budgets (
  provider text PRIMARY KEY,
  monthly_budget numeric NOT NULL DEFAULT 1000,
  warning_threshold numeric NOT NULL DEFAULT 0.8,
  hard_limit numeric NOT NULL DEFAULT 1,
  current_spend numeric NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL DEFAULT date_trunc('month', now()) + interval '1 month',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_provider_budgets TO anon, authenticated;
GRANT ALL ON public.ai_provider_budgets TO service_role;

ALTER TABLE public.ai_provider_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view provider budgets"
  ON public.ai_provider_budgets FOR SELECT
  USING (true);

CREATE POLICY "Admins manage provider budgets"
  ON public.ai_provider_budgets FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ai_provider_budgets_updated
  BEFORE UPDATE ON public.ai_provider_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 9. Daily credit reset function and trigger
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

  -- Reset daily credits if reset time has passed
  IF NEW.daily_reset_at IS NULL OR NEW.daily_reset_at < now() THEN
    NEW.daily_credits := plan_limit;
    NEW.daily_reset_at := now() + interval '1 day';
  END IF;

  -- Reset monthly credits if reset time has passed
  IF NEW.monthly_reset_at IS NULL OR NEW.monthly_reset_at < now() THEN
    NEW.monthly_credits := plan_limit * 30; -- Approximate monthly limit
    NEW.monthly_reset_at := date_trunc('month', now()) + interval '1 month';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reset_daily_credits
  BEFORE UPDATE ON public.ai_credit_balances
  FOR EACH ROW EXECUTE FUNCTION public.reset_daily_credits();

-- ============================================================
-- 10. Seed initial data
-- ============================================================

-- Expand existing ai_providers with type and config
UPDATE public.ai_providers
  SET type = CASE vendor
    WHEN 'google' THEN 'gemini'
    WHEN 'openai' THEN 'openai'
    ELSE 'unknown'
  END,
  config = CASE vendor
    WHEN 'google' THEN '{}'::jsonb
    WHEN 'openai' THEN '{}'::jsonb
    ELSE '{}'::jsonb
  END,
  priority = CASE vendor
    WHEN 'google' THEN 1
    WHEN 'openai' THEN 2
    ELSE 99
  END
WHERE type = 'google'; -- only update existing rows

-- Seed ai_models for existing providers
INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT
  p.id,
  'gemini-1.5-flash',
  'Gemini 1.5 Flash',
  'standard',
  0.075,
  0.30,
  1
FROM public.ai_providers p
WHERE p.vendor = 'google'
ON CONFLICT (provider_id, model_id) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT
  p.id,
  'gemini-1.5-pro',
  'Gemini 1.5 Pro',
  'pro',
  1.25,
  5.00,
  2
FROM public.ai_providers p
WHERE p.vendor = 'google'
ON CONFLICT (provider_id, model_id) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT
  p.id,
  'gpt-4o-mini',
  'GPT-4o Mini',
  'standard',
  0.15,
  0.60,
  1
FROM public.ai_providers p
WHERE p.vendor = 'openai'
ON CONFLICT (provider_id, model_id) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT
  p.id,
  'gpt-4o',
  'GPT-4o',
  'pro',
  2.50,
  10.00,
  2
FROM public.ai_providers p
WHERE p.vendor = 'openai'
ON CONFLICT (provider_id, model_id) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT
  p.id,
  'o3-mini',
  'o3 Mini',
  'pro',
  1.10,
  4.40,
  3
FROM public.ai_providers p
WHERE p.vendor = 'openai'
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- Seed ai_feature_settings for all existing features
INSERT INTO public.ai_feature_settings (feature_key, credits, max_input_tokens, max_output_tokens, daily_limit, monthly_limit)
VALUES
  ('topic_generation', 2, 4000, 2048, 50, 200),
  ('chapter_generation', 20, 8000, 4096, 20, 100),
  ('refinement', 20, 12000, 4096, 20, 100),
  ('academic_assist', 2, 8000, 2048, 50, 200),
  ('citation', 2, 4000, 1024, 50, 200),
  ('quality_check', 8, 12000, 2048, 20, 100),
  ('defense_basic', 10, 8000, 2048, 30, 150),
  ('defense_simulation', 10, 12000, 4096, 20, 100),
  ('originality', 10, 12000, 2048, 20, 100),
  ('literature', 5, 8000, 2048, 30, 150),
  ('data_analysis', 8, 16000, 4096, 20, 100)
ON CONFLICT (feature_key) DO NOTHING;

-- Seed provider pricing
INSERT INTO public.ai_provider_pricing (provider, model, input_price_per_1k, output_price_per_1k, currency)
VALUES
  ('google', 'gemini-1.5-flash', 0.075, 0.30, 'USD'),
  ('google', 'gemini-1.5-pro', 1.25, 5.00, 'USD'),
  ('openai', 'gpt-4o-mini', 0.15, 0.60, 'USD'),
  ('openai', 'gpt-4o', 2.50, 10.00, 'USD'),
  ('openai', 'o3-mini', 1.10, 4.40, 'USD')
ON CONFLICT (provider, model, effective_from) DO NOTHING;

-- Seed provider budgets
INSERT INTO public.ai_provider_budgets (provider, monthly_budget, warning_threshold, hard_limit)
VALUES
  ('google', 5000, 0.8, 1.0),
  ('openai', 10000, 0.8, 1.0)
ON CONFLICT (provider) DO NOTHING;
