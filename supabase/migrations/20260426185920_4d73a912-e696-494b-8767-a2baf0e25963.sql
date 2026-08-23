-- 1) Tabela de categorias por usuária (contas e receitas)
CREATE TABLE public.categorias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('conta', 'receita')),
  nome text NOT NULL,
  emoji text NOT NULL DEFAULT '✨',
  thiing text NOT NULL DEFAULT 'coins',
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, nome)
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categorias"
ON public.categorias FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categorias"
ON public.categorias FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categorias"
ON public.categorias FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categorias"
ON public.categorias FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_categorias_user_kind ON public.categorias(user_id, kind, ordem);

-- 2) Receitas: nova coluna 'categoria' (texto livre, alimentado pelo nome da categoria escolhida)
ALTER TABLE public.receitas
  ADD COLUMN IF NOT EXISTS categoria text;

-- Backfill: usar o tipo atual como categoria inicial
UPDATE public.receitas SET categoria = CASE
  WHEN tipo = 'salario' THEN 'Salário'
  WHEN tipo = 'extra' THEN 'Renda extra'
  ELSE COALESCE(tipo, 'Outros')
END WHERE categoria IS NULL;

-- 3) Função que cria as categorias-padrão para uma usuária
CREATE OR REPLACE FUNCTION public.seed_categorias_padrao(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Contas (idempotente via UNIQUE)
  INSERT INTO public.categorias (user_id, kind, nome, emoji, thiing, ordem) VALUES
    (_user_id, 'conta', 'Moradia / Aluguel', '🏠', 'house', 1),
    (_user_id, 'conta', 'Luz', '💡', 'bill', 2),
    (_user_id, 'conta', 'Água', '🌊', 'bill', 3),
    (_user_id, 'conta', 'Internet', '🌐', 'bill', 4),
    (_user_id, 'conta', 'Celular', '📱', 'bill', 5),
    (_user_id, 'conta', 'Supermercado', '🛒', 'wallet', 6),
    (_user_id, 'conta', 'Escola', '🎒', 'bill', 7),
    (_user_id, 'conta', 'Farmácia / Saúde', '💊', 'flower', 8),
    (_user_id, 'conta', 'Transporte', '🚌', 'wallet', 9),
    (_user_id, 'conta', 'Cartão de crédito', '💳', 'wallet', 10),
    (_user_id, 'conta', 'Lazer', '🎬', 'flower', 11),
    (_user_id, 'conta', 'Beleza / Cuidado', '💄', 'flower', 12),
    (_user_id, 'conta', 'Assinaturas', '📺', 'bill', 13),
    (_user_id, 'conta', 'Outros', '✨', 'coins', 99)
  ON CONFLICT (user_id, kind, nome) DO NOTHING;

  -- Receitas
  INSERT INTO public.categorias (user_id, kind, nome, emoji, thiing, ordem) VALUES
    (_user_id, 'receita', 'Salário', '💼', 'coins', 1),
    (_user_id, 'receita', 'Renda extra', '✨', 'coins', 2),
    (_user_id, 'receita', 'Freela', '💻', 'wallet', 3),
    (_user_id, 'receita', 'Presente', '🎁', 'flower', 4),
    (_user_id, 'receita', 'Outros', '🌷', 'coins', 99)
  ON CONFLICT (user_id, kind, nome) DO NOTHING;
END;
$$;

-- 4) Atualizar handle_new_user para também semear categorias
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)));

  PERFORM public.seed_categorias_padrao(NEW.id);
  RETURN NEW;
END;
$$;

-- Garantir que o trigger existe (já que listagem indica nenhum trigger)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5) Semear categorias para usuárias que já existem
DO $$
DECLARE u record;
BEGIN
  FOR u IN SELECT id FROM auth.users LOOP
    PERFORM public.seed_categorias_padrao(u.id);
  END LOOP;
END $$;