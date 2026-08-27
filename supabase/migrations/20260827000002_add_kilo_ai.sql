-- ============================================================
-- Add Kilo AI Provider
-- Kilo AI provides free models via https://api.kilo.ai/api/gateway
-- ============================================================

-- Add Kilo AI provider
INSERT INTO public.ai_providers (vendor, type, api_key, active, priority, config)
VALUES ('kilo', 'kilo', '', true, 0, '{}'::jsonb)
ON CONFLICT (vendor) DO UPDATE SET
  active = true,
  priority = 0,
  updated_at = now();

-- Add Kilo AI free model (auto-routes to best available free model)
INSERT INTO public.ai_models (provider_id, model_id, label, tier, input_price_per_1k, output_price_per_1k, sort_order)
SELECT p.id, 'kilo-auto/free', 'Kilo Auto Free', 'standard', 0, 0, 1
FROM public.ai_providers p
WHERE p.vendor = 'kilo'
ON CONFLICT (provider_id, model_id) DO UPDATE SET
  active = true,
  label = 'Kilo Auto Free',
  updated_at = now();

-- Add pricing for Kilo AI free model
INSERT INTO public.ai_provider_pricing (provider, model, input_price_per_1k, output_price_per_1k, currency)
VALUES ('kilo', 'kilo-auto/free', 0, 0, 'USD')
ON CONFLICT (provider, model, effective_from) DO UPDATE SET
  input_price_per_1k = 0,
  output_price_per_1k = 0;

-- Add budget for Kilo AI (free)
INSERT INTO public.ai_provider_budgets (provider, monthly_budget, warning_threshold, hard_limit)
VALUES ('kilo', 0, 0.8, 1.0)
ON CONFLICT (provider) DO UPDATE SET
  monthly_budget = 0,
  updated_at = now();
