import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/finance";
import { Users, Sparkles, CheckCircle2, XCircle, DollarSign, TrendingUp, UserPlus, CreditCard } from "lucide-react";

type Stats = {
  total_usuarias: number;
  em_trial: number;
  ativas: number;
  expiradas: number;
  total_arrecadado: number;
  pagamentos_aprovados: number;
  mrr_estimado: number;
  novas_7d: number;
  novas_30d: number;
};

const Card = ({ icon: Icon, label, value, tone = "rose" }: any) => (
  <div className="bg-background rounded-2xl border border-border p-5">
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
        tone === "rose" ? "bg-primary-soft text-primary"
        : tone === "green" ? "bg-emerald-50 text-emerald-600"
        : tone === "amber" ? "bg-amber-50 text-amber-600"
        : "bg-muted text-muted-foreground"
      }`}>
        <Icon size={18} />
      </div>
    </div>
    <p className="font-serif text-3xl text-foreground">{value}</p>
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("admin_stats").then(({ data, error }) => {
      if (error) console.error(error);
      else setStats(data as unknown as Stats);
      setLoading(false);
    });
  }, []);

  return (
    <AdminLayout title="Dashboard" subtitle="Visão geral da Miva 💕">
      {loading || !stats ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <>
          {/* Receita */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card icon={DollarSign} label="Total arrecadado" value={formatBRL(stats.total_arrecadado)} tone="green" />
            <Card icon={TrendingUp} label="MRR estimado" value={formatBRL(stats.mrr_estimado)} tone="rose" />
            <Card icon={CreditCard} label="Pagamentos aprovados" value={stats.pagamentos_aprovados} tone="rose" />
          </section>

          {/* Usuárias */}
          <h2 className="font-serif text-xl text-foreground mb-3">Usuárias</h2>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card icon={Users} label="Total" value={stats.total_usuarias} />
            <Card icon={Sparkles} label="Em trial" value={stats.em_trial} tone="amber" />
            <Card icon={CheckCircle2} label="Ativas" value={stats.ativas} tone="green" />
            <Card icon={XCircle} label="Expiradas" value={stats.expiradas} tone="muted" />
          </section>

          {/* Crescimento */}
          <h2 className="font-serif text-xl text-foreground mb-3">Crescimento</h2>
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card icon={UserPlus} label="Novas (7 dias)" value={stats.novas_7d} tone="rose" />
            <Card icon={UserPlus} label="Novas (30 dias)" value={stats.novas_30d} tone="rose" />
          </section>
        </>
      )}
    </AdminLayout>
  );
}
