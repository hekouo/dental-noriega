// src/app/api/email/confirm/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = {
  to?: string | string[];
  subject?: string;
  html?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[email/confirm] RESEND_API_KEY missing. Skipping send.");
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Intentar importar resend solo si hay API key
    // Usar require para evitar análisis estático de webpack
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
          "[email/confirm] resend module not installed. Skipping send.",
        );
        return NextResponse.json({
          ok: true,
          skipped: true,
          reason: "resend_not_installed",
        });
      }
      console.error("[email/confirm] Error cargando resend:", requireError);
      return NextResponse.json(
        { ok: false, error: "resend_not_available" },
        { status: 500 },
      );
    }

    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: "no-reply@ddn.example",
      to: body.to ?? "test@example.com",
      subject: body.subject ?? "Confirmación de pedido",
      html: body.html ?? "<p>Gracias por tu compra.</p>",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[email/confirm] error:", err);
    return NextResponse.json(
      { ok: false, error: "send_failed" },
      { status: 500 },
    );
  }
}
