// src/app/api/email/confirm/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

    // Importa sólo si hay API key para no romper el build
    let Resend;
    try {
      const resendModule = await import("resend");
      Resend = resendModule.Resend || resendModule.default?.Resend || resendModule.default;
      if (!Resend) {
        throw new Error("Resend no disponible");
      }
    } catch (importError) {
      console.error("[email/confirm] Error importando resend:", importError);
      return NextResponse.json({ ok: false, error: "resend_not_available" }, { status: 500 });
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
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 500 });
  }
}
