import { ReactNode } from "react";
import { NavLink, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { LayoutDashboard, Users, CreditCard, LogOut, ArrowLeft, ArrowDownToLine, Settings } from "lucide-react";
import { MivaLogo } from "@/components/MivaLogo";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/usuarias", label: "Usuárias", icon: Users },
  { to: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard },
  { to: "/admin/saques", label: "Saques PIX", icon: ArrowDownToLine },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminLayout({ children, title, subtitle }: Props) {
  const { user, loading, signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Carregando…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="card-soft max-w-md text-center py-10">
          <h1 className="font-serif text-2xl text-foreground mb-2">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Esta área é exclusiva para administradores.
          </p>
          <button
            onClick={() => navigate("/")}
            className="h-10 px-5 rounded-full gradient-rose text-primary-foreground text-sm font-semibold shadow-rose"
          >
            Voltar para o app
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-background border-r border-border flex flex-col">
        <div className="p-5 border-b border-border">
          <MivaLogo size="md" variant="rose" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary mt-1 font-semibold">
            Painel Admin
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} /> Voltar ao app
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <header className="bg-background border-b border-border px-8 py-6">
          <h1 className="font-serif text-3xl text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
