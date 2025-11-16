import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import Stripe from "stripe";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Schema Zod para validación
const CreatePaymentIntentRequestSchema = z.object({
  order_id: z.string().uuid(),
  total_cents: z.number().int().positive().optional(),
});

type CreatePaymentIntentRequest = z.infer<typeof CreatePaymentIntentRequestSchema>;

// Verificar que STRIPE_SECRET_KEY existe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("[create-payment-intent] STRIPE_SECRET_KEY no está configurado");
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    })
  : null;

export async function POST(req: NextRequest) {
  noStore();
  
  // Variables para contexto en catch
  let order_id: string | undefined;
  let amount: number | null | undefined;
  let total_cents: number | undefined;
  
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe no está configurado. Verifica que STRIPE_SECRET_KEY esté definido en las variables de entorno." },
        { status: 500 },
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Error al inicializar Stripe" },
        { status: 500 },
      );
    }

    const body = await req.json().catch(() => null);
    
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Datos inválidos: se espera un objeto JSON" },
        { status: 400 },
      );
    }

    // Validar con Zod
    const validationResult = CreatePaymentIntentRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      return NextResponse.json(
        { error: `Datos inválidos: ${errors}` },
        { status: 400 },
      );
    }

    const data = validationResult.data;
    ({ order_id, total_cents } = data);

    // Usar total_cents del body como fuente principal
    let amount: number | null = total_cents && total_cents > 0 ? total_cents : null;

    // Log controlado para debugging
    const debug = process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1";
    if (debug) {
      console.info("[create-payment-intent] Iniciando con:", {
        order_id,
        total_cents_from_body: total_cents,
        amount_from_body: amount,
      });
    }

    // Si no hay total_cents válido en el body, usar fallback desde DB
    if (!amount || amount <= 0) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && serviceRoleKey) {
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });

        // Buscar la orden
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("total")
          .eq("id", order_id)
          .single();

        if (orderError || !order) {
          console.warn("[create-payment-intent] Orden no encontrada:", {
            order_id,
            error: orderError?.message,
          });
          return NextResponse.json(
            { error: `Orden no encontrada: ${order_id}` },
            { status: 404 },
          );
        }

        // Determinar amount desde orders.total (convertir a centavos)
        amount = order.total ? Math.round(order.total * 100) : 0;
        
        // Log controlado para debugging
        if (debug) {
          console.info("[create-payment-intent] Orden encontrada en DB:", {
            order_id,
            total: order.total,
            amount_from_db: amount,
          });
        }

        // Si amount es 0 o negativo, recomputar desde order_items
        if (!amount || amount <= 0) {
          const { data: items, error: itemsError } = await supabase
            .from("order_items")
            .select("qty, price")
            .eq("order_id", order_id);

          if (itemsError) {
            console.warn("[create-payment-intent] Error al obtener items:", itemsError.message);
            return NextResponse.json(
              { error: "Error al calcular el monto de la orden" },
              { status: 500 },
            );
          }

          if (!items || items.length === 0) {
            console.warn("[create-payment-intent] Orden sin items:", order_id);
            return NextResponse.json(
              { error: "Orden sin monto válido" },
              { status: 422 },
            );
          }

          // Recomputar: SUM(qty * price) y convertir a centavos
          const recomputedTotal = items.reduce(
            (sum, item) => sum + (item.qty || 0) * (item.price || 0),
            0,
          );
          amount = Math.round(recomputedTotal * 100);

          // Log controlado para debugging
          if (debug) {
            console.info("[create-payment-intent] Recomputando desde items:", {
              order_id,
              items_count: items.length,
              items: items.map((i) => ({
                qty: i.qty,
                price: i.price,
                subtotal: (i.qty || 0) * (i.price || 0),
              })),
              recomputed_total_decimal: recomputedTotal,
              recomputed_total_cents: amount,
            });
          }

          if (amount <= 0) {
            const errorInfo = {
              order_id,
              amount,
              total_cents_from_body: total_cents,
              order_from_db: order.total,
              recomputed_total_cents: amount,
            };
            
            if (debug) {
              console.warn("[create-payment-intent] invalid amount después de recomputar", errorInfo);
            }
            
            return NextResponse.json(
              { error: "No se pudo determinar el monto de la orden" },
              { status: 422 },
            );
          }
        }
      }
    }

    if (!amount || amount <= 0) {
      const errorInfo = {
        order_id,
        amount,
        total_cents_from_body: total_cents,
      };
      
      if (debug) {
        console.warn("[create-payment-intent] invalid amount final", errorInfo);
      }
      
      return NextResponse.json(
        { error: "No se pudo determinar el monto de la orden" },
        { status: 422 },
      );
    }

    // Log controlado antes de crear PaymentIntent
    if (debug) {
      console.info("[create-payment-intent] Creando PaymentIntent:", {
        order_id,
        amount,
        currency: "mxn",
        source: total_cents && total_cents > 0 ? "body" : "db",
      });
    }

    // Idempotencia: incluir amount en la key para evitar errores cuando cambia el monto
    // Si la misma orden se intenta con el mismo amount → idempotente
    // Si cambia el amount (cupón, shipping, etc.) → nueva key, no da error
    const idempotencyKey = `pi_${order_id}_${amount}`;

    // Log controlado antes de crear PaymentIntent
    if (debug) {
      console.info("[create-payment-intent] Creando PaymentIntent con idempotency:", {
        order_id,
        amount,
        idempotencyKey,
      });
    }

    // Obtener email de la orden desde Supabase para usar en Stripe
    // Prioridad: orders.email > metadata.contact_email > body.email
    let customerEmail: string | undefined = undefined;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Configuración de Supabase no disponible" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Buscar orden con email y metadata
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, email, metadata")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: `Orden no encontrada: ${order_id}` },
        { status: 404 },
      );
    }

    // Prioridad 1: orders.email
    if (order.email) {
      customerEmail = order.email;
      if (debug) {
        console.info("[create-payment-intent] Email obtenido de orders.email:", {
          order_id,
          email: customerEmail,
        });
      }
    } else {
      // Prioridad 2: metadata.contact_email
      const metadata = order.metadata as Record<string, unknown> | null;
      if (metadata && typeof metadata === "object" && "contact_email" in metadata) {
        const contactEmail = metadata.contact_email;
        if (typeof contactEmail === "string" && contactEmail.length > 0) {
          customerEmail = contactEmail;
          if (debug) {
            console.info("[create-payment-intent] Email obtenido de metadata.contact_email:", {
              order_id,
              email: customerEmail,
            });
          }
        }
      }
    }

    // Prioridad 3: body.email (solo si no se encontró en orden)
    if (!customerEmail && body && typeof body === "object" && "email" in body) {
      const bodyEmail = body.email;
      if (typeof bodyEmail === "string" && bodyEmail.length > 0) {
        customerEmail = bodyEmail;
        if (debug) {
          console.info("[create-payment-intent] Email obtenido de body:", {
            order_id,
            email: customerEmail,
          });
        }
      }
    }

    // Validar que existe email antes de crear PaymentIntent
    if (!customerEmail) {
      return NextResponse.json(
        { error: "Missing email for order. Email is required for Stripe payment." },
        { status: 422 },
      );
    }

    // Obtener título del primer producto para description
    let description = `Depósito Dental Noriega - Pedido ${order.id}`;
    try {
      const { data: items } = await supabase
        .from("order_items")
        .select("title")
        .eq("order_id", order_id)
        .limit(1);

      const mainTitle = items?.[0]?.title;
      if (mainTitle && typeof mainTitle === "string" && mainTitle.length > 0) {
        description = `Depósito Dental Noriega - Pedido ${order.id} - ${mainTitle}`;
      }
    } catch (itemsError) {
      // Si falla obtener items, usar description básica
      if (debug) {
        console.warn("[create-payment-intent] No se pudo obtener título del producto:", itemsError);
      }
    }

    // Crear PaymentIntent con idempotencia, email del cliente y description útil
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: "mxn",
        receipt_email: customerEmail, // Email para el recibo de Stripe
        description, // Descripción útil con order.id y título del primer producto
        metadata: {
          order_id: order_id,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      },
      {
        idempotencyKey,
      },
    );

    if (!paymentIntent.client_secret) {
      return NextResponse.json(
        { error: "No se recibió client_secret de Stripe" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount,
    });
  } catch (error) {
    // Manejo mejorado de errores de Stripe
    const debug = process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1";
    
    // Capturar contexto disponible del scope
    const context = {
      order_id: order_id ?? "unknown",
      amount: amount ?? "unknown",
      total_cents_from_body: total_cents ?? "unknown",
    };
    
    if (error && typeof error === "object" && "type" in error) {
      // Es un error de Stripe
      const stripeError = error as Stripe.errors.StripeError;
      const errorInfo = {
        type: stripeError.type,
        message: stripeError.message,
        code: stripeError.code,
        param: stripeError.param,
        requestId: stripeError.requestId,
        ...context,
      };
      
      if (debug) {
        console.error("[create-payment-intent] Stripe error:", errorInfo);
      } else {
        console.warn("[create-payment-intent] Stripe error:", {
          type: stripeError.type,
          message: stripeError.message,
          code: stripeError.code,
          order_id: context.order_id,
        });
      }
      
      return NextResponse.json(
        {
          error: stripeError.message ?? "Error al crear payment intent",
        },
        { status: 500 },
      );
    }
    
    // Error genérico
    const errorMessage =
      error instanceof Error ? error.message : "Error al crear payment intent";
    
    if (debug) {
      console.error("[create-payment-intent] Error:", {
        message: errorMessage,
        ...context,
        error,
      });
    } else {
      console.warn("[create-payment-intent]", errorMessage, context);
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
