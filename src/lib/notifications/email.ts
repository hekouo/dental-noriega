/**
 * Helper genérico para envío de correos transaccionales
 * Soporta Resend pero no falla si no está configurado
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult =
  | { ok: true }
  | { ok: false; reason: "disabled" | "missing_config" | "send_failed"; error?: string };

/**
 * Envía un correo transaccional usando Resend (si está configurado)
 * 
 * Variables de entorno requeridas (si EMAIL_ENABLED="true"):
 * - RESEND_API_KEY: API key de Resend
 * - EMAIL_FROM: Dirección de correo remitente (ej: "noreply@tudominio.com")
 * 
 * Si EMAIL_ENABLED no es "true" o faltan variables, solo hace console.warn y devuelve { ok: false, reason: "disabled" }
 */
export async function sendTransactionalEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const enabled = process.env.EMAIL_ENABLED === "true";

  // Si no está habilitado o faltan configuraciones, solo loguear y retornar
  if (!enabled || !apiKey || !from) {
    console.warn("[email] disabled, would send transactional email", {
      to: input.to,
      subject: input.subject,
    });
    return { ok: false, reason: "disabled" };
  }

  try {
    // Intentar usar Resend SDK si está disponible
    let Resend;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const resendModule = require("resend");
      Resend =
        resendModule.Resend ||
        resendModule.default?.Resend ||
        resendModule.default;
      
      if (!Resend) {
        throw new Error("Resend no disponible");
      }
    } catch (requireError: unknown) {
      const errorMsg =
        requireError instanceof Error
          ? requireError.message
          : String(requireError);
      
      if (
        errorMsg.includes("Cannot find module") ||
        errorMsg.includes("MODULE_NOT_FOUND")
      ) {
        console.warn(
          "[email] resend module not installed. Skipping send.",
        );
        return { ok: false, reason: "missing_config" };
      }
      
      console.error(
        "[email] Error cargando resend",
        {
          error:
            requireError instanceof Error
              ? { name: requireError.name, message: requireError.message }
              : String(requireError),
        },
      );
      return { ok: false, reason: "missing_config" };
    }

    // Enviar usando Resend SDK
    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text || input.html.replace(/<[^>]*>/g, ""), // Fallback a texto plano
    });

    if (result.error) {
      console.error(
        "[email] Resend error",
        {
          to: input.to,
          error:
            result.error instanceof Error
              ? { name: result.error.name, message: result.error.message }
              : String(result.error),
        },
      );
      return {
        ok: false,
        reason: "send_failed",
        error: result.error.message || "Unknown error",
      };
    }

    console.log("[email] Sent successfully", {
      to: input.to,
    });
    return { ok: true };
  } catch (err) {
    console.error(
      "[email] Unexpected error",
      {
        to: input.to,
        error:
          err instanceof Error
            ? { name: err.name, message: err.message }
            : String(err),
      },
    );
    return {
      ok: false,
      reason: "send_failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
