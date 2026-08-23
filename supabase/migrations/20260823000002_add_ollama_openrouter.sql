-- Add Ollama and OpenRouter providers and seed additional models
-- Run after 20260823000001_ai_provider_system.sql

-- ============================================================
-- Seed Ollama and OpenRouter providers if missing
-- ============================================================

INSERT INTO public.ai_providers (vendor, type, api_key, active, priority, config)
VALUES
  ('ollama', 'ollama', '', false, 99, '{"base_url": "http://localhost:11434"}'::jsonb),
  ('openrouter', 'openrouter', '', false, 98, '{}'::jsonb)
ON CONFLICT (vendor) DO NOTHING;

-- ============================================================
-- Seed models for Ollama
-- ============================================================

INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT
  p.id,
  'llama3.1',
  'Llama 3.1',
  'standard',
  0,
  0,
  1
FROM public.ai_providers p
WHERE p.vendor = 'ollama'
ON CONFLICT (provider_id, model_id) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT
  p.id,
  'llama3.1:70b',
  'Llama 3.1 70B',
  'pro',
  0,
  0,
  2
FROM public.ai_providers p
WHERE p.vendor = 'ollama'
ON CONFLICT (provider_id, model_id) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT
  p.id,
  'mistral',
  'Mistral',
  'standard',
  0,
  0,
  3
FROM public.ai_providers p
WHERE p.vendor = 'ollama'
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- ============================================================
-- Seed models for OpenRouter
-- ============================================================

INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT
  p.id,
  'meta-llama/llama-3.1-70b-instruct',
  'Llama 3.1 70B Instruct',
  'standard',
  0.35,
  0.40,
  1
FROM public.ai_providers p
WHERE p.vendor = 'openrouter'
ON CONFLICT (provider_id, model_id) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT
  p.id,
  'meta-llama/llama-3.1-405b-instruct',
  'Llama 3.1 405B Instruct',
  'pro',
  1.00,
  1.00,
  2
FROM public.ai_providers p
WHERE p.vendor = 'openrouter'
ON CONFLICT (provider_id, model_id) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT
  p.id,
  'google/gemini-pro-1.5',
  'Gemini Pro 1.5',
  'standard',
  0.35,
  1.05,
  3
FROM public.ai_providers p
WHERE p.vendor = 'openrouter'
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- ============================================================
-- Seed provider budgets for new providers
-- ============================================================

INSERT INTO public.ai_provider_budgets (provider, monthly_budget, warning_threshold, hard_limit)
VALUES
  ('ollama', 0, 0.8, 1.0),
  ('openrouter', 5000, 0.8, 1.0)
ON CONFLICT (provider) DO NOTHING;

-- ============================================================
-- Seed provider pricing for OpenRouter models
-- ============================================================

INSERT INTO public.ai_provider_pricing (provider, model, input_price_per_1k, output_price_per_1k, currency)
VALUES
  ('openrouter', 'meta-llama/llama-3.1-70b-instruct', 0.35, 0.40, 'USD'),
  ('openrouter', 'meta-llama/llama-3.1-405b-instruct', 1.00, 1.00, 'USD'),
  ('openrouter', 'google/gemini-pro-1.5', 0.35, 1.05, 'USD')
ON CONFLICT (provider, model, effective_from) DO NOTHING;
