import type { ThiingName } from "@/components/ThiingIcon";

// Categorias com ícones (emoji) usadas em contas
// `thiing` mapeia a categoria para um ícone 3D claymorphism quando aplicável
export const CATEGORIAS = [
  { value: "moradia", label: "Moradia / Aluguel", emoji: "🏠", thiing: "house" as ThiingName },
  { value: "luz", label: "Luz", emoji: "💡", thiing: "bill" as ThiingName },
  { value: "agua", label: "Água", emoji: "🌊", thiing: "bill" as ThiingName },
  { value: "internet", label: "Internet", emoji: "🌐", thiing: "bill" as ThiingName },
  { value: "celular", label: "Celular", emoji: "📱", thiing: "bill" as ThiingName },
  { value: "supermercado", label: "Supermercado", emoji: "🛒", thiing: "wallet" as ThiingName },
  { value: "escola", label: "Escola", emoji: "🎒", thiing: "bill" as ThiingName },
  { value: "farmacia", label: "Farmácia / Saúde", emoji: "💊", thiing: "flower" as ThiingName },
  { value: "transporte", label: "Transporte", emoji: "🚌", thiing: "wallet" as ThiingName },
  { value: "cartao", label: "Cartão de crédito", emoji: "💳", thiing: "wallet" as ThiingName },
  { value: "lazer", label: "Lazer", emoji: "🎬", thiing: "flower" as ThiingName },
  { value: "beleza", label: "Beleza / Cuidado", emoji: "💄", thiing: "flower" as ThiingName },
  { value: "assinatura", label: "Assinaturas", emoji: "📺", thiing: "bill" as ThiingName },
  { value: "outros", label: "Outros", emoji: "✨", thiing: "coins" as ThiingName },
] as const;

export type CategoriaValue = (typeof CATEGORIAS)[number]["value"];

export function getCategoria(value: string) {
  return CATEGORIAS.find((c) => c.value === value) ?? CATEGORIAS[CATEGORIAS.length - 1];
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function mesAtual() {
  return new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function intervaloMesAtual() {
  const now = new Date();
  return intervaloMes(now.getFullYear(), now.getMonth() + 1);
}

/** Intervalo (inicio, fim, ano, mes) para um ano/mês arbitrário. `mes` é 1-12. */
export function intervaloMes(ano: number, mes: number) {
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: fmt(inicio), fim: fmt(fim), ano, mes };
}

/** Nome do mês formatado em português, ex: "maio de 2026". */
export function nomeMes(ano: number, mes: number) {
  return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function formatData(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function formatDataLonga(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

export function isAtrasada(dataVenc: string, pago: boolean) {
  if (pago) return false;
  const hoje = new Date().toISOString().slice(0, 10);
  return dataVenc < hoje;
}

export function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Iniciais (até 2 letras) para avatar fallback. Ex: "João Gabriel Andrade" → "JA". */
export function iniciais(nomeOuEmail?: string | null) {
  if (!nomeOuEmail) return "?";
  const base = nomeOuEmail.trim();
  if (!base) return "?";
  // Se for email, pega antes do @
  const limpo = base.includes("@") ? base.split("@")[0] : base;
  const partes = limpo.replace(/[._-]+/g, " ").split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** Abrevia um nome para exibição: primeiro nome + inicial dos demais. Ex: "João Gabriel Gomes de Andrade" → "João G. A.". */
export function nomeAbreviado(nomeCompleto?: string | null) {
  if (!nomeCompleto) return "";
  const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  if (partes.length === 1) return capitalizar(partes[0]);
  const ignorar = new Set(["da", "de", "do", "das", "dos", "e"]);
  const primeiro = capitalizar(partes[0]);
  const iniciaisRestantes = partes
    .slice(1)
    .filter((p) => !ignorar.has(p.toLowerCase()))
    .map((p) => p[0].toUpperCase() + ".")
    .join(" ");
  return iniciaisRestantes ? `${primeiro} ${iniciaisRestantes}` : primeiro;
}

function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

