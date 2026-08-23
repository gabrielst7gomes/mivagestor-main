import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChevronRight, TrendingUp, TrendingDown, ArrowLeft } from "lucide-react";
import { formatBRL } from "@/lib/finance";
import { ThiingIcon } from "@/components/ThiingIcon";
import { useCategorias } from "@/hooks/useCategorias";
import { cn } from "@/lib/utils";

interface Conta {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data_vencimento: string;
  pago: boolean;
  data_pagamento: string | null;
  cartao_id?: string | null;
}
interface Receita {
  id: string;
  descricao: string;
  categoria: string | null;
  tipo: string;
  valor: number;
  data_recebimento: string;
}

interface MesAgg {
  ano: number;
  mes: number; // 1-12
  key: string; // YYYY-MM
  receitas: number;
  pagas: number;
  resultado: number;
  contas: Conta[];
  receitasList: Receita[];
}

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function Historico() {
  const { user } = useAuth();
  const { findByNome: findConta } = useCategorias("conta");
  const { findByNome: findReceita } = useCategorias("receita");
  const [contas, setContas] = useState<Conta[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: c }, { data: r }] = await Promise.all([
      supabase
        .from("contas")
        .select("id, descricao, categoria, valor, data_vencimento, pago, data_pagamento, cartao_id")
        .eq("user_id", user.id)
        .order("data_vencimento", { ascending: false }),
      supabase
        .from("receitas")
        .select("id, descricao, categoria, tipo, valor, data_recebimento")
        .eq("user_id", user.id)
        .order("data_recebimento", { ascending: false }),
    ]);
    setContas((c ?? []) as Conta[]);
    setReceitas((r ?? []) as Receita[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { carregar(); }, [carregar]);

  const meses: MesAgg[] = useMemo(() => {
    const map = new Map<string, MesAgg>();

    const garantir = (ano: number, mes: number): MesAgg => {
      const key = `${ano}-${String(mes).padStart(2, "0")}`;
      let m = map.get(key);
      if (!m) {
        m = { ano, mes, key, receitas: 0, pagas: 0, resultado: 0, contas: [], receitasList: [] };
        map.set(key, m);
      }
      return m;
    };

    for (const c of contas) {
      const [y, mo] = c.data_vencimento.split("-").map(Number);
      const m = garantir(y, mo);
      m.contas.push(c);
      if (c.pago) m.pagas += Number(c.valor);
    }
    for (const r of receitas) {
      const [y, mo] = r.data_recebimento.split("-").map(Number);
      const m = garantir(y, mo);
      m.receitasList.push(r);
      m.receitas += Number(r.valor);
    }
    for (const m of map.values()) m.resultado = m.receitas - m.pagas;

    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [contas, receitas]);

  const mesAberto = aberto ? meses.find((m) => m.key === aberto) : null;

  if (mesAberto) {
    return (
      <DetalheMes
        mes={mesAberto}
        onVoltar={() => setAberto(null)}
        findConta={findConta}
        findReceita={findReceita}
      />
    );
  }

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-6 animate-fade-in">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">Linha do tempo</p>
          <h1 className="font-serif text-3xl text-foreground">Histórico ✨</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Veja como cada mês fechou — entradas, saídas e o que sobrou.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Carregando…</p>
        ) : meses.length === 0 ? (
          <div className="card-soft text-center py-10 flex flex-col items-center">
            <ThiingIcon name="flower" size="lg" float />
            <p className="text-sm text-foreground font-medium mt-3">Ainda sem histórico</p>
            <p className="text-xs text-muted-foreground mt-1">
              Conforme você registra contas e receitas, eles aparecem aqui 💕
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {meses.map((m) => (
              <button
                key={m.key}
                onClick={() => setAberto(m.key)}
                className="w-full text-left card-soft hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-serif text-lg text-foreground capitalize">
                      {NOMES_MES[m.mes - 1]} <span className="text-muted-foreground">{m.ano}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.contas.length} contas · {m.receitasList.length} receitas
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <ResumoMini
                    icon={<TrendingUp size={12} />}
                    label="Entradas"
                    value={m.receitas}
                    tone="success"
                  />
                  <ResumoMini
                    icon={<TrendingDown size={12} />}
                    label="Saídas"
                    value={m.pagas}
                    tone="rose"
                  />
                  <ResumoMini
                    label="Resultado"
                    value={m.resultado}
                    tone={m.resultado >= 0 ? "success" : "rose-deep"}
                    destaque
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ResumoMini({
  icon,
  label,
  value,
  tone,
  destaque,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number;
  tone: "success" | "rose" | "rose-deep";
  destaque?: boolean;
}) {
  const color =
    tone === "success" ? "text-success bg-success-soft/80"
    : tone === "rose" ? "text-primary bg-primary-soft/80"
    : "text-primary-deep bg-primary-soft/60";
  return (
    <div>
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${color}`}>
        {icon} {label}
      </div>
      <p className={`text-foreground mt-1.5 truncate ${destaque ? "font-serif text-sm font-semibold" : "text-xs font-semibold"}`}>
        {formatBRL(value)}
      </p>
    </div>
  );
}

// ===================== Detalhe do mês =====================

function DetalheMes({
  mes,
  onVoltar,
  findConta,
  findReceita,
}: {
  mes: MesAgg;
  onVoltar: () => void;
  findConta: ReturnType<typeof useCategorias>["findByNome"];
  findReceita: ReturnType<typeof useCategorias>["findByNome"];
}) {
  // Agregação por categoria
  const saidasDetalhadas = useMemo(() => {
    return mes.contas.sort((a, b) => b.valor - a.valor);
  }, [mes]);

  const entradasDetalhadas = useMemo(() => {
    return mes.receitasList.sort((a, b) => b.valor - a.valor);
  }, [mes]);

  const totalSaidas = mes.pagas;
  const totalAPagar = mes.contas.filter((c) => !c.pago).reduce((a, c) => a + Number(c.valor), 0);

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-6 animate-fade-in">
        <button
          onClick={onVoltar}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="mb-5">
          <p className="text-sm text-muted-foreground">Detalhes de</p>
          <h1 className="font-serif text-3xl text-foreground capitalize">
            {NOMES_MES[mes.mes - 1]} {mes.ano}
          </h1>
        </div>

        {/* Cartão resumo do mês */}
        <div className="card-hero mb-5">
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Resultado do mês</p>
          <p className={`font-serif text-4xl font-semibold ${mes.resultado >= 0 ? "text-success" : "text-primary-deep"}`}>
            {formatBRL(mes.resultado)}
          </p>
          <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/60">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Entradas</p>
              <p className="text-sm font-semibold text-success mt-1">{formatBRL(mes.receitas)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pagas</p>
              <p className="text-sm font-semibold text-primary mt-1">{formatBRL(totalSaidas)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">A pagar</p>
              <p className="text-sm font-semibold text-primary-deep mt-1">{formatBRL(totalAPagar)}</p>
            </div>
          </div>
        </div>

        {/* Entradas por categoria */}
        <h2 className="font-serif text-xl text-foreground mb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-success" /> Entradas (Receitas)
        </h2>
        {entradasDetalhadas.length === 0 ? (
          <div className="card-soft text-center py-6 mb-6">
            <p className="text-sm text-muted-foreground">Sem receitas neste mês</p>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {entradasDetalhadas.map((r) => {
              const meta = findReceita(r.categoria || (r.tipo === "salario" ? "Salário" : "Renda extra"));
              return (
                <div key={r.id} className="card-soft flex items-center gap-3">
                  <ThiingIcon name={meta?.thiing ?? "coins"} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground line-clamp-1">{r.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.categoria || (r.tipo === "salario" ? "Salário" : "Renda extra")}
                    </p>
                  </div>
                  <p className="font-semibold text-success">{formatBRL(r.valor)}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Saídas detalhadas */}
        <h2 className="font-serif text-xl text-foreground mb-3 flex items-center gap-2">
          <TrendingDown size={18} className="text-primary" /> Saídas (Gastos e Contas)
        </h2>
        {saidasDetalhadas.length === 0 ? (
          <div className="card-soft text-center py-6">
            <p className="text-sm text-muted-foreground">Sem contas neste mês</p>
          </div>
        ) : (
          <div className="space-y-2">
            {saidasDetalhadas.map((c) => {
              const meta = findConta(c.categoria);
              return (
                <div key={c.id} className={cn("card-soft flex items-center gap-3", c.pago && "opacity-60")}>
                  <ThiingIcon name={meta?.thiing ?? "coins"} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium text-foreground line-clamp-1", c.pago && "line-through")}>
                      {c.descricao}
                      {c.cartao_id && <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">Cartão</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.categoria || "Geral"} · {c.pago ? "Pago" : "Pendente"}
                    </p>
                  </div>
                  <p className={cn("font-semibold text-primary", c.pago && "line-through")}>{formatBRL(c.valor)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
