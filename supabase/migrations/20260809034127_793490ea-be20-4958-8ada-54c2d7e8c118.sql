CREATE TABLE public.app_settings (
  id text PRIMARY KEY DEFAULT 'global',
  pricing_mode text NOT NULL DEFAULT 'paid',
  free_mode_message text DEFAULT 'All premium features are currently free for every student.',
  payments_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_single_row CHECK (id = 'global'),
  CONSTRAINT app_settings_mode_valid CHECK (pricing_mode IN ('paid','free'))
);

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app settings"
ON public.app_settings FOR SELECT
USING (true);

CREATE POLICY "Admins manage app settings"
ON public.app_settings FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_app_settings_updated
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (id) VALUES ('global') ON CONFLICT DO NOTHING;