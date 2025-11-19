import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Tipo para resumen de puntos de lealtad
 */
export type LoyaltySummary = {
  email: string;
  pointsBalance: number;
  lifetimeEarned: number;
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
 * Obtiene el resumen de puntos de un usuario por email
 * Si no existe, devuelve valores en cero sin crear registro en DB
 */
export async function getLoyaltySummaryByEmail(
  email: string,
): Promise<LoyaltySummary | null> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = createServiceRoleSupabase();

  const { data, error } = await supabase
    .from("account_points")
    .select("user_email, points_balance, lifetime_earned")
    .eq("user_email", normalizedEmail)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No encontrado - devolver valores en cero sin crear registro
      return {
        email: normalizedEmail,
        pointsBalance: 0,
        lifetimeEarned: 0,
      };
    }
    if (process.env.NODE_ENV === "development") {
      console.error("[getLoyaltySummaryByEmail] Error:", error);
    }
    throw new Error(`Error al obtener puntos: ${error.message}`);
  }

  return {
    email: data.user_email,
    pointsBalance: data.points_balance || 0,
    lifetimeEarned: data.lifetime_earned || 0,
  };
}

/**
 * Añade puntos a un usuario
 * Si no existe el registro, lo crea
 */
export async function addLoyaltyPoints(
  email: string,
  points: number,
): Promise<LoyaltySummary> {
  if (points <= 0) {
    throw new Error("Los puntos a añadir deben ser positivos");
  }

  const normalizedEmail = normalizeEmail(email);
  const supabase = createServiceRoleSupabase();

  // Obtener registro existente
  const { data: existing } = await supabase
    .from("account_points")
    .select("points_balance, lifetime_earned")
    .eq("user_email", normalizedEmail)
    .single();

  if (existing) {
    // Actualizar existente
    const { data: updated, error: updateError } = await supabase
      .from("account_points")
      .update({
        points_balance: (existing.points_balance || 0) + points,
        lifetime_earned: (existing.lifetime_earned || 0) + points,
      })
      .eq("user_email", normalizedEmail)
      .select()
      .single();

    if (updateError || !updated) {
      if (process.env.NODE_ENV === "development") {
        console.error("[addLoyaltyPoints] Error al actualizar:", updateError);
      }
      throw new Error(`Error al añadir puntos: ${updateError?.message || "Error desconocido"}`);
    }

    return {
      email: normalizedEmail,
      pointsBalance: updated.points_balance || 0,
      lifetimeEarned: updated.lifetime_earned || 0,
    };
  } else {
    // Crear nuevo
    const { data: created, error: createError } = await supabase
      .from("account_points")
      .insert({
        user_email: normalizedEmail,
        points_balance: points,
        lifetime_earned: points,
      })
      .select()
      .single();

    if (createError || !created) {
      if (process.env.NODE_ENV === "development") {
        console.error("[addLoyaltyPoints] Error al crear:", createError);
      }
      throw new Error(`Error al crear puntos: ${createError?.message || "Error desconocido"}`);
    }

    return {
      email: normalizedEmail,
      pointsBalance: created.points_balance || 0,
      lifetimeEarned: created.lifetime_earned || 0,
    };
  }
}

/**
 * Gasta puntos de un usuario
 * Verifica que tenga suficientes puntos antes de gastar
 */
export async function spendLoyaltyPoints(
  email: string,
  pointsToSpend: number,
): Promise<LoyaltySummary> {
  if (pointsToSpend <= 0) {
    throw new Error("Los puntos a gastar deben ser positivos");
  }

  const normalizedEmail = normalizeEmail(email);
  const supabase = createServiceRoleSupabase();

  // Obtener balance actual
  const { data: current, error: fetchError } = await supabase
    .from("account_points")
    .select("points_balance, lifetime_earned")
    .eq("user_email", normalizedEmail)
    .single();

  if (fetchError || !current) {
    throw new Error("No se encontró registro de puntos para este usuario");
  }

  const currentBalance = current.points_balance || 0;

  if (currentBalance < pointsToSpend) {
    throw new Error(
      `Puntos insuficientes. Tienes ${currentBalance} puntos, necesitas ${pointsToSpend}`,
    );
  }

  // Restar puntos (solo del balance, no del lifetime_earned)
  const { data: updated, error: updateError } = await supabase
    .from("account_points")
    .update({
      points_balance: currentBalance - pointsToSpend,
    })
    .eq("user_email", normalizedEmail)
    .select()
    .single();

  if (updateError || !updated) {
    if (process.env.NODE_ENV === "development") {
      console.error("[spendLoyaltyPoints] Error:", updateError);
    }
    throw new Error(`Error al gastar puntos: ${updateError?.message || "Error desconocido"}`);
  }

  return {
    email: normalizedEmail,
    pointsBalance: updated.points_balance || 0,
    lifetimeEarned: updated.lifetime_earned || 0,
  };
}

