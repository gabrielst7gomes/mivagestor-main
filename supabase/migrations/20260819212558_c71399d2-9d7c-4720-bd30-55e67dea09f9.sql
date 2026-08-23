
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_listar_usuarias() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_listar_pagamentos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_listar_saques() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_atualizar_saque(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ativar_plano(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancelar_plano(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_estender_trial(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saldo_indicacao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.solicitar_saque(numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_saldo_em_pagamento(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_credito_indicacao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replicar_recorrentes(uuid, integer, integer) TO authenticated;
