-- Fix admin reply policy - allow admins to insert replies in any conversation
DROP POLICY IF EXISTS "Admins manage all messages" ON public.support_messages;
CREATE POLICY "Admins manage all messages" ON public.support_messages
  FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true)
  WITH CHECK ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);
