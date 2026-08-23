ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tutorial_concluido boolean NOT NULL DEFAULT false;