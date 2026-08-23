import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, user, loading } = useAuth();
  const location = useLocation();
  const [acesso, setAcesso] = useState<"checando" | "ok" | "bloqueado">("checando");

  useEffect(() => {
    let cancel = false;
    async function check() {
      if (!user) return;
      // /plano e /auth são sempre acessíveis (assim a usuária consegue renovar)
      if (location.pathname === "/plano") {
        setAcesso("ok");
        return;
      }
      const { data } = await supabase
        .from("assinaturas")
        .select("status, trial_fim, periodo_fim")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancel) return;
      if (!data) { setAcesso("bloqueado"); return; }

      const hoje = new Date().toISOString().slice(0, 10);
      const trialOk = data.status === "trial" && data.trial_fim && data.trial_fim >= hoje;
      const ativaOk = data.status === "ativa" && data.periodo_fim && data.periodo_fim >= hoje;
      setAcesso(trialOk || ativaOk ? "ok" : "bloqueado");
    }
    if (user) check();
    return () => { cancel = true; };
  }, [user, location.pathname]);

  if (loading || (session && acesso === "checando")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground font-serif text-lg">Carregando…</div>
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace />;
  if (acesso === "bloqueado") return <Navigate to="/plano" replace />;
  return <>{children}</>;
}
