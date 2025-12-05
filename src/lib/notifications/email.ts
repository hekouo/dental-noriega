/**
 * Helper genérico para envío de correos transaccionales
 * Usa Resend si está configurado, sino solo loguea
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult = {
  ok: boolean;
  reason?: string;
};

/**
 * Envía un correo transaccional usando Resend
 * Si no está configurado, solo loguea y devuelve ok: false
 */
export async function sendTransactionalEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "no-reply@ddn.example";
  const emailEnabled = process.env.EMAIL_ENABLED === "true";

  // Si no está habilitado o falta configuración, solo loguear
  if (!apiKey || !emailEnabled) {
    console.warn("[email] disabled, would send:", {
      to: input.to,
      subject: input.subject,
      html: input.html.substring(0, 100) + "...",
    });
    return { ok: false, reason: "disabled" };
  }

  // Intentar importar Resend dinámicamente
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
      console.warn("[email] resend module not installed. Skipping send.");
      return { ok: false, reason: "resend_not_installed" };
    }
    console.error("[email] Error cargando resend:", requireError);
    return { ok: false, reason: "resend_not_available" };
  }

  // Enviar correo
  try {
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    return { ok: true };
  } catch (err) {
    console.error("[email] Error al enviar:", err);
    return { ok: false, reason: "send_failed" };
  }
}

