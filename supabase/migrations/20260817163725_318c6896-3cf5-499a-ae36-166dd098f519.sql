CREATE TABLE public.reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  meta numeric,
  tipo text NOT NULL DEFAULT 'guardado',
  cor text DEFAULT 'rose',
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservas TO authenticated;
GRANT ALL ON public.reservas TO service_role;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reservas" ON public.reservas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_reservas_updated_at BEFORE UPDATE ON public.reservas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.reserva_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reserva_id uuid NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'aporte',
  valor numeric NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reserva_movimentos TO authenticated;
GRANT ALL ON public.reserva_movimentos TO service_role;
ALTER TABLE public.reserva_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reserva_movimentos" ON public.reserva_movimentos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_reserva_movimentos_reserva ON public.reserva_movimentos(reserva_id);