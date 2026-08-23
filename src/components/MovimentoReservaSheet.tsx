import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { hojeISO } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function MovimentoReservaSheet({
  open,
  onOpenChange,
  onSaved,
  reservaId,
  reservaNome,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  reservaId: string | null;
  reservaNome?: string;
}) {
  const { user } = useAuth();
  const [tipo, setTipo] = useState<"aporte" | "resgate">("aporte");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO());
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTipo("aporte");
    setValor("");
    setData(hojeISO());
    setObservacao("");
  }, [open]);

  const salvar = async () => {
    if (!user || !reservaId) return;
    const v = Number(valor.replace(",", "."));
    if (!v || v <= 0) {
      toast.error("Informe um valor válido 💕");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("reserva_movimentos").insert({
      user_id: user.id,
      reserva_id: reservaId,
      tipo,
      valor: v,
      data,
      observacao: observacao.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Não consegui salvar agora. Pode tentar de novo?");
      return;
    }
    toast.success(tipo === "aporte" ? "Guardado com carinho ✨" : "Resgate registrado");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl">Movimentar</SheetTitle>
          {reservaNome && <p className="text-sm text-muted-foreground text-left">{reservaNome}</p>}
        </SheetHeader>

        <div className="space-y-4 mt-5">
          <div className="grid grid-cols-2 gap-2">
            {(["aporte", "resgate"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={cn(
                  "rounded-2xl border py-3 text-sm font-medium transition-colors",
                  tipo === t
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-muted-foreground"
                )}
              >
                {t === "aporte" ? "Guardar" : "Resgatar"}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Valor</Label>
            <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>

          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: sobra do mês" />
          </div>

          <Button onClick={salvar} disabled={saving} className="w-full gradient-rose text-primary-foreground">
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
