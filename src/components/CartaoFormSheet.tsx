import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type CartaoLite = {
  id?: string;
  nome: string;
  bandeira: string | null;
  limite: number | null;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cartao?: CartaoLite | null;
  onSaved?: () => void;
}

const empty: CartaoLite = {
  nome: "",
  bandeira: "",
  limite: null,
  dia_fechamento: null,
  dia_vencimento: null,
};

export function CartaoFormSheet({ open, onOpenChange, cartao, onSaved }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<CartaoLite>(empty);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) setForm(cartao ?? empty);
  }, [open, cartao]);

  const handleSave = async () => {
    if (!user) return;
    if (!form.nome.trim()) {
      toast.error("Dá um nomezinho pro cartão 💕");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      nome: form.nome.trim(),
      bandeira: form.bandeira?.trim() || null,
      limite: form.limite,
      dia_fechamento: form.dia_fechamento,
      dia_vencimento: form.dia_vencimento,
    };
    const res = cartao?.id
      ? await supabase.from("cartoes").update(payload).eq("id", cartao.id)
      : await supabase.from("cartoes").insert(payload);
    setSaving(false);
    if (res.error) {
      toast.error("Não consegui salvar agora.");
      return;
    }
    toast.success(cartao?.id ? "Cartão atualizado" : "Cartão adicionado ✨");
    onSaved?.();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!cartao?.id) return;
    if (!confirm("Excluir este cartão? Os lançamentos ficarão sem vínculo.")) return;
    setDeleting(true);
    // Solta o vínculo das contas
    await supabase.from("contas").update({ cartao_id: null }).eq("cartao_id", cartao.id);
    const { error } = await supabase.from("cartoes").delete().eq("id", cartao.id);
    setDeleting(false);
    if (error) {
      toast.error("Não consegui excluir.");
      return;
    }
    toast.success("Cartão removido");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl">
            {cartao?.id ? "Editar cartão" : "Novo cartão"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4 pb-6">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Nubank Roxinho"
              className="h-12 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Bandeira (opcional)</Label>
            <Input
              value={form.bandeira ?? ""}
              onChange={(e) => setForm({ ...form, bandeira: e.target.value })}
              placeholder="Visa, Mastercard…"
              className="h-12 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Limite (opcional)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={form.limite ?? ""}
              onChange={(e) =>
                setForm({ ...form, limite: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="R$ 0,00"
              className="h-12 rounded-2xl"
            />
            <p className="text-xs text-muted-foreground">
              Deixe em branco se não quiser controlar o saldo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fechamento</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={form.dia_fechamento ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dia_fechamento: e.target.value ? Math.min(31, Math.max(1, Number(e.target.value))) : null,
                  })
                }
                placeholder="Dia"
                className="h-12 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Vencimento</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={form.dia_vencimento ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dia_vencimento: e.target.value ? Math.min(31, Math.max(1, Number(e.target.value))) : null,
                  })
                }
                placeholder="Dia"
                className="h-12 rounded-2xl"
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 gradient-rose text-primary-foreground rounded-full font-semibold shadow-rose"
          >
            {saving ? "Salvando…" : "Salvar"}
          </Button>

          {cartao?.id && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full h-12 rounded-full border-destructive/40 text-destructive hover:bg-destructive/5"
            >
              {deleting ? "Excluindo…" : "Excluir cartão"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
