import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategorias } from "@/hooks/useCategorias";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

const schema = z.object({
  descricao: z.string().trim().min(1).max(100),
  categoria: z.string().min(1),
  valor: z.number().positive(),
  data_vencimento: z.string().min(1),
});

export interface EditavelConta {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data_vencimento: string;
  recorrente?: boolean;
  compra_grupo_id?: string | null;
  parcelas_total?: number | null;
  origem_recorrente_id?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  conta: EditavelConta | null;
}

export function EditarContaSheet({ open, onOpenChange, onSaved, conta }: Props) {
  const { categorias } = useCategorias("conta");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState("");
  const [recorrente, setRecorrente] = useState(false);
  const [aplicarTodas, setAplicarTodas] = useState(false);
  const [loading, setLoading] = useState(false);

  const parceladaEmGrupo = !!conta?.compra_grupo_id && (conta?.parcelas_total ?? 1) > 1;
  const raizRecorrente = conta?.recorrente ? (conta.origem_recorrente_id ?? conta.id) : null;
  const temGrupo = parceladaEmGrupo || !!raizRecorrente;

  useEffect(() => {
    if (conta && open) {
      setDescricao(conta.descricao);
      setCategoria(conta.categoria);
      setValor(String(conta.valor).replace(".", ","));
      setData(conta.data_vencimento);
      setRecorrente(!!conta.recorrente);
      setAplicarTodas(false);
    }
  }, [conta, open]);

  const handleSave = async () => {
    if (!conta) return;
    const parsed = schema.safeParse({
      descricao, categoria,
      valor: parseFloat(valor.replace(",", ".")),
      data_vencimento: data,
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);

    let error = null;
    if (aplicarTodas && temGrupo) {
      // Atualiza descrição/categoria/valor de todo o lançamento (mantendo as datas de cada parcela)
      const base = {
        categoria: parsed.data.categoria,
        valor: parsed.data.valor,
        recorrente,
      };
      if (parceladaEmGrupo) {
        const { data: irmas } = await supabase
          .from("contas")
          .select("id, parcela_atual, parcelas_total")
          .eq("compra_grupo_id", conta.compra_grupo_id!)
          .order("parcela_atual");
        for (const p of irmas ?? []) {
          const desc = (p.parcelas_total ?? 1) > 1
            ? `${parsed.data.descricao} (${p.parcela_atual}/${p.parcelas_total})`
            : parsed.data.descricao;
          const res = await supabase.from("contas").update({ ...base, descricao: desc }).eq("id", p.id);
          if (res.error) error = res.error;
        }
      } else {
        const res = await supabase
          .from("contas")
          .update({ ...base, descricao: parsed.data.descricao })
          .or(`id.eq.${raizRecorrente},origem_recorrente_id.eq.${raizRecorrente}`);
        error = res.error;
      }
    } else {
      const res = await supabase.from("contas").update({
        descricao: parsed.data.descricao,
        categoria: parsed.data.categoria,
        valor: parsed.data.valor,
        data_vencimento: parsed.data.data_vencimento,
        recorrente,
      }).eq("id", conta.id);
      error = res.error;
    }

    setLoading(false);
    if (error) { toast.error("Não consegui salvar agora. Pode tentar de novo?"); return; }
    toast.success(aplicarTodas && temGrupo ? "Lançamento atualizado ✨" : "Conta atualizada ✨");
    onOpenChange(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (!conta) return;
    const { error } = await supabase.from("contas").delete().eq("id", conta.id);
    if (error) { toast.error("Não consegui excluir agora."); return; }
    toast.success("Conta removida.");
    onOpenChange(false);
    onSaved();
  };

  const handleDeleteTodas = async () => {
    if (!conta) return;
    let error = null;
    if (parceladaEmGrupo) {
      const res = await supabase.from("contas").delete().eq("compra_grupo_id", conta.compra_grupo_id!);
      error = res.error;
    } else if (raizRecorrente) {
      const res = await supabase
        .from("contas")
        .delete()
        .or(`id.eq.${raizRecorrente},origem_recorrente_id.eq.${raizRecorrente}`);
      error = res.error;
    }
    if (error) { toast.error("Não consegui excluir agora."); return; }
    toast.success("Lançamento inteiro removido.");
    onOpenChange(false);
    onSaved();
  };


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-0 shadow-sheet max-w-[420px] mx-auto px-6 pt-6 pb-8 max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left mb-6">
          <SheetTitle className="font-serif text-2xl">Editar conta</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} className="h-12 rounded-2xl" />
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder="Escolha uma categoria" /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.nome}>
                    <span className="mr-2">{c.emoji}</span>{c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor</Label>
            <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className="h-12 rounded-2xl text-lg font-semibold" />
          </div>

          <div className="space-y-2">
            <Label>Data de vencimento</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-12 rounded-2xl" />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-primary/5 p-4">
            <div>
              <p className="font-medium">Conta fixa/recorrente</p>
              <p className="text-xs text-muted-foreground">Replicar nos próximos meses</p>
            </div>
            <Switch checked={recorrente} onCheckedChange={setRecorrente} />
          </div>

          {temGrupo && (
            <div className="flex items-center justify-between rounded-2xl bg-primary/5 p-4">
              <div className="pr-3">
                <p className="font-medium">Aplicar em todo o lançamento</p>
                <p className="text-xs text-muted-foreground">
                  {parceladaEmGrupo
                    ? `Altera as ${conta?.parcelas_total} parcelas (a data de cada uma é mantida)`
                    : "Altera todos os meses dessa conta fixa"}
                </p>
              </div>
              <Switch checked={aplicarTodas} onCheckedChange={setAplicarTodas} />
            </div>
          )}

          <Button onClick={handleSave} disabled={loading} className="w-full h-12 gradient-rose text-primary-foreground rounded-2xl font-semibold shadow-rose mt-2">
            {loading ? "Salvando…" : "Salvar alterações"}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full h-12 rounded-2xl border-destructive/40 text-destructive hover:bg-destructive/5">
                <Trash2 size={16} className="mr-2" /> {temGrupo ? "Excluir só esta parcela" : "Excluir esta conta"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-serif">Excluir esta conta?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {temGrupo && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full h-12 rounded-2xl border-destructive/40 text-destructive hover:bg-destructive/5">
                  <Trash2 size={16} className="mr-2" />
                  {parceladaEmGrupo ? `Excluir todas as ${conta?.parcelas_total} parcelas` : "Excluir todos os meses"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-serif">Excluir o lançamento inteiro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {parceladaEmGrupo
                      ? `Todas as ${conta?.parcelas_total} parcelas serão removidas, inclusive as já pagas.`
                      : "Todos os meses dessa conta fixa serão removidos."} Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteTodas} className="bg-destructive hover:bg-destructive/90">Excluir tudo</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
