import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  data_vencimento: z.string().min(1, "Informe a data"),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function NovaContaSheet({ open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const { categorias } = useCategorias("conta");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO());
  const [recorrente, setRecorrente] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setDescricao(""); setCategoria(""); setValor(""); setData(hojeISO()); setRecorrente(false);
  };

  const handleSave = async () => {
    if (!user) return;
    const parsed = schema.safeParse({
      descricao, categoria,
      valor: parseFloat(valor.replace(",", ".")),
      data_vencimento: data,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("contas").insert({
      user_id: user.id,
      descricao: parsed.data.descricao,
      categoria: parsed.data.categoria,
      valor: parsed.data.valor,
      data_vencimento: parsed.data.data_vencimento,
      recorrente,
    });
    setLoading(false);
    if (error) {
      console.error("Erro ao salvar conta:", error);
      toast.error(error.message || "Não consegui salvar agora. Pode tentar de novo?");
      return;
    }
    // Se a conta foi criada em outro mês, avisa para evitar confusão
    const hoje = new Date();
    const [y, m] = parsed.data.data_vencimento.split("-").map(Number);
    const mesmoMes = y === hoje.getFullYear() && m === hoje.getMonth() + 1;
    if (mesmoMes) {
      toast.success("Conta adicionada à sua lista ✨");
    } else {
      const nomeMes = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      toast.success(`Conta salva para ${nomeMes} 💕 — você pode ver trocando o mês.`);
    }
    reset();
    onOpenChange(false);
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-0 shadow-sheet max-w-[420px] mx-auto px-6 pt-6 pb-8 max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left mb-6">
          <SheetTitle className="font-serif text-2xl">Nova conta</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Aluguel" className="h-12 rounded-2xl" />
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

          <Button onClick={handleSave} disabled={loading} className="w-full h-12 gradient-rose text-primary-foreground rounded-2xl font-semibold shadow-rose mt-2">
            {loading ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
