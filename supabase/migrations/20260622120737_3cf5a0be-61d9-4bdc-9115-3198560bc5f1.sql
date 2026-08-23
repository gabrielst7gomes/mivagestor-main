
-- Tabela de compromissos da agenda
CREATE TABLE public.compromissos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL,
  local TEXT,
  observacoes TEXT,
  conta_id UUID REFERENCES public.contas(id) ON DELETE SET NULL,
  receita_id UUID REFERENCES public.receitas(id) ON DELETE SET NULL,
  concluido BOOLEAN NOT NULL DEFAULT false,
  notificado_dia_anterior BOOLEAN NOT NULL DEFAULT false,
  notificado_no_dia BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compromissos TO authenticated;
GRANT ALL ON public.compromissos TO service_role;

ALTER TABLE public.compromissos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuárias gerenciam seus próprios compromissos"
ON public.compromissos FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_compromissos_user_data ON public.compromissos(user_id, data_hora);

CREATE TRIGGER update_compromissos_updated_at
BEFORE UPDATE ON public.compromissos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de inscrições push (Web Push) por dispositivo
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuárias gerenciam suas próprias inscrições push"
ON public.push_subscriptions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_push_subs_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
