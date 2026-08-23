import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  data_recebimento: z.string().min(1),
});

export interface EditavelReceita {
  id: string;
  descricao: string;
  categoria: string | null;
  tipo?: string;
  valor: number;
  data_recebimento: string;
}

function tipoFromCategoria(nome: string): "salario" | "extra" {
  return nome.toLowerCase() === "salário" || nome.toLowerCase() === "salario" ? "salario" : "extra";
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  receita: EditavelReceita | null;
}

export function EditarReceitaSheet({ open, onOpenChange, onSaved, receita }: Props) {
  const { categorias } = useCategorias("receita");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (receita && open) {
      setDescricao(receita.descricao);
      setCategoria(receita.categoria ?? (receita.tipo === "salario" ? "Salário" : "Renda extra"));
      setValor(String(receita.valor).replace(".", ","));
      setData(receita.data_recebimento);
    }
  }, [receita, open]);

  const handleSave = async () => {
    if (!receita) return;
    const parsed = schema.safeParse({
      descricao, categoria,
      valor: parseFloat(valor.replace(",", ".")),
      data_recebimento: data,
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);
    const { error } = await supabase.from("receitas").update({
      descricao: parsed.data.descricao,
      categoria: parsed.data.categoria,
      tipo: tipoFromCategoria(parsed.data.categoria),
      valor: parsed.data.valor,
      data_recebimento: parsed.data.data_recebimento,
    }).eq("id", receita.id);
    setLoading(false);
    if (error) { toast.error("Não consegui salvar agora. Pode tentar de novo?"); return; }
    toast.success("Receita atualizada ✨");
    onOpenChange(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (!receita) return;
    const { error } = await supabase.from("receitas").delete().eq("id", receita.id);
    if (error) { toast.error("Não consegui excluir agora."); return; }
    toast.success("Receita removida.");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-0 shadow-sheet max-w-[420px] mx-auto px-6 pt-6 pb-8 max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left mb-6">
          <SheetTitle className="font-serif text-2xl">Editar receita</SheetTitle>
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
            <Label>Data de recebimento</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-12 rounded-2xl" />
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full h-12 gradient-rose text-primary-foreground rounded-2xl font-semibold shadow-rose mt-2">
            {loading ? "Salvando…" : "Salvar alterações"}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full h-12 rounded-2xl border-destructive/40 text-destructive hover:bg-destructive/5">
                <Trash2 size={16} className="mr-2" /> Excluir esta receita
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-serif">Excluir esta receita?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}
