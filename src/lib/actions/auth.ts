"use server";

import { z } from "zod";
import { createActionSupabase } from "@/lib/supabase/server-actions";

// Esquemas internos (no exportados)
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z
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
export async function loginAction(input: unknown) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { email, password } = parsed.data;
  const supabase = createActionSupabase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error: error.message };
  if (!data.session) return { error: "No se pudo iniciar sesión" };

  return { success: true };
}

// REGISTRO
export async function registerAction(input: unknown) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { fullName, phone, email, password } = parsed.data;
  const supabase = createActionSupabase();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone ?? null,
      },
      emailRedirectTo: process.env.SITE_URL
        ? `${process.env.SITE_URL}/cuenta/perfil`
        : undefined,
    },
  });

  if (error) return { error: error.message };

  return {
    success: true,
    message: "Registro exitoso. Revisa tu correo para confirmar.",
  };
}

// LOGOUT
export async function logoutAction() {
  const supabase = createActionSupabase();
  await supabase.auth.signOut();
  return { success: true };
}

// GOOGLE OAUTH
export async function signInWithGoogleAction() {
  const supabase = createActionSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002"}/cuenta/perfil`,
    },
  });

  if (error) return { error: error.message };
  if (!data.url) return { error: "No se pudo iniciar sesión con Google" };

  return { success: true, url: data.url };
}
