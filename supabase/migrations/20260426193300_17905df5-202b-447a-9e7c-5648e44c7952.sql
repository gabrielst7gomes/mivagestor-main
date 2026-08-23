-- Atualiza a função de seed para incluir "Sistema Miva"
CREATE OR REPLACE FUNCTION public.seed_categorias_padrao(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
    (_user_id, 'conta', 'Sistema Miva', '💕', 'coins', 14),
    (_user_id, 'conta', 'Outros', '✨', 'coins', 99)
  ON CONFLICT (user_id, kind, nome) DO NOTHING;

  INSERT INTO public.categorias (user_id, kind, nome, emoji, thiing, ordem) VALUES
    (_user_id, 'receita', 'Salário', '💼', 'coins', 1),
    (_user_id, 'receita', 'Renda extra', '✨', 'coins', 2),
    (_user_id, 'receita', 'Freela', '💻', 'wallet', 3),
    (_user_id, 'receita', 'Presente', '🎁', 'flower', 4),
    (_user_id, 'receita', 'Outros', '🌷', 'coins', 99)
  ON CONFLICT (user_id, kind, nome) DO NOTHING;
END;
$function$;

-- Cria a categoria "Sistema Miva" para todos os usuários existentes
INSERT INTO public.categorias (user_id, kind, nome, emoji, thiing, ordem)
SELECT id, 'conta', 'Sistema Miva', '💕', 'coins', 14
FROM auth.users
ON CONFLICT (user_id, kind, nome) DO NOTHING;