-- Reactivate the free plan so free users retain AI access (topic generation, Chapter One).
-- Preserves the weekly contribution model for paid subscribers.
INSERT INTO public.subscription_plans (slug, name, price, currency, description, features, ai_limits, sort_order, active)
VALUES (
  'free',
  'Free Trial',
  0,
  'NGN',
  'Explore the platform and test the AI',
  '["Account creation","AI topic suggestions","Generate Chapter 1 of one project","Limited AI questions","Preview premium features"]'::jsonb,
  '{"credits":5,"max_projects":1,"chapters":["chapter1"],"refinement":false,"defense":"preview"}'::jsonb,
  1,
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

-- Grant new users a free credit balance row so they receive 5 daily credits.
-- Existing backend fallback covers users with no balance row, but an explicit
-- row makes entitlement resolution deterministic across all code paths.
INSERT INTO public.ai_credit_balances (user_id, daily_credits, credits_total, daily_reset_at, monthly_reset_at)
SELECT p.id, 5, 5, now(), now()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_credit_balances acb WHERE acb.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;
