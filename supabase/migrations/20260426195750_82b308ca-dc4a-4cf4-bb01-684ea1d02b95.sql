-- 1) Novo default da coluna valor
ALTER TABLE public.assinaturas ALTER COLUMN valor SET DEFAULT 39.90;

-- 2) Atualiza assinaturas que ainda estão no valor antigo
UPDATE public.assinaturas SET valor = 39.90 WHERE valor = 49.90;

-- 3) Atualiza handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nome, whatsapp)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'whatsapp'
  );

  PERFORM public.seed_categorias_padrao(NEW.id);

  INSERT INTO public.assinaturas (user_id, status, trial_fim, valor)
  VALUES (NEW.id, 'trial', (CURRENT_DATE + INTERVAL '7 days')::DATE, 39.90)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 4) Atualiza admin_stats (MRR usa 39.90)
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'total_usuarias', (SELECT COUNT(*) FROM auth.users),
    'em_trial', (SELECT COUNT(*) FROM public.assinaturas WHERE status = 'trial' AND trial_fim >= CURRENT_DATE),
    'ativas', (SELECT COUNT(*) FROM public.assinaturas WHERE status = 'ativa' AND periodo_fim >= CURRENT_DATE),
    'expiradas', (SELECT COUNT(*) FROM public.assinaturas WHERE
        (status = 'trial' AND (trial_fim IS NULL OR trial_fim < CURRENT_DATE)) OR
        (status = 'ativa' AND (periodo_fim IS NULL OR periodo_fim < CURRENT_DATE)) OR
        status NOT IN ('trial', 'ativa')
    ),
    'total_arrecadado', COALESCE((SELECT SUM(valor) FROM public.pagamentos WHERE status = 'aprovado'), 0),
    'pagamentos_aprovados', (SELECT COUNT(*) FROM public.pagamentos WHERE status = 'aprovado'),
    'mrr_estimado', COALESCE((SELECT COUNT(*) * 39.90 FROM public.assinaturas WHERE status = 'ativa' AND periodo_fim >= CURRENT_DATE), 0),
    'novas_7d', (SELECT COUNT(*) FROM auth.users WHERE created_at >= now() - interval '7 days'),
    'novas_30d', (SELECT COUNT(*) FROM auth.users WHERE created_at >= now() - interval '30 days')
  ) INTO result;

  RETURN result;
END;
$function$;