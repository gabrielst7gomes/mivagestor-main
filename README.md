# Miva

Aqui está o preview interativo — você pode clicar nas abas e marcar contas como pagas! Agora segue o prompt completo e estruturado para o Lovable:

🌸 Prompt MVP — App de Finanças Pessoais Feminino

CONTEXTO DO PROJETO

Crie um aplicativo mobile-first de gestão financeira pessoal voltado para mulheres. O design deve ser acolhedor, sofisticado e intuitivo — paleta rosé e carvão, tipografia elegante, UX simples sem curva de aprendizado.

STACK TÉCNICA

Framework: React com TypeScript

Estilo: Tailwind CSS

Banco de dados: Supabase (PostgreSQL + Auth)

Roteamento: React Router DOM

Armazenamento de estado: Zustand ou Context API

Ícones: Lucide React

BANCO DE DADOS — SUPABASE

Crie as seguintes tabelas:

sql

-- Usuárias
create table profiles (
  id uuid references auth.users primary key,
  nome text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Receitas (salário + extras)
create table receitas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  descricao text not null,
  valor numeric(10,2) not null,
  tipo text check (tipo in ('salario', 'extra')),
  data_recebimento date not null,
  created_at timestamptz default now()
);

-- Contas a pagar
create table contas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  descricao text not null,
  categoria text not null,
  valor numeric(10,2) not null,
  data_vencimento date not null,
  pago boolean default false,
  data_pagamento date,
  recorrente boolean default false,
  created_at timestamptz default now()
);

Ative RLS em todas as tabelas. Policies: cada usuária só vê e edita seus próprios dados.

ESTRUTURA DE TELAS

1. TELA DE ONBOARDING / LOGIN

Tela com fundo carvão (#1C1C1A)

Logo do app: nome "Meu Bolso" em fonte serif rosada

Botão "Entrar com e-mail"

Botão "Criar conta"

Abaixo: frase motivacional pequena — "Sua vida financeira, com carinho."

Autenticação via Supabase Auth (email + senha)

2. HOME — DASHBOARD PRINCIPAL

Layout mobile (max-width 390px). Componentes em ordem vertical:

A) Header:

Saudação dinâmica (Bom dia / Boa tarde / Boa noite), nome da usuária

Avatar circular com inicial do nome (rosé)

Ícone de notificações

B) Cartão de saldo (dark card, bordas arredondadas):

"Saldo disponível em [Mês atual]"

Valor calculado: total receitas − total gastos pagos

3 mini-indicadores: ↑ Receitas | ↓ Gastos pagos | ⏳ A pagar

C) Grid 2x2 de resumo:

Contas pagas (N de Total) + barra de progresso

Próximo vencimento (data + nome da conta)

Total salário do mês

Total renda extra do mês

D) Lista "Próximas contas" (3 primeiras por vencimento):

Ícone por categoria, nome, data de vencimento, valor

Botão circular de "dar baixa" (marcar como pago)

Ao tocar: feedback visual + toast "✓ Conta marcada como paga!"

E) FAB (botão flutuante rosé):

Ícone "+" abre modal para adicionar nova conta

3. TELA — CONTAS A PAGAR (/contas)

Header: "Contas a Pagar" + mês/ano atual

Filtros por pills:

Todas | Pendentes | Pagas | Atrasadas (data vencimento < hoje e pago = false)

Lista de contas: Cada item exibe:

Ícone emoji por categoria (🏠 Aluguel, 🎒 Escola, 💊 Farmácia, 💡 Luz, 📱 Celular, 🌊 Água, 🛒 Supermercado, etc.)

Nome da conta + subtexto (data vencimento ou "Pago em DD/Mês")

Valor

Botão de baixa circular:

Estado padrão: borda cinza, traço "–"

Ao tocar: fundo verde, checkmark "✓", valor riscado e opaco

Tocar novamente: desfaz a baixa

Modal "Nova Conta" (bottom sheet):

Campo: Descrição

Campo: Categoria (select com ícones)

Campo: Valor (teclado numérico)

Campo: Data de vencimento (date picker)

Toggle: Conta fixa/recorrente

Botão "Salvar" rosê

4. TELA — RECEITAS (/receitas)

Header: "Minhas Receitas" + mês/ano

Lista de receitas por mês: Cada item:

Descrição

Data de recebimento

Valor em verde

Tag colorida: Salário (verde suave) ou Extra (rosé suave)

Card de total: "Total recebido em [Mês]: R$ X.XXX,XX"

Modal "Nova Receita" (bottom sheet):

Campo: Descrição

Tipo: Salário / Renda Extra (toggle)

Campo: Valor

Campo: Data de recebimento

Botão "Adicionar"

5. TELA — PERFIL (/perfil)

Nome da usuária

Email

Botão "Sair" (logout Supabase)

NAVEGAÇÃO BOTTOM BAR

4 abas fixas na parte inferior:

🏠 Início

📋 Contas

💰 Receitas

👤 Perfil

Aba ativa: ícone e texto em rosé (#D4537E). Inativas: cinza.

IDENTIDADE VISUAL

Cores:
  --fundo-principal: #FFF8F5
  --fundo-card-dark: #2C2C2A
  --rosa-primario: #D4537E
  --rosa-suave: #FBEAF0
  --verde-positivo: #639922
  --cinza-texto: #888780
  --borda-suave: #F1EFE8

Tipografia:
  Títulos: 'Playfair Display' (Google Fonts) — elegante, feminino
  Corpo e UI: 'DM Sans' — legível, moderno

Border radius padrão: 16px para cards, 24px para cartão principal
Sombras: mínimas — apenas nos modais (bottom sheets)

REGRAS DE NEGÓCIO

Saldo disponível = soma das receitas do mês − soma das contas pagas do mês

"A pagar" = soma das contas com pago = false no mês

"Atrasada" = conta com data_vencimento < hoje e pago = false

Dar baixa salva pago = true e data_pagamento = hoje

Desfazer baixa reseta para pago = false e data_pagamento = null

Contas recorrentes: ao virar o mês, replicar automaticamente para o próximo mês com pago = false

FLUXO DE DESENVOLVIMENTO — ORDEM DE IMPLEMENTAÇÃO

Auth (login/cadastro com Supabase)

Tabelas Supabase + RLS

Bottom Navigation

Tela Receitas (mais simples)

Tela Contas com dar baixa

Dashboard Home com cálculos

Perfil

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mivagestor.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4d3529a5-cdf0-4c58-94ac-c4eb67b240fc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
