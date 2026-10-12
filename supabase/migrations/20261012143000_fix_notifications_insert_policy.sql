-- Fix: Allow authenticated users to insert their own welcome notification
-- The handle_new_user() trigger runs as the new user (auth.uid() = NEW.id)
-- and attempts to INSERT into notifications, which is blocked by RLS.

CREATE POLICY "Users insert own welcome notification"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);