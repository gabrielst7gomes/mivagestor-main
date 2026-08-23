import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Bell, ChevronRight, TrendingUp, TrendingDown, Hourglass } from "lucide-react";
import { saudacao, mesAtual, intervaloMesAtual, formatBRL, formatDataLonga, iniciais, nomeAbreviado } from "@/lib/finance";
import { Progress } from "@/components/ui/progress";
import { ThiingIcon } from "@/components/ThiingIcon";
import { useCategorias } from "@/hooks/useCategorias";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Conta {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data_vencimento: string;
  pago: boolean;
  cartao_id?: string | null;
}
interface Receita { id: string; valor: number; tipo: string; }

export default function Home() {
  const { user } = useAuth();
  const { findByNome } = useCategorias("conta");
  const [nome, setNome] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [contas, setContas] = useState<Conta[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!user) return;
    const { inicio, fim, ano, mes } = intervaloMesAtual();

    // Replicar contas recorrentes para este mês (idempotente)
    await supabase.rpc("replicar_recorrentes", { _user_id: user.id, _ano: ano, _mes: mes });

    const [{ data: prof }, { data: c }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("nome, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("contas").select("*").eq("user_id", user.id).gte("data_vencimento", inicio).lt("data_vencimento", fim).order("data_vencimento"),
      supabase.from("receitas").select("id, valor, tipo").eq("user_id", user.id).gte("data_recebimento", inicio).lt("data_recebimento", fim),
    ]);
    setNome(prof?.nome ?? "");
    setAvatarUrl(prof?.avatar_url ?? null);
    setContas((c ?? []) as Conta[]);
    setReceitas((r ?? []) as Receita[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { carregar(); }, [carregar]);

  const totalReceitas = receitas.reduce((a, r) => a + Number(r.valor), 0);
  const totalSalario = receitas.filter((r) => r.tipo === "salario").reduce((a, r) => a + Number(r.valor), 0);
  const totalExtra = receitas.filter((r) => r.tipo === "extra").reduce((a, r) => a + Number(r.valor), 0);
  
  const pagas = contas.filter((c) => c.pago);
  const pendentes = contas.filter((c) => !c.pago);
  const totalPagas = pagas.reduce((a, c) => a + Number(c.valor), 0);
  const totalAPagar = pendentes.reduce((a, c) => a + Number(c.valor), 0);
  const saldo = totalReceitas - totalPagas;
  const progresso = contas.length > 0 ? (pagas.length / contas.length) * 100 : 0;
  const proximas = pendentes.slice(0, 6);
  const proximoVenc = pendentes[0];

  const darBaixa = async (id: string) => {
    const { error } = await supabase
      .from("contas")
      .update({ pago: true, data_pagamento: new Date().toISOString().slice(0, 10) })
      .eq("id", id);
    if (error) { toast.error("Não consegui marcar agora. Pode tentar de novo?"); return; }
    toast.success("✓ Conta marcada como paga. Respira, tá indo tudo bem.");
    carregar();
  };

  const initials = iniciais(nome || user?.email);
  const displayName = nomeAbreviado(nome) || "amiga";

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-6 animate-fade-in md:grid md:grid-cols-[1fr_360px] lg:grid-cols-[1fr_400px] md:gap-6 md:items-start">
        <div className="md:min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">{saudacao()},</p>
              <h1 className="font-serif text-2xl text-foreground capitalize truncate">{displayName} ✨</h1>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button aria-label="Notificações" className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                <Bell size={18} />
              </button>
              <Link
                to="/perfil"
                aria-label="Ir para perfil"
                className="w-10 h-10 rounded-full overflow-hidden bg-primary-soft text-primary flex items-center justify-center font-serif font-semibold border border-primary/20"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </Link>
            </div>
          </div>

          {/* Cartão saldo — liquid glass + cofrinho 3D */}
          <div className="card-hero mb-5 animate-scale-in">
            {/* Cofrinho decorativo no canto */}
            <ThiingIcon name="piggy" size="lg" float className="absolute -top-4 -right-2 z-10" />

            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1 relative">Saldo disponível em</p>
            <p className="text-foreground/70 text-sm capitalize mb-3 relative">{mesAtual()}</p>
            <p className="font-serif text-4xl font-semibold text-rose-shimmer relative">{formatBRL(saldo)}</p>

            <div className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-white/60 relative">
              <Mini icon={<TrendingUp size={14} />} label="Receitas" value={formatBRL(totalReceitas)} tone="success" />
              <Mini icon={<TrendingDown size={14} />} label="Pagas" value={formatBRL(totalPagas)} tone="rose" />
              <Mini icon={<Hourglass size={14} />} label="A pagar" value={formatBRL(totalAPagar)} tone="rose-deep" />
            </div>
          </div>

          {/* Grid resumo 2x2 */}
          <div className="grid grid-cols-2 gap-3 mb-6 md:mb-0">
            <div className="card-soft">
              <p className="text-xs text-muted-foreground mb-1">Contas pagas</p>
              <p className="font-serif text-2xl text-foreground">{pagas.length}<span className="text-base text-muted-foreground"> de {contas.length}</span></p>
              <Progress value={progresso} className="mt-3 h-1.5" />
            </div>
            <div className="card-soft">
              <p className="text-xs text-muted-foreground mb-1">Próximo vencimento</p>
              {proximoVenc ? (
                <>
                  <p className="font-serif text-base text-foreground line-clamp-1">{proximoVenc.descricao}</p>
                  <p className="text-xs text-primary mt-1">{formatDataLonga(proximoVenc.data_vencimento)}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">Tudo em dia 💕</p>
              )}
            </div>
            <div className="card-soft">
              <p className="text-xs text-muted-foreground mb-1">Salário</p>
              <p className="font-serif text-xl text-success">{formatBRL(totalSalario)}</p>
            </div>
            <div className="card-soft">
              <p className="text-xs text-muted-foreground mb-1">Renda extra</p>
              <p className="font-serif text-xl text-primary-deep">{formatBRL(totalExtra)}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 md:mt-0">
          {/* Próximas contas */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl text-foreground">Próximas contas</h2>
            <Link to="/contas" className="text-xs text-primary flex items-center gap-1 font-medium">
              Ver todas <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Carregando…</p>
            ) : proximas.length === 0 ? (
              <div className="card-soft text-center py-8 flex flex-col items-center">
                <ThiingIcon name="flower" size="lg" float />
                <p className="text-sm text-foreground font-medium mt-3">Tudo em dia este mês</p>
                <p className="text-xs text-muted-foreground mt-1">Nada para se preocupar agora 💕</p>
              </div>
            ) : (
              proximas.map((c, i) => {
                const cat = findByNome(c.categoria);
                return (
                  <div key={c.id} className={cn("card-soft items-center gap-3", i < 3 ? "flex" : "hidden md:flex")}>
                    <ThiingIcon name={cat?.thiing ?? "coins"} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground line-clamp-1">{c.descricao}</p>
                      <p className="text-xs text-muted-foreground">Vence {formatDataLonga(c.data_vencimento)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatBRL(Number(c.valor))}</p>
                    </div>
                    <button
                      onClick={() => darBaixa(c.id)}
                      aria-label="Dar baixa"
                      className="w-9 h-9 rounded-full border-2 border-border hover:border-success hover:bg-success/10 flex items-center justify-center text-muted-foreground hover:text-success transition-all"
                    >
                      <span className="text-lg leading-none">–</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Mini({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "success" | "rose" | "rose-deep" }) {
  const color =
    tone === "success" ? "text-success bg-success-soft/80"
    : tone === "rose" ? "text-primary bg-primary-soft/80"
    : "text-primary-deep bg-primary-soft/60";
  return (
    <div>
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm ${color}`}>
        {icon} {label}
      </div>
      <p className="text-foreground text-sm font-semibold mt-1.5 truncate">{value}</p>
    </div>
  );
}
