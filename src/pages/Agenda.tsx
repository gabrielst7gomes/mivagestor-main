import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Bell, BellOff, MapPin, Plus, Trash2, Check, Pencil, ChevronLeft, ChevronRight, Receipt, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThiingIcon } from "@/components/ThiingIcon";
import { NovoCompromissoSheet } from "@/components/NovoCompromissoSheet";
import { ensurePushSubscription, disablePushSubscription, pushSupported, getNotificationPermission } from "@/lib/push";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/finance";
import { Link } from "react-router-dom";

interface Compromisso {
  id: string;
  titulo: string;
  data_hora: string;
  local: string | null;
  observacoes: string | null;
  conta_id: string | null;
  receita_id: string | null;
  concluido: boolean;
}
interface Conta {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  pago: boolean;
}
interface Receita {
  id: string;
  descricao: string | null;
  tipo: string;
  valor: number;
  data_recebimento: string;
}

type Evento =
  | { kind: "compromisso"; date: Date; ord: string; data: Compromisso }
  | { kind: "conta"; date: Date; ord: string; data: Conta }
  | { kind: "receita"; date: Date; ord: string; data: Receita };

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS = ["D","S","T","Q","Q","S","S"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function ehHoje(d: Date) { return sameDay(d, new Date()); }
function formatarDataExtenso(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}
function formatarHora(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// Cria Date local a partir de "yyyy-mm-dd" (evita shift de fuso)
function dateFromYMD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export default function Agenda() {
  const { user } = useAuth();
  const hoje = new Date();
  const [cursor, setCursor] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [selecionado, setSelecionado] = useState<Date>(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSheet, setOpenSheet] = useState(false);
  const [editing, setEditing] = useState<Compromisso | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [pushAtivo, setPushAtivo] = useState(false);

  const carregar = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const inicio = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    const fim = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 1);
    const inicioYMD = ymdLocal(inicio);
    const fimYMD = ymdLocal(fim);

    const [{ data: comp }, { data: ct }, { data: rc }] = await Promise.all([
      supabase.from("compromissos").select("*").eq("user_id", user.id)
        .gte("data_hora", inicio.toISOString()).lt("data_hora", fim.toISOString())
        .order("data_hora", { ascending: true }),
      supabase.from("contas").select("id, descricao, valor, data_vencimento, pago").eq("user_id", user.id)
        .gte("data_vencimento", inicioYMD).lt("data_vencimento", fimYMD),
      supabase.from("receitas").select("id, descricao, tipo, valor, data_recebimento").eq("user_id", user.id)
        .gte("data_recebimento", inicioYMD).lt("data_recebimento", fimYMD),
    ]);
    setCompromissos((comp ?? []) as Compromisso[]);
    setContas((ct ?? []) as Conta[]);
    setReceitas((rc ?? []) as Receita[]);
    setLoading(false);
  }, [user, cursor]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    (async () => {
      if (!pushSupported()) return;
      const p = await getNotificationPermission();
      setPermission(p);
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setPushAtivo(!!sub && p === "granted");
    })();
  }, []);

  const ativarLembretes = async () => {
    if (!user) return;
    if (!pushSupported()) { toast.error("Seu navegador não permite lembretes push. Instale o app pra usar."); return; }
    const ok = await ensurePushSubscription(user.id);
    if (ok) { setPushAtivo(true); setPermission("granted"); toast.success("Lembretes ativados 💕"); }
    else { toast.error("Não foi possível ativar agora."); setPermission(await getNotificationPermission()); }
  };
  const desativarLembretes = async () => {
    await disablePushSubscription();
    setPushAtivo(false);
    toast.success("Lembretes desativados");
  };

  const concluir = async (id: string, concluido: boolean) => {
    await supabase.from("compromissos").update({ concluido: !concluido }).eq("id", id);
    carregar();
  };
  const excluir = async (id: string) => {
    if (!confirm("Apagar este compromisso?")) return;
    await supabase.from("compromissos").delete().eq("id", id);
    toast.success("Compromisso removido");
    carregar();
  };

  // Lista unificada de eventos
  const eventos: Evento[] = useMemo(() => {
    const arr: Evento[] = [];
    for (const c of compromissos) {
      const d = new Date(c.data_hora);
      arr.push({ kind: "compromisso", date: d, ord: d.toISOString(), data: c });
    }
    for (const c of contas) {
      const d = dateFromYMD(c.data_vencimento);
      arr.push({ kind: "conta", date: d, ord: ymdLocal(d) + "T08:00", data: c });
    }
    for (const r of receitas) {
      const d = dateFromYMD(r.data_recebimento);
      arr.push({ kind: "receita", date: d, ord: ymdLocal(d) + "T09:00", data: r });
    }
    return arr;
  }, [compromissos, contas, receitas]);

  // Mapa: ymd -> contagem
  const contagemPorDia = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of eventos) {
      const k = ymdLocal(e.date);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [eventos]);

  // Grade do mês (6 semanas)
  const celulas = useMemo(() => {
    const primeiro = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const inicio = new Date(primeiro);
    inicio.setDate(inicio.getDate() - inicio.getDay());
    const arr: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [cursor]);

  const eventosDoDia = useMemo(() => {
    return eventos
      .filter((e) => sameDay(e.date, selecionado))
      .sort((a, b) => a.ord.localeCompare(b.ord));
  }, [eventos, selecionado]);

  const mudarMes = (delta: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  const irPraHoje = () => {
    const h = new Date();
    setCursor(new Date(h.getFullYear(), h.getMonth(), 1));
    setSelecionado(new Date(h.getFullYear(), h.getMonth(), h.getDate()));
  };

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-serif text-2xl text-foreground">Minha Agenda</h1>
            <p className="text-sm text-muted-foreground">Compromissos, contas e receitas ✨</p>
          </div>
          <Button
            size="icon"
            onClick={() => { setEditing(null); setOpenSheet(true); }}
            className="rounded-full h-12 w-12 shadow-lg"
            aria-label="Novo compromisso"
          >
            <Plus size={22} />
          </Button>
        </div>

        {/* Calendário */}
        <div className="card-soft mb-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => mudarMes(-1)} aria-label="Mês anterior"
              className="w-9 h-9 rounded-full hover:bg-primary-soft flex items-center justify-center text-muted-foreground hover:text-primary">
              <ChevronLeft size={18} />
            </button>
            <button onClick={irPraHoje} className="font-serif text-lg text-foreground capitalize">
              {MESES[cursor.getMonth()]} <span className="text-muted-foreground">{cursor.getFullYear()}</span>
            </button>
            <button onClick={() => mudarMes(1)} aria-label="Próximo mês"
              className="w-9 h-9 rounded-full hover:bg-primary-soft flex items-center justify-center text-muted-foreground hover:text-primary">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DIAS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {celulas.map((d, i) => {
              const ehDoMes = d.getMonth() === cursor.getMonth();
              const ehSelecionado = sameDay(d, selecionado);
              const hojeFlag = ehHoje(d);
              const qtd = contagemPorDia.get(ymdLocal(d)) ?? 0;
              return (
                <button
                  key={i}
                  onClick={() => setSelecionado(new Date(d))}
                  className={cn(
                    "relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all",
                    !ehDoMes && "text-muted-foreground/40",
                    ehDoMes && !ehSelecionado && "text-foreground hover:bg-primary-soft/60",
                    ehSelecionado && "bg-primary text-primary-foreground font-semibold shadow-md",
                    hojeFlag && !ehSelecionado && "ring-1 ring-primary/40",
                  )}
                >
                  <span>{d.getDate()}</span>
                  {qtd > 0 && (
                    <span className="absolute bottom-1 flex gap-0.5">
                      {Array.from({ length: Math.min(qtd, 3) }).map((_, k) => (
                        <span key={k} className={cn(
                          "w-1 h-1 rounded-full",
                          ehSelecionado ? "bg-primary-foreground" : "bg-primary"
                        )} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border/60 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Compromisso</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /> Conta</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Receita</span>
          </div>
        </div>

        {/* Banner de lembretes */}
        <div className="card-soft mb-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${pushAtivo ? "bg-success-soft text-success" : "bg-primary-soft text-primary"}`}>
            {pushAtivo ? <Bell size={18} /> : <BellOff size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {pushAtivo ? "Lembretes ativados" : "Receba lembretes no celular"}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {pushAtivo
                ? "Avisamos 1 dia antes e no dia."
                : permission === "denied"
                ? "Permissão bloqueada — libere nas configurações."
                : "Toque pra ativar mesmo com o app fechado."}
            </p>
          </div>
          {pushAtivo ? (
            <Button variant="ghost" size="sm" onClick={desativarLembretes}>Desativar</Button>
          ) : (
            <Button size="sm" onClick={ativarLembretes} disabled={permission === "denied"}>Ativar</Button>
          )}
        </div>

        {/* Eventos do dia selecionado */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {ehHoje(selecionado) ? "Hoje" : ""}
            </p>
            <h2 className="font-serif text-lg text-foreground capitalize">{formatarDataExtenso(selecionado)}</h2>
          </div>
          <button
            onClick={() => { setEditing(null); setOpenSheet(true); }}
            className="text-xs text-primary font-medium flex items-center gap-1"
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Carregando…</p>
        ) : eventosDoDia.length === 0 ? (
          <div className="card-soft text-center py-8 flex flex-col items-center">
            <ThiingIcon name="flower" size="lg" float />
            <p className="text-sm text-foreground font-medium mt-3">Nada marcado nesse dia</p>
            <p className="text-xs text-muted-foreground mt-1">Aproveita pra descansar 💕</p>
          </div>
        ) : (
          <div className="space-y-2">
            {eventosDoDia.map((e) => {
              if (e.kind === "compromisso") {
                const c = e.data;
                return (
                  <div key={"c-" + c.id} className={cn("card-soft flex items-start gap-3", c.concluido && "opacity-60")}>
                    <div className="flex flex-col items-center justify-center w-12 shrink-0">
                      <span className="font-serif text-base font-semibold text-primary leading-none">{formatarHora(e.date)}</span>
                    </div>
                    <div className="w-px self-stretch bg-border" />
                    <button
                      onClick={() => concluir(c.id, c.concluido)}
                      className={cn(
                        "w-8 h-8 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                        c.concluido
                          ? "bg-success border-success text-white"
                          : "border-border hover:border-success text-transparent hover:text-success"
                      )}
                      aria-label="Concluir"
                    >
                      <Check size={14} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium text-foreground", c.concluido && "line-through")}>{c.titulo}</p>
                      {c.local && (
                        <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                          <MapPin size={11} />{c.local}
                        </p>
                      )}
                      {c.observacoes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.observacoes}</p>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => { setEditing(c); setOpenSheet(true); }}
                        className="w-8 h-8 rounded-full hover:bg-primary-soft text-muted-foreground hover:text-primary flex items-center justify-center"
                        aria-label="Editar"
                      ><Pencil size={14} /></button>
                      <button
                        onClick={() => excluir(c.id)}
                        className="w-8 h-8 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center"
                        aria-label="Excluir"
                      ><Trash2 size={14} /></button>
                    </div>
                  </div>
                );
              }

              if (e.kind === "conta") {
                const c = e.data;
                return (
                  <Link to="/contas" key={"a-" + c.id}
                    className={cn("card-soft flex items-center gap-3 block", c.pago && "opacity-60")}>
                    <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                      <Receipt size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium text-foreground line-clamp-1", c.pago && "line-through")}>{c.descricao}</p>
                      <p className="text-[11px] text-rose-500/80 uppercase tracking-wider">
                        {c.pago ? "Conta paga" : "Conta a pagar"}
                      </p>
                    </div>
                    <p className="font-semibold text-rose-500 text-sm shrink-0">{formatBRL(Number(c.valor))}</p>
                  </Link>
                );
              }

              // receita
              const r = e.data;
              return (
                <Link to="/receitas" key={"r-" + r.id} className="card-soft flex items-center gap-3 block">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <TrendingUp size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground line-clamp-1">{r.descricao || r.tipo}</p>
                    <p className="text-[11px] text-emerald-600/80 uppercase tracking-wider">Receita</p>
                  </div>
                  <p className="font-semibold text-emerald-600 text-sm shrink-0">{formatBRL(Number(r.valor))}</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <NovoCompromissoSheet
        open={openSheet}
        onOpenChange={(o) => { setOpenSheet(o); if (!o) setEditing(null); }}
        onSaved={carregar}
        initialDate={ymdLocal(selecionado)}
        editing={editing as any}
      />
    </AppShell>
  );
}
