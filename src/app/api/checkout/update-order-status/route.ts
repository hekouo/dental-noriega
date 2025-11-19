import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const BodySchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum(["paid", "pending", "failed", "processing"]),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { order_id, status } = BodySchema.parse(json);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      // Si Supabase no está configurado, retornar éxito igualmente
      return NextResponse.json({ success: true });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Si el status cambia a "paid", procesar puntos de lealtad
    if (status === "paid") {
      // Obtener la orden para verificar email y total
      // Nota: la tabla orders puede tener 'email' o 'contact_email', verificar ambos
      const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("email, contact_email, total_cents, metadata, status")
        .eq("id", order_id)
        .single();

      // Usar email o contact_email (según el schema real)
      const orderEmail = (order as { email?: string; contact_email?: string }).email || 
                         (order as { email?: string; contact_email?: string }).contact_email;

      if (!fetchError && order && orderEmail && order.total_cents) {
        // Solo procesar si la orden no estaba ya pagada
        if (order.status !== "paid") {
          try {
            const metadata = (order.metadata as Record<string, unknown>) || {};
            const loyaltyPointsEarned = metadata.loyalty_points_earned;

            // Solo añadir puntos si no se han añadido ya
            if (!loyaltyPointsEarned) {
              const { addLoyaltyPoints } = await import("@/lib/loyalty/points.server");
              const { LOYALTY_POINTS_PER_MXN } = await import("@/lib/loyalty/config");

              const mxnTotal = Math.max(0, Math.floor(order.total_cents / 100));
              const pointsEarned = mxnTotal * LOYALTY_POINTS_PER_MXN;

              if (pointsEarned > 0) {
                if (process.env.NODE_ENV === "development") {
                  console.log("[LOYALTY] about to add points", {
                    email: orderEmail,
                    pointsToAdd: pointsEarned,
                    mxnTotal,
                    context: "update-order-status",
                    order_id,
                  });
                }

                const loyaltySummary = await addLoyaltyPoints(orderEmail, pointsEarned);

                if (process.env.NODE_ENV === "development") {
                  console.log("[LOYALTY] points added successfully", {
                    email: orderEmail,
                    pointsEarned,
                    newBalance: loyaltySummary.pointsBalance,
                  });
                }

                // Actualizar metadata de la orden
                await supabase
                  .from("orders")
                  .update({
                    metadata: {
                      ...metadata,
                      loyalty_points_earned: pointsEarned,
                      loyalty_points_balance_after: loyaltySummary.pointsBalance,
                    },
                  })
                  .eq("id", order_id);
              }
            }
          } catch (loyaltyError) {
            // No fallar la actualización si falla la lógica de puntos
            console.error("[update-order-status] Error al procesar puntos:", loyaltyError);
            if (process.env.NODE_ENV === "development") {
              console.error("[LOYALTY] error details:", {
                email: orderEmail,
                error: loyaltyError instanceof Error ? loyaltyError.message : String(loyaltyError),
              });
            }
          }
        }
      } else {
        if (process.env.NODE_ENV === "development") {
          console.log("[LOYALTY] skipping - no email or order not found", {
            hasOrder: !!order,
            hasEmail: !!orderEmail,
            fetchError: fetchError?.message,
          });
        }
      }
    }

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", order_id);

    if (error) {
      console.error("[update-order-status] Error:", error);
      return NextResponse.json(
        { error: "Error al actualizar el estado de la orden" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[update-order-status] Error:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 },
    );
  }
}

