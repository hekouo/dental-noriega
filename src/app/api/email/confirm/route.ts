import { NextRequest, NextResponse } from "next/server";

type EmailRequest = {
  to: string;
  orderRef: string;
  resumen?: {
    items?: Array<{ title: string; qty: number; price: number }>;
    subtotal?: number;
    shipping?: number;
    total?: number;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EmailRequest;

    if (!body.to || !body.orderRef) {
      return NextResponse.json(
        { error: "Faltan campos requeridos (to, orderRef)" },
        { status: 400 },
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      try {
        // Dynamic import para evitar error si resend no está instalado
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const resendModule = require("resend");
        const Resend = resendModule.Resend || resendModule.default?.Resend || resendModule.default;
        if (!Resend) {
          throw new Error("Resend no disponible");
        }
        const resend = new Resend(resendApiKey);

        const itemsHtml =
          body.resumen?.items
            ?.map(
              (item) =>
                `<li>${item.title} x${item.qty} - ${formatMXN(item.price * item.qty)}</li>`,
            )
            .join("") || "";

        const { data, error } = await resend.emails.send({
          from: "Dental Noriega <noreply@dentalnoriega.com>",
          to: body.to,
          subject: `Confirmación de pedido ${body.orderRef}`,
          html: `
            <h1>¡Gracias por tu pedido!</h1>
            <p>Tu número de orden es: <strong>${body.orderRef}</strong></p>
            ${body.resumen ? `
              <h2>Resumen:</h2>
              <ul>${itemsHtml}</ul>
              <p><strong>Total: ${formatMXN(body.resumen.total || 0)}</strong></p>
            ` : ""}
            <p>Te contactaremos pronto para coordinar el pago y el envío.</p>
          `,
        });

        if (error) {
          console.error("[POST /api/email/confirm] Error de Resend:", error);
          return NextResponse.json(
            { error: "Error al enviar email" },
            { status: 500 },
          );
        }

        return NextResponse.json({ success: true, messageId: data?.id });
      } catch (resendError) {
        console.error("[POST /api/email/confirm] Error con Resend:", resendError);
        // Fallback a log si falla Resend
        console.log(
          `[EMAIL PLACEHOLDER] Enviar confirmación a ${body.to} para orden ${body.orderRef}`,
        );
        return NextResponse.json({ success: true, placeholder: true });
      }
    }

    // Sin RESEND_API_KEY: solo log
    console.log(
      `[EMAIL PLACEHOLDER] Enviar confirmación a ${body.to} para orden ${body.orderRef}`,
      body.resumen,
    );
    return NextResponse.json({ success: true, placeholder: true });
  } catch (error) {
    console.error("[POST /api/email/confirm] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

function formatMXN(v: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(v);
}

