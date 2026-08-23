import { useEffect, useState } from "react";
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
import { CreditCard, Plus } from "lucide-react";

type Cartao = {
  id: string;
  nome: string;
  bandeira: string | null;
  limite: number | null;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
};

const schema = z.object({
  descricao: z.string().trim().min(1, "Informe uma descrição").max(100),
  categoria: z.string().min(1, "Escolha uma categoria"),
  valor: z.number().positive("Valor deve ser maior que 0"),
  cartao_id: z.string().min(1, "Escolha um cartão"),
  primeira_parcela: z.string().min(1, "Informe a data"),
  parcelas: z.number().int().min(1).max(60),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
  cartaoIdInicial?: string;
}

const addMonths = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1 + n, d);
  // Ajuste para meses curtos (ex: 31 jan + 1 mês = 28/29 fev)
  if (dt.getDate() !== d) dt.setDate(0);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

const proximaDataVencimento = (diaVenc: number | null, diaFech: number | null) => {
  if (!diaVenc) return hojeISO();
  const hoje = new Date();
  const diaHoje = hoje.getDate();
  
  // Se o cartão fecha dia 05 e hoje é dia 05 ou depois, o lançamento vai para o mês seguinte.
  // Se não houver dia de fechamento definido, assumimos que fecha 7 dias antes do vencimento
  const fechamentoReal = diaFech || (diaVenc > 7 ? diaVenc - 7 : 30 - (7 - diaVenc));
  
  let mesOffset = 0;
  if (diaHoje >= fechamentoReal) {
    mesOffset = 1;
  }

  let target = new Date(hoje.getFullYear(), hoje.getMonth() + mesOffset, diaVenc);
  
  // Se a data calculada for hoje ou no passado (ex: hoje é dia 04, vence dia 05, mas já fechou mês passado)
  // Ajustamos para garantir que seja no futuro ou no próximo vencimento disponível
  if (target <= hoje) {
    target = new Date(hoje.getFullYear(), hoje.getMonth() + mesOffset + 1, diaVenc);
  }

  if (target.getDate() !== diaVenc) target.setDate(0);
  const yy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

export function GastoCartaoSheet({ open, onOpenChange, onSaved, cartaoIdInicial }: Props) {
  const { user } = useAuth();
  const { categorias } = useCategorias("conta");
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");
  const [cartaoId, setCartaoId] = useState(cartaoIdInicial ?? "");
  const [primeiraData, setPrimeiraData] = useState(hojeISO());
  const [parcelas, setParcelas] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from("cartoes")
      .select("id, nome, bandeira, limite, dia_vencimento, dia_fechamento")
      .eq("user_id", user.id)
      .order("ordem")
      .order("created_at")
      .then(({ data }) => {
        const lista = (data ?? []) as Cartao[];
        setCartoes(lista);
        if (!cartaoId && lista.length > 0) {
          const inicial = cartaoIdInicial && lista.find((c) => c.id === cartaoIdInicial)
            ? cartaoIdInicial
            : lista[0].id;
          setCartaoId(inicial);
        }
      });
  }, [open, user, cartaoIdInicial]);

  // Quando troca o cartão, sugere a próxima data de vencimento dele
  useEffect(() => {
    const c = cartoes.find((x) => x.id === cartaoId);
    if (c) setPrimeiraData(proximaDataVencimento(c.dia_vencimento, c.dia_fechamento));
  }, [cartaoId, cartoes]);

  const reset = () => {
    setDescricao("");
    setCategoria("");
    setValor("");
    setParcelas(1);
  };

  const valorNum = parseFloat(valor.replace(",", ".")) || 0;
  const valorParcela = parcelas > 0 ? valorNum / parcelas : 0;
  const cartaoSel = cartoes.find((c) => c.id === cartaoId);

  const handleSave = async () => {
    if (!user) return;
    const parsed = schema.safeParse({
      descricao,
      categoria,
      valor: valorNum,
      cartao_id: cartaoId,
      primeira_parcela: primeiraData,
      parcelas,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const grupo = crypto.randomUUID();
    const valorParc = Math.round((parsed.data.valor / parsed.data.parcelas) * 100) / 100;

    const linhas = Array.from({ length: parsed.data.parcelas }, (_, i) => ({
      user_id: user.id,
      descricao:
        parsed.data.parcelas > 1
          ? `${parsed.data.descricao} (${i + 1}/${parsed.data.parcelas})`
          : parsed.data.descricao,
      categoria: parsed.data.categoria,
      valor: valorParc,
      data_vencimento: addMonths(parsed.data.primeira_parcela, i),
      cartao_id: parsed.data.cartao_id,
      parcelas_total: parsed.data.parcelas,
      parcela_atual: i + 1,
      compra_grupo_id: grupo,
      recorrente: false,
      pago: false,
    }));

    const { error } = await supabase.from("contas").insert(linhas);
    setLoading(false);
    if (error) {
      console.error(error);
      toast.error("Não consegui salvar agora.");
      return;
    }
    toast.success(
      parsed.data.parcelas > 1
        ? `Compra parcelada em ${parsed.data.parcelas}x salva 💕`
        : "Gasto lançado no cartão 💕"
    );
    reset();
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-0 shadow-sheet max-w-[420px] mx-auto px-6 pt-6 pb-8 max-h-[92vh] overflow-y-auto"
      >
        <SheetHeader className="text-left mb-6">
          <SheetTitle className="font-serif text-2xl flex items-center gap-2">
            <CreditCard size={22} className="text-primary" /> Gasto no cartão
          </SheetTitle>
        </SheetHeader>

        {cartoes.length === 0 ? (
          <div className="card-soft text-center py-8">
            <p className="font-medium text-foreground mb-2">Nenhum cartão cadastrado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Cadastre um cartão primeiro para lançar gastos.
            </p>
            <Button
              onClick={() => onOpenChange(false)}
              className="gradient-rose text-primary-foreground rounded-full"
            >
              <Plus size={16} className="mr-1" /> Ir para Cartões
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cartão</Label>
              <Select value={cartaoId} onValueChange={setCartaoId}>
                <SelectTrigger className="h-12 rounded-2xl">
                  <SelectValue placeholder="Escolha o cartão" />
                </SelectTrigger>
                <SelectContent>
                  {cartoes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      💳 {c.nome}
                      {c.bandeira ? ` · ${c.bandeira}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Tênis novo"
                className="h-12 rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="h-12 rounded-2xl">
                  <SelectValue placeholder="Escolha uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.nome}>
                      <span className="mr-2">{c.emoji}</span>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor total</Label>
                <Input
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  className="h-12 rounded-2xl text-lg font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={parcelas}
                  onChange={(e) => setParcelas(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                  className="h-12 rounded-2xl text-center"
                />
              </div>
            </div>

            {parcelas > 1 && valorNum > 0 && (
              <p className="text-xs text-muted-foreground -mt-2">
                {parcelas}x de <strong>R$ {valorParcela.toFixed(2).replace(".", ",")}</strong>
              </p>
            )}

            <div className="space-y-2">
              <Label>1ª parcela vence em</Label>
              <Input
                type="date"
                value={primeiraData}
                onChange={(e) => setPrimeiraData(e.target.value)}
                className="h-12 rounded-2xl"
              />
              {cartaoSel?.dia_vencimento && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Vencimento: dia {cartaoSel.dia_vencimento}
                    {cartaoSel.dia_fechamento && ` · Fechamento: dia ${cartaoSel.dia_fechamento}`}
                  </p>
                  {new Date().getDate() >= (cartaoSel.dia_fechamento || 0) && cartaoSel.dia_fechamento && (
                    <p className="text-[10px] text-amber-600 font-medium">
                      Fatura fechada. Lançamento sugerido para o próximo mês.
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={loading}
              className="w-full h-12 gradient-rose text-primary-foreground rounded-2xl font-semibold shadow-rose mt-2"
            >
              {loading ? "Salvando…" : "Lançar no cartão"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
