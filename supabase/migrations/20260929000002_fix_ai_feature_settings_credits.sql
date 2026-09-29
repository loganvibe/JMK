-- ============================================================
-- Correct ai_feature_settings.credits to match the authoritative
-- FEATURE_RULES in supabase/functions/_shared/entitlements.ts.
--
-- Why: the original seed used ON CONFLICT (feature_key) DO NOTHING, so any
-- pre-existing row kept its old value. checkCreditLimit() compared
-- balance.daily_credits against this drifted column, producing false
-- rejections such as "Daily limit reached. You have 10 credits remaining today."
-- while the user still had credits available.
-- ============================================================

UPDATE public.ai_feature_settings SET credits = 2  WHERE feature_key = 'topic_generation';
UPDATE public.ai_feature_settings SET credits = 20 WHERE feature_key = 'chapter_generation';
UPDATE public.ai_feature_settings SET credits = 20 WHERE feature_key = 'refinement';
UPDATE public.ai_feature_settings SET credits = 2  WHERE feature_key = 'academic_assist';
UPDATE public.ai_feature_settings SET credits = 2  WHERE feature_key = 'citation';
UPDATE public.ai_feature_settings SET credits = 8  WHERE feature_key = 'quality_check';
UPDATE public.ai_feature_settings SET credits = 10 WHERE feature_key = 'defense_basic';
UPDATE public.ai_feature_settings SET credits = 10 WHERE feature_key = 'defense_simulation';
UPDATE public.ai_feature_settings SET credits = 10 WHERE feature_key = 'originality';
UPDATE public.ai_feature_settings SET credits = 5  WHERE feature_key = 'literature';
UPDATE public.ai_feature_settings SET credits = 8  WHERE feature_key = 'data_analysis';
