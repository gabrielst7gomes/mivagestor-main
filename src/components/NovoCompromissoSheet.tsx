import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: () => void;
  initialDate?: string; // yyyy-mm-dd
  editing?: {
    id: string;
    titulo: string;
    data_hora: string;
    local: string | null;
    observacoes: string | null;
    conta_id: string | null;
    receita_id: string | null;
  } | null;
}

interface Conta { id: string; descricao: string; }
interface Receita { id: string; descricao: string | null; tipo: string; }

export function NovoCompromissoSheet({ open, onOpenChange, onSaved, initialDate, editing }: Props) {
  const { user } = useAuth();
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("09:00");
  const [local, setLocal] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [vinculo, setVinculo] = useState<string>("nenhum"); // "nenhum" | "conta:<id>" | "receita:<id>"
  const [contas, setContas] = useState<Conta[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [{ data: c }, { data: r }] = await Promise.all([
        supabase.from("contas").select("id, descricao").eq("user_id", user.id).order("data_vencimento", { ascending: false }).limit(50),
        supabase.from("receitas").select("id, descricao, tipo").eq("user_id", user.id).order("data_recebimento", { ascending: false }).limit(50),
      ]);
      setContas((c ?? []) as Conta[]);
      setReceitas((r ?? []) as Receita[]);
    })();
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const dt = new Date(editing.data_hora);
      setTitulo(editing.titulo);
      setData(dt.toISOString().slice(0, 10));
      setHora(dt.toTimeString().slice(0, 5));
      setLocal(editing.local ?? "");
      setObservacoes(editing.observacoes ?? "");
      setVinculo(
        editing.conta_id ? `conta:${editing.conta_id}` :
        editing.receita_id ? `receita:${editing.receita_id}` :
        "nenhum"
      );
    } else {
      setTitulo("");
      setData(initialDate ?? new Date().toISOString().slice(0, 10));
      setHora("09:00");
      setLocal("");
      setObservacoes("");
      setVinculo("nenhum");
    }
  }, [open, editing, initialDate]);

  const salvar = async () => {
    if (!user) return;
    if (!titulo.trim()) { toast.error("Coloque um título carinhoso pro compromisso 💕"); return; }
    if (!data) { toast.error("Escolhe a data, amiga"); return; }
    setSaving(true);

    const dataHoraISO = new Date(`${data}T${hora || "09:00"}:00`).toISOString();
    const conta_id = vinculo.startsWith("conta:") ? vinculo.slice(6) : null;
    const receita_id = vinculo.startsWith("receita:") ? vinculo.slice(8) : null;

    const payload = {
      user_id: user.id,
      titulo: titulo.trim(),
      data_hora: dataHoraISO,
      local: local.trim() || null,
      observacoes: observacoes.trim() || null,
      conta_id,
      receita_id,
      // Reset de notificações ao reagendar
      notificado_dia_anterior: false,
      notificado_no_dia: false,
    };

    const { error } = editing
      ? await supabase.from("compromissos").update(payload).eq("id", editing.id)
      : await supabase.from("compromissos").insert(payload);

    setSaving(false);
    if (error) { toast.error("Não consegui salvar agora. Pode tentar de novo?"); return; }
    toast.success(editing ? "Compromisso atualizado ✨" : "Compromisso na sua agenda 💕");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-w-[420px] mx-auto rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="font-serif text-2xl">
            {editing ? "Editar compromisso" : "Novo compromisso"}
          </SheetTitle>
          <SheetDescription>Vamos guardar com carinho na sua agenda.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          <div>
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" placeholder="Ex: Reunião escola, dentista…" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="data">Data</Label>
              <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="hora">Hora</Label>
              <Input id="hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="local">Local (opcional)</Label>
            <Input id="local" placeholder="Ex: Clínica Bem-Estar" value={local} onChange={(e) => setLocal(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="obs">Observações (opcional)</Label>
            <Textarea id="obs" placeholder="Algo importante de lembrar…" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
          </div>

          <div>
            <Label>Vincular a algo (opcional)</Label>
            <Select value={vinculo} onValueChange={setVinculo}>
              <SelectTrigger><SelectValue placeholder="Nada vinculado" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="nenhum">Nada vinculado</SelectItem>
                {contas.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Contas</div>
                    {contas.map((c) => (
                      <SelectItem key={c.id} value={`conta:${c.id}`}>💳 {c.descricao}</SelectItem>
                    ))}
                  </>
                )}
                {receitas.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Receitas</div>
                    {receitas.map((r) => (
                      <SelectItem key={r.id} value={`receita:${r.id}`}>💰 {r.descricao || r.tipo}</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">Pra lembrar de pagar um boleto, receber um valor, etc.</p>
          </div>

          <Button onClick={salvar} disabled={saving} className="w-full h-12 rounded-full font-medium text-base">
            {saving ? "Salvando…" : editing ? "Atualizar compromisso" : "Salvar na agenda"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
