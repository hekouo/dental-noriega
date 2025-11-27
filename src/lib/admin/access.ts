import "server-only";
import { createActionSupabase } from "@/lib/supabase/server-actions";

/**
 * Resultado de verificación de acceso admin
 */
export type AdminAccessResult =
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "allowed"; userEmail: string };

/**
 * Verifica si el usuario actual tiene acceso al panel de administración
 * basándose en la variable de entorno ADMIN_ALLOWED_EMAILS
 * 
 * @returns Resultado estructurado:
 *   - `{ status: "unauthenticated" }`: Usuario no autenticado → debe redirigir a /cuenta
 *   - `{ status: "forbidden" }`: Usuario autenticado pero no admin → debe devolver notFound()
 *   - `{ status: "allowed", userEmail: string }`: Usuario admin → acceso permitido
 * 
 * @example
 * // En .env.local:
 * ADMIN_ALLOWED_EMAILS=admin@example.com,otro@example.com
 * 
 * // Uso en página:
 * const access = await checkAdminAccess();
 * if (access.status === "unauthenticated") {
 *   redirect("/cuenta");
 * }
 * if (access.status === "forbidden") {
 *   notFound();
 * }
 * // access.status === "allowed" → continuar
 */
export async function checkAdminAccess(): Promise<AdminAccessResult> {
  const allowedEmailsEnv = process.env.ADMIN_ALLOWED_EMAILS;
  
  if (!allowedEmailsEnv || allowedEmailsEnv.trim().length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[checkAdminAccess] ADMIN_ALLOWED_EMAILS no está configurado. Acceso denegado.",
      );
    }
    // Si no hay configuración, cualquier usuario autenticado es "forbidden"
    // pero primero verificamos si hay usuario
  }

  // Parsear lista de emails permitidos (si existe)
  const allowedEmails = allowedEmailsEnv
    ? allowedEmailsEnv
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0)
    : [];

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
      return { status: "unauthenticated" };
    }

    const userEmail = user.email.trim().toLowerCase();

    // Si no hay emails permitidos configurados, denegar acceso
    if (allowedEmails.length === 0) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[checkAdminAccess] ADMIN_ALLOWED_EMAILS está vacío. Acceso denegado.",
        );
      }
      return { status: "forbidden" };
    }

    const allowed = allowedEmails.includes(userEmail);

    if (process.env.NODE_ENV === "development") {
      console.log("[checkAdminAccess] Verificación:", {
        userEmail,
        allowed,
        allowedEmails,
      });
    }

    if (allowed) {
      return { status: "allowed", userEmail };
    }

    return { status: "forbidden" };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[checkAdminAccess] Error al verificar acceso:", err);
    }
    // En caso de error, asumir no autenticado para seguridad
    return { status: "unauthenticated" };
  }
}

