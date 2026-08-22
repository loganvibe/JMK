CREATE TABLE IF NOT EXISTS public.payment_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  public_key text,
  secret_key text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_provider_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.payment_providers(id) ON DELETE CASCADE,
  setting_key text NOT NULL,
  setting_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, setting_key)
);

ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage providers" ON public.payment_providers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage provider settings" ON public.payment_provider_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Anyone can view active providers" ON public.payment_providers FOR SELECT USING (active = true OR auth.uid() IS NOT NULL);

CREATE TRIGGER trg_payment_providers_updated BEFORE UPDATE ON public.payment_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payment_provider_settings_updated BEFORE UPDATE ON public.payment_provider_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.payment_providers (slug, name, active, sort_order) VALUES
('paystack', 'Paystack', true, 1),
('flutterwave', 'Flutterwave', false, 2),
('stripe', 'Stripe', false, 3)
ON CONFLICT (slug) DO NOTHING;
