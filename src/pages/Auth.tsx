import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MivaLogo } from "@/components/MivaLogo";
import { ThiingIcon } from "@/components/ThiingIcon";
import { toast } from "sonner";
import { z } from "zod";

const onlyDigits = (v: string) => v.replace(/\D/g, "");

const formatWhats = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha precisa de pelo menos 6 caracteres"),
  nome: z.string().trim().min(1, "Como podemos te chamar?").max(80).optional(),
  whatsapp: z
    .string()
    .optional()
    .refine((v) => !v || onlyDigits(v).length >= 10, "WhatsApp inválido (DDD + número)"),
  refCode: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[A-Z0-9]{5,12}$/.test(v.trim().toUpperCase()),
      "Código de convite inválido",
    ),
});

export default function Auth() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [refCode, setRefCode] = useState("");
  const [refFromUrl, setRefFromUrl] = useState(false);
  const [loading, setLoading] = useState(false);

  // Captura ?ref= e armazena (persiste mesmo após reload/redirecionamento)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const stored = localStorage.getItem("miva_ref_code");
    const initial = (ref || stored || "").toUpperCase().trim();
    if (initial) {
      localStorage.setItem("miva_ref_code", initial);
      setRefCode(initial);
      setRefFromUrl(!!ref);
      if (ref) setMode("signup");
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (data) {
        navigate("/admin", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    })();
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = refCode.trim().toUpperCase();
    const parsed = schema.safeParse({
      email,
      password,
      nome: mode === "signup" ? nome : undefined,
      whatsapp: mode === "signup" ? whatsapp : undefined,
      refCode: mode === "signup" && cleanRef ? cleanRef : undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const whatsDigits = onlyDigits(whatsapp);
        const finalRef =
          cleanRef || localStorage.getItem("miva_ref_code") || undefined;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { nome, whatsapp: whatsDigits, ...(finalRef ? { ref: finalRef } : {}) },
          },
        });
        if (error) throw error;
        // Auto-confirm está ativo: já tenta logar para entrar direto
        await supabase.auth.signInWithPassword({ email, password });
        localStorage.removeItem("miva_ref_code");
        toast.success("Bem-vinda à Miva 💕");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Que bom te ver de novo!");
      }
    } catch (err: any) {
      const msg = err?.message?.includes("Invalid login")
        ? "E-mail ou senha não conferem. Quer tentar de novo?"
        : err?.message?.includes("already registered")
        ? "Esta conta já existe — entra por aqui 💕"
        : "Não consegui agora. Pode tentar de novo em alguns segundos?";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-soft flex flex-col">
      <div className="mobile-shell flex flex-col px-6 py-8">
        {/* Logo + ícone 3D */}
        <div className="flex flex-col items-center justify-center text-center animate-fade-in pt-6 pb-6">
          {/* Cofrinho 3D flutuando */}
          <ThiingIcon name="piggy" size="2xl" float className="mb-2" />
          {/* halo rosé suave atrás da logo */}
          <div className="relative mb-3">
            <div className="absolute inset-0 -m-8 rounded-full gradient-rose opacity-20 blur-3xl" />
            <MivaLogo size="lg" variant="rose" withUnderline className="relative" />
          </div>
          <p className="text-muted-foreground text-sm font-light italic max-w-[260px]">
            Sua vida financeira, com carinho.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in card-soft p-6 shadow-hero">
          {mode === "signup" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Como podemos te chamar?"
                  className="h-12 rounded-2xl bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-xs uppercase tracking-wider text-muted-foreground">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  inputMode="numeric"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatWhats(e.target.value))}
                  placeholder="(11) 90000-0000"
                  className="h-12 rounded-2xl bg-background"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="refCode" className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  Código de convite
                  <span className="text-[10px] normal-case tracking-normal text-muted-foreground/70 font-normal">(opcional)</span>
                </Label>
                <Input
                  id="refCode"
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))}
                  placeholder="Ex: MIVA123"
                  maxLength={12}
                  autoCapitalize="characters"
                  className="h-12 rounded-2xl bg-background font-mono tracking-wider"
                />
                {refFromUrl && refCode && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    💕 Código aplicado automaticamente do link
                  </p>
                )}
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-12 rounded-2xl bg-background"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="h-12 rounded-2xl bg-background"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 gradient-rose text-primary-foreground rounded-full font-semibold shadow-rose hover:opacity-95 transition-opacity"
          >
            {loading ? "Aguarde…" : mode === "signin" ? "Entrar com e-mail" : "Criar conta"}
          </Button>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full h-12 rounded-full border border-primary/40 text-primary text-sm font-medium hover:bg-primary-soft transition-colors"
          >
            {mode === "signin" ? "Criar conta" : "Já tenho conta — entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
