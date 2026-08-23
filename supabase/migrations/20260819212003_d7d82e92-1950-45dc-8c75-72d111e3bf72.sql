ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS mp_preapproval_id text,
  ADD COLUMN IF NOT EXISTS recorrencia_ativa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aviso_venc_3d date,
  ADD COLUMN IF NOT EXISTS aviso_venc_1d date,
  ADD COLUMN IF NOT EXISTS aviso_vencida date;

CREATE INDEX IF NOT EXISTS idx_assinaturas_preapproval ON public.assinaturas (mp_preapproval_id);

ALTER TABLE public.pagamentos REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pagamentos;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;