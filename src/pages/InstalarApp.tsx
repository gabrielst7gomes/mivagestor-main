import { Share, Plus, MoreVertical, Download, Smartphone, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallGate } from "@/hooks/useInstallGate";
import { ThiingIcon } from "@/components/ThiingIcon";

/**
 * Tela bloqueante exibida em mobile quando o app NÃO está instalado.
 * Mostra instruções específicas para iOS e Android.
 */
export default function InstalarApp() {
  const { device, installPromptEvent, triggerInstall } = useInstallGate();

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-primary-soft/30 via-background to-background px-5 py-10 flex flex-col items-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <ThiingIcon name="flower" size="lg" float />
          </div>
          <h1 className="font-serif text-3xl text-foreground leading-tight">
            Instale o Miva no seu celular
          </h1>
          <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
            Para uma experiência completa, leve e sem distrações, o Miva precisa ser
            instalado como aplicativo. É rápido, gratuito e ocupa pouquíssimo espaço.
          </p>
        </div>

        {/* Benefícios */}
        <div className="card-soft mb-6 space-y-2.5">
          {[
            "Abre direto da tela inicial, como um app de verdade",
            "Funciona em tela cheia, sem barras do navegador",
            "Carrega mais rápido e gasta menos dados",
            "Notificações e atalhos personalizados",
          ].map((b) => (
            <div key={b} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center mt-0.5 shrink-0">
                <Check size={12} className="text-primary" />
              </div>
              <p className="text-sm text-foreground/90 leading-snug">{b}</p>
            </div>
          ))}
        </div>

        {/* Instruções iOS */}
        {device === "ios" && (
          <section className="card-soft mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone size={18} className="text-primary" />
              <h2 className="font-serif text-xl text-foreground">No iPhone / iPad</h2>
            </div>
            <ol className="space-y-3.5">
              <Step n={1}>
                Toque no botão <Share size={14} className="inline mx-0.5 -mt-0.5" />{" "}
                <strong>Compartilhar</strong> na barra inferior do Safari.
              </Step>
              <Step n={2}>
                Role e toque em <strong>"Adicionar à Tela de Início"</strong>{" "}
                <Plus size={14} className="inline -mt-0.5" />.
              </Step>
              <Step n={3}>
                Toque em <strong>"Adicionar"</strong> no canto superior direito.
              </Step>
              <Step n={4}>
                Pronto! Abra o Miva pelo ícone na sua tela inicial 💕
              </Step>
            </ol>
            <p className="mt-4 text-xs text-muted-foreground italic">
              Importante: no iPhone, a instalação só funciona no Safari. Se você abriu
              por outro navegador (Chrome, Instagram, etc.), copie o link e cole no
              Safari.
            </p>
          </section>
        )}

        {/* Instruções Android */}
        {device === "android" && (
          <section className="card-soft mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone size={18} className="text-primary" />
              <h2 className="font-serif text-xl text-foreground">No Android</h2>
            </div>

            {installPromptEvent ? (
              <div className="mb-4">
                <Button
                  onClick={triggerInstall}
                  className="w-full h-12 rounded-2xl btn-primary-glow gap-2"
                >
                  <Download size={18} /> Instalar agora
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Toque acima e confirme em <strong>"Instalar"</strong>.
                </p>
              </div>
            ) : (
              <ol className="space-y-3.5">
                <Step n={1}>
                  Toque no menu{" "}
                  <MoreVertical size={14} className="inline -mt-0.5" /> (três
                  pontinhos no canto superior direito do Chrome).
                </Step>
                <Step n={2}>
                  Toque em <strong>"Instalar app"</strong> ou{" "}
                  <strong>"Adicionar à tela inicial"</strong>.
                </Step>
                <Step n={3}>
                  Confirme em <strong>"Instalar"</strong>.
                </Step>
                <Step n={4}>
                  Pronto! Abra o Miva pelo ícone na sua tela inicial 💕
                </Step>
              </ol>
            )}
          </section>
        )}

        {/* Outros mobiles */}
        {device === "other-mobile" && (
          <section className="card-soft mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone size={18} className="text-primary" />
              <h2 className="font-serif text-xl text-foreground">No seu celular</h2>
            </div>
            <ol className="space-y-3.5">
              <Step n={1}>Abra o menu do seu navegador.</Step>
              <Step n={2}>
                Procure por <strong>"Instalar app"</strong> ou{" "}
                <strong>"Adicionar à tela inicial"</strong>.
              </Step>
              <Step n={3}>Confirme e abra o Miva pelo ícone instalado.</Step>
            </ol>
          </section>
        )}

        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground italic flex items-center justify-center gap-1.5">
            <Sparkles size={12} className="text-primary" /> Já instalou? Abra o Miva
            pelo ícone do app na sua tela inicial.
          </p>
        </div>
      </div>
    </main>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center shrink-0 shadow-sm">
        {n}
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed pt-0.5">{children}</p>
    </li>
  );
}
