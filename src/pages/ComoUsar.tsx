import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import {
  ArrowLeft,
  Wallet,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Tag,
  History,
  Sparkles,
  Receipt,
  ChevronDown,
} from "lucide-react";
import { ThiingIcon } from "@/components/ThiingIcon";
import { useState } from "react";

interface Section {
  icon: React.ReactNode;
  titulo: string;
  resumo: string;
  passos: string[];
}

const SECOES: Section[] = [
  {
    icon: <Wallet size={18} />,
    titulo: "1. Comece pela tela inicial",
    resumo: "É a sua visão geral do mês — saldo, receitas, gastos e o que está por vencer.",
    passos: [
      "Veja seu saldo do mês no topo (receitas menos despesas).",
      "Use o seletor de mês para navegar entre períodos.",
      "Toque nos cards de Receitas, Contas e Cartões para abrir cada área.",
      "A seção 'Próximos vencimentos' mostra o que precisa ser pago em breve.",
    ],
  },
  {
    icon: <TrendingUp size={18} />,
    titulo: "2. Cadastre suas receitas",
    resumo: "Tudo que entra: salário, freelas, pix de presente, vendas...",
    passos: [
      "Abra 'Receitas' pelo menu inferior.",
      "Toque no botão + para lançar uma nova entrada.",
      "Escolha categoria, valor, data e forma de recebimento.",
      "Marque como recorrente se for fixa todo mês (ex.: salário).",
    ],
  },
  {
    icon: <TrendingDown size={18} />,
    titulo: "3. Lance suas contas e gastos",
    resumo: "Toda saída de dinheiro vira uma 'conta' — paga ou a pagar.",
    passos: [
      "Em 'Contas', toque no + para adicionar uma despesa.",
      "Defina valor, vencimento e forma de pagamento.",
      "Marque como paga quando quitar — o saldo atualiza sozinho.",
      "Contas a vencer aparecem no topo da Home como lembrete.",
    ],
  },
  {
    icon: <CreditCard size={18} />,
    titulo: "4. Organize seus cartões de crédito",
    resumo: "Cadastre cada cartão com limite, fechamento e vencimento — e parcele compras.",
    passos: [
      "Acesse Perfil → 'Cartões de crédito' → toque em + para cadastrar.",
      "Informe nome, bandeira, limite, dia de fechamento e vencimento.",
      "Para lançar um gasto, toque em 'Novo gasto' dentro do cartão.",
      "Em compras parceladas (ex.: 3x), o app cria 3 contas automaticamente.",
      "Cada parcela paga libera o limite do cartão de volta.",
    ],
  },
  {
    icon: <Tag size={18} />,
    titulo: "5. Personalize suas categorias",
    resumo: "Organize entradas e saídas do seu jeito.",
    passos: [
      "Acesse Perfil → 'Minhas categorias'.",
      "Crie, edite ou apague categorias de receita e despesa.",
      "Use ícones e nomes que façam sentido pra você (ex.: 'Autocuidado', 'Mercado').",
    ],
  },
  {
    icon: <History size={18} />,
    titulo: "6. Acompanhe seu histórico",
    resumo: "Veja tudo que entrou e saiu, com filtros por mês e categoria.",
    passos: [
      "Toque em 'Histórico' no menu inferior.",
      "Filtre por mês, tipo (receita ou despesa) e categoria.",
      "Use para revisar gastos e identificar padrões.",
    ],
  },
  {
    icon: <Sparkles size={18} />,
    titulo: "7. Cuide do seu plano",
    resumo: "Sua assinatura é o que mantém o Miva ativo.",
    passos: [
      "Em Perfil → 'Meu plano' você vê status, vencimento e renovação.",
      "Em 'Histórico de pagamentos' acompanha todos os recibos.",
      "Cada mensalidade paga aparece também como conta no seu controle.",
    ],
  },
  {
    icon: <Receipt size={18} />,
    titulo: "Dica de ouro",
    resumo: "Lance no momento que acontece.",
    passos: [
      "Sempre que pagar algo, abra o Miva e lance na hora — leva 10 segundos.",
      "Reserve 5 minutos no domingo para revisar a semana.",
      "Não se cobre por 'esquecer' — apenas volte e ajuste, sem julgamento. 💕",
    ],
  },
];

export default function ComoUsar() {
  const [aberto, setAberto] = useState<number | null>(0);

  return (
    <AppShell>
      <div className="px-5 pt-6 pb-12 max-w-md mx-auto">
        <Link
          to="/perfil"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} /> Voltar
        </Link>

        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <ThiingIcon name="flower" size="md" float />
          </div>
          <h1 className="font-serif text-3xl text-foreground">Como usar o Miva</h1>
          <p className="text-muted-foreground text-sm mt-2 px-4">
            Um passo a passo carinhoso para você dominar seu dinheiro com leveza.
          </p>
        </div>

        <div className="space-y-2.5">
          {SECOES.map((s, i) => {
            const open = aberto === i;
            return (
              <div
                key={s.titulo}
                className="card-soft p-0 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setAberto(open ? null : i)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-primary-soft/20 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-soft/80 flex items-center justify-center text-primary shrink-0">
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground leading-tight">
                      {s.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {s.resumo}
                    </p>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-muted-foreground transition-transform shrink-0 ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {open && (
                  <div className="px-4 pb-4 pt-1 border-t border-border/50 bg-primary-soft/10">
                    <ul className="space-y-2 mt-3">
                      {s.passos.map((p, idx) => (
                        <li
                          key={idx}
                          className="flex gap-2.5 text-sm text-foreground/85 leading-relaxed"
                        >
                          <span className="text-primary mt-1 shrink-0">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="card-soft text-center py-6 mt-6 flex flex-col items-center">
          <ThiingIcon name="flower" size="md" float />
          <p className="font-serif text-base text-foreground mt-3">
            Você não está sozinha nessa.
          </p>
          <p className="text-sm text-muted-foreground italic">
            O Miva caminha com você. 💕
          </p>
        </div>
      </div>
    </AppShell>
  );
}
