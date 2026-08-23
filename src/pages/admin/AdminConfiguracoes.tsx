import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminConfiguracoes() {
  const [percent, setPercent] = useState("30");
  const [minimo, setMinimo] = useState("100");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("system_settings").select("chave, valor");
      if (data) {
        const p = data.find((s: any) => s.chave === "recompensa_indicacao_percent");
        const m = data.find((s: any) => s.chave === "saque_minimo");
        if (p) setPercent(String(p.valor));
        if (m) setMinimo(String(m.valor));
      }
      setLoading(false);
    })();
  }, []);

  const salvar = async () => {
    const p = Number(percent);
    const m = Number(minimo);
    if (isNaN(p) || p < 0 || p > 100) { toast.error("Percentual deve estar entre 0 e 100"); return; }
    if (isNaN(m) || m < 0) { toast.error("Saque mínimo inválido"); return; }

    setSaving(true);
    const { error: e1 } = await supabase
      .from("system_settings")
      .update({ valor: p as any, updated_at: new Date().toISOString() })
      .eq("chave", "recompensa_indicacao_percent");
    const { error: e2 } = await supabase
      .from("system_settings")
      .update({ valor: m as any, updated_at: new Date().toISOString() })
      .eq("chave", "saque_minimo");
    setSaving(false);
    if (e1 || e2) { toast.error("Erro ao salvar"); return; }
    toast.success("Configurações atualizadas!");
  };

  return (
    <AdminLayout title="Configurações" subtitle="Ajustes do programa de indicações">
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="max-w-xl space-y-5">
          <div className="card-soft space-y-4">
            <h2 className="font-serif text-lg text-foreground">Programa de indicações</h2>

            <div className="space-y-2">
              <Label>Percentual de recompensa (%)</Label>
              <Input
                type="number" min={0} max={100} step="0.01"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className="h-11 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                % do valor da mensalidade que vira crédito para quem indicou.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Saque mínimo (R$)</Label>
              <Input
                type="number" min={0} step="0.01"
                value={minimo}
                onChange={(e) => setMinimo(e.target.value)}
                className="h-11 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Valor mínimo que a usuária precisa acumular para solicitar saque PIX.
              </p>
            </div>

            <Button
              onClick={salvar}
              disabled={saving}
              className="rounded-full gradient-rose text-primary-foreground"
            >
              {saving ? "Salvando…" : "Salvar configurações"}
            </Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
