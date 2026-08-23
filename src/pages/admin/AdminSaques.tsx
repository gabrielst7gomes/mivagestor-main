import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatBRL, formatDataLonga } from "@/lib/finance";
import { Copy, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Saque {
  id: string;
  user_id: string;
  email: string;
  nome: string | null;
  valor: number;
  chave_pix: string;
  tipo_chave: string;
  status: "solicitado" | "pago" | "recusado";
  observacao_admin: string | null;
  pago_em: string | null;
  created_at: string;
}

const STATUS: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  solicitado: { label: "Aguardando", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock size={12} /> },
  pago: { label: "Pago", cls: "bg-success/10 text-success border-success/30", icon: <Check size={12} /> },
  recusado: { label: "Recusado", cls: "bg-destructive/10 text-destructive border-destructive/30", icon: <X size={12} /> },
};

export default function AdminSaques() {
  const [saques, setSaques] = useState<Saque[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Saque | null>(null);
  const [obs, setObs] = useState("");
  const [novoStatus, setNovoStatus] = useState<"pago" | "recusado">("pago");

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_listar_saques");
    if (error) toast.error(error.message);
    setSaques((data ?? []) as Saque[]);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const copiar = async (txt: string) => {
    await navigator.clipboard.writeText(txt);
    toast.success("Copiado!");
  };

  const salvar = async () => {
    if (!editing) return;
    const { error } = await supabase.rpc("admin_atualizar_saque", {
      _saque_id: editing.id,
      _novo_status: novoStatus,
      _observacao: obs || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Saque atualizado!");
    setEditing(null); setObs("");
    carregar();
  };

  const pendentes = saques.filter((s) => s.status === "solicitado").length;

  return (
    <AdminLayout title="Saques PIX" subtitle={`${pendentes} aguardando aprovação`}>
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : saques.length === 0 ? (
        <div className="card-soft text-center py-10">
          <p className="text-sm text-muted-foreground">Nenhum saque solicitado ainda.</p>
        </div>
      ) : (
        <div className="bg-background rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Usuária</th>
                <th className="text-right px-4 py-3">Valor</th>
                <th className="text-left px-4 py-3">Chave PIX</th>
                <th className="text-left px-4 py-3">Solicitado</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {saques.map((s) => {
                const st = STATUS[s.status];
                return (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{s.nome || "—"}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatBRL(Number(s.valor))}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs uppercase text-muted-foreground">{s.tipo_chave}</span>
                        <code className="text-xs">{s.chave_pix}</code>
                        <button onClick={() => copiar(s.chave_pix)} className="text-muted-foreground hover:text-primary">
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDataLonga(s.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-1 rounded-full border inline-flex items-center gap-1", st.cls)}>
                        {st.icon} {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.status === "solicitado" && (
                        <Button
                          size="sm"
                          onClick={() => { setEditing(s); setObs(""); setNovoStatus("pago"); }}
                          className="rounded-full h-8 gradient-rose text-primary-foreground"
                        >
                          Gerenciar
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Atualizar saque</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-xl p-3 text-sm">
                <p><strong>{editing.nome}</strong> — {editing.email}</p>
                <p className="text-lg font-semibold text-primary mt-1">{formatBRL(Number(editing.valor))}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PIX ({editing.tipo_chave}): <code>{editing.chave_pix}</code>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Novo status</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={novoStatus === "pago" ? "default" : "outline"}
                    onClick={() => setNovoStatus("pago")}
                    className={cn("rounded-full", novoStatus === "pago" && "gradient-rose text-primary-foreground")}
                  >
                    <Check size={14} className="mr-1" /> Pago
                  </Button>
                  <Button
                    type="button"
                    variant={novoStatus === "recusado" ? "default" : "outline"}
                    onClick={() => setNovoStatus("recusado")}
                    className="rounded-full"
                  >
                    <X size={14} className="mr-1" /> Recusar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observação (opcional)</Label>
                <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex: Pago em 26/04" />
              </div>

              <Button onClick={salvar} className="w-full rounded-full h-11 gradient-rose text-primary-foreground">
                Salvar
              </Button>
              {novoStatus === "recusado" && (
                <p className="text-xs text-muted-foreground text-center">
                  Ao recusar, o saldo é devolvido para a usuária.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
