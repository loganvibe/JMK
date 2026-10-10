-- Create customer support system
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Awaiting User', 'Resolved')),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_conversations TO authenticated;
GRANT ALL ON public.support_conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

-- updated_at trigger
CREATE TRIGGER trg_support_conversations_updated BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_conversations_user ON public.support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON public.support_conversations(status);
CREATE INDEX IF NOT EXISTS idx_support_conversations_created ON public.support_conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_conv ON public.support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created ON public.support_messages(created_at);

-- RLS
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Policies for support_conversations
CREATE POLICY "Users view own conversations" ON public.support_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create own conversations" ON public.support_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own conversation except status/resolved" ON public.support_conversations
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND status != 'Resolved');

CREATE POLICY "Admins view all conversations" ON public.support_conversations
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Policies for support_messages
CREATE POLICY "Users view own conversation messages" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users create messages in own conversations" ON public.support_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid() AND sender_id = auth.uid()
    )
    AND is_admin = false
  );

CREATE POLICY "Admins manage all messages" ON public.support_messages
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
