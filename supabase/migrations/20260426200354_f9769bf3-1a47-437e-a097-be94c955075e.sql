-- 1) Settings do sistema (chave/valor)
CREATE TABLE public.system_settings (
  chave TEXT PRIMARY KEY,
  valor JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read settings"
  ON public.system_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage settings"
  ON public.system_settings FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.system_settings (chave, valor) VALUES
  ('recompensa_indicacao_percent', '30'::jsonb),
  ('saque_minimo', '100'::jsonb);

-- 2) Código único por usuária
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS codigo_indicacao TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS indicado_por UUID;

CREATE OR REPLACE FUNCTION public.gerar_codigo_indicacao()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  novo TEXT;
  tentativa INT := 0;
BEGIN
  LOOP
    novo := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 7));
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE codigo_indicacao = novo) THEN
      RETURN novo;
    END IF;
    tentativa := tentativa + 1;
    IF tentativa > 10 THEN
      novo := upper(substring(md5(random()::text || gen_random_uuid()::text) FROM 1 FOR 9));
      RETURN novo;
    END IF;
  END LOOP;
END;
$$;

-- Backfill códigos existentes
UPDATE public.profiles
SET codigo_indicacao = public.gerar_codigo_indicacao()
WHERE codigo_indicacao IS NULL;

-- 3) Indicações (relação indicador -> indicada)
CREATE TABLE public.indicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id UUID NOT NULL,
  indicada_id UUID NOT NULL UNIQUE,
  codigo_usado TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_indicacoes_indicador ON public.indicacoes(indicador_id);
ALTER TABLE public.indicacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own as indicador or indicada"
  ON public.indicacoes FOR SELECT TO authenticated
  USING (auth.uid() = indicador_id OR auth.uid() = indicada_id OR public.is_admin());

CREATE POLICY "Admins manage indicacoes"
  ON public.indicacoes FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4) Movimentações de crédito (extrato)
CREATE TABLE public.creditos_indicacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('credito', 'abatimento_fatura', 'saque')),
  valor NUMERIC(10,2) NOT NULL,
  descricao TEXT,
  pagamento_id UUID,
  indicada_id UUID,
  saque_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_creditos_user ON public.creditos_indicacao(user_id, created_at DESC);
ALTER TABLE public.creditos_indicacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own creditos"
  ON public.creditos_indicacao FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins manage creditos"
  ON public.creditos_indicacao FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5) Solicitações de saque PIX
CREATE TABLE public.saques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  chave_pix TEXT NOT NULL,
  tipo_chave TEXT NOT NULL CHECK (tipo_chave IN ('cpf','email','telefone','aleatoria')),
  status TEXT NOT NULL DEFAULT 'solicitado' CHECK (status IN ('solicitado','pago','recusado')),
  observacao_admin TEXT,
  pago_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_saques_user ON public.saques(user_id, created_at DESC);
CREATE INDEX idx_saques_status ON public.saques(status);
ALTER TABLE public.saques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own saques"
  ON public.saques FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins manage saques"
  ON public.saques FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER trg_saques_updated_at BEFORE UPDATE ON public.saques
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Atualiza handle_new_user para gerar código + registrar indicação se veio com ?ref=
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ref_code TEXT;
  indicador UUID;
BEGIN
  ref_code := NULLIF(upper(trim(NEW.raw_user_meta_data->>'ref')), '');

  IF ref_code IS NOT NULL THEN
    SELECT id INTO indicador FROM public.profiles WHERE codigo_indicacao = ref_code;
  END IF;

  INSERT INTO public.profiles (id, nome, whatsapp, codigo_indicacao, indicado_por)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'whatsapp',
    public.gerar_codigo_indicacao(),
    indicador
  );

  PERFORM public.seed_categorias_padrao(NEW.id);

  INSERT INTO public.assinaturas (user_id, status, trial_fim, valor)
  VALUES (NEW.id, 'trial', (CURRENT_DATE + INTERVAL '7 days')::DATE, 39.90)
  ON CONFLICT (user_id) DO NOTHING;

  IF indicador IS NOT NULL THEN
    INSERT INTO public.indicacoes (indicador_id, indicada_id, codigo_usado)
    VALUES (indicador, NEW.id, ref_code)
    ON CONFLICT (indicada_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 7) View / RPC: saldo disponível
CREATE OR REPLACE FUNCTION public.saldo_indicacao(_user_id uuid)
RETURNS NUMERIC LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(
    CASE WHEN tipo = 'credito' THEN valor ELSE -valor END
  ), 0)::NUMERIC(10,2)
  FROM public.creditos_indicacao
  WHERE user_id = _user_id;
$$;

-- 8) RPC: aplicar crédito quando um pagamento for aprovado (chamado pelo webhook)
CREATE OR REPLACE FUNCTION public.aplicar_credito_indicacao(_pagamento_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pag RECORD;
  ind RECORD;
  percent NUMERIC;
  valor_credito NUMERIC;
BEGIN
  SELECT user_id, valor, status INTO pag
    FROM public.pagamentos WHERE id = _pagamento_id;
  IF NOT FOUND OR pag.status <> 'aprovado' THEN
    RETURN;
  END IF;

  -- evita duplicidade
  IF EXISTS (SELECT 1 FROM public.creditos_indicacao
             WHERE pagamento_id = _pagamento_id AND tipo = 'credito') THEN
    RETURN;
  END IF;

  SELECT * INTO ind FROM public.indicacoes WHERE indicada_id = pag.user_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT (valor::text)::numeric INTO percent
    FROM public.system_settings WHERE chave = 'recompensa_indicacao_percent';
  percent := COALESCE(percent, 30);

  valor_credito := round((pag.valor * percent / 100)::numeric, 2);
  IF valor_credito <= 0 THEN RETURN; END IF;

  INSERT INTO public.creditos_indicacao (user_id, tipo, valor, descricao, pagamento_id, indicada_id)
  VALUES (
    ind.indicador_id,
    'credito',
    valor_credito,
    'Recompensa ' || percent || '% por mensalidade da indicada',
    _pagamento_id,
    pag.user_id
  );
END;
$$;

-- 9) RPC: solicitar saque (valida saldo e mínimo)
CREATE OR REPLACE FUNCTION public.solicitar_saque(_valor numeric, _chave_pix text, _tipo_chave text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  saldo NUMERIC;
  minimo NUMERIC;
  novo_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _valor <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF _chave_pix IS NULL OR length(trim(_chave_pix)) = 0 THEN
    RAISE EXCEPTION 'Informe a chave PIX';
  END IF;
  IF _tipo_chave NOT IN ('cpf','email','telefone','aleatoria') THEN
    RAISE EXCEPTION 'Tipo de chave inválido';
  END IF;

  SELECT (valor::text)::numeric INTO minimo
    FROM public.system_settings WHERE chave = 'saque_minimo';
  minimo := COALESCE(minimo, 100);

  IF _valor < minimo THEN
    RAISE EXCEPTION 'Saque mínimo é R$ %', minimo;
  END IF;

  SELECT public.saldo_indicacao(auth.uid()) INTO saldo;
  IF _valor > saldo THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  INSERT INTO public.saques (user_id, valor, chave_pix, tipo_chave, status)
  VALUES (auth.uid(), _valor, trim(_chave_pix), _tipo_chave, 'solicitado')
  RETURNING id INTO novo_id;

  INSERT INTO public.creditos_indicacao (user_id, tipo, valor, descricao, saque_id)
  VALUES (auth.uid(), 'saque', _valor, 'Solicitação de saque PIX', novo_id);

  RETURN novo_id;
END;
$$;

-- 10) RPC: admin marcar saque como pago / recusado
CREATE OR REPLACE FUNCTION public.admin_atualizar_saque(_saque_id uuid, _novo_status text, _observacao text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s RECORD;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF _novo_status NOT IN ('pago','recusado','solicitado') THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;

  SELECT * INTO s FROM public.saques WHERE id = _saque_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Saque não encontrado'; END IF;

  UPDATE public.saques
    SET status = _novo_status,
        observacao_admin = COALESCE(_observacao, observacao_admin),
        pago_em = CASE WHEN _novo_status = 'pago' THEN now() ELSE pago_em END
    WHERE id = _saque_id;

  -- Se recusado, devolve o saldo (apaga o débito do extrato)
  IF _novo_status = 'recusado' AND s.status <> 'recusado' THEN
    DELETE FROM public.creditos_indicacao
      WHERE saque_id = _saque_id AND tipo = 'saque';
  END IF;
END;
$$;

-- 11) RPC: admin listar saques
CREATE OR REPLACE FUNCTION public.admin_listar_saques()
RETURNS TABLE (
  id uuid, user_id uuid, email text, nome text,
  valor numeric, chave_pix text, tipo_chave text,
  status text, observacao_admin text,
  pago_em timestamptz, created_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY
  SELECT s.id, s.user_id, u.email::text, p.nome,
         s.valor, s.chave_pix, s.tipo_chave,
         s.status, s.observacao_admin,
         s.pago_em, s.created_at
  FROM public.saques s
  LEFT JOIN auth.users u ON u.id = s.user_id
  LEFT JOIN public.profiles p ON p.id = s.user_id
  ORDER BY
    CASE WHEN s.status = 'solicitado' THEN 0 ELSE 1 END,
    s.created_at DESC;
END;
$$;

-- 12) RPC: aplicar saldo na próxima fatura (no momento de criar pagamento)
-- Retorna o valor abatido. Usado pela página de plano.
CREATE OR REPLACE FUNCTION public.aplicar_saldo_em_pagamento(_pagamento_id uuid, _valor_solicitado numeric)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  saldo NUMERIC;
  abater NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pagamentos WHERE id = _pagamento_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Pagamento não encontrado';
  END IF;

  SELECT public.saldo_indicacao(auth.uid()) INTO saldo;
  abater := LEAST(GREATEST(_valor_solicitado, 0), saldo);
  IF abater <= 0 THEN RETURN 0; END IF;

  INSERT INTO public.creditos_indicacao (user_id, tipo, valor, descricao, pagamento_id)
  VALUES (auth.uid(), 'abatimento_fatura', abater, 'Abatimento de saldo na mensalidade', _pagamento_id);

  RETURN abater;
END;
$$;