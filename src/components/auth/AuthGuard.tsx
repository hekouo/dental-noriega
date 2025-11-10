"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<unknown>(null);
  const router = useRouter();
  // loadFromSupabase removido del store simplificado

  useEffect(() => {
    const s = getBrowserSupabase();
    if (!s) {
      setIsLoading(false);
      return;
    }
    s.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/cuenta");
      } else {
        setUser(user);
        // Cargar carrito desde Supabase - removido del store simplificado
      }
      setIsLoading(false);
    });
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" aria-hidden="true"></div>
        <span className="sr-only">Cargando...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
