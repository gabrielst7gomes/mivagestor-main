import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { intervaloMes, nomeMes, formatBRL, formatData, formatDataLonga, isAtrasada, hojeISO } from "@/lib/finance";
import { Plus, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { NovaContaSheet } from "@/components/NovaContaSheet";
import { EditarContaSheet, type EditavelConta } from "@/components/EditarContaSheet";
import { GastoCartaoSheet } from "@/components/GastoCartaoSheet";
import { EscolherTipoLancamentoSheet } from "@/components/EscolherTipoLancamentoSheet";
import { ThiingIcon } from "@/components/ThiingIcon";
import { useCategorias } from "@/hooks/useCategorias";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Conta {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data_vencimento: string;
  pago: boolean;
  data_pagamento: string | null;
  recorrente: boolean;
  parcela_atual: number | null;
  parcelas_total: number | null;
  compra_grupo_id: string | null;
  origem_recorrente_id: string | null;
}

type Filtro = "todas" | "pendentes" | "pagas" | "atrasadas";

export default function Contas() {
  const { user } = useAuth();
  const { findByNome } = useCategorias("conta");
  const [searchParams] = useSearchParams();
  const cartaoIdFiltro = searchParams.get("cartao");
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1); // 1-12
  const [contas, setContas] = useState<Conta[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [openEscolha, setOpenEscolha] = useState(false);
  const [openSheet, setOpenSheet] = useState(false);
  const [openCartaoSheet, setOpenCartaoSheet] = useState(false);
  const [editing, setEditing] = useState<EditavelConta | null>(null);
  const [cartaoNome, setCartaoNome] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    // Se tiver filtro de cartão, não limitamos por mês inicialmente? 
    // Ou talvez mostramos os lançamentos do cartão NO MÊS selecionado.
    // O usuário geralmente quer ver o que tem que pagar esse mês no cartão.
    const { inicio, fim } = intervaloMes(ano, mes);
    await supabase.rpc("replicar_recorrentes", { _user_id: user.id, _ano: ano, _mes: mes });
    
    let query = supabase
      .from("contas")
      .select("*")
      .eq("user_id", user.id)
      .order("data_vencimento");

    if (cartaoIdFiltro) {
      query = query.eq("cartao_id", cartaoIdFiltro);
      
      // Ao filtrar por cartão, mostramos TODOS os lançamentos em aberto (independente do mês)
      // PLUS os lançamentos já pagos NO MÊS selecionado.
      // Isso garante que o total em aberto do cartão bata com a tela de cartões.
      query = query.or(`pago.eq.false,and(pago.eq.true,data_vencimento.gte.${inicio},data_vencimento.lt.${fim})`);

      // Carrega o nome do cartão
      const { data: cData } = await supabase.from("cartoes").select("nome").eq("id", cartaoIdFiltro).maybeSingle();
      if (cData) setCartaoNome(cData.nome);
    } else {
      query = query.gte("data_vencimento", inicio).lt("data_vencimento", fim);
      setCartaoNome(null);
    }

    const { data } = await query;
    setContas((data ?? []) as Conta[]);
    setLoading(false);
  }, [user, ano, mes, cartaoIdFiltro]);

  useEffect(() => { carregar(); }, [carregar]);

  const mudarMes = (delta: number) => {
    const d = new Date(ano, mes - 1 + delta, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth() + 1);
  };

  const irHoje = () => {
    const d = new Date();
    setAno(d.getFullYear());
    setMes(d.getMonth() + 1);
  };

  const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;

  const totalFiltrado = useMemo(() => {
    return contas.reduce((acc, c) => acc + Number(c.valor), 0);
  }, [contas]);

  const filtradas = useMemo(() => {
    if (filtro === "pendentes") return contas.filter((c) => !c.pago);
    if (filtro === "pagas") return contas.filter((c) => c.pago);
    if (filtro === "atrasadas") return contas.filter((c) => isAtrasada(c.data_vencimento, c.pago));
    return contas;
  }, [contas, filtro]);

  const togglePago = async (c: Conta) => {
    const novoPago = !c.pago;
    const { error } = await supabase
      .from("contas")
      .update({ pago: novoPago, data_pagamento: novoPago ? hojeISO() : null })
      .eq("id", c.id);
    if (error) { toast.error("Não consegui atualizar agora. Pode tentar de novo?"); return; }
    toast.success(novoPago ? "✓ Conta marcada como paga. Respira, tá indo tudo bem." : "Baixa desfeita.");
    carregar();
  };

  const counts = {
    todas: contas.length,
    pendentes: contas.filter((c) => !c.pago).length,
    pagas: contas.filter((c) => c.pago).length,
    atrasadas: contas.filter((c) => isAtrasada(c.data_vencimento, c.pago)).length,
  };

  const filtros: { key: Filtro; label: string }[] = [
    { key: "todas", label: "Todas" },
    { key: "pendentes", label: "Pendentes" },
    { key: "pagas", label: "Pagas" },
    { key: "atrasadas", label: "Atrasadas" },
  ];

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-6 animate-fade-in">
        {cartaoIdFiltro && (
          <Link
            to="/cartoes"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4"
          >
            <ChevronLeft size={16} /> Voltar para Cartões
          </Link>
        )}
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl text-foreground">
              {cartaoNome ? `Fatura: ${cartaoNome}` : "Contas a Pagar"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {cartaoNome ? "Lançamentos deste cartão ✨" : "Navegue pelos meses ✨"}
            </p>
          </div>
          <ThiingIcon name="wallet" size="lg" float />
        </header>

        {cartaoIdFiltro && (
          <div className="card-hero mb-4 animate-scale-in">
            <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Total da Fatura</p>
            <p className="font-serif text-3xl font-semibold text-rose-shimmer">{formatBRL(totalFiltrado)}</p>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/40">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase">Pendentes</span>
                <span className="text-sm font-semibold text-primary">{formatBRL(contas.filter(c => !c.pago).reduce((a, b) => a + Number(b.valor), 0))}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase">Pagas</span>
                <span className="text-sm font-semibold text-success">{formatBRL(contas.filter(c => c.pago).reduce((a, b) => a + Number(b.valor), 0))}</span>
              </div>
            </div>
          </div>
        )}

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

        {/* Filtros pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-5 px-5 mb-3 scrollbar-none">
          {filtros.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all",
                filtro === f.key
                  ? "bg-primary-soft text-primary border-primary-soft"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              {f.label} <span className="opacity-70 ml-1">({counts[f.key]})</span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>
          ) : filtradas.length === 0 ? (
            <div className="card-soft text-center py-10 flex flex-col items-center">
              <ThiingIcon name="flower" size="lg" float />
              <p className="text-sm text-foreground font-medium mt-3">
                {filtro === "atrasadas" ? "Nenhuma conta atrasada" : filtro === "pagas" ? "Ainda nada pago por aqui" : "Nada por aqui ainda"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {filtro === "todas" ? "Que tal começar por aquela que vence primeiro?" : "Tudo certo do seu lado 💕"}
              </p>
            </div>
          ) : (
            filtradas.map((c) => {
              const cat = findByNome(c.categoria);
              const atrasada = isAtrasada(c.data_vencimento, c.pago);
              return (
                <div key={c.id} className={cn("card-soft flex items-center gap-3", c.pago && "opacity-60")}>
                  <button
                    type="button"
                    onClick={() => setEditing({ id: c.id, descricao: c.descricao, categoria: c.categoria, valor: Number(c.valor), data_vencimento: c.data_vencimento, recorrente: c.recorrente, compra_grupo_id: c.compra_grupo_id, parcelas_total: c.parcelas_total, origem_recorrente_id: c.origem_recorrente_id })}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <ThiingIcon name={cat?.thiing ?? "coins"} size="sm" className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium text-foreground line-clamp-1", c.pago && "line-through")}>
                        {c.descricao}
                        {c.parcelas_total && c.parcelas_total > 1 && (
                          <span className="ml-1.5 text-[10px] font-bold text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded-md">
                            {c.parcela_atual}/{c.parcelas_total}
                          </span>
                        )}
                      </p>
                      <p className={cn("text-xs", atrasada ? "text-destructive font-medium" : "text-muted-foreground")}>
                        {c.pago && c.data_pagamento
                          ? `Pago em ${formatDataLonga(c.data_pagamento)}`
                          : atrasada
                          ? `Atrasada — venceu ${formatData(c.data_vencimento)}`
                          : `Vence ${formatDataLonga(c.data_vencimento)}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn("font-semibold text-foreground", c.pago && "line-through")}>{formatBRL(Number(c.valor))}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => togglePago(c)}
                    aria-label={c.pago ? "Desfazer baixa" : "Dar baixa"}
                    className={cn(
                      "w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all shrink-0 active:scale-110",
                      c.pago
                        ? "bg-success border-success text-success-foreground"
                        : "border-border text-muted-foreground hover:border-success hover:text-success hover:bg-success/10"
                    )}
                  >
                    {c.pago ? <Check size={16} strokeWidth={3} /> : <span className="text-lg leading-none">–</span>}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">Toque em uma conta para editar ✏️</p>
      </div>

      <button
        onClick={() => setOpenEscolha(true)}
        aria-label="Adicionar conta"
        className="fixed bottom-24 right-[calc(50%-198px)] md:right-[calc(50%-308px)] lg:right-[calc(50%-348px)] w-14 h-14 rounded-full gradient-rose text-primary-foreground shadow-rose flex items-center justify-center z-30 hover:scale-105 transition-transform"
      >
        <Plus size={26} />
      </button>

      <EscolherTipoLancamentoSheet
        open={openEscolha}
        onOpenChange={setOpenEscolha}
        onEscolher={(tipo) => {
          setOpenEscolha(false);
          if (tipo === "conta") setOpenSheet(true);
          else setOpenCartaoSheet(true);
        }}
      />
      <NovaContaSheet open={openSheet} onOpenChange={setOpenSheet} onSaved={carregar} />
      <GastoCartaoSheet open={openCartaoSheet} onOpenChange={setOpenCartaoSheet} onSaved={carregar} />
      <EditarContaSheet
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        onSaved={carregar}
        conta={editing}
      />
    </AppShell>
  );
}
