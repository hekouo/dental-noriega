import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Tipo para dirección de cuenta
 */
export type AccountAddress = {
  id: string;
  user_email: string;
  full_name: string;
  phone: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Crea un cliente Supabase con SERVICE_ROLE_KEY (bypassa RLS)
 * Reutiliza el mismo patrón que los endpoints de checkout y orders
 */
function createServiceRoleSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan variables de Supabase (URL o SERVICE_ROLE_KEY)");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Normaliza email (trim + lowercase)
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Obtiene todas las direcciones de un usuario por email
 * Ordenadas con is_default primero
 */
export async function getAddressesByEmail(
  email: string,
): Promise<AccountAddress[]> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = createServiceRoleSupabase();

  const { data, error } = await supabase
    .from("account_addresses")
    .select("*")
    .eq("user_email", normalizedEmail)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAddressesByEmail] Error:", error);
    throw new Error(`Error al obtener direcciones: ${error.message}`);
  }

  return (data || []) as AccountAddress[];
}

/**
 * Obtiene una dirección por ID y email (verifica ownership)
 */
export async function getAddressById(
  id: string,
  email: string,
): Promise<AccountAddress | null> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = createServiceRoleSupabase();

  const { data, error } = await supabase
    .from("account_addresses")
    .select("*")
    .eq("id", id)
    .eq("user_email", normalizedEmail)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No encontrado
      return null;
    }
    console.error("[getAddressById] Error:", error);
    throw new Error(`Error al obtener dirección: ${error.message}`);
  }

  return data as AccountAddress | null;
}

/**
 * Crea una nueva dirección
 * Si is_default es true, desmarca otras direcciones del mismo usuario como default
 */
export async function createAddress(
  email: string,
  address: Omit<AccountAddress, "id" | "user_email" | "created_at" | "updated_at">,
): Promise<AccountAddress> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = createServiceRoleSupabase();

  // Si esta dirección es default, desmarcar otras
  if (address.is_default) {
    await supabase
      .from("account_addresses")
      .update({ is_default: false })
      .eq("user_email", normalizedEmail)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("account_addresses")
    .insert({
      user_email: normalizedEmail,
      full_name: address.full_name,
      phone: address.phone,
      street: address.street,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zip_code: address.zip_code,
      country: address.country || "México",
      is_default: address.is_default || false,
    })
    .select()
    .single();

  if (error) {
    console.error("[createAddress] Error:", error);
    throw new Error(`Error al crear dirección: ${error.message}`);
  }

  return data as AccountAddress;
}

/**
 * Actualiza una dirección existente
 * Si is_default es true, desmarca otras direcciones del mismo usuario como default
 */
export async function updateAddress(
  id: string,
  email: string,
  address: Partial<Omit<AccountAddress, "id" | "user_email" | "created_at" | "updated_at">>,
): Promise<AccountAddress> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = createServiceRoleSupabase();

  // Verificar ownership
  const existing = await getAddressById(id, email);
  if (!existing) {
    throw new Error("Dirección no encontrada o no pertenece a este usuario");
  }

  // Si esta dirección se marca como default, desmarcar otras
  if (address.is_default === true) {
    await supabase
      .from("account_addresses")
      .update({ is_default: false })
      .eq("user_email", normalizedEmail)
      .eq("is_default", true)
      .neq("id", id);
  }

  const { data, error } = await supabase
    .from("account_addresses")
    .update({
      full_name: address.full_name,
      phone: address.phone,
      street: address.street,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zip_code: address.zip_code,
      country: address.country,
      is_default: address.is_default,
    })
    .eq("id", id)
    .eq("user_email", normalizedEmail)
    .select()
    .single();

  if (error) {
    console.error("[updateAddress] Error:", error);
    throw new Error(`Error al actualizar dirección: ${error.message}`);
  }

  return data as AccountAddress;
}

/**
 * Elimina una dirección
 */
export async function deleteAddress(id: string, email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = createServiceRoleSupabase();

  // Verificar ownership
  const existing = await getAddressById(id, email);
  if (!existing) {
    throw new Error("Dirección no encontrada o no pertenece a este usuario");
  }

  const { error } = await supabase
    .from("account_addresses")
    .delete()
    .eq("id", id)
    .eq("user_email", normalizedEmail);

  if (error) {
    console.error("[deleteAddress] Error:", error);
    throw new Error(`Error al eliminar dirección: ${error.message}`);
  }
}

/**
 * Marca una dirección como predeterminada
 */
export async function setDefaultAddress(id: string, email: string): Promise<AccountAddress> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = createServiceRoleSupabase();

  // Verificar ownership
  const existing = await getAddressById(id, email);
  if (!existing) {
    throw new Error("Dirección no encontrada o no pertenece a este usuario");
  }

  // Desmarcar otras direcciones como default
  await supabase
    .from("account_addresses")
    .update({ is_default: false })
    .eq("user_email", normalizedEmail)
    .eq("is_default", true)
    .neq("id", id);

  // Marcar esta como default
  const { data, error } = await supabase
    .from("account_addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_email", normalizedEmail)
    .select()
    .single();

  if (error) {
    console.error("[setDefaultAddress] Error:", error);
    throw new Error(`Error al marcar dirección como predeterminada: ${error.message}`);
  }

  return data as AccountAddress;
}

