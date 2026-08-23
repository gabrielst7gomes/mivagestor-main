import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/finance";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Plus, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { toast } from "sonner";

type Usuaria = {
  id: string;
  email: string;
  nome: string | null;
  whatsapp: string | null;
  criado_em: string;
  status: string | null;
  trial_fim: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  metodo: string | null;
  valor: number | null;
  total_pago: number;
};

const fmtData = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";

const statusBadge = (s: string | null, fim: string | null) => {
  const ativo = fim ? new Date(fim) >= new Date(new Date().toDateString()) : false;
  if (s === "trial" && ativo) return { label: "Trial", cls: "bg-amber-50 text-amber-700" };
  if (s === "ativa" && ativo) return { label: "Ativa", cls: "bg-emerald-50 text-emerald-700" };
  if (s === "cancelada") return { label: "Cancelada", cls: "bg-muted text-muted-foreground" };
  return { label: "Expirada", cls: "bg-destructive/10 text-destructive" };
};

export default function AdminUsuarias() {
  const [items, setItems] = useState<Usuaria[]>([]);
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Usuaria | null>(null);
  const [dias, setDias] = useState(30);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_listar_usuarias");
    if (error) console.error(error);
    setItems((data ?? []) as Usuaria[]);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const filtrado = items.filter((u) => {
    const q = filtro.toLowerCase().trim();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.nome ?? "").toLowerCase().includes(q) ||
      (u.whatsapp ?? "").includes(q)
    );
  });

  const acao = async (rpc: "admin_estender_trial" | "admin_ativar_plano" | "admin_cancelar_plano", params: any, msg: string) => {
    const { error } = await supabase.rpc(rpc, params);
    if (error) {
      console.error(error);
      toast.error("Não consegui executar.");
      return;
    }
    toast.success(msg);
    setEditing(null);
    carregar();
  };

  return (
    <AdminLayout title="Usuárias" subtitle={`${items.length} cadastradas`}>
      <div className="bg-background rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou WhatsApp"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="h-10 pl-9 rounded-xl"
            />
          </div>
          <p className="text-sm text-muted-foreground ml-auto">{filtrado.length} resultados</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Usuária</th>
                <th className="text-left px-4 py-3 font-medium">WhatsApp</th>
                <th className="text-left px-4 py-3 font-medium">Cadastro</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Vence em</th>
                <th className="text-right px-4 py-3 font-medium">Total pago</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Carregando…</td></tr>
              ) : filtrado.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Nenhuma usuária encontrada.</td></tr>
              ) : (
                filtrado.map((u) => {
                  const fim = u.status === "trial" ? u.trial_fim : u.periodo_fim;
                  const badge = statusBadge(u.status, fim);
                  return (
                    <tr key={u.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{u.nome ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.whatsapp ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtData(u.criado_em)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtData(fim)}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{formatBRL(Number(u.total_pago))}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditing(u); setDias(30); }}
                          className="h-8 rounded-full"
                        >
                          Gerenciar
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              Gerenciar assinatura
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="text-sm">
                <p className="font-medium text-foreground">{editing.nome ?? "—"}</p>
                <p className="text-muted-foreground">{editing.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-xl">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium text-foreground capitalize">{editing.status ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vence em</p>
                  <p className="font-medium text-foreground">
                    {fmtData(editing.status === "trial" ? editing.trial_fim : editing.periodo_fim)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Dias</label>
                <Input
                  type="number"
                  value={dias}
                  min={1}
                  onChange={(e) => setDias(Math.max(1, Number(e.target.value) || 0))}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Button
                  onClick={() => acao("admin_estender_trial", { _user_id: editing.id, _dias: dias }, "Trial estendido")}
                  className="h-11 gradient-rose text-primary-foreground rounded-xl"
                >
                  <Plus size={16} className="mr-1" /> Estender trial em {dias} dias
                </Button>
                <Button
                  variant="outline"
                  onClick={() => acao("admin_ativar_plano", { _user_id: editing.id, _dias: dias }, "Plano ativado")}
                  className="h-11 rounded-xl"
                >
                  <CheckCircle2 size={16} className="mr-1" /> Ativar plano por {dias} dias
                </Button>
                <Button
                  variant="outline"
                  onClick={() => acao("admin_cancelar_plano", { _user_id: editing.id }, "Plano cancelado")}
                  className="h-11 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/5"
                >
                  <XCircle size={16} className="mr-1" /> Cancelar plano
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
