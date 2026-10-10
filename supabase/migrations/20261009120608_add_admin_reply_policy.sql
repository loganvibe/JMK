-- Fix admin reply policy - allow admins to insert replies in any conversation
DROP POLICY IF EXISTS "Admins manage all messages" ON public.support_messages;
CREATE POLICY "Admins manage all messages" ON public.support_messages
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
