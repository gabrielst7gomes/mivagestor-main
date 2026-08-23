-- Tabela de cartões (opcional - usuária pode ou não cadastrar)
CREATE TABLE public.cartoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  bandeira TEXT,
  limite NUMERIC(12,2),
  dia_fechamento INTEGER CHECK (dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento INTEGER CHECK (dia_vencimento BETWEEN 1 AND 31),
  cor TEXT DEFAULT 'rose',
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cartoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cartoes" ON public.cartoes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cartoes" ON public.cartoes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cartoes" ON public.cartoes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cartoes" ON public.cartoes
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_cartoes_updated_at
  BEFORE UPDATE ON public.cartoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Adiciona campos de cartão e parcelamento em contas
ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS cartao_id UUID,
  ADD COLUMN IF NOT EXISTS parcelas_total INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parcela_atual INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS compra_grupo_id UUID;

CREATE INDEX IF NOT EXISTS idx_contas_cartao_id ON public.contas(cartao_id);
CREATE INDEX IF NOT EXISTS idx_contas_compra_grupo ON public.contas(compra_grupo_id);

-- Função: saldo disponível do cartão = limite − soma das parcelas não pagas
CREATE OR REPLACE FUNCTION public.saldo_cartao(_cartao_id uuid)
RETURNS NUMERIC
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(c.limite, 0) - COALESCE((
    SELECT SUM(valor) FROM public.contas
    WHERE cartao_id = _cartao_id AND pago = false
  ), 0)
  FROM public.cartoes c
  WHERE c.id = _cartao_id
$$;