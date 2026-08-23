-- Função utilitária (criada se não existir)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ========== TABELA assinaturas ==========
CREATE TABLE public.assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','ativa','vencida','cancelada')),
  metodo TEXT CHECK (metodo IN ('pix','cartao')),
  valor NUMERIC(10,2) NOT NULL DEFAULT 49.90,
  trial_fim DATE,
  periodo_inicio DATE,
  periodo_fim DATE,
  ultimo_pagamento_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assinatura"
  ON public.assinaturas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own assinatura"
  ON public.assinaturas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_assinaturas_user ON public.assinaturas(user_id);

-- ========== TABELA pagamentos ==========
CREATE TABLE public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  assinatura_id UUID REFERENCES public.assinaturas(id) ON DELETE CASCADE,
  metodo TEXT NOT NULL CHECK (metodo IN ('pix','cartao')),
  valor NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado','cancelado','expirado')),
  mp_payment_id TEXT,
  mp_status TEXT,
  pix_qr_code TEXT,
  pix_qr_code_base64 TEXT,
  pix_expires_at TIMESTAMPTZ,
  cobranca_de DATE,
  cobranca_ate DATE,
  pago_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pagamentos"
  ON public.pagamentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_pagamentos_user ON public.pagamentos(user_id);
CREATE INDEX idx_pagamentos_mp_id ON public.pagamentos(mp_payment_id);

-- Triggers de updated_at
CREATE TRIGGER trg_assinaturas_updated
  BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_pagamentos_updated
  BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função: tem_acesso
CREATE OR REPLACE FUNCTION public.tem_acesso(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assinaturas a
    WHERE a.user_id = _user_id
      AND (
        (a.status = 'trial' AND a.trial_fim IS NOT NULL AND a.trial_fim >= CURRENT_DATE)
        OR (a.status = 'ativa' AND a.periodo_fim IS NOT NULL AND a.periodo_fim >= CURRENT_DATE)
      )
  )
$$;

-- Função: dias_restantes
CREATE OR REPLACE FUNCTION public.dias_restantes(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(0, COALESCE(
    CASE
      WHEN status = 'trial' THEN (trial_fim - CURRENT_DATE)
      WHEN status = 'ativa' THEN (periodo_fim - CURRENT_DATE)
      ELSE 0
    END, 0))::INTEGER
  FROM public.assinaturas
  WHERE user_id = _user_id
$$;

-- Atualiza handle_new_user para criar assinatura em trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)));

  PERFORM public.seed_categorias_padrao(NEW.id);

  INSERT INTO public.assinaturas (user_id, status, trial_fim, valor)
  VALUES (NEW.id, 'trial', (CURRENT_DATE + INTERVAL '7 days')::DATE, 49.90)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Cria assinaturas em trial RETROATIVAMENTE para usuárias existentes
INSERT INTO public.assinaturas (user_id, status, trial_fim, valor)
SELECT p.id, 'trial', (CURRENT_DATE + INTERVAL '7 days')::DATE, 49.90
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.assinaturas a WHERE a.user_id = p.id);