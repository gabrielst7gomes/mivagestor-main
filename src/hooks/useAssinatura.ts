import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type StatusAssinatura = "trial" | "ativa" | "vencida" | "cancelada";

export interface Assinatura {
  id: string;
  status: StatusAssinatura;
  metodo: "pix" | "cartao" | null;
  valor: number;
  trial_fim: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  ultimo_pagamento_id: string | null;
  recorrencia_ativa?: boolean;
  mp_preapproval_id?: string | null;
}

export function useAssinatura() {
  const { user } = useAuth();
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!user) {
      setAssinatura(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("assinaturas")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setAssinatura(data as Assinatura | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { carregar(); }, [carregar]);

  // Realtime: atualiza quando o webhook ativar a assinatura
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`assinatura:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assinaturas", filter: `user_id=eq.${user.id}` },
        () => carregar()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, carregar]);

  // Calcula dias restantes localmente
  const referencia =
    assinatura?.status === "trial"
      ? assinatura.trial_fim
      : assinatura?.status === "ativa"
        ? assinatura.periodo_fim
        : null;

  const diasRestantes = (() => {
    if (!referencia) return 0;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const [y, m, d] = referencia.split("-").map(Number);
    const fim = new Date(y, m - 1, d);
    const diff = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  })();

  const ativa =
    !!assinatura &&
    ((assinatura.status === "trial" || assinatura.status === "ativa") &&
      diasRestantes > 0);

  return { assinatura, loading, recarregar: carregar, diasRestantes, ativa };
}
