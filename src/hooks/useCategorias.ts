import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ThiingName } from "@/components/ThiingIcon";

export type CategoriaKind = "conta" | "receita";

export interface Categoria {
  id: string;
  user_id: string;
  kind: CategoriaKind;
  nome: string;
  emoji: string;
  thiing: ThiingName;
  ordem: number;
}

export function useCategorias(kind?: CategoriaKind) {
  const { user } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!user) return;
    let q = supabase.from("categorias").select("*").eq("user_id", user.id).order("ordem").order("nome");
    if (kind) q = q.eq("kind", kind);
    const { data } = await q;
    setCategorias((data ?? []) as Categoria[]);
    setLoading(false);
  }, [user, kind]);

  useEffect(() => { carregar(); }, [carregar]);

  /** Resolve uma categoria pelo nome (case-insensitive) ou retorna fallback "Outros". */
  const findByNome = useCallback((nome?: string | null): Categoria | undefined => {
    if (!nome) return categorias.find((c) => c.nome.toLowerCase() === "outros");
    const direct = categorias.find((c) => c.nome.toLowerCase() === nome.toLowerCase());
    return direct ?? categorias.find((c) => c.nome.toLowerCase() === "outros");
  }, [categorias]);

  return { categorias, loading, recarregar: carregar, findByNome };
}
