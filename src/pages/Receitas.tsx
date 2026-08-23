import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { nomeMes, intervaloMes, formatBRL, formatDataLonga } from "@/lib/finance";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { NovaReceitaSheet } from "@/components/NovaReceitaSheet";
import { EditarReceitaSheet, type EditavelReceita } from "@/components/EditarReceitaSheet";
import { ThiingIcon } from "@/components/ThiingIcon";
import { useCategorias } from "@/hooks/useCategorias";

interface Receita {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
  categoria: string | null;
  data_recebimento: string;
}

export default function Receitas() {
  const { user } = useAuth();
  const { findByNome } = useCategorias("receita");
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1); // 1-12
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EditavelReceita | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { inicio, fim } = intervaloMes(ano, mes);
    const { data } = await supabase
      .from("receitas")
      .select("*")
      .eq("user_id", user.id)
      .gte("data_recebimento", inicio)
      .lt("data_recebimento", fim)
      .order("data_recebimento", { ascending: false });
    setReceitas((data ?? []) as Receita[]);
    setLoading(false);
  }, [user, ano, mes]);

  useEffect(() => { carregar(); }, [carregar]);

  const mudarMes = (delta: number) => {
    const d = new Date(ano, mes - 1 + delta, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth() + 1);
  };

  const irHoje = () => {
    setAno(hoje.getFullYear());
    setMes(hoje.getMonth() + 1);
  };

  const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;

  const total = receitas.reduce((a, r) => a + Number(r.valor), 0);

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-6 animate-fade-in">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl text-foreground">Minhas Receitas</h1>
            <p className="text-sm text-muted-foreground capitalize">{nomeMes(ano, mes)}</p>
          </div>
          <ThiingIcon name="coins" size="lg" float />
        </header>

        {/* Seletor de mês */}
        <div className="card-soft mb-4 flex items-center justify-between gap-2 py-3 px-3">
          <button
            onClick={() => mudarMes(-1)}
            aria-label="Mês anterior"
            className="w-9 h-9 rounded-full bg-primary-soft/60 text-primary flex items-center justify-center hover:bg-primary-soft transition-colors active:scale-95"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 text-center">
            <p className="font-serif text-base text-foreground capitalize leading-tight">{nomeMes(ano, mes)}</p>
            {!ehMesAtual && (
              <button onClick={irHoje} className="text-[11px] text-primary font-medium mt-0.5 underline-offset-2 hover:underline">
                voltar para hoje
              </button>
            )}
          </div>
          <button
            onClick={() => mudarMes(1)}
            aria-label="Próximo mês"
            className="w-9 h-9 rounded-full bg-primary-soft/60 text-primary flex items-center justify-center hover:bg-primary-soft transition-colors active:scale-95"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Card total — liquid glass */}
        <div className="card-hero mb-6 animate-scale-in">
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2 relative">Total recebido</p>
          <p className="font-serif text-4xl font-semibold text-rose-shimmer relative">{formatBRL(total)}</p>
          <p className="text-muted-foreground text-xs mt-2 capitalize relative">{nomeMes(ano, mes)}</p>
        </div>

        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>
          ) : receitas.length === 0 ? (
            <div className="card-soft text-center py-10 flex flex-col items-center">
              <ThiingIcon name="coins" size="lg" float />
              <p className="text-sm text-foreground font-medium mt-3">Nenhuma receita por aqui ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Toque no + e registre seu primeiro recebimento</p>
            </div>
          ) : (
            receitas.map((r) => {
              const nomeCat = r.categoria ?? (r.tipo === "salario" ? "Salário" : "Renda extra");
              const cat = findByNome(nomeCat);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setEditing({ id: r.id, descricao: r.descricao, categoria: r.categoria, tipo: r.tipo, valor: Number(r.valor), data_recebimento: r.data_recebimento })}
                  className="card-soft flex items-center gap-3 w-full text-left"
                >
                  <ThiingIcon name={cat?.thiing ?? "coins"} size="sm" className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground line-clamp-1">{r.descricao}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide bg-primary-soft/80 text-primary">
                        {cat?.emoji} {nomeCat}
                      </span>
                      <p className="text-xs text-muted-foreground">{formatDataLonga(r.data_recebimento)}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-success shrink-0">+ {formatBRL(Number(r.valor))}</p>
                </button>
              );
            })
          )}
        </div>

        {receitas.length > 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4">Toque em uma receita para editar ✏️</p>
        )}
      </div>

      <button
        onClick={() => setOpen(true)}
        aria-label="Adicionar receita"
        className="fixed bottom-24 right-[calc(50%-198px)] md:right-[calc(50%-308px)] lg:right-[calc(50%-348px)] w-14 h-14 rounded-full gradient-rose text-primary-foreground shadow-rose flex items-center justify-center z-30 hover:scale-105 transition-transform"
      >
        <Plus size={26} />
      </button>

      <NovaReceitaSheet open={open} onOpenChange={setOpen} onSaved={carregar} />
      <EditarReceitaSheet
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        onSaved={carregar}
        receita={editing}
      />
    </AppShell>
  );
}
