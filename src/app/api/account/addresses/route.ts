import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAddressesByEmail,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  type AccountAddress,
} from "@/lib/supabase/addresses.server";

// Schema de validación para crear/actualizar dirección
const addressSchema = z.object({
  full_name: z.string().min(1, "El nombre completo es requerido"),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos"),
  street: z.string().min(1, "La calle es requerida"),
  neighborhood: z.string().min(1, "La colonia es requerida"),
  city: z.string().min(1, "La ciudad es requerida"),
  state: z.string().min(1, "El estado es requerido"),
  zip_code: z.string().regex(/^\d{5}$/, "El código postal debe tener 5 dígitos"),
  country: z.string().default("México"),
  is_default: z.boolean().default(false),
});

// Schema para query params
const emailSchema = z.string().email("Email inválido");

/**
 * GET /api/account/addresses?email=...
 * Obtiene todas las direcciones de un usuario
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email es requerido" },
        { status: 400 },
      );
    }

    const validatedEmail = emailSchema.parse(email.trim().toLowerCase());
    const addresses = await getAddressesByEmail(validatedEmail);

    return NextResponse.json({ addresses });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 422 },
      );
    }

    console.error("[GET /api/account/addresses] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al obtener direcciones" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/account/addresses
 * Crea una nueva dirección
 * Body: { email: string, ...address }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, ...addressData } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email es requerido" },
        { status: 400 },
      );
    }

    const validatedEmail = emailSchema.parse(email.trim().toLowerCase());
    const validatedAddress = addressSchema.parse(addressData);

    const address = await createAddress(validatedEmail, validatedAddress);

    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 422 },
      );
    }

    console.error("[POST /api/account/addresses] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear dirección" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/account/addresses
 * Actualiza una dirección existente
 * Body: { id: string, email: string, ...address }
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, email, ...addressData } = body;

    if (!id || !email) {
      return NextResponse.json(
        { error: "ID y email son requeridos" },
        { status: 400 },
      );
    }

    const validatedEmail = emailSchema.parse(email.trim().toLowerCase());
    const validatedAddress = addressSchema.partial().parse(addressData);

    const address = await updateAddress(id, validatedEmail, validatedAddress);

    return NextResponse.json({ address });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 422 },
      );
    }

    console.error("[PUT /api/account/addresses] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar dirección" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/account/addresses
 * Elimina una dirección
 * Body: { id: string, email: string }
 */
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id, email } = body;

    if (!id || !email) {
      return NextResponse.json(
        { error: "ID y email son requeridos" },
        { status: 400 },
      );
    }

    const validatedEmail = emailSchema.parse(email.trim().toLowerCase());

    await deleteAddress(id, validatedEmail);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 422 },
      );
    }

    console.error("[DELETE /api/account/addresses] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al eliminar dirección" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/account/addresses
 * Marca una dirección como predeterminada
 * Body: { id: string, email: string }
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, email } = body;

    if (!id || !email) {
      return NextResponse.json(
        { error: "ID y email son requeridos" },
        { status: 400 },
      );
    }

    const validatedEmail = emailSchema.parse(email.trim().toLowerCase());

    const address = await setDefaultAddress(id, validatedEmail);

    return NextResponse.json({ address });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 422 },
      );
    }

    console.error("[PATCH /api/account/addresses] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al marcar dirección como predeterminada" },
      { status: 500 },
    );
  }
}

