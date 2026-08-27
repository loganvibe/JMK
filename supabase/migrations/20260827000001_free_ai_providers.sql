-- ============================================================
-- Free AI Provider Setup for JMK
-- Adds free models from OpenRouter and Groq
-- Run this after the initial AI tables setup
-- ============================================================

-- ============================================================
-- Ensure OpenRouter provider exists and is active
-- ============================================================

INSERT INTO public.ai_providers (vendor, type, api_key, active, priority, config)
VALUES ('openrouter', 'openrouter', '', true, 1, '{}'::jsonb)
ON CONFLICT (vendor) DO UPDATE SET
  active = true,
  priority = 1,
  updated_at = now();

-- ============================================================
-- Ensure Groq provider exists and is active (free tier)
-- ============================================================

INSERT INTO public.ai_providers (vendor, type, api_key, active, priority, config)
VALUES ('groq', 'groq', '', true, 2, '{}'::jsonb)
ON CONFLICT (vendor) DO UPDATE SET
  active = true,
  priority = 2,
  updated_at = now();

-- ============================================================
-- Free OpenRouter models (truly free, no payment required)
-- ============================================================

-- GLM 5.2 Free (ZhipuAI)
INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT p.id, 'z-ai/glm-5.2:free', 'GLM-5.2 Free', 'standard', 0, 0, 1
FROM public.ai_providers p
WHERE p.vendor = 'openrouter'
ON CONFLICT (provider_id, model_id) DO UPDATE SET
  active = true,
  label = 'GLM-5.2 Free',
  updated_at = now();

-- Stealth OX Alpha (experimental free model)
INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT p.id, 'stealth/ox-alpha', 'Stealth OX Alpha', 'standard', 0, 0, 2
FROM public.ai_providers p
WHERE p.vendor = 'openrouter'
ON CONFLICT (provider_id, model_id) DO UPDATE SET
  active = true,
  label = 'Stealth OX Alpha',
  updated_at = now();

-- Llama 3.1 70B Instruct (very cheap, nearly free)
INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT p.id, 'meta-llama/llama-3.1-70b-instruct', 'Llama 3.1 70B Instruct', 'standard', 0.35, 0.40, 3
FROM public.ai_providers p
WHERE p.vendor = 'openrouter'
ON CONFLICT (provider_id, model_id) DO UPDATE SET
  active = true,
  updated_at = now();

-- Google Gemini Pro 1.5 via OpenRouter (cheap)
INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT p.id, 'google/gemini-pro-1.5', 'Gemini Pro 1.5', 'standard', 0.35, 1.05, 4
FROM public.ai_providers p
WHERE p.vendor = 'openrouter'
ON CONFLICT (provider_id, model_id) DO UPDATE SET
  active = true,
  updated_at = now();

-- ============================================================
-- Free Groq models (generous free tier)
-- ============================================================

-- Llama 3.3 70B Versatile (free on Groq)
INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT p.id, 'llama-3.3-70b-versatile', 'Llama 3.3 70B Versatile', 'standard', 0, 0, 1
FROM public.ai_providers p
WHERE p.vendor = 'groq'
ON CONFLICT (provider_id, model_id) DO UPDATE SET
  active = true,
  label = 'Llama 3.3 70B Versatile',
  updated_at = now();

-- Llama 3.1 8B Instant (free on Groq)
INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT p.id, 'llama-3.1-8b-instant', 'Llama 3.1 8B Instant', 'standard', 0, 0, 2
FROM public.ai_providers p
WHERE p.vendor = 'groq'
ON CONFLICT (provider_id, model_id) DO UPDATE SET
  active = true,
  label = 'Llama 3.1 8B Instant',
  updated_at = now();

-- Mixtral 8x7B (free on Groq)
INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT p.id, 'mixtral-8x7b-32768', 'Mixtral 8x7B', 'standard', 0, 0, 3
FROM public.ai_providers p
WHERE p.vendor = 'groq'
ON CONFLICT (provider_id, model_id) DO UPDATE SET
  active = true,
  label = 'Mixtral 8x7B',
  updated_at = now();

-- Gemma 2 9B (free on Groq)
INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT p.id, 'gemma2-9b-it', 'Gemma 2 9B', 'standard', 0, 0, 4
FROM public.ai_providers p
WHERE p.vendor = 'groq'
ON CONFLICT (provider_id, model_id) DO UPDATE SET
  active = true,
  label = 'Gemma 2 9B',
  updated_at = now();

-- ============================================================
-- Update pricing for free models
-- ============================================================

INSERT INTO public.ai_provider_pricing (provider, model, input_price_per_1k, output_price_per_1k, currency)
VALUES
  ('openrouter', 'z-ai/glm-5.2:free', 0, 0, 'USD'),
  ('openrouter', 'stealth/ox-alpha', 0, 0, 'USD'),
  ('groq', 'llama-3.3-70b-versatile', 0, 0, 'USD'),
  ('groq', 'llama-3.1-8b-instant', 0, 0, 'USD'),
  ('groq', 'mixtral-8x7b-32768', 0, 0, 'USD'),
  ('groq', 'gemma2-9b-it', 0, 0, 'USD')
ON CONFLICT (provider, model, effective_from) DO UPDATE SET
  input_price_per_1k = EXCLUDED.input_price_per_1k,
  output_price_per_1k = EXCLUDED.output_price_per_1k;

-- ============================================================
-- Update budgets for free providers
-- ============================================================

INSERT INTO public.ai_provider_budgets (provider, monthly_budget, warning_threshold, hard_limit)
VALUES
  ('openrouter', 0, 0.8, 1.0),
  ('groq', 0, 0.8, 1.0)
ON CONFLICT (provider) DO UPDATE SET
  monthly_budget = 0,
  updated_at = now();

-- ============================================================
-- Ensure all features are enabled
-- ============================================================

INSERT INTO public.ai_feature_settings (feature_key, credits, max_input_tokens, max_output_tokens, daily_limit, monthly_limit, enabled)
VALUES
  ('topic_generation', 2, 4000, 2048, 50, 200, true),
  ('chapter_generation', 20, 8000, 4096, 20, 100, true),
  ('refinement', 20, 12000, 4096, 20, 100, true),
  ('academic_assist', 2, 8000, 2048, 50, 200, true),
  ('citation', 2, 4000, 1024, 50, 200, true),
  ('quality_check', 8, 12000, 2048, 20, 100, true),
  ('defense_basic', 10, 8000, 2048, 30, 150, true),
  ('defense_simulation', 10, 12000, 4096, 20, 100, true),
  ('originality', 10, 12000, 2048, 20, 100, true),
  ('literature', 5, 8000, 2048, 30, 150, true),
  ('data_analysis', 8, 16000, 4096, 20, 100, true)
ON CONFLICT (feature_key) DO UPDATE SET
  enabled = true,
  updated_at = now();
