import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAssinatura } from "@/hooks/useAssinatura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ThiingIcon } from "@/components/ThiingIcon";
import { formatBRL } from "@/lib/finance";
import { Check, Copy, Loader2, ArrowLeft, CreditCard, QrCode, Sparkles, ShieldCheck, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const VALOR = 39.90;

declare global {
  interface Window {
    MercadoPago?: any;
  }
}

type Aba = "resumo" | "pix" | "cartao";

export default function Plano() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { assinatura, loading, diasRestantes, ativa, recarregar } = useAssinatura();
  const [aba, setAba] = useState<Aba>("resumo");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-serif">Carregando…</p>
      </div>
    );
  }

  const status = assinatura?.status ?? "trial";
  const fimRef =
    status === "trial" ? assinatura?.trial_fim : assinatura?.periodo_fim;

  const total = status === "trial" ? 7 : 30;
  const usados = total - diasRestantes;
  const progresso = Math.min(100, Math.max(0, (usados / total) * 100));

  return (
    <div className="mobile-shell gradient-soft pb-10 min-h-screen">
      <div className="px-5 pt-8 pb-6 animate-fade-in">
        {ativa && (
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
        )}

        {!ativa && (
          <div className="text-center mb-2">
            <p className="text-xs uppercase tracking-widest text-primary-deep">Miva</p>
          </div>
        )}

        <div className="mb-6 text-center">
          <h1 className="font-serif text-3xl text-foreground">
            {ativa ? "Seu plano" : "Renove seu acesso"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ativa
              ? "Tudo pronto para você cuidar do seu dinheiro com leveza."
              : "Para continuar usando a Miva, finalize sua assinatura."}
          </p>
        </div>

        {aba === "resumo" && (
          <ResumoCard
            recorrente={!!assinatura?.recorrencia_ativa}
            onRecarregar={recarregar}
            status={status}
            diasRestantes={diasRestantes}
            fimRef={fimRef}
            progresso={progresso}
            ativa={ativa}
            onPix={() => setAba("pix")}
            onCartao={() => setAba("cartao")}
          />
        )}

        {aba === "pix" && (
          <PixCheckout
            voltar={() => setAba("resumo")}
            onPago={() => { recarregar(); setAba("resumo"); }}
          />
        )}

        {aba === "cartao" && (
          <CartaoCheckout
            voltar={() => setAba("resumo")}
            onPago={() => { recarregar(); setAba("resumo"); }}
            email={user?.email ?? ""}
          />
        )}

        {!ativa && aba === "resumo" && (
          <button
            onClick={signOut}
            className="mx-auto mt-8 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
          >
            <LogOut size={12} /> Sair
          </button>
        )}
      </div>
    </div>
  );
}

// ===================== RESUMO =====================

function ResumoCard({
  status, diasRestantes, fimRef, progresso, ativa, onPix, onCartao, recorrente, onRecarregar,
}: {
  status: string;
  recorrente: boolean;
  onRecarregar: () => void;
  diasRestantes: number;
  fimRef: string | null | undefined;
  progresso: number;
  ativa: boolean;
  onPix: () => void;
  onCartao: () => void;
}) {
  const fimFmt = fimRef
    ? new Date(fimRef + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "—";

  const labelStatus =
    status === "trial" ? "Período de teste"
    : status === "ativa" ? "Plano ativo"
    : status === "cancelada" ? "Plano cancelado"
    : "Plano vencido";

  return (
    <>
      <div className="card-hero mb-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{labelStatus}</p>
            <p className="font-serif text-2xl text-foreground mt-1">Miva Mensal</p>
          </div>
          <ThiingIcon name="piggy" size="md" float />
        </div>

        <div className="flex items-baseline gap-1 mb-1">
          <span className="font-serif text-4xl text-rose-shimmer">{formatBRL(VALOR)}</span>
          <span className="text-sm text-muted-foreground">/mês</span>
        </div>

        {ativa ? (
          <>
            <div className="mt-5 pt-4 border-t border-white/60">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">
                  {diasRestantes} {diasRestantes === 1 ? "dia restante" : "dias restantes"}
                </span>
                <span className="text-muted-foreground">até {fimFmt}</span>
              </div>
              <Progress value={progresso} className="h-1.5" />
            </div>
          </>
        ) : (
          <div className="mt-4 px-3 py-2.5 rounded-xl bg-primary-soft/60 border border-primary/20">
            <p className="text-sm text-foreground">
              Seu acesso está pausado. Renove para continuar com tudo que você já organizou aqui 💕
            </p>
          </div>
        )}
      </div>

      {/* Renovação automática */}
      <RenovacaoAutomatica recorrente={recorrente} onRecarregar={onRecarregar} />

      {/* Benefícios */}
      <div className="card-soft mb-5">
        <p className="font-serif text-base text-foreground mb-3">Você tem acesso a:</p>
        <ul className="space-y-2">
          {[
            "Controle de contas e receitas ilimitadas",
            "Histórico mensal com gráficos por categoria",
            "Categorias personalizadas",
            "Lembretes de vencimento",
          ].map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-foreground">
              <Check size={16} className="text-success mt-0.5 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTAs */}
      <p className="text-xs text-muted-foreground text-center mb-3">
        {ativa ? "Antecipe sua próxima mensalidade" : "Escolha como quer pagar"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={onPix}
          variant="outline"
          className="h-16 rounded-2xl flex flex-col gap-1 border-primary/30 hover:bg-primary-soft"
        >
          <QrCode size={20} className="text-primary" />
          <span className="text-sm font-medium">Pix</span>
        </Button>
        <Button
          onClick={onCartao}
          className="h-16 rounded-2xl flex flex-col gap-1 gradient-rose text-white shadow-rose"
        >
          <CreditCard size={20} />
          <span className="text-sm font-medium">Cartão</span>
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground text-center mt-4 flex items-center justify-center gap-1">
        <ShieldCheck size={12} /> Pagamentos processados com segurança pelo Mercado Pago
      </p>
    </>
  );
}

function RenovacaoAutomatica({ recorrente, onRecarregar }: { recorrente: boolean; onRecarregar: () => void }) {
  const [cancelando, setCancelando] = useState(false);

  const cancelar = async () => {
    setCancelando(true);
    try {
      const { error } = await supabase.functions.invoke("mp-cancel-recorrencia");
      if (error) throw error;
      toast.success("Renovação automática desligada. Seu acesso continua até o fim do período pago 💕");
      onRecarregar();
    } catch (e) {
      console.error(e);
      toast.error("Não consegui desligar agora. Pode tentar de novo?");
    } finally {
      setCancelando(false);
    }
  };

  if (!recorrente) {
    return (
      <div className="card-soft mb-5 flex items-start gap-3">
        <RefreshCw size={18} className="text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Renovação automática desligada</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ao pagar com cartão, você pode ativar a renovação automática e nunca mais lembrar de renovar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-soft mb-5">
      <div className="flex items-start gap-3">
        <RefreshCw size={18} className="text-success mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Renovação automática ligada ✨</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cobramos {formatBRL(VALOR)} no seu cartão todo mês, automaticamente.
          </p>
        </div>
      </div>
      <button
        onClick={cancelar}
        disabled={cancelando}
        className="mt-3 text-xs text-muted-foreground hover:text-destructive underline"
      >
        {cancelando ? "Desligando…" : "Desligar renovação automática"}
      </button>
    </div>
  );
}

// ===================== PIX =====================

function PixCheckout({ voltar, onPago }: { voltar: () => void; onPago: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saldo, setSaldo] = useState(0);
  const [pix, setPix] = useState<{
    pagamento_id: string;
    qr_code: string;
    qr_code_base64: string;
    expires_at: string;
    valor?: number;
    valor_total?: number;
    valor_abatido?: number;
  } | null>(null);
  const [aprovado, setAprovado] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("saldo_indicacao", { _user_id: user.id }).then(({ data }) => {
      setSaldo(Number(data ?? 0));
    });
  }, [user]);

  const gerar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("mp-create-pix");
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      // Caso especial: saldo de indicação cobriu 100%
      if ((data as any)?.pago_com_saldo) {
        toast.success("Mensalidade quitada com seu saldo de indicação 💕");
        setAprovado(true);
        setTimeout(onPago, 1800);
        return;
      }
      setPix(data as any);
    } catch (e) {
      console.error(e);
      toast.error("Não consegui gerar o Pix agora. Tenta de novo?");
    } finally {
      setLoading(false);
    }
  };

  // Realtime: detecta aprovação via webhook
  useEffect(() => {
    if (!pix) return;
    const ch = supabase
      .channel(`pag:${pix.pagamento_id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pagamentos", filter: `id=eq.${pix.pagamento_id}` },
        (payload) => {
          const p = payload.new as { status?: string };
          if (p.status === "aprovado") {
            setAprovado(true);
            setTimeout(onPago, 2000);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [pix, onPago]);

  // Fallback: se o webhook atrasar, consultamos o Mercado Pago a cada 5s
  useEffect(() => {
    if (!pix || aprovado) return;
    const id = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("mp-sync-payment", {
          body: { pagamento_id: pix.pagamento_id },
        });
        if ((data as any)?.status === "aprovado") {
          setAprovado(true);
          setTimeout(onPago, 2000);
        }
      } catch { /* silencioso */ }
    }, 5000);
    return () => clearInterval(id);
  }, [pix, aprovado, onPago]);

  const copiar = async () => {
    if (!pix) return;
    await navigator.clipboard.writeText(pix.qr_code);
    toast.success("Código Pix copiado!");
  };

  return (
    <div className="card-hero">
      <button onClick={voltar} className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> Voltar
      </button>

      <h2 className="font-serif text-2xl text-foreground mb-1">Pagar com Pix</h2>
      <p className="text-sm text-muted-foreground mb-3">{formatBRL(VALOR)} · vale por 30 dias</p>

      {saldo > 0 && !pix && !aprovado && (
        <div className="mb-4 px-3 py-2.5 rounded-xl bg-success/10 border border-success/30">
          <p className="text-xs text-success-foreground/80">
            🎁 Você tem <strong className="text-success">{formatBRL(saldo)}</strong> de saldo de indicação.
            {saldo >= VALOR
              ? " Sua mensalidade será 100% gratuita este mês!"
              : ` Vamos abater do valor — você paga só ${formatBRL(VALOR - saldo)}.`}
          </p>
        </div>
      )}

      {pix?.valor_abatido !== undefined && pix.valor_abatido > 0 && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-success/10 border border-success/30 text-xs text-foreground">
          Saldo de indicação aplicado: <strong>−{formatBRL(pix.valor_abatido)}</strong> · cobrança via Pix: <strong>{formatBRL(pix.valor ?? VALOR)}</strong>
        </div>
      )}

      {aprovado ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-success-soft flex items-center justify-center mx-auto mb-3">
            <Check size={32} className="text-success" />
          </div>
          <p className="font-serif text-xl text-foreground">Pagamento confirmado!</p>
          <p className="text-sm text-muted-foreground mt-1">Liberando seu acesso… ✨</p>
        </div>
      ) : !pix ? (
        <Button onClick={gerar} disabled={loading} className="w-full h-12 rounded-2xl gradient-rose text-white">
          {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Gerando QR…</> : "Gerar QR Code"}
        </Button>
      ) : (
        <>
          <div className="bg-white rounded-2xl p-4 mb-4 flex items-center justify-center border border-border">
            <img
              src={`data:image/png;base64,${pix.qr_code_base64}`}
              alt="QR Code Pix"
              className="w-56 h-56 object-contain"
            />
          </div>
          <Label className="text-xs text-muted-foreground">Pix copia e cola</Label>
          <div className="flex gap-2 mt-1.5">
            <Input value={pix.qr_code} readOnly className="text-xs font-mono rounded-xl" />
            <Button onClick={copiar} variant="outline" className="rounded-xl shrink-0">
              <Copy size={14} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            Aguardando confirmação automática…
          </p>
          <p className="text-[11px] text-muted-foreground mt-2">
            Após o pagamento no seu banco, sua assinatura é liberada em segundos.
          </p>
        </>
      )}
    </div>
  );
}

// ===================== CARTÃO =====================

function CartaoCheckout({ voltar, onPago, email }: { voltar: () => void; onPago: () => void; email: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [mpReady, setMpReady] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aprovado, setAprovado] = useState(false);
  const [modo, setModo] = useState<"unico" | "recorrente">("recorrente");
  const [aguardando, setAguardando] = useState(false);
  const modoRef = useRef<"unico" | "recorrente">("recorrente");
  const cardFormRef = useRef<any>(null);

  useEffect(() => { modoRef.current = modo; }, [modo]);

  // 1) Pega public key + carrega script
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("mp-public-key");
        if (error || !(data as any)?.public_key) {
          toast.error("Public Key do Mercado Pago não configurada.");
          return;
        }
        if (cancel) return;
        setPublicKey((data as any).public_key);

        if (!document.getElementById("mp-sdk")) {
          const s = document.createElement("script");
          s.id = "mp-sdk";
          s.src = "https://sdk.mercadopago.com/js/v2";
          s.onload = () => !cancel && setMpReady(true);
          document.body.appendChild(s);
        } else {
          setMpReady(true);
        }
      } catch (e) {
        console.error(e);
        toast.error("Não consegui carregar o checkout.");
      }
    })();
    return () => { cancel = true; };
  }, []);

  // 2) Inicializa CardForm quando SDK + key prontos
  useEffect(() => {
    if (!mpReady || !publicKey || !window.MercadoPago) return;
    const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });

    const cardForm = mp.cardForm({
      amount: String(VALOR),
      iframe: true,
      form: {
        id: "form-cartao",
        cardNumber: { id: "mp-cardNumber", placeholder: "Número do cartão" },
        expirationDate: { id: "mp-expirationDate", placeholder: "MM/AA" },
        securityCode: { id: "mp-securityCode", placeholder: "CVV" },
        cardholderName: { id: "mp-cardholderName", placeholder: "Como aparece no cartão" },
        issuer: { id: "mp-issuer", placeholder: "Banco emissor" },
        installments: { id: "mp-installments", placeholder: "Parcelas" },
        identificationType: { id: "mp-identificationType", placeholder: "Tipo de doc" },
        identificationNumber: { id: "mp-identificationNumber", placeholder: "CPF" },
        cardholderEmail: { id: "mp-cardholderEmail", placeholder: "E-mail", value: email },
      },
      callbacks: {
        onFormMounted: (error: any) => {
          if (error) console.warn("CardForm mount error:", error);
        },
        onSubmit: async (event: Event) => {
          event.preventDefault();
          setEnviando(true);
          try {
            const data = cardForm.getCardFormData();

            if (modoRef.current === "recorrente") {
              const { data: sub, error: subErr } = await supabase.functions.invoke("mp-subscribe-card", {
                body: {
                  card_token_id: data.token,
                  payer_email: data.cardholderEmail || email,
                },
              });
              if (subErr) throw subErr;
              if ((sub as any)?.error) throw new Error((sub as any).error);
              toast.success("Renovação automática ativada 💕");
              setAguardando(true);
              setTimeout(onPago, 4000);
              return;
            }

            const { data: resp, error } = await supabase.functions.invoke("mp-pay-card", {
              body: {
                token: data.token,
                payment_method_id: data.paymentMethodId,
                issuer_id: data.issuerId,
                installments: 1,
                identificationType: data.identificationType,
                identificationNumber: data.identificationNumber,
                payer_email: data.cardholderEmail || email,
              },
            });
            if (error) throw error;
            const r = resp as { aprovado: boolean; status: string; status_detail: string };
            if (r.aprovado) {
              setAprovado(true);
              setTimeout(onPago, 1800);
            } else {
              toast.error(`Pagamento ${r.status}: ${traduzirStatus(r.status_detail)}`);
            }
          } catch (e: any) {
            console.error(e);
            toast.error(e?.message || "Não consegui processar o pagamento.");
          } finally {
            setEnviando(false);
          }
        },
        onFetching: (resource: string) => {
          console.log("Fetching:", resource);
        },
      },
    });

    cardFormRef.current = cardForm;

    return () => {
      try { cardForm.unmount(); } catch { /* noop */ }
    };
  }, [mpReady, publicKey, email, onPago]);

  return (
    <div className="card-hero">
      <button onClick={voltar} className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> Voltar
      </button>

      <h2 className="font-serif text-2xl text-foreground mb-1">Pagar com cartão</h2>
      <p className="text-sm text-muted-foreground mb-5">{formatBRL(VALOR)} · libera 30 dias de acesso</p>

      {aguardando ? (
        <div className="text-center py-6">
          <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
          <p className="font-serif text-xl text-foreground">Confirmando sua assinatura…</p>
          <p className="text-sm text-muted-foreground mt-1">
            A primeira cobrança é processada em instantes. Você pode acompanhar em Histórico de pagamentos.
          </p>
        </div>
      ) : aprovado ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-success-soft flex items-center justify-center mx-auto mb-3">
            <Sparkles size={32} className="text-success" />
          </div>
          <p className="font-serif text-xl text-foreground">Pagamento aprovado!</p>
          <p className="text-sm text-muted-foreground mt-1">Bem-vinda de volta ✨</p>
        </div>
      ) : !mpReady || !publicKey ? (
        <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Carregando checkout seguro…
        </div>
      ) : (
        <form id="form-cartao" ref={formRef} className="space-y-3">
          <div className="grid grid-cols-2 gap-2 mb-1">
            <button
              type="button"
              onClick={() => setModo("recorrente")}
              className={`rounded-2xl border p-3 text-left transition ${modo === "recorrente" ? "border-primary bg-primary-soft/60" : "border-border"}`}
            >
              <span className="block text-sm font-medium text-foreground">Todo mês</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">Renovação automática</span>
            </button>
            <button
              type="button"
              onClick={() => setModo("unico")}
              className={`rounded-2xl border p-3 text-left transition ${modo === "unico" ? "border-primary bg-primary-soft/60" : "border-border"}`}
            >
              <span className="block text-sm font-medium text-foreground">Só desta vez</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">Pagamento único</span>
            </button>
          </div>
          <Field label="Número do cartão"><div id="mp-cardNumber" className="mp-field" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Validade"><div id="mp-expirationDate" className="mp-field" /></Field>
            <Field label="CVV"><div id="mp-securityCode" className="mp-field" /></Field>
          </div>
          <Field label="Nome no cartão">
            <input id="mp-cardholderName" className="mp-input" placeholder="Como aparece no cartão" autoComplete="cc-name" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select id="mp-identificationType" className="mp-input" />
            </Field>
            <Field label="CPF/CNPJ">
              <input id="mp-identificationNumber" className="mp-input" placeholder="000.000.000-00" inputMode="numeric" />
            </Field>
          </div>
          <Field label="E-mail">
            <input id="mp-cardholderEmail" className="mp-input" defaultValue={email} type="email" />
          </Field>
          {/* hidden — preenchidos pelo CardForm */}
          <select id="mp-issuer" className="hidden" />
          <select id="mp-installments" className="hidden" />

          <Button type="submit" disabled={enviando} className="w-full h-12 mt-4 rounded-2xl gradient-rose text-white shadow-rose">
            {enviando
              ? <><Loader2 size={16} className="animate-spin mr-2" /> Processando…</>
              : modo === "recorrente"
                ? `Assinar por ${formatBRL(VALOR)}/mês`
                : `Pagar ${formatBRL(VALOR)}`}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
            <ShieldCheck size={12} /> Seus dados são tokenizados e nunca passam pela Miva
          </p>
        </form>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function traduzirStatus(detail: string): string {
  const map: Record<string, string> = {
    cc_rejected_insufficient_amount: "saldo insuficiente",
    cc_rejected_bad_filled_card_number: "número do cartão incorreto",
    cc_rejected_bad_filled_date: "data de validade incorreta",
    cc_rejected_bad_filled_security_code: "CVV incorreto",
    cc_rejected_bad_filled_other: "dados incorretos",
    cc_rejected_call_for_authorize: "autorize a compra com seu banco",
    cc_rejected_high_risk: "recusada por segurança",
    cc_rejected_other_reason: "cartão recusado",
  };
  return map[detail] || "tente outro cartão";
}
