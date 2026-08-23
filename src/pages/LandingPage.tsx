import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MivaLogo } from "@/components/MivaLogo";
import { ThiingIcon } from "@/components/ThiingIcon";
import {
  Heart,
  Sparkles,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Smartphone,
  Gift,
  ShieldCheck,
  Check,
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: PiggyBank,
      title: "Contas no controle",
      desc: "Cadastre gastos do dia a dia em segundos, com categorias acolhedoras.",
    },
    {
      icon: CreditCard,
      title: "Cartão sem susto",
      desc: "Acompanhe a fatura, parcelas e o que ainda vai cair no próximo mês.",
    },
    {
      icon: TrendingUp,
      title: "Receitas e metas",
      desc: "Veja para onde vai o seu dinheiro e o que sobra de verdade no fim do mês.",
    },
    {
      icon: Smartphone,
      title: "App no seu celular",
      desc: "Instale como aplicativo, abre rapidinho e funciona de qualquer lugar.",
    },
    {
      icon: Gift,
      title: "Indique e ganhe",
      desc: "Cada amiga que assina volta como crédito pra você — pode até virar PIX.",
    },
    {
      icon: ShieldCheck,
      title: "Seus dados, seus",
      desc: "Tudo protegido com login seguro. Ninguém vê o que é só seu.",
    },
  ];

  const planoBeneficios = [
    "Lançamentos ilimitados",
    "Cartões e faturas organizados",
    "Categorias personalizadas",
    "Histórico completo dos seus meses",
    "Programa Indique e Ganhe (até 30%)",
    "Suporte com carinho de verdade",
  ];

  return (
    <div className="min-h-screen gradient-soft">
      <div className="mobile-shell px-6 py-8 flex flex-col gap-16">
        {/* Header */}
        <header className="flex items-center justify-between animate-fade-in">
          <MivaLogo size="md" variant="rose" />
          <Button
            variant="ghost"
            onClick={() => navigate("/auth")}
            className="text-primary text-sm font-medium"
          >
            Entrar
          </Button>
        </header>

        {/* Hero */}
        <section className="flex flex-col items-center text-center animate-fade-in">
          <ThiingIcon name="piggy" size="2xl" float className="mb-4" />
          <div className="relative mb-4">
            <div className="absolute inset-0 -m-8 rounded-full gradient-rose opacity-20 blur-3xl" />
            <h1 className="font-serif text-4xl md:text-5xl text-foreground leading-tight relative">
              Sua vida financeira,
              <br />
              <span className="italic text-primary">com carinho.</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-base font-light max-w-[320px] mb-8">
            A Miva é o appzinho que organiza suas contas, cartões e sonhos —
            sem planilha, sem sermão, sem complicar.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-[280px]">
            <Button
              onClick={() => navigate("/auth")}
              className="w-full h-12 gradient-rose text-primary-foreground rounded-full font-semibold shadow-rose hover:opacity-95"
            >
              Começar grátis
            </Button>
            <p className="text-xs text-muted-foreground italic">
              <Sparkles className="inline w-3 h-3 mr-1" />
              7 dias de teste — sem cartão de crédito
            </p>
          </div>
        </section>

        {/* Funcionalidades */}
        <section className="animate-fade-in">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">
              Tudo que você precisa
            </p>
            <h2 className="font-serif text-3xl text-foreground">
              Feito pra mulher real
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="card-soft p-5 flex flex-col gap-2 hover:shadow-rose transition-shadow"
              >
                <div className="w-10 h-10 rounded-full gradient-rose flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-serif text-lg text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground font-light">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trial */}
        <section className="animate-fade-in">
          <div className="card-soft p-8 text-center shadow-hero relative overflow-hidden">
            <div className="absolute inset-0 gradient-rose opacity-5" />
            <div className="relative">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
              <h2 className="font-serif text-2xl text-foreground mb-2">
                7 dias grátis pra experimentar
              </h2>
              <p className="text-sm text-muted-foreground font-light max-w-[300px] mx-auto">
                Cria sua conta e usa tudo, sem precisar cadastrar cartão.
                Se não rolou conexão, é só não continuar — sem cobrança nenhuma.
              </p>
            </div>
          </div>
        </section>

        {/* Plano / Preço */}
        <section className="animate-fade-in">
          <div className="text-center mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">
              Mensalidade
            </p>
            <h2 className="font-serif text-3xl text-foreground">
              Um plano, simples assim
            </h2>
          </div>
          <div className="card-soft p-8 shadow-hero relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 rounded-full gradient-rose opacity-20 blur-2xl" />
            <div className="relative flex flex-col items-center text-center">
              <Heart className="w-6 h-6 text-primary mb-3 fill-primary/20" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Plano Miva
              </p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-serif text-5xl text-foreground">
                  R$ 39,90
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-light mb-6">
                por mês — cancela quando quiser
              </p>

              <ul className="w-full space-y-3 mb-6">
                {planoBeneficios.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-3 text-sm text-foreground"
                  >
                    <div className="w-5 h-5 rounded-full gradient-rose flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                    <span className="text-left font-light">{b}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => navigate("/auth")}
                className="w-full h-12 gradient-rose text-primary-foreground rounded-full font-semibold shadow-rose hover:opacity-95"
              >
                Quero começar
              </Button>
            </div>
          </div>
        </section>

        {/* Vantagens / Por que Miva */}
        <section className="animate-fade-in">
          <div className="text-center mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">
              Por que Miva
            </p>
            <h2 className="font-serif text-3xl text-foreground">
              Pensado pra você se sentir em casa
            </h2>
          </div>
          <div className="space-y-3">
            {[
              {
                t: "Sem julgamento",
                d: "Aqui ninguém vai te dizer que você gasta demais com café.",
              },
              {
                t: "Sem planilha confusa",
                d: "Telas leves, com tudo no lugar certo.",
              },
              {
                t: "Sem letrinha miúda",
                d: "Preço único, sem taxas escondidas, sem fidelidade.",
              },
              {
                t: "Com suporte humano",
                d: "Quando precisar, vai falar com gente — não com robô.",
              },
            ].map((v) => (
              <div key={v.t} className="card-soft p-4 flex gap-3 items-start">
                <Heart className="w-4 h-4 text-primary mt-1 fill-primary/20 flex-shrink-0" />
                <div>
                  <h4 className="font-serif text-base text-foreground">{v.t}</h4>
                  <p className="text-sm text-muted-foreground font-light">{v.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Final */}
        <section className="animate-fade-in text-center pb-8">
          <h2 className="font-serif text-3xl text-foreground mb-3">
            Bora organizar com leveza?
          </h2>
          <p className="text-sm text-muted-foreground font-light mb-6 max-w-[300px] mx-auto">
            Em menos de 2 minutos você já tá com tudo no lugar.
          </p>
          <Button
            onClick={() => navigate("/auth")}
            className="h-12 px-8 gradient-rose text-primary-foreground rounded-full font-semibold shadow-rose hover:opacity-95"
          >
            Criar minha conta grátis
          </Button>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground font-light pb-4">
          <MivaLogo size="sm" variant="rose" className="mx-auto mb-2" />
          <p>Feito com 💕 pra você</p>
        </footer>
      </div>
    </div>
  );
}
