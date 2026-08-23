import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase.rpc("is_admin").then(({ data, error }) => {
      if (error) {
        console.error(error);
        setIsAdmin(false);
      } else {
        setIsAdmin(Boolean(data));
      }
    });
  }, [user, authLoading]);

  return { isAdmin, loading: isAdmin === null };
}
