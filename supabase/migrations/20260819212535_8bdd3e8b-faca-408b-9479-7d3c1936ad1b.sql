
-- 1. Enforce caller identity on user-scoped SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.saldo_indicacao(_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v numeric;
BEGIN
  IF auth.uid() IS NULL OR (_user_id <> auth.uid() AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  SELECT COALESCE(SUM(CASE WHEN tipo = 'credito' THEN valor ELSE -valor END), 0)::NUMERIC(10,2)
    INTO v FROM public.creditos_indicacao WHERE user_id = _user_id;
  RETURN v;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tem_acesso(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v boolean;
BEGIN
  IF auth.uid() IS NOT NULL AND _user_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.assinaturas a
    WHERE a.user_id = _user_id
      AND (
        (a.status = 'trial' AND a.trial_fim IS NOT NULL AND a.trial_fim >= CURRENT_DATE)
        OR (a.status = 'ativa' AND a.periodo_fim IS NOT NULL AND a.periodo_fim >= CURRENT_DATE)
      )
  ) INTO v;
  RETURN v;
END;
$function$;

CREATE OR REPLACE FUNCTION public.dias_restantes(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v integer;
BEGIN
  IF auth.uid() IS NOT NULL AND _user_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  SELECT GREATEST(0, COALESCE(
    CASE
      WHEN status = 'trial' THEN (trial_fim - CURRENT_DATE)
      WHEN status = 'ativa' THEN (periodo_fim - CURRENT_DATE)
      ELSE 0
    END, 0))::INTEGER
  INTO v FROM public.assinaturas WHERE user_id = _user_id;
  RETURN COALESCE(v, 0);
END;
$function$;

-- 2. Remove direct API access to internal-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gerar_codigo_indicacao() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_categorias_padrao(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.saldo_cartao(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.aplicar_credito_indicacao(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tem_acesso(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.dias_restantes(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.saldo_indicacao(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.solicitar_saque(numeric, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.aplicar_saldo_em_pagamento(uuid, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.replicar_recorrentes(uuid, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_listar_usuarias() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_listar_pagamentos() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_listar_saques() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_atualizar_saque(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_ativar_plano(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_cancelar_plano(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_estender_trial(uuid, integer) FROM anon;
