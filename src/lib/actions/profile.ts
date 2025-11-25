"use server";

import { z } from "zod";
import { createActionSupabase } from "@/lib/supabase/server-actions";

const updateProfileSchema = z.object({
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().optional(),
});

export async function updateProfileAction(input: unknown) {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const { fullName, phone } = parsed.data;
  const supabase = createActionSupabase();

  // Obtener usuario actual
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "No se pudo obtener la información del usuario" };
  }

  // Actualizar user_metadata en auth.users
  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      phone: phone || null,
    },
  });

  if (updateError) {
    return { error: "No se pudo actualizar el perfil" };
  }

  // Actualizar también en user_profiles para mantener consistencia
  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
    })
    .eq("id", user.id);

  if (profileError) {
    // Si falla la actualización en user_profiles, no es crítico
    // porque ya actualizamos user_metadata
    console.warn("[updateProfileAction] Error actualizando user_profiles:", profileError);
  }

  return { success: true, message: "Perfil actualizado correctamente" };
}

