import { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/public";

/**
 * Genera el sitemap dinámico para SEO
 * Incluye URLs estáticas y dinámicas de productos y secciones del catálogo
 */
export const revalidate = 86400; // Revalidar cada 24 horas

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE.url;

  // URLs estáticas
  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}${ROUTES.home()}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}${ROUTES.tienda()}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}${ROUTES.destacados()}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}${ROUTES.catalogIndex()}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}${ROUTES.buscar()}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/como-comprar`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/aviso-de-privacidad`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contrato-de-compra`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // URLs dinámicas de productos y secciones
  const dynamicUrls: MetadataRoute.Sitemap = [];

  try {
    const sb = createClient();
    
    // Obtener todos los productos activos de la vista canónica
    // La vista api_catalog_with_images tiene: id, section, product_slug, title, price_cents, image_url, in_stock, is_active
    const { data: products, error } = await sb
      .from("api_catalog_with_images")
      .select("section, product_slug")
      .eq("is_active", true)
      .not("section", "is", null)
      .not("product_slug", "is", null);

    if (error) {
      console.error("[sitemap] Error fetching products:", error);
      // Si hay error, retornar solo URLs estáticas
      return staticUrls;
    }

    if (products && products.length > 0) {
      // Obtener secciones únicas
      const uniqueSections = new Set<string>();
      
      // Procesar productos y secciones
      products.forEach((product) => {
        const section = String(product.section || "").trim();
        const slug = String(product.product_slug || "").trim();
        
        if (section && slug) {
          uniqueSections.add(section);
          
          // URL del producto (PDP)
          // La vista no incluye updated_at/created_at, usamos fecha actual como fallback
          dynamicUrls.push({
            url: `${baseUrl}${ROUTES.product(section, slug)}`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
          });
        }
      });

      // Agregar URLs de secciones
      uniqueSections.forEach((section) => {
        dynamicUrls.push({
          url: `${baseUrl}${ROUTES.section(section)}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        });
      });
    }
  } catch (error) {
    console.error("[sitemap] Error generating dynamic URLs:", error);
    // Si hay error, retornar solo URLs estáticas
    return staticUrls;
  }

  // Combinar URLs estáticas y dinámicas
  return [...staticUrls, ...dynamicUrls];
}

