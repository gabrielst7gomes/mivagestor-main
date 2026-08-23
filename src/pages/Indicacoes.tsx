import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Copy, Share2, Gift, Wallet, Users, ArrowDownToLine, Check, Clock, X } from "lucide-react";
import { ThiingIcon } from "@/components/ThiingIcon";
import { formatBRL, formatDataLonga } from "@/lib/finance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Indicada {
  id: string;
  indicada_id: string;
  created_at: string;
  nome: string | null;
  status_assinatura: string | null;
  total_creditado: number;
}

interface Movimento {
  id: string;
  tipo: "credito" | "abatimento_fatura" | "saque";
  valor: number;
  descricao: string | null;
  created_at: string;
}

interface Saque {
  id: string;
  valor: number;
  chave_pix: string;
  tipo_chave: string;
  status: "solicitado" | "pago" | "recusado";
  pago_em: string | null;
  created_at: string;
  observacao_admin: string | null;
}

const STATUS_LABEL: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  solicitado: { label: "Em análise", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock size={12} /> },
  pago: { label: "Pago", cls: "bg-success/10 text-success border-success/30", icon: <Check size={12} /> },
  recusado: { label: "Recusado", cls: "bg-destructive/10 text-destructive border-destructive/30", icon: <X size={12} /> },
};

export default function Indicacoes() {
  const { user } = useAuth();
  const [codigo, setCodigo] = useState<string>("");
  const [percent, setPercent] = useState<number>(30);
  const [minimo, setMinimo] = useState<number>(100);
  const [saldo, setSaldo] = useState<number>(0);
  const [indicadas, setIndicadas] = useState<Indicada[]>([]);
  const [extrato, setExtrato] = useState<Movimento[]>([]);
  const [saques, setSaques] = useState<Saque[]>([]);
  const [loading, setLoading] = useState(true);

  // Saque dialog
  const [openSaque, setOpenSaque] = useState(false);
  const [valorSaque, setValorSaque] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [tipoChave, setTipoChave] = useState<"cpf" | "email" | "telefone" | "aleatoria">("cpf");
  const [enviando, setEnviando] = useState(false);

  const carregar = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: prof }, { data: settings }, { data: saldoData }, { data: ind }, { data: ext }, { data: sq }] =
      await Promise.all([
        supabase.from("profiles").select("codigo_indicacao").eq("id", user.id).maybeSingle(),
        supabase.from("system_settings").select("chave, valor"),
        supabase.rpc("saldo_indicacao", { _user_id: user.id }),
        supabase.from("indicacoes")
          .select("id, indicada_id, created_at")
          .eq("indicador_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("creditos_indicacao")
          .select("id, tipo, valor, descricao, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(40),
        supabase.from("saques")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

    setCodigo(prof?.codigo_indicacao ?? "");

    if (settings) {
      const p = settings.find((s: any) => s.chave === "recompensa_indicacao_percent");
      const m = settings.find((s: any) => s.chave === "saque_minimo");
      if (p) setPercent(Number(p.valor));
      if (m) setMinimo(Number(m.valor));
    }

    setSaldo(Number(saldoData ?? 0));

    // Buscar nomes e status das indicadas + créditos por indicada
    if (ind && ind.length > 0) {
      const ids = ind.map((i: any) => i.indicada_id);
      const [{ data: profs }, { data: assins }, { data: creditos }] = await Promise.all([
        supabase.from("profiles").select("id, nome").in("id", ids),
        supabase.from("assinaturas").select("user_id, status").in("user_id", ids),
        supabase.from("creditos_indicacao")
          .select("indicada_id, valor, tipo")
          .eq("user_id", user.id)
          .in("indicada_id", ids),
      ]);

      const lista: Indicada[] = ind.map((i: any) => {
        const p = profs?.find((x: any) => x.id === i.indicada_id);
        const a = assins?.find((x: any) => x.user_id === i.indicada_id);
        const total = (creditos ?? [])
          .filter((c: any) => c.indicada_id === i.indicada_id && c.tipo === "credito")
          .reduce((s: number, c: any) => s + Number(c.valor), 0);
        return {
          id: i.id,
          indicada_id: i.indicada_id,
          created_at: i.created_at,
          nome: p?.nome ?? null,
          status_assinatura: a?.status ?? null,
          total_creditado: total,
        };
      });
      setIndicadas(lista);
    } else {
      setIndicadas([]);
    }

    setExtrato((ext ?? []) as Movimento[]);
    setSaques((sq ?? []) as Saque[]);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [user]);

  const link = codigo
    ? `https://appmiva.com.br/auth?ref=${codigo}`
    : "";

  const copiarLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado! Compartilha com carinho 💕");
    } catch {
      toast.error("Não consegui copiar agora.");
    }
  };

  const compartilhar = async () => {
    if (!link) return;
    const texto = `Vem cuidar das suas finanças com leveza no Miva 💕 Use meu link: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Miva", text: texto, url: link });
      } catch {/* cancelado */}
    } else {
      copiarLink();
    }
  };

  const podeSacar = saldo >= minimo;

  const enviarSaque = async () => {
    const v = parseFloat(valorSaque.replace(",", "."));
    if (!v || v <= 0) { toast.error("Informe um valor válido"); return; }
    if (v < minimo) { toast.error(`Saque mínimo é ${formatBRL(minimo)}`); return; }
    if (v > saldo) { toast.error("Saldo insuficiente"); return; }
    if (!chavePix.trim()) { toast.error("Informe sua chave PIX"); return; }

    setEnviando(true);
    const { error } = await supabase.rpc("solicitar_saque", {
      _valor: v,
      _chave_pix: chavePix.trim(),
      _tipo_chave: tipoChave,
    });
    setEnviando(false);
    if (error) { toast.error(error.message ?? "Não consegui solicitar agora."); return; }
    toast.success("Saque solicitado! Em breve cai no seu PIX 💕");
    setOpenSaque(false);
    setValorSaque(""); setChavePix("");
    carregar();
  };

  return (
    <AppShell>
      <div className="px-5 pt-6 pb-12 max-w-md mx-auto animate-fade-in">
        <Link to="/perfil" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft size={16} /> Voltar
        </Link>

        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <ThiingIcon name="coins" size="lg" float />
          </div>
          <h1 className="font-serif text-3xl text-foreground">Indique e ganhe</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Compartilhe o Miva e receba <strong>{percent}%</strong> de cada mensalidade paga por quem você indicar.
          </p>
        </div>

        {/* Card saldo */}
        <div className="card-hero py-6 px-5 mb-5 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Saldo disponível</p>
          <p className="font-serif text-4xl text-primary mb-1">{formatBRL(saldo)}</p>
          <p className="text-xs text-muted-foreground">
            Usado automaticamente na sua próxima mensalidade
          </p>
          <Button
            onClick={() => setOpenSaque(true)}
            disabled={!podeSacar}
            className="mt-4 w-full h-11 gradient-rose text-primary-foreground rounded-full font-medium shadow-rose disabled:opacity-50"
          >
            <ArrowDownToLine size={16} className="mr-1.5" />
            {podeSacar ? "Sacar via PIX" : `Sacar via PIX (mín. ${formatBRL(minimo)})`}
          </Button>
        </div>

        {/* Link */}
        <div className="relative mb-5 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary-soft/40 via-background to-primary-soft/20 p-5 shadow-rose">
          {/* decoração */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />

          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full gradient-rose flex items-center justify-center shadow-rose">
                  <Share2 size={14} className="text-primary-foreground" />
                </div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Seu link de indicação
                </Label>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-primary font-semibold bg-primary/10 px-2 py-1 rounded-full border border-primary/20">
                {codigo || "—"}
              </span>
            </div>

            <button
              onClick={copiarLink}
              className="group w-full flex items-center gap-2 p-3 rounded-2xl bg-background/70 backdrop-blur border border-primary/20 hover:border-primary/40 transition-all text-left"
            >
              <span className="flex-1 font-mono text-xs text-foreground/80 truncate">
                {link || "—"}
              </span>
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary-soft flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Copy size={13} />
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button onClick={copiarLink} variant="outline" className="rounded-full h-11 border-primary/40 text-primary bg-background/60 backdrop-blur hover:bg-primary-soft/40">
                <Copy size={15} className="mr-1.5" /> Copiar link
              </Button>
              <Button onClick={compartilhar} className="rounded-full h-11 gradient-rose text-primary-foreground shadow-rose">
                <Share2 size={15} className="mr-1.5" /> Compartilhar
              </Button>
            </div>
          </div>
        </div>

        {/* Indicadas */}
        <div className="mb-5">
          <h2 className="font-serif text-lg text-foreground mb-2 flex items-center gap-2">
            <Users size={18} className="text-primary" /> Suas indicações
            <span className="text-sm text-muted-foreground font-sans">({indicadas.length})</span>
          </h2>
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-6">Carregando…</p>
          ) : indicadas.length === 0 ? (
            <div className="card-soft text-center py-6">
              <p className="text-sm text-muted-foreground">Você ainda não indicou ninguém.</p>
              <p className="text-xs text-muted-foreground mt-1">Compartilhe seu link e comece a ganhar 💕</p>
            </div>
          ) : (
            <div className="space-y-2">
              {indicadas.map((i) => (
                <div key={i.id} className="card-soft flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-full bg-primary-soft flex items-center justify-center text-primary text-sm font-semibold shrink-0">
                    {(i.nome ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm line-clamp-1">
                      {i.nome || "Convidada"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Entrou em {formatDataLonga(i.created_at)}
                      {i.status_assinatura === "trial" && " · em teste"}
                      {i.status_assinatura === "ativa" && " · pagando 💕"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Você ganhou</p>
                    <p className="font-semibold text-success text-sm">{formatBRL(i.total_creditado)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saques */}
        {saques.length > 0 && (
          <div className="mb-5">
            <h2 className="font-serif text-lg text-foreground mb-2 flex items-center gap-2">
              <ArrowDownToLine size={18} className="text-primary" /> Meus saques
            </h2>
            <div className="space-y-2">
              {saques.map((s) => {
                const st = STATUS_LABEL[s.status];
                return (
                  <div key={s.id} className="card-soft py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{formatBRL(Number(s.valor))}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDataLonga(s.created_at)} · {s.tipo_chave.toUpperCase()}
                      </p>
                      {s.observacao_admin && (
                        <p className="text-xs text-muted-foreground italic mt-0.5">{s.observacao_admin}</p>
                      )}
                    </div>
                    <span className={cn("text-xs px-2.5 py-1 rounded-full border inline-flex items-center gap-1", st.cls)}>
                      {st.icon} {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Extrato */}
        {extrato.length > 0 && (
          <div className="mb-5">
            <h2 className="font-serif text-lg text-foreground mb-2 flex items-center gap-2">
              <Wallet size={18} className="text-primary" /> Extrato
            </h2>
            <div className="space-y-1.5">
              {extrato.map((m) => (
                <div key={m.id} className="card-soft py-2.5 px-3 flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    m.tipo === "credito" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  )}>
                    {m.tipo === "credito" ? <Gift size={14} /> : m.tipo === "saque" ? <ArrowDownToLine size={14} /> : <Wallet size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-1">{m.descricao || m.tipo}</p>
                    <p className="text-xs text-muted-foreground">{formatDataLonga(m.created_at)}</p>
                  </div>
                  <p className={cn(
                    "text-sm font-semibold shrink-0",
                    m.tipo === "credito" ? "text-success" : "text-muted-foreground"
                  )}>
                    {m.tipo === "credito" ? "+" : "−"}{formatBRL(Number(m.valor))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Como funciona */}
        <div className="card-soft p-4 bg-primary-soft/20">
          <p className="font-serif text-base text-foreground mb-2">Como funciona 🌸</p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li>• Compartilhe seu link com amigas.</li>
            <li>• Quando ela pagar a mensalidade, você ganha <strong>{percent}%</strong>.</li>
            <li>• O saldo é descontado automaticamente da sua próxima fatura.</li>
            <li>• Excedente acima de {formatBRL(minimo)} pode ser sacado via PIX.</li>
          </ul>
        </div>
      </div>

      {/* Dialog de saque */}
      <Dialog open={openSaque} onOpenChange={setOpenSaque}>
        <DialogContent className="max-w-[380px] mx-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Solicitar saque PIX</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Saldo disponível: <strong className="text-foreground">{formatBRL(saldo)}</strong>
              <br />Saque mínimo: {formatBRL(minimo)}
            </p>

            <div className="space-y-2">
              <Label>Valor a sacar</Label>
              <Input
                inputMode="decimal"
                value={valorSaque}
                onChange={(e) => setValorSaque(e.target.value)}
                placeholder="0,00"
                className="h-12 rounded-2xl text-lg font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de chave PIX</Label>
              <Select value={tipoChave} onValueChange={(v) => setTipoChave(v as any)}>
                <SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="aleatoria">Chave aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Chave PIX</Label>
              <Input
                value={chavePix}
                onChange={(e) => setChavePix(e.target.value)}
                placeholder="Sua chave PIX"
                className="h-12 rounded-2xl"
              />
            </div>

            <Button
              onClick={enviarSaque}
              disabled={enviando}
              className="w-full h-12 gradient-rose text-primary-foreground rounded-full font-semibold shadow-rose"
            >
              {enviando ? "Enviando…" : "Solicitar saque"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Após aprovação manual, o PIX é enviado em até 2 dias úteis.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
