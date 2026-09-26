-- ============================================================
-- OpenRouter-only AI provider refactor
-- Locks the system to OpenRouter as the sole AI provider.
-- Removes all support for Ollama, Gemini, OpenAI, and Groq.
-- ============================================================

-- ============================================================
-- 1. Remove non-OpenRouter models first (before removing providers,
--    because ai_models.provider_id -> ai_providers.id FK exists)
-- ============================================================
DELETE FROM public.ai_models
WHERE provider_id IN (
  SELECT id FROM public.ai_providers WHERE vendor IN ('google', 'openai', 'ollama', 'groq', 'lovable')
);

-- ============================================================
-- 2. Clear ai_feature_settings references to deleted models/providers
-- ============================================================
UPDATE public.ai_feature_settings
SET provider_id = NULL,
    model_id = NULL
WHERE provider_id IN (
  SELECT id FROM public.ai_providers WHERE vendor IN ('google', 'openai', 'ollama', 'groq', 'lovable')
);

-- ============================================================
-- 3. Remove non-OpenRouter pricing and budgets
-- ============================================================
DELETE FROM public.ai_provider_pricing
WHERE provider IN ('google', 'openai', 'ollama', 'groq', 'lovable');

DELETE FROM public.ai_provider_budgets
WHERE provider IN ('google', 'openai', 'ollama', 'groq', 'lovable');

DELETE FROM public.ai_provider_usage
WHERE provider IN ('google', 'openai', 'ollama', 'groq', 'lovable');

-- ============================================================
-- 4. Deactivate and remove non-OpenRouter providers
--    Keep the openrouter provider row but clear its api_key
--    (the key now comes from the OPENROUTER_API_KEY env var only)
-- ============================================================
UPDATE public.ai_providers
SET api_key = NULL
WHERE vendor = 'openrouter';

DELETE FROM public.ai_providers
WHERE vendor IN ('google', 'openai', 'ollama', 'groq', 'lovable');

-- ============================================================
-- 5. Ensure OpenRouter provider exists and is the only provider
-- ============================================================
INSERT INTO public.ai_providers (vendor, type, api_key, active, priority, config)
VALUES ('openrouter', 'openrouter', NULL, true, 1, '{}'::jsonb)
ON CONFLICT (vendor) DO UPDATE SET
  type = 'openrouter',
  api_key = NULL,
  active = true,
  priority = 1,
  config = '{}'::jsonb;

-- ============================================================
-- 6. Seed OpenRouter models (only if not already present)
-- ============================================================
INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT p.id, 'meta-llama/llama-3.1-70b-instruct', 'Llama 3.1 70B Instruct', 'standard', 0.35, 0.40, 1
FROM public.ai_providers p WHERE p.vendor = 'openrouter'
ON CONFLICT (provider_id, model_id) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT p.id, 'meta-llama/llama-3.1-405b-instruct', 'Llama 3.1 405B Instruct', 'pro', 1.00, 1.00, 2
FROM public.ai_providers p WHERE p.vendor = 'openrouter'
ON CONFLICT (provider_id, model_id) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT p.id, 'google/gemini-pro-1.5', 'Gemini Pro 1.5 (via OpenRouter)', 'standard', 0.35, 1.05, 3
FROM public.ai_providers p WHERE p.vendor = 'openrouter'
ON CONFLICT (provider_id, model_id) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT p.id, 'z-ai/glm-5.2:free', 'GLM-5.2 Free', 'standard', 0, 0, 4
FROM public.ai_providers p WHERE p.vendor = 'openrouter'
ON CONFLICT (provider_id, model_id) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT p.id, 'stealth/ox-alpha', 'Stealth OX Alpha', 'standard', 0, 0, 5
FROM public.ai_providers p WHERE p.vendor = 'openrouter'
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- ============================================================
-- 7. Seed OpenRouter pricing
-- ============================================================
INSERT INTO public.ai_provider_pricing (provider, model, input_price_per_1k, output_price_per_1k, currency)
VALUES
  ('openrouter', 'meta-llama/llama-3.1-70b-instruct', 0.35, 0.40, 'USD'),
  ('openrouter', 'meta-llama/llama-3.1-405b-instruct', 1.00, 1.00, 'USD'),
  ('openrouter', 'google/gemini-pro-1.5', 0.35, 1.05, 'USD'),
  ('openrouter', 'z-ai/glm-5.2:free', 0, 0, 'USD'),
  ('openrouter', 'stealth/ox-alpha', 0, 0, 'USD')
ON CONFLICT (provider, model, effective_from) DO NOTHING;

-- ============================================================
-- 8. Seed OpenRouter budget
-- ============================================================
INSERT INTO public.ai_provider_budgets (provider, monthly_budget, warning_threshold, hard_limit)
VALUES ('openrouter', 5000, 0.8, 1.0)
ON CONFLICT (provider) DO NOTHING;

-- ============================================================
-- 9. Update credit system defaults
--    Paying students (Student / Premium+) get 100 credits/day.
--    Free tier gets 10 credits/day.
--    This is achieved by updating the subscription plan ai_limits.
-- ============================================================
UPDATE public.subscription_plans
SET ai_limits = jsonb_set(
  ai_limits || '{"max_projects":5,"chapters":["chapter1","chapter2","chapter3","chapter4","chapter5"],"refinement":true,"defense":"full"}'::jsonb,
  '{credits}',
  '100'::jsonb
)
WHERE slug = 'student';

UPDATE public.subscription_plans
SET ai_limits = jsonb_set(
  ai_limits || '{"max_projects":50,"chapters":["chapter1","chapter2","chapter3","chapter4","chapter5"],"refinement":true,"defense":"full","priority":true}'::jsonb,
  '{credits}',
  '100'::jsonb
)
WHERE slug = 'premium_plus';

-- ============================================================
-- 10. Update reset_daily_credits trigger function default
--     Change the fallback default from 10 to 100 when no plan is found.
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
    plan_ai_limits := '{"credits": 100}'::jsonb;
  END IF;

  plan_limit := COALESCE((plan_ai_limits->>'credits')::integer, 100);

  -- Reset daily credits if reset time has passed
  IF NEW.daily_reset_at IS NULL OR NEW.daily_reset_at < now() THEN
    NEW.daily_credits := plan_limit;
    NEW.daily_reset_at := now() + interval '1 day';
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
-- 11. Update profiles.preferred_model default to OpenRouter model
-- ============================================================
ALTER TABLE public.profiles
ALTER COLUMN preferred_model SET DEFAULT 'openrouter/meta-llama/llama-3.1-70b-instruct';

-- ============================================================
-- 12. Update handle_new_user trigger function
--     Align the ai_usage seed credits with the new defaults.
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
  ON CONFLICT (user_id) DO NOTHING;

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
