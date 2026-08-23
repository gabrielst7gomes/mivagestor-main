-- 1. Enum de roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Tabela de roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Função has_role (security definer, evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Função is_admin (atalho)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- 5. RLS de user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. Permitir admin ver tudo: profiles, assinaturas, pagamentos
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all assinaturas" ON public.assinaturas;
CREATE POLICY "Admins can view all assinaturas" ON public.assinaturas
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all assinaturas" ON public.assinaturas;
CREATE POLICY "Admins can update all assinaturas" ON public.assinaturas
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all pagamentos" ON public.pagamentos;
CREATE POLICY "Admins can view all pagamentos" ON public.pagamentos
  FOR SELECT USING (public.is_admin());

-- 7. RPC: estatísticas gerais
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
    'mrr_estimado', COALESCE((SELECT COUNT(*) * 49.90 FROM public.assinaturas WHERE status = 'ativa' AND periodo_fim >= CURRENT_DATE), 0),
    'novas_7d', (SELECT COUNT(*) FROM auth.users WHERE created_at >= now() - interval '7 days'),
    'novas_30d', (SELECT COUNT(*) FROM auth.users WHERE created_at >= now() - interval '30 days')
  ) INTO result;

  RETURN result;
END;
$$;

-- 8. RPC: lista usuárias com dados consolidados
CREATE OR REPLACE FUNCTION public.admin_listar_usuarias()
RETURNS TABLE (
  id uuid,
  email text,
  nome text,
  whatsapp text,
  avatar_url text,
  criado_em timestamptz,
  status text,
  trial_fim date,
  periodo_inicio date,
  periodo_fim date,
  metodo text,
  valor numeric,
  total_pago numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    p.nome,
    p.whatsapp,
    p.avatar_url,
    u.created_at,
    a.status,
    a.trial_fim,
    a.periodo_inicio,
    a.periodo_fim,
    a.metodo,
    a.valor,
    COALESCE((SELECT SUM(pg.valor) FROM public.pagamentos pg WHERE pg.user_id = u.id AND pg.status = 'aprovado'), 0)
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.assinaturas a ON a.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

-- 9. RPC: lista pagamentos com dados da usuária
CREATE OR REPLACE FUNCTION public.admin_listar_pagamentos()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  nome text,
  valor numeric,
  metodo text,
  status text,
  pago_em timestamptz,
  created_at timestamptz,
  cobranca_de date,
  cobranca_ate date
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    pg.id,
    pg.user_id,
    u.email::text,
    p.nome,
    pg.valor,
    pg.metodo,
    pg.status,
    pg.pago_em,
    pg.created_at,
    pg.cobranca_de,
    pg.cobranca_ate
  FROM public.pagamentos pg
  LEFT JOIN auth.users u ON u.id = pg.user_id
  LEFT JOIN public.profiles p ON p.id = pg.user_id
  ORDER BY pg.created_at DESC
  LIMIT 500;
END;
$$;

-- 10. RPC: ações sobre assinatura
CREATE OR REPLACE FUNCTION public.admin_estender_trial(_user_id uuid, _dias integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  UPDATE public.assinaturas
    SET status = 'trial',
        trial_fim = GREATEST(COALESCE(trial_fim, CURRENT_DATE), CURRENT_DATE) + _dias
    WHERE user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ativar_plano(_user_id uuid, _dias integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  UPDATE public.assinaturas
    SET status = 'ativa',
        periodo_inicio = CURRENT_DATE,
        periodo_fim = CURRENT_DATE + _dias
    WHERE user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_cancelar_plano(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  UPDATE public.assinaturas
    SET status = 'cancelada',
        periodo_fim = CURRENT_DATE
    WHERE user_id = _user_id;
END;
$$;