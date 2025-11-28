"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAdminSection,
  updateAdminSection,
} from "@/lib/supabase/sections.admin.server";

export async function createSectionAction(formData: FormData): Promise<void> {
  const slug = formData.get("slug")?.toString() || "";
  const name = formData.get("name")?.toString() || "";

  // Validación básica
  if (!slug || !name) {
    redirect("/admin/secciones?error=campos_requeridos");
    return;
  }

  try {
    await createAdminSection({ slug, name });

    // Revalidar rutas
    revalidatePath("/admin/secciones");
    revalidatePath("/admin/productos");
    revalidatePath("/catalogo", "layout");

    redirect("/admin/secciones");
  } catch (err) {
    console.error("[createSectionAction] Error:", err);
    const errorMsg = err instanceof Error ? err.message : "error_desconocido";
    redirect(`/admin/secciones?error=${encodeURIComponent(errorMsg)}`);
  }
}

export async function updateSectionAction(
  sectionId: string,
  formData: FormData,
): Promise<void> {
  const slug = formData.get("slug")?.toString() || "";
  const name = formData.get("name")?.toString() || "";

  // Validación básica
  if (!slug || !name) {
    redirect(`/admin/secciones/${sectionId}/editar?error=campos_requeridos`);
    return;
  }

  try {
    await updateAdminSection(sectionId, { slug, name });

    // Revalidar rutas
    revalidatePath("/admin/secciones");
    revalidatePath("/admin/productos");
    revalidatePath("/catalogo", "layout");

    redirect("/admin/secciones");
  } catch (err) {
    console.error("[updateSectionAction] Error:", err);
    const errorMsg = err instanceof Error ? err.message : "error_desconocido";
    redirect(
      `/admin/secciones/${sectionId}/editar?error=${encodeURIComponent(errorMsg)}`,
    );
  }
}

