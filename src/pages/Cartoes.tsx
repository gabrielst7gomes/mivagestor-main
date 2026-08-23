import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatBRL } from "@/lib/finance";
import { ArrowLeft, Plus, CreditCard, Pencil, Receipt } from "lucide-react";
import { CartaoFormSheet, CartaoLite } from "@/components/CartaoFormSheet";
import { GastoCartaoSheet } from "@/components/GastoCartaoSheet";
import { ThiingIcon } from "@/components/ThiingIcon";

type Cartao = {
  id: string;
  nome: string;
  bandeira: string | null;
  limite: number | null;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
};

type Conta = {
  id: string;
  cartao_id: string | null;
  valor: number;
  pago: boolean;
  data_vencimento: string;
  descricao: string;
  parcela_atual: number | null;
  parcelas_total: number | null;
};

export default function Cartoes() {
  const { user } = useAuth();
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<CartaoLite | null>(null);
  const [openGasto, setOpenGasto] = useState(false);
  const [cartaoGasto, setCartaoGasto] = useState<string | undefined>();

  const carregar = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: cs }, { data: ks }] = await Promise.all([
      supabase
        .from("cartoes")
        .select("*")
        .eq("user_id", user.id)
        .order("ordem")
        .order("created_at"),
      supabase
        .from("contas")
        .select("id, cartao_id, valor, pago, data_vencimento, descricao, parcela_atual, parcelas_total")
        .eq("user_id", user.id)
        .not("cartao_id", "is", null),
    ]);
    setCartoes((cs ?? []) as Cartao[]);
    setContas((ks ?? []) as Conta[]);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const porCartao = useMemo(() => {
    const map = new Map<string, { aberto: number; pago: number; count: number }>();
    contas.forEach((c) => {
      if (!c.cartao_id) return;
      const cur = map.get(c.cartao_id) ?? { aberto: 0, pago: 0, count: 0 };
      if (c.pago) cur.pago += Number(c.valor);
      else cur.aberto += Number(c.valor);
      cur.count += 1;
      map.set(c.cartao_id, cur);
    });
    return map;
  }, [contas]);

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-6 animate-fade-in">
        <Link
          to="/perfil"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft size={16} /> Voltar
        </Link>

        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl text-foreground">Cartões</h1>
            <p className="text-sm text-muted-foreground">Controle seus cartões de crédito</p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setOpenForm(true);
            }}
            className="gradient-rose text-primary-foreground rounded-full h-10 px-4 shadow-rose"
          >
            <Plus size={16} className="mr-1" /> Novo
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>
        ) : cartoes.length === 0 ? (
          <div className="card-soft text-center py-10 flex flex-col items-center">
            <ThiingIcon name="wallet" size="md" float />
            <p className="font-serif text-lg text-foreground mt-3">Nenhum cartão ainda</p>
            <p className="text-sm text-muted-foreground italic max-w-[260px] mt-1 mb-4">
              Cadastre seus cartões para acompanhar limite e parcelas.
            </p>
            <Button
              onClick={() => {
                setEditing(null);
                setOpenForm(true);
              }}
              className="gradient-rose text-primary-foreground rounded-full"
            >
              <Plus size={16} className="mr-1" /> Adicionar cartão
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {cartoes.map((c) => {
              const stats = porCartao.get(c.id) ?? { aberto: 0, pago: 0, count: 0 };
              const disponivel = c.limite != null ? Number(c.limite) - stats.aberto : null;
              const pct = c.limite && Number(c.limite) > 0
                ? Math.min(100, (stats.aberto / Number(c.limite)) * 100)
                : 0;
              return (
                <li key={c.id} className="card-hero relative overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl gradient-rose text-white flex items-center justify-center shadow-rose shrink-0">
                        <CreditCard size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-serif text-xl text-foreground truncate">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.bandeira || "Cartão"}
                          {c.dia_vencimento ? ` · vence dia ${c.dia_vencimento}` : ""}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditing(c);
                        setOpenForm(true);
                      }}
                      className="text-muted-foreground hover:text-primary p-1"
                      aria-label="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>

                  {c.limite != null ? (
                    <div className="mt-4">
                      <div className="flex items-end justify-between mb-1">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Disponível
                        </p>
                        <p className="font-serif text-2xl text-rose-shimmer">
                          {formatBRL(disponivel ?? 0)}
                        </p>
                      </div>
                      <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
                        <div
                          className="h-full gradient-rose transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {formatBRL(stats.aberto)} usados de {formatBRL(Number(c.limite))}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-4">
                      Em aberto: <strong className="text-foreground">{formatBRL(stats.aberto)}</strong>
                      {stats.count > 0 && ` · ${stats.count} ${stats.count === 1 ? "lançamento" : "lançamentos"}`}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button
                      onClick={() => {
                        setCartaoGasto(c.id);
                        setOpenGasto(true);
                      }}
                      className="h-10 gradient-rose text-primary-foreground rounded-full text-sm font-semibold shadow-rose"
                    >
                      <Plus size={14} className="mr-1" /> Lançar gasto
                    </Button>
                    <Link
                      to={`/contas?cartao=${c.id}`}
                      className="h-10 rounded-full border border-primary/30 text-primary text-sm font-medium flex items-center justify-center hover:bg-primary-soft transition-colors"
                    >
                      <Receipt size={14} className="mr-1" /> Ver lançamentos
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <CartaoFormSheet
        open={openForm}
        onOpenChange={setOpenForm}
        cartao={editing}
        onSaved={carregar}
      />
      <GastoCartaoSheet
        open={openGasto}
        onOpenChange={(v) => {
          setOpenGasto(v);
          if (!v) setCartaoGasto(undefined);
        }}
        cartaoIdInicial={cartaoGasto}
        onSaved={carregar}
      />
    </AppShell>
  );
}
