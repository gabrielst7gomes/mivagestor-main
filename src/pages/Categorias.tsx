import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useCategorias, type Categoria, type CategoriaKind } from "@/hooks/useCategorias";
import { ThiingIcon } from "@/components/ThiingIcon";
import { CategoriaFormSheet } from "@/components/CategoriaFormSheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export default function Categorias() {
  const [tab, setTab] = useState<CategoriaKind>("conta");
  const { categorias, loading, recarregar } = useCategorias(tab);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Categoria | null>(null);

  const abrirNova = () => { setEditing(null); setOpenForm(true); };
  const abrirEdicao = (c: Categoria) => { setEditing(c); setOpenForm(true); };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("categorias").delete().eq("id", confirmDelete.id);
    if (error) { toast.error("Não consegui excluir agora."); return; }
    toast.success("Categoria removida.");
    setConfirmDelete(null);
    recarregar();
  };

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link to="/perfil" aria-label="Voltar" className="w-10 h-10 rounded-full bg-card/70 border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors backdrop-blur-md">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-foreground">Categorias</h1>
            <p className="text-xs text-muted-foreground">Organize do seu jeitinho</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(["conta", "receita"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "flex-1 h-11 rounded-full text-sm font-medium border transition-all backdrop-blur-md",
                tab === k
                  ? "bg-primary-soft/80 text-primary border-primary-soft"
                  : "bg-card/60 text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              {k === "conta" ? "Contas" : "Receitas"}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>
          ) : categorias.length === 0 ? (
            <div className="card-soft text-center py-10 flex flex-col items-center">
              <ThiingIcon name="flower" size="lg" float />
              <p className="text-sm text-foreground font-medium mt-3">Nenhuma categoria por aqui</p>
              <p className="text-xs text-muted-foreground mt-1">Toque em + e crie a primeira</p>
            </div>
          ) : (
            categorias.map((c) => (
              <div key={c.id} className="card-soft flex items-center gap-3">
                <ThiingIcon name={c.thiing} size="sm" className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground line-clamp-1">{c.nome}</p>
                  <p className="text-xs text-muted-foreground">{c.emoji}</p>
                </div>
                <button
                  onClick={() => abrirEdicao(c)}
                  aria-label="Editar"
                  className="w-9 h-9 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center transition-colors"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => setConfirmDelete(c)}
                  aria-label="Excluir"
                  className="w-9 h-9 rounded-full border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 flex items-center justify-center transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={abrirNova}
        aria-label="Nova categoria"
        className="fixed bottom-24 right-[calc(50%-198px)] md:bottom-8 md:right-8 w-14 h-14 rounded-full gradient-rose text-primary-foreground shadow-rose flex items-center justify-center z-30 hover:scale-105 transition-transform"
      >
        <Plus size={26} />
      </button>

      <CategoriaFormSheet
        open={openForm}
        onOpenChange={setOpenForm}
        onSaved={recarregar}
        kind={tab}
        categoria={editing}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Excluir esta categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Os lançamentos que usavam <strong>{confirmDelete?.nome}</strong> continuam aqui — só perdem a categoria atual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
