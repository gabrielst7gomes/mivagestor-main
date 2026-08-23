import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ThiingIcon } from "@/components/ThiingIcon";
import { Wallet, TrendingUp, TrendingDown, CreditCard, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Slide {
  icon: React.ReactNode;
  titulo: string;
  texto: string;
}

const SLIDES: Slide[] = [
  {
    icon: <Sparkles size={28} className="text-primary" />,
    titulo: "Bem-vinda ao Miva 💕",
    texto:
      "Aqui você cuida do seu dinheiro com leveza, sem julgamento. Em poucos passos, te mostro como começar.",
  },
  {
    icon: <Wallet size={28} className="text-primary" />,
    titulo: "Tela inicial",
    texto:
      "É a sua visão geral do mês: saldo, receitas, despesas e o que está por vencer. Tudo em um só lugar.",
  },
  {
    icon: <TrendingUp size={28} className="text-primary" />,
    titulo: "Lance suas receitas",
    texto:
      "Tudo que entra (salário, freela, presente). Toque no + dentro de Receitas e marque como recorrente se for fixa.",
  },
  {
    icon: <TrendingDown size={28} className="text-primary" />,
    titulo: "Cadastre suas contas",
    texto:
      "Em Contas, lance cada despesa com valor e vencimento. Marque como paga quando quitar — o saldo atualiza sozinho.",
  },
  {
    icon: <CreditCard size={28} className="text-primary" />,
    titulo: "Cartões de crédito",
    texto:
      "Cadastre seus cartões com limite e vencimento. Compras parceladas viram contas automáticas, mês a mês.",
  },
  {
    icon: <ThiingIcon name="flower" size="md" />,
    titulo: "Pronta pra começar?",
    texto:
      "Você pode rever esse passo a passo a qualquer momento em Perfil → Como usar o Miva. Vamos juntas? 🌸",
  },
];

export function TutorialPopup() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Verifica se a usuária já viu o tutorial
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      // Fallback rápido em localStorage (caso o profile ainda não tenha sido criado)
      const localKey = `miva_tutorial_${user.id}`;
      if (localStorage.getItem(localKey) === "1") return;

      const { data, error } = await supabase
        .from("profiles")
        .select("tutorial_concluido")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        // Em caso de erro de leitura, ainda mostra para garantir o onboarding
        setOpen(true);
        return;
      }
      if (!data || data.tutorial_concluido === false) {
        setOpen(true);
      } else {
        localStorage.setItem(localKey, "1");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const concluir = async () => {
    if (!user) return;
    setSaving(true);
    localStorage.setItem(`miva_tutorial_${user.id}`, "1");
    await supabase
      .from("profiles")
      .update({ tutorial_concluido: true })
      .eq("id", user.id);
    setSaving(false);
    setOpen(false);
  };

  const avancar = () => {
    if (step < SLIDES.length - 1) setStep(step + 1);
    else concluir();
  };
  const voltar = () => {
    if (step > 0) setStep(step - 1);
  };

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) concluir(); }}>
      <DialogContent
        className="max-w-[380px] mx-auto rounded-3xl border-0 p-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="bg-primary-soft/40 px-6 pt-8 pb-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-card shadow-sm flex items-center justify-center mb-4">
            {slide.icon}
          </div>
          <h2 className="font-serif text-2xl text-foreground mb-2">{slide.titulo}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed px-2">
            {slide.texto}
          </p>
        </div>

        <div className="px-6 py-5 bg-card">
          {/* Indicadores */}
          <div className="flex justify-center gap-1.5 mb-5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Ir para passo ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={voltar}
                className="rounded-full h-11 px-4"
              >
                <ChevronLeft size={18} />
              </Button>
            )}
            <Button
              onClick={avancar}
              disabled={saving}
              className="flex-1 h-11 rounded-full gradient-rose text-primary-foreground font-medium shadow-rose"
            >
              {isLast ? (saving ? "Salvando…" : "Começar a usar 🌸") : (
                <>
                  Avançar <ChevronRight size={18} className="ml-1" />
                </>
              )}
            </Button>
          </div>

          {!isLast && (
            <button
              type="button"
              onClick={concluir}
              className="w-full text-xs text-muted-foreground hover:text-foreground mt-3"
            >
              Pular tutorial
            </button>
          )}

          {isLast && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              Quer revisar?{" "}
              <Link
                to="/como-usar"
                onClick={concluir}
                className="text-primary font-medium underline-offset-2 hover:underline"
              >
                Abrir guia completo
              </Link>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
