import { Home, ListChecks, Wallet, PiggyBank, CalendarHeart, User } from "lucide-react";

export const tabs = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/contas", label: "Contas", icon: ListChecks },
  { to: "/receitas", label: "Receitas", icon: Wallet },
  { to: "/investimentos", label: "Guardado", icon: PiggyBank },
  { to: "/agenda", label: "Agenda", icon: CalendarHeart },
  { to: "/perfil", label: "Perfil", icon: User },
];
