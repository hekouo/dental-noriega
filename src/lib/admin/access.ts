import "server-only";
import { createActionSupabase } from "@/lib/supabase/server-actions";

/**
 * Verifica si el usuario actual tiene acceso al panel de administración
 * basándose en la variable de entorno ADMIN_ALLOWED_EMAILS
 * 
 * @returns Objeto con `allowed: boolean` y `email: string | null`
 * 
 * @example
 * // En .env.local:
 * ADMIN_ALLOWED_EMAILS=admin@example.com,otro@example.com
 * 
 * // Uso:
 * const { allowed, email } = await checkAdminAccess();
 * if (!allowed) {
 *   return notFound();
 * }
 */
export async function checkAdminAccess(): Promise<{
  allowed: boolean;
  email: string | null;
}> {
  const allowedEmailsEnv = process.env.ADMIN_ALLOWED_EMAILS;
  
  if (!allowedEmailsEnv || allowedEmailsEnv.trim().length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[checkAdminAccess] ADMIN_ALLOWED_EMAILS no está configurado. Acceso denegado.",
      );
    }
    return { allowed: false, email: null };
  }

  // Parsear lista de emails permitidos
  const allowedEmails = allowedEmailsEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  if (allowedEmails.length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[checkAdminAccess] ADMIN_ALLOWED_EMAILS está vacío. Acceso denegado.",
      );
    }
    return { allowed: false, email: null };
  }

  // Obtener email del usuario autenticado
  try {
    const supabase = createActionSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      if (process.env.NODE_ENV === "development") {
        console.log("[checkAdminAccess] Usuario no autenticado.");
      }
      return { allowed: false, email: null };
    }

    const userEmail = user.email.trim().toLowerCase();
    const allowed = allowedEmails.includes(userEmail);

    if (process.env.NODE_ENV === "development") {
      console.log("[checkAdminAccess] Verificación:", {
        userEmail,
        allowed,
        allowedEmails,
      });
    }

    return {
      allowed,
      email: allowed ? userEmail : null,
    };
  } catch (err) {
    console.error("[checkAdminAccess] Error al verificar acceso:", err);
    return { allowed: false, email: null };
  }
}

