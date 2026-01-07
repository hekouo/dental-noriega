import { NextRequest, NextResponse } from "next/server";
import "server-only";

type ShippingAddress = {
	name: string;
	phone?: string | null;
	email?: string | null;
	address1: string;
	address2?: string | null;
	city: string;
	state: string;
	postal_code: string;
	country?: string;
};

type AddressValidationResult = {
	verdict: "valid" | "needs_review" | "invalid";
	normalized_address: ShippingAddress | null;
	needs_confirmation: boolean;
	missing_fields: string[];
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeAddress(addr: ShippingAddress): ShippingAddress {
	return {
		...addr,
		address1: String(addr.address1 || "").trim(),
		address2: addr.address2 ? String(addr.address2).trim() : null,
		city: String(addr.city || "").trim(),
		state: String(addr.state || "").trim(),
		postal_code: String(addr.postal_code || "").trim(),
		country: (addr.country || "MX").toUpperCase(),
		name: String(addr.name || "").trim(),
		phone: addr.phone ? String(addr.phone).trim() : null,
		email: addr.email ? String(addr.email).trim().toLowerCase() : null,
	};
}

function basicValidate(addr: ShippingAddress): AddressValidationResult {
	const missing: string[] = [];
	if (!addr.name) missing.push("name");
	if (!addr.address1) missing.push("address1");
	if (!addr.city) missing.push("city");
	if (!addr.state) missing.push("state");
	if (!addr.postal_code) missing.push("postal_code");
	const normalized = normalizeAddress(addr);
	const postalOk = /^\d{5}$/.test(normalized.postal_code);
	if (!postalOk && !missing.includes("postal_code")) missing.push("postal_code");
	const needsReview = missing.length > 0 || !postalOk;
	return {
		verdict: needsReview ? "needs_review" : "valid",
		normalized_address: normalized,
		needs_confirmation: needsReview,
		missing_fields: missing,
	};
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json().catch(() => null);
		if (!body || typeof body !== "object" || !("shipping_address" in body)) {
			return NextResponse.json(
				{
					error: "Datos inválidos: se requiere { shipping_address }",
				},
				{ status: 400 },
			);
		}
		const shipping_address = (body as { shipping_address: ShippingAddress }).shipping_address;
		if (!shipping_address || typeof shipping_address !== "object") {
			return NextResponse.json(
				{
					error: "shipping_address inválido",
				},
				{ status: 400 },
			);
		}

		// Si hay API externa configurada, intentar usarla
		const extUrl = process.env.ADDRESS_VALIDATION_API_URL;
		const extKey = process.env.ADDRESS_VALIDATION_API_KEY;

		if (extUrl) {
			try {
				const resp = await fetch(extUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(extKey ? { Authorization: `Bearer ${extKey}` } : {}),
					},
					body: JSON.stringify({ shipping_address }),
					// No cache para validación
					cache: "no-store",
				});
				if (resp.ok) {
					const data = (await resp.json()) as Partial<AddressValidationResult>;
					// Ensamblar con defaults por seguridad
					const result: AddressValidationResult = {
						verdict: (data.verdict as AddressValidationResult["verdict"]) || "needs_review",
						normalized_address: (data.normalized_address as ShippingAddress | null) || normalizeAddress(shipping_address),
						needs_confirmation: Boolean(data.needs_confirmation ?? data.verdict !== "valid"),
						missing_fields: Array.isArray(data.missing_fields) ? (data.missing_fields as string[]) : [],
					};
					return NextResponse.json(result);
				}
				// Si falla la API externa, cae al validador básico
			} catch {
				// Ignorar y usar validación básica
			}
		}

		// Validación básica local
		const basic = basicValidate(shipping_address);
		return NextResponse.json(basic);
	} catch (err) {
		return NextResponse.json(
			{
				error: err instanceof Error ? err.message : "Error inesperado",
			},
			{ status: 500 },
		);
	}
}


