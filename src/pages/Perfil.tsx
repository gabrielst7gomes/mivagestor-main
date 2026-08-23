import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { LogOut, Mail, Tag, ChevronRight, Camera, Loader2, Trash2, Sparkles, Receipt, CreditCard, BookOpen, Gift, Palette, Check } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

import { ThiingIcon } from "@/components/ThiingIcon";
import { iniciais, nomeAbreviado } from "@/lib/finance";
import { toast } from "sonner";

export default function Perfil() {
  const { user, signOut } = useAuth();
  const { theme, setTheme, mode, setMode } = useTheme();

  const [nome, setNome] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("nome, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setNome(data?.nome ?? "");
        setAvatarUrl(data?.avatar_url ?? null);
      });
  }, [user]);

  const onPickFile = () => fileInput.current?.click();

  const handleUpload = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Escolhe uma imagem, tá? 💕");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A foto pode ter até 5MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${pub.publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (dbErr) throw dbErr;

      setAvatarUrl(url);
      toast.success("Linda! Foto atualizada ✨");
    } catch (err) {
      console.error(err);
      toast.error("Não consegui salvar agora. Tenta de novo?");
    } finally {
      setUploading(false);
    }
  };

  const removerFoto = async () => {
    if (!user) return;
    setUploading(true);
    try {
      // Lista e apaga arquivos da pasta do user
      const { data: list } = await supabase.storage.from("avatars").list(user.id);
      if (list && list.length > 0) {
        await supabase.storage
          .from("avatars")
          .remove(list.map((f) => `${user.id}/${f.name}`));
      }
      await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      setAvatarUrl(null);
      toast.success("Foto removida.");
    } catch (err) {
      console.error(err);
      toast.error("Não consegui remover agora.");
    } finally {
      setUploading(false);
    }
  };

  const initials = iniciais(nome || user?.email);
  const displayName = nomeAbreviado(nome) || "amiga";

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-6 animate-fade-in">
        <h1 className="font-serif text-3xl text-foreground mb-6">Perfil</h1>

        <div className="card-hero text-center py-8 mb-6 animate-scale-in">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <button
              type="button"
              onClick={onPickFile}
              disabled={uploading}
              aria-label="Trocar foto de perfil"
              className="w-24 h-24 rounded-full overflow-hidden gradient-rose flex items-center justify-center font-serif text-3xl text-white shadow-rose ring-2 ring-white/70 transition-transform hover:scale-105 disabled:opacity-60"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </button>

            <button
              type="button"
              onClick={onPickFile}
              disabled={uploading}
              aria-label="Adicionar foto"
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-white border border-primary/30 shadow-md flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            </button>

            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
          </div>

          <p className="font-serif text-2xl text-foreground capitalize relative">{displayName}</p>
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-1.5 mt-1 relative">
            <Mail size={13} /> {user?.email}
          </p>

          {avatarUrl && (
            <button
              type="button"
              onClick={removerFoto}
              disabled={uploading}
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 size={12} /> Remover foto
            </button>
          )}
        </div>

        {/* Configurações */}
        <div className="space-y-2 mb-6">
          <Link
            to="/categorias"
            className="card-soft flex items-center gap-3 hover:border-primary/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-soft/80 flex items-center justify-center text-primary">
              <Tag size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">Minhas categorias</p>
              <p className="text-xs text-muted-foreground">Crie, edite e organize</p>
            </div>
            <ChevronRight className="text-muted-foreground" size={18} />
          </Link>

          <Link
            to="/cartoes"
            className="card-soft flex items-center gap-3 hover:border-primary/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-soft/80 flex items-center justify-center text-primary">
              <CreditCard size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">Cartões de crédito</p>
              <p className="text-xs text-muted-foreground">Limite, parcelas e gastos</p>
            </div>
            <ChevronRight className="text-muted-foreground" size={18} />
          </Link>

          <Link
            to="/plano"
            className="card-soft flex items-center gap-3 hover:border-primary/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-soft/80 flex items-center justify-center text-primary">
              <Sparkles size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">Meu plano</p>
              <p className="text-xs text-muted-foreground">Assinatura, pagamento e renovação</p>
            </div>
            <ChevronRight className="text-muted-foreground" size={18} />
          </Link>

          <Link
            to="/historico-pagamentos"
            className="card-soft flex items-center gap-3 hover:border-primary/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-soft/80 flex items-center justify-center text-primary">
              <Receipt size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">Histórico de pagamentos</p>
              <p className="text-xs text-muted-foreground">Suas mensalidades e recibos</p>
            </div>
            <ChevronRight className="text-muted-foreground" size={18} />
          </Link>

          <Link
            to="/indicacoes"
            className="card-soft flex items-center gap-3 hover:border-primary/40 transition-colors bg-gradient-to-r from-primary-soft/40 to-transparent"
          >
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-rose">
              <Gift size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">Indique e ganhe 💕</p>
              <p className="text-xs text-muted-foreground">Receba até 30% de cada indicação</p>
            </div>
            <ChevronRight className="text-muted-foreground" size={18} />
          </Link>

          <Link
            to="/como-usar"
            className="card-soft flex items-center gap-3 hover:border-primary/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-soft/80 flex items-center justify-center text-primary">
              <BookOpen size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">Como usar o Miva</p>
              <p className="text-xs text-muted-foreground">Passo a passo carinhoso</p>
            </div>
            <ChevronRight className="text-muted-foreground" size={18} />
          </Link>
        </div>

        {/* Seletor de tema */}
        <div className="card-soft mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary-soft/80 flex items-center justify-center text-primary">
              <Palette size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">Tema do app</p>
              <p className="text-xs text-muted-foreground">Escolha o visual que combina com você</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: "feminino", label: "Feminino", desc: "Rosé e delicado", dots: ["hsl(339 58% 58%)", "hsl(339 70% 88%)"] },
              { id: "masculino", label: "Masculino", desc: "Azul e sóbrio", dots: ["hsl(210 68% 42%)", "hsl(210 55% 85%)"] },
            ] as const).map((opt) => {
              const ativo = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setTheme(opt.id);
                    toast.success(`Tema ${opt.label.toLowerCase()} aplicado`);
                  }}
                  className={`rounded-2xl border p-3 text-left transition-colors ${
                    ativo ? "border-primary bg-primary-soft/50" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    {opt.dots.map((c) => (
                      <span key={c} className="w-4 h-4 rounded-full" style={{ background: c }} />
                    ))}
                    {ativo && <Check size={14} className="ml-auto text-primary" />}
                  </div>
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground mt-4 mb-2">Aparência</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: "claro", label: "Claro", desc: "Luminoso e leve", dots: ["hsl(0 0% 100%)", "hsl(0 0% 90%)"] },
              { id: "escuro", label: "Escuro", desc: "Descanso pros olhos", dots: ["hsl(220 20% 12%)", "hsl(220 15% 30%)"] },
            ] as const).map((opt) => {
              const ativo = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setMode(opt.id);
                    toast.success(`Modo ${opt.label.toLowerCase()} aplicado`);
                  }}
                  className={`rounded-2xl border p-3 text-left transition-colors ${
                    ativo ? "border-primary bg-primary-soft/50" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    {opt.dots.map((c) => (
                      <span key={c} className="w-4 h-4 rounded-full border border-border" style={{ background: c }} />
                    ))}
                    {ativo && <Check size={14} className="ml-auto text-primary" />}
                  </div>
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>



        <div className="card-soft text-center py-6 mb-6 flex flex-col items-center">
          <ThiingIcon name="flower" size="md" float />
          <p className="font-serif text-base text-foreground mt-3">Cuidar do seu dinheiro</p>
          <p className="text-sm text-muted-foreground italic">é cuidar de você.</p>
        </div>

        <Button
          variant="outline"
          onClick={signOut}
          className="w-full h-12 rounded-2xl border-border text-muted-foreground hover:bg-destructive/5 hover:text-destructive hover:border-destructive/40"
        >
          <LogOut size={18} className="mr-2" /> Sair
        </Button>
      </div>
    </AppShell>
  );
}
