-- Adicionar coluna whatsapp ao profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Atualizar handle_new_user para incluir whatsapp
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
  VALUES (NEW.id, 'trial', (CURRENT_DATE + INTERVAL '7 days')::DATE, 49.90)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;