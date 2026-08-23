import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/finance";
import { Input } from "@/components/ui/input";
import { Search, QrCode, CreditCard } from "lucide-react";

type Pagamento = {
  id: string;
  user_id: string;
  email: string;
  nome: string | null;
  valor: number;
  metodo: string;
  status: string;
  pago_em: string | null;
  created_at: string;
  cobranca_de: string | null;
  cobranca_ate: string | null;
};

const fmtData = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const statusBadge = (s: string) => {
  if (s === "aprovado") return { label: "Aprovado", cls: "bg-emerald-50 text-emerald-700" };
  if (s === "pendente") return { label: "Pendente", cls: "bg-amber-50 text-amber-700" };
  if (s === "rejeitado" || s === "cancelado") return { label: s, cls: "bg-destructive/10 text-destructive" };
  return { label: s, cls: "bg-muted text-muted-foreground" };
};

export default function AdminPagamentos() {
  const [items, setItems] = useState<Pagamento[]>([]);
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("admin_listar_pagamentos").then(({ data, error }) => {
      if (error) console.error(error);
      setItems((data ?? []) as Pagamento[]);
      setLoading(false);
    });
  }, []);

  const filtrado = items.filter((p) => {
    const q = filtro.toLowerCase().trim();
    if (!q) return true;
    return (
      p.email.toLowerCase().includes(q) ||
      (p.nome ?? "").toLowerCase().includes(q) ||
      p.metodo.includes(q) ||
      p.status.includes(q)
    );
  });

  const totais = useMemo(() => {
    const aprov = filtrado.filter((p) => p.status === "aprovado");
    return {
      total: aprov.reduce((s, p) => s + Number(p.valor), 0),
      qtd: aprov.length,
    };
  }, [filtrado]);

  return (
    <AdminLayout title="Pagamentos" subtitle="Histórico completo de transações">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-background rounded-2xl border border-border p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total aprovado (filtro)</p>
          <p className="font-serif text-3xl text-foreground mt-2">{formatBRL(totais.total)}</p>
        </div>
        <div className="bg-background rounded-2xl border border-border p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Pagamentos aprovados</p>
          <p className="font-serif text-3xl text-foreground mt-2">{totais.qtd}</p>
        </div>
        <div className="bg-background rounded-2xl border border-border p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total registros</p>
          <p className="font-serif text-3xl text-foreground mt-2">{filtrado.length}</p>
        </div>
      </div>

      <div className="bg-background rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuária, método ou status"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="h-10 pl-9 rounded-xl"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Usuária</th>
                <th className="text-left px-4 py-3 font-medium">Método</th>
                <th className="text-right px-4 py-3 font-medium">Valor</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Pago em</th>
                <th className="text-left px-4 py-3 font-medium">Criado em</th>
                <th className="text-left px-4 py-3 font-medium">Período</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Carregando…</td></tr>
              ) : filtrado.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Nenhum pagamento.</td></tr>
              ) : (
                filtrado.map((p) => {
                  const badge = statusBadge(p.status);
                  const Icon = p.metodo === "pix" ? QrCode : CreditCard;
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{p.nome ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground capitalize">
                          <Icon size={14} /> {p.metodo === "pix" ? "Pix" : "Cartão"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{formatBRL(Number(p.valor))}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtData(p.pago_em)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtData(p.created_at)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {p.cobranca_de && p.cobranca_ate
                          ? `${fmtData(p.cobranca_de)} → ${fmtData(p.cobranca_ate)}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
