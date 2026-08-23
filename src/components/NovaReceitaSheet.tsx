import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hojeISO } from "@/lib/finance";
import { useCategorias } from "@/hooks/useCategorias";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  descricao: z.string().trim().min(1, "Informe uma descrição").max(100),
  categoria: z.string().min(1, "Escolha uma categoria"),
  valor: z.number().positive("Valor deve ser maior que 0"),
  data_recebimento: z.string().min(1, "Informe a data"),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

/** Mantém compat com a coluna antiga `tipo` (salario/extra). */
function tipoFromCategoria(nome: string): "salario" | "extra" {
  return nome.toLowerCase() === "salário" || nome.toLowerCase() === "salario" ? "salario" : "extra";
}

export function NovaReceitaSheet({ open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const { categorias } = useCategorias("receita");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO());
  const [loading, setLoading] = useState(false);

  // Pré-seleciona "Salário" quando carregar
  useEffect(() => {
    if (!categoria && categorias.length) {
      setCategoria(categorias.find((c) => c.nome.toLowerCase() === "salário")?.nome ?? categorias[0].nome);
    }
  }, [categorias, categoria]);

  const reset = () => {
    setDescricao(""); setValor(""); setData(hojeISO()); setCategoria("");
  };

  const handleSave = async () => {
    if (!user) return;
    const parsed = schema.safeParse({
      descricao, categoria,
      valor: parseFloat(valor.replace(",", ".")),
      data_recebimento: data,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("receitas").insert({
      user_id: user.id,
      descricao: parsed.data.descricao,
      valor: parsed.data.valor,
      data_recebimento: parsed.data.data_recebimento,
      tipo: tipoFromCategoria(parsed.data.categoria),
      categoria: parsed.data.categoria,
    });
    setLoading(false);
    if (error) {
      toast.error("Não consegui salvar agora. Pode tentar de novo?");
      return;
    }
    toast.success("Nova receita adicionada. Seu saldo agradece 💚");
    reset();
    onOpenChange(false);
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-0 shadow-sheet max-w-[420px] mx-auto px-6 pt-6 pb-8 max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left mb-6">
          <SheetTitle className="font-serif text-2xl">Nova receita</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Salário de Janeiro" className="h-12 rounded-2xl" />
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
            <Input
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="h-12 rounded-2xl text-lg font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label>Data de recebimento</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-12 rounded-2xl" />
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full h-12 gradient-rose text-primary-foreground rounded-2xl font-semibold shadow-rose mt-2">
            {loading ? "Salvando…" : "Adicionar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
