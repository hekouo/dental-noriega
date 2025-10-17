"use server";

import { z } from "zod";
import { createActionSupabase } from "@/lib/supabase/server-actions";

// Esquemas mínimos por si no los tenías
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z
  .object({
    fullName: z.string().min(2),
    phone: z.string().optional(),
    email: z.string().email(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

// LOGIN
export async function loginAction(input: z.infer<typeof loginSchema>) {
  const supabase = createActionSupabase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) return { error: error.message };
  if (!data.session) return { error: "No se pudo iniciar sesión" };

  return { success: true };
}

// REGISTRO
export async function registerAction(input: z.infer<typeof registerSchema>) {
  const supabase = createActionSupabase();

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        phone: input.phone ?? null,
      },
      emailRedirectTo: process.env.SITE_URL
        ? `${process.env.SITE_URL}/cuenta/perfil`
        : undefined,
    },
  });

  if (error) return { error: error.message };

  // Si tu proyecto requiere verificación por correo, aquí no habrá sesión aún.
  return {
    success: true,
    message: "Registro exitoso. Revisa tu correo para confirmar.",
  };
}
