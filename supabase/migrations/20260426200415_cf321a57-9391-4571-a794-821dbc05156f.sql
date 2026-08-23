CREATE OR REPLACE FUNCTION public.gerar_codigo_indicacao()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
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