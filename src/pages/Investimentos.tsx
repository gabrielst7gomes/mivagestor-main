import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ThiingIcon } from "@/components/ThiingIcon";
import { Progress } from "@/components/ui/progress";
import { formatBRL, formatDataLonga } from "@/lib/finance";
import { Plus, Pencil, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { NovaReservaSheet, type ReservaEditavel } from "@/components/NovaReservaSheet";
import { MovimentoReservaSheet } from "@/components/MovimentoReservaSheet";

interface Reserva {
  id: string;
  nome: string;
  meta: number | null;
  tipo: string;
}
interface Movimento {
  id: string;
  reserva_id: string;
  tipo: string;
  valor: number;
  data: string;
  observacao: string | null;
}

const TIPO_LABEL: Record<string, string> = {
  guardado: "💰 Guardado",
  emergencia: "🛟 Emergência",
  meta: "🎯 Meta",
  investimento: "📈 Investimento",
};

export default function Investimentos() {
  const { user } = useAuth();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaOpen, setNovaOpen] = useState(false);
  const [editando, setEditando] = useState<ReservaEditavel | null>(null);
  const [movendo, setMovendo] = useState<Reserva | null>(null);

  const carregar = useCallback(async () => {
    if (!user) return;
    const [{ data: r }, { data: m }] = await Promise.all([
      supabase.from("reservas").select("*").eq("user_id", user.id).order("ordem").order("created_at"),
      supabase.from("reserva_movimentos").select("*").eq("user_id", user.id).order("data", { ascending: false }).limit(30),
    ]);
    setReservas((r ?? []) as Reserva[]);
    setMovimentos((m ?? []) as Movimento[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { carregar(); }, [carregar]);

  const saldoPorReserva = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const mv of movimentos) {
      acc[mv.reserva_id] = (acc[mv.reserva_id] ?? 0) + (mv.tipo === "resgate" ? -Number(mv.valor) : Number(mv.valor));
    }
    return acc;
  }, [movimentos]);

  const [saldosCompletos, setSaldosCompletos] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    supabase
      .from("reserva_movimentos")
      .select("reserva_id, tipo, valor")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const acc: Record<string, number> = {};
        for (const mv of data ?? []) {
          const v = mv.tipo === "resgate" ? -Number(mv.valor) : Number(mv.valor);
          acc[mv.reserva_id] = (acc[mv.reserva_id] ?? 0) + v;
        }
        setSaldosCompletos(acc);
      });
  }, [user, movimentos]);

  const saldos = Object.keys(saldosCompletos).length ? saldosCompletos : saldoPorReserva;
  const totalGuardado = reservas.reduce((a, r) => a + (saldos[r.id] ?? 0), 0);
  const totalMeta = reservas.reduce((a, r) => a + (r.meta ? Number(r.meta) : 0), 0);
  const progressoGeral = totalMeta > 0 ? Math.min(100, (totalGuardado / totalMeta) * 100) : 0;

  const nomeReserva = (id: string) => reservas.find((r) => r.id === id)?.nome ?? "Reserva";

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-6 animate-fade-in">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl text-foreground">Dinheiro guardado</h1>
            <p className="text-sm text-muted-foreground">Suas reservas e investimentos</p>
          </div>
          <ThiingIcon name="piggy" size="lg" float />
        </header>

        <div className="card-hero mb-6 animate-scale-in">
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2 relative">Total guardado</p>
          <p className="font-serif text-4xl font-semibold text-rose-shimmer relative">{formatBRL(totalGuardado)}</p>
          {totalMeta > 0 && (
            <div className="relative mt-4">
              <Progress value={progressoGeral} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-2">
                {Math.round(progressoGeral)}% da sua meta de {formatBRL(totalMeta)}
              </p>
            </div>
          )}
        </div>

        <h2 className="font-serif text-xl text-foreground mb-3">Minhas reservas</h2>

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>
          ) : reservas.length === 0 ? (
            <div className="card-soft text-center py-10 flex flex-col items-center">
              <ThiingIcon name="piggy" size="lg" float />
              <p className="text-sm text-foreground font-medium mt-3">Nenhuma reserva ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Toque no + e comece a guardar, no seu ritmo 💕</p>
            </div>
          ) : (
            reservas.map((r) => {
              const saldo = saldos[r.id] ?? 0;
              const meta = r.meta ? Number(r.meta) : 0;
              const pct = meta > 0 ? Math.min(100, (saldo / meta) * 100) : 0;
              return (
                <div key={r.id} className="card-soft">
                  <div className="flex items-center gap-3">
                    <ThiingIcon name="coins" size="sm" className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground line-clamp-1">{r.nome}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide bg-primary-soft/80 text-primary inline-block mt-1">
                        {TIPO_LABEL[r.tipo] ?? r.tipo}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-foreground">{formatBRL(saldo)}</p>
                      {meta > 0 && <p className="text-[11px] text-muted-foreground">de {formatBRL(meta)}</p>}
                    </div>
                  </div>

                  {meta > 0 && <Progress value={pct} className="h-1.5 mt-3" />}

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => setMovendo(r)}
                      className="flex-1 rounded-full py-2 text-xs font-medium gradient-rose text-primary-foreground"
                    >
                      Guardar / resgatar
                    </button>
                    <button
                      onClick={() => setEditando({ id: r.id, nome: r.nome, meta: r.meta, tipo: r.tipo })}
                      aria-label="Editar reserva"
                      className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {movimentos.length > 0 && (
          <>
            <h2 className="font-serif text-xl text-foreground mt-8 mb-3">Movimentações recentes</h2>
            <div className="space-y-2">
              {movimentos.map((mv) => {
                const isAporte = mv.tipo !== "resgate";
                return (
                  <div key={mv.id} className="card-soft flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isAporte ? "bg-success-soft/80 text-success" : "bg-primary-soft/80 text-primary"}`}>
                      {isAporte ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground line-clamp-1">{nomeReserva(mv.reserva_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDataLonga(mv.data)}{mv.observacao ? ` · ${mv.observacao}` : ""}
                      </p>
                    </div>
                    <p className={`font-semibold shrink-0 ${isAporte ? "text-success" : "text-primary-deep"}`}>
                      {isAporte ? "+" : "–"} {formatBRL(Number(mv.valor))}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <button
        onClick={() => setNovaOpen(true)}
        aria-label="Nova reserva"
        className="fixed bottom-24 right-[calc(50%-198px)] md:right-[calc(50%-308px)] lg:right-[calc(50%-348px)] w-14 h-14 rounded-full gradient-rose text-primary-foreground shadow-rose flex items-center justify-center z-30 hover:scale-105 transition-transform"
      >
        <Plus size={26} />
      </button>

      <NovaReservaSheet open={novaOpen} onOpenChange={setNovaOpen} onSaved={carregar} />
      <NovaReservaSheet
        open={!!editando}
        onOpenChange={(v) => !v && setEditando(null)}
        onSaved={carregar}
        reserva={editando}
      />
      <MovimentoReservaSheet
        open={!!movendo}
        onOpenChange={(v) => !v && setMovendo(null)}
        onSaved={carregar}
        reservaId={movendo?.id ?? null}
        reservaNome={movendo?.nome}
      />
    </AppShell>
  );
}
