import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatBRL } from "@/lib/finance";
import { ThiingIcon } from "@/components/ThiingIcon";
import { ArrowLeft, CheckCircle2, Clock, XCircle, QrCode, CreditCard, Receipt, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Pagamento = {
  id: string;
  valor: number;
  metodo: string;
  status: string;
  mp_status: string | null;
  pago_em: string | null;
  created_at: string;
  cobranca_de: string | null;
  cobranca_ate: string | null;
};

const statusInfo = (s: string) => {
  switch (s) {
    case "aprovado":
    case "approved":
      return { label: "Pago", icon: CheckCircle2, tone: "text-emerald-600", bg: "bg-emerald-50" };
    case "pendente":
    case "pending":
    case "in_process":
      return { label: "Pendente", icon: Clock, tone: "text-amber-600", bg: "bg-amber-50" };
    case "rejeitado":
    case "rejected":
    case "cancelled":
    case "cancelado":
      return { label: "Recusado", icon: XCircle, tone: "text-destructive", bg: "bg-destructive/10" };
    default:
      return { label: s || "—", icon: Clock, tone: "text-muted-foreground", bg: "bg-muted/40" };
  }
};

const formatData = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function HistoricoPagamentos() {
  const { user } = useAuth();
  const [items, setItems] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [recibo, setRecibo] = useState<Pagamento | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("pagamentos")
      .select("id, valor, metodo, status, mp_status, pago_em, created_at, cobranca_de, cobranca_ate")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems((data ?? []) as Pagamento[]);
        setLoading(false);
      });
  }, [user]);

  const totalPago = items
    .filter((i) => i.status === "aprovado" || i.status === "approved")
    .reduce((s, i) => s + Number(i.valor), 0);

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-6 animate-fade-in">
        <Link
          to="/perfil"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft size={16} /> Voltar
        </Link>

        <h1 className="font-serif text-3xl text-foreground mb-2">Histórico de pagamentos</h1>
        <p className="text-sm text-muted-foreground mb-6">Suas mensalidades da Miva 💕</p>

        {/* Resumo */}
        <div className="card-hero mb-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total pago</p>
          <p className="font-serif text-3xl text-rose-shimmer">{formatBRL(totalPago)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {items.length} {items.length === 1 ? "lançamento" : "lançamentos"}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>
        ) : items.length === 0 ? (
          <div className="card-soft text-center py-10 flex flex-col items-center">
            <ThiingIcon name="flower" size="md" float />
            <p className="font-serif text-lg text-foreground mt-3">Nada por aqui ainda</p>
            <p className="text-sm text-muted-foreground italic max-w-[260px] mt-1">
              Quando você renovar seu plano, os pagamentos aparecem aqui.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((p) => {
              const info = statusInfo(p.status);
              const Icon = info.icon;
              const MetodoIcon = p.metodo === "pix" ? QrCode : CreditCard;
              return (
                <li key={p.id} className="card-soft flex items-center gap-3 cursor-pointer" onClick={() => setRecibo(p)}>
                  <div className={`w-10 h-10 rounded-xl ${info.bg} flex items-center justify-center ${info.tone}`}>
                    <MetodoIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground capitalize">
                        {p.metodo === "pix" ? "Pix" : "Cartão"}
                      </p>
                      <p className="font-serif text-lg text-foreground">{formatBRL(Number(p.valor))}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {formatData(p.pago_em ?? p.created_at)}
                      </p>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${info.tone}`}>
                        <Icon size={12} /> {info.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-primary mt-1 inline-flex items-center gap-1">
                      <Receipt size={11} /> Ver comprovante
                    </p>
                    {p.cobranca_de && p.cobranca_ate && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Período: {formatData(p.cobranca_de)} → {formatData(p.cobranca_ate)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ReciboDialog pagamento={recibo} onClose={() => setRecibo(null)} />
    </AppShell>
  );
}

function ReciboDialog({ pagamento, onClose }: { pagamento: Pagamento | null; onClose: () => void }) {
  if (!pagamento) return null;
  const info = statusInfo(pagamento.status);
  const metodo = pagamento.metodo === "pix" ? "Pix"
    : pagamento.metodo === "cartao" ? "Cartão de crédito"
    : "Saldo de indicação";

  const texto = [
    "Comprovante Miva",
    `Plano: Miva Mensal`,
    `Valor: ${formatBRL(Number(pagamento.valor))}`,
    `Forma de pagamento: ${metodo}`,
    `Status: ${info.label}`,
    `Data: ${formatData(pagamento.pago_em ?? pagamento.created_at)}`,
    pagamento.cobranca_de && pagamento.cobranca_ate
      ? `Período: ${formatData(pagamento.cobranca_de)} a ${formatData(pagamento.cobranca_ate)}`
      : "",
    `Código: ${pagamento.id.slice(0, 8).toUpperCase()}`,
  ].filter(Boolean).join("\n");

  const copiar = async () => {
    await navigator.clipboard.writeText(texto);
    toast.success("Comprovante copiado 💕");
  };

  const compartilhar = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Comprovante Miva", text: texto }); return; } catch { /* cancelado */ }
    }
    copiar();
  };

  const Linha = ({ label, valor }: { label: string; valor: string }) => (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/60 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground text-right">{valor}</span>
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Comprovante</DialogTitle>
        </DialogHeader>

        <div className="text-center py-2">
          <p className="font-serif text-3xl text-rose-shimmer">{formatBRL(Number(pagamento.valor))}</p>
          <span className={`inline-flex items-center gap-1 text-xs font-medium mt-1 ${info.tone}`}>
            <info.icon size={12} /> {info.label}
          </span>
        </div>

        <div className="rounded-2xl bg-muted/30 px-4 py-1">
          <Linha label="Plano" valor="Miva Mensal" />
          <Linha label="Forma de pagamento" valor={metodo} />
          <Linha label="Data" valor={formatData(pagamento.pago_em ?? pagamento.created_at)} />
          {pagamento.cobranca_de && pagamento.cobranca_ate && (
            <Linha
              label="Período"
              valor={`${formatData(pagamento.cobranca_de)} → ${formatData(pagamento.cobranca_ate)}`}
            />
          )}
          <Linha label="Código" valor={pagamento.id.slice(0, 8).toUpperCase()} />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button variant="outline" className="rounded-2xl" onClick={copiar}>
            <Copy size={14} className="mr-1.5" /> Copiar
          </Button>
          <Button className="rounded-2xl gradient-rose text-white" onClick={compartilhar}>
            <Receipt size={14} className="mr-1.5" /> Compartilhar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
