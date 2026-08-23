import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ReservaEditavel {
  id: string;
  nome: string;
  meta: number | null;
  tipo: string;
}

const TIPOS = [
  { value: "guardado", label: "💰 Dinheiro guardado" },
  { value: "emergencia", label: "🛟 Reserva de emergência" },
  { value: "meta", label: "🎯 Meta / sonho" },
  { value: "investimento", label: "📈 Investimento" },
];

export function NovaReservaSheet({
  open,
  onOpenChange,
  onSaved,
  reserva,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  reserva?: ReservaEditavel | null;
}) {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [meta, setMeta] = useState("");
  const [tipo, setTipo] = useState("guardado");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome(reserva?.nome ?? "");
    setMeta(reserva?.meta ? String(reserva.meta) : "");
    setTipo(reserva?.tipo ?? "guardado");
  }, [open, reserva]);

  const salvar = async () => {
    if (!user) return;
    if (!nome.trim()) {
      toast.error("Dá um nome pra sua reserva 💕");
      return;
    }
    setSaving(true);
    const payload = {
      nome: nome.trim(),
      meta: meta ? Number(meta.replace(",", ".")) : null,
      tipo,
    };
    const { error } = reserva
      ? await supabase.from("reservas").update(payload).eq("id", reserva.id)
      : await supabase.from("reservas").insert({ ...payload, user_id: user.id });
    setSaving(false);
    if (error) {
      toast.error("Não consegui salvar agora. Pode tentar de novo?");
      return;
    }
    toast.success(reserva ? "Reserva atualizada ✨" : "Reserva criada ✨");
    onOpenChange(false);
    onSaved();
  };

  const excluir = async () => {
    if (!reserva) return;
    setSaving(true);
    const { error } = await supabase.from("reservas").delete().eq("id", reserva.id);
    setSaving(false);
    if (error) {
      toast.error("Não consegui excluir agora.");
      return;
    }
    toast.success("Reserva removida");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl">
            {reserva ? "Editar reserva" : "Nova reserva"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-5">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Viagem, Emergência, Tesouro Direto" />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Meta (opcional)</Label>
            <Input
              inputMode="decimal"
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
              placeholder="Ex: 5000"
            />
          </div>

          <Button onClick={salvar} disabled={saving} className="w-full gradient-rose text-primary-foreground">
            {saving ? "Salvando…" : "Salvar"}
          </Button>

          {reserva && (
            <Button onClick={excluir} disabled={saving} variant="ghost" className="w-full text-destructive">
              Excluir reserva
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
