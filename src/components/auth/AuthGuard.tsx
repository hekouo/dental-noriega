"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/lib/store/cartStore";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<unknown>(null);
  const router = useRouter();
  // loadFromSupabase removido del store simplificado

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
