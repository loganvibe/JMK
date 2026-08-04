CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
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
  ON CONFLICT (user_id, month) DO NOTHING;

  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (
    NEW.id,
    'Welcome to jmk 🎓',
    'Start by completing your student profile, then create your first project and generate topic ideas with AI.',
    'info',
    '/profile'
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'failed' THEN
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (NEW.user_id, 'Payment failed',
        'We could not complete your payment. No money was taken - please try again or use another card.',
        'error', '/billing');
    ELSIF NEW.status = 'success' THEN
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (NEW.user_id, 'Payment received',
        'Thank you! Your payment was successful and your plan has been updated.',
        'success', '/billing');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_payment_status ON public.payment_transactions;
CREATE TRIGGER trg_notify_payment_status
AFTER UPDATE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.notify_payment_status();