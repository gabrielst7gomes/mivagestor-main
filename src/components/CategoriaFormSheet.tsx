import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThiingIcon, type ThiingName } from "@/components/ThiingIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";
import type { Categoria, CategoriaKind } from "@/hooks/useCategorias";

const schema = z.object({
  nome: z.string().trim().min(1, "Dê um nome para a categoria").max(40),
  emoji: z.string().trim().min(1, "Escolha um emoji").max(8),
});

const THIINGS: ThiingName[] = ["coins", "wallet", "house", "bill", "flower", "piggy"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  kind: CategoriaKind;
  /** Se passado, abre em modo edição. */
  categoria?: Categoria | null;
}

export function CategoriaFormSheet({ open, onOpenChange, onSaved, kind, categoria }: Props) {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [thiing, setThiing] = useState<ThiingName>("coins");
  const [loading, setLoading] = useState(false);

  const isEdit = !!categoria;

  useEffect(() => {
    if (open) {
      setNome(categoria?.nome ?? "");
      setEmoji(categoria?.emoji ?? "✨");
      setThiing(categoria?.thiing ?? (kind === "conta" ? "bill" : "coins"));
    }
  }, [open, categoria, kind]);

  const handleSave = async () => {
    if (!user) return;
    const parsed = schema.safeParse({ nome, emoji });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const payload = { nome: parsed.data.nome, emoji: parsed.data.emoji, thiing };

    let error;
    if (isEdit && categoria) {
      ({ error } = await supabase.from("categorias").update(payload).eq("id", categoria.id));
      // Se o nome mudou, atualiza referências em contas/receitas
      if (!error && categoria.nome !== parsed.data.nome) {
        const tabela = kind === "conta" ? "contas" : "receitas";
        await supabase.from(tabela).update({ categoria: parsed.data.nome })
          .eq("user_id", user.id).eq("categoria", categoria.nome);
      }
    } else {
      ({ error } = await supabase.from("categorias").insert({
        ...payload,
        user_id: user.id,
        kind,
        ordem: 50,
      }));
    }
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("Já existe uma categoria com esse nome.");
      } else {
        toast.error("Não consegui salvar agora. Pode tentar de novo?");
      }
      return;
    }
    toast.success(isEdit ? "Categoria atualizada ✨" : "Nova categoria criada 💕");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-0 shadow-sheet max-w-[420px] mx-auto px-6 pt-6 pb-8 max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left mb-6">
          <SheetTitle className="font-serif text-2xl">
            {isEdit ? "Editar categoria" : `Nova categoria de ${kind === "conta" ? "conta" : "receita"}`}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Preview */}
          <div className="card-soft flex items-center gap-3">
            <ThiingIcon name={thiing} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground line-clamp-1">{nome || "Sua categoria"}</p>
              <p className="text-xs text-muted-foreground">{emoji} pré-visualização</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Pet, Academia, Doação…" className="h-12 rounded-2xl" maxLength={40} />
          </div>

          <div className="space-y-2">
            <Label>Emoji</Label>
            <Input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="Ex: 🐶"
              className="h-12 rounded-2xl text-2xl text-center"
              maxLength={4}
            />
            <p className="text-xs text-muted-foreground">Usado em listas compactas. Cole qualquer emoji.</p>
          </div>

          <div className="space-y-2">
            <Label>Ícone 3D</Label>
            <div className="grid grid-cols-3 gap-2">
              {THIINGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setThiing(t)}
                  className={cn(
                    "rounded-2xl p-3 border-2 flex items-center justify-center transition-all",
                    thiing === t
                      ? "border-primary bg-primary-soft/60"
                      : "border-border bg-card/60 hover:border-primary/40"
                  )}
                  aria-label={t}
                >
                  <ThiingIcon name={t} size="sm" />
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full h-12 gradient-rose text-primary-foreground rounded-2xl font-semibold shadow-rose mt-2">
            {loading ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar categoria"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
