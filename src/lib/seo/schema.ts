// src/lib/seo/schema.ts
// Helpers para generar structured data (Schema.org JSON-LD)

import { SITE } from "@/lib/site";

/**
 * Genera el JSON-LD para Organization
 */
export function getOrganizationJsonLd() {
  const sameAs: string[] = [];
  if (SITE.facebook) sameAs.push(SITE.facebook);
  if (SITE.instagram) sameAs.push(SITE.instagram);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organization`,
    name: "Depósito Dental Noriega",
    url: SITE.url,
    logo: `${SITE.url}/favicon.ico`,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };
}

/**
 * Genera el JSON-LD para WebSite
 */
export function getWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    url: SITE.url,
    name: "Depósito Dental Noriega",
    publisher: {
      "@id": `${SITE.url}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE.url}/buscar?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Genera el JSON-LD para BreadcrumbList
 */
export function getBreadcrumbsJsonLd(
  crumbs: Array<{ name: string; url?: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      ...(crumb.url ? { item: crumb.url } : {}),
    })),
  };
}

/**
 * Parámetros para getProductJsonLd
 */
export type ProductJsonLdParams = {
  id: string;
  name: string;
  description?: string | null;
  sectionName?: string;
  url: string;
  image_url?: string | null;
  priceCents?: number | null;
  currency?: string;
  inStock?: boolean | null;
};

/**
 * Genera el JSON-LD para Product
 */
export function getProductJsonLd(params: ProductJsonLdParams) {
  const {
    name,
    description,
    sectionName,
    url,
    image_url,
    priceCents,
    currency = "MXN",
    inStock,
  } = params;

  const price =
    priceCents != null ? (priceCents / 100).toFixed(2) : undefined;

  const descriptionText =
    description?.trim() ||
    `${name} disponible en Depósito Dental Noriega. Insumos dentales de calidad para consultorios y clínicas.`;

  const product: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name,
    description: descriptionText,
    brand: {
      "@type": "Organization",
      name: "Depósito Dental Noriega",
    },
  };

  if (image_url) {
    product.image = image_url;
  }

  if (sectionName) {
    product.category = sectionName;
  }

  if (price !== undefined) {
    const availability =
      inStock === false
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock";

    product.offers = {
      "@type": "Offer",
      priceCurrency: currency,
      price,
      availability,
      url,
    };
  }

  return product;
}

/**
 * Genera el JSON-LD para FAQPage basado en el contenido de /como-comprar
 */
export function getComoComprarFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "¿Cómo puedo hacer mi primer pedido?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Puedes explorar nuestros productos navegando por la tienda, productos destacados o las secciones del catálogo. Agrega productos al carrito y luego completa tus datos en el checkout. Ingresa tu información de contacto, dirección de envío y método de pago. Revisa el resumen y confirma tu compra. Recibirás un correo con los detalles del pedido.",
        },
      },
      {
        "@type": "Question",
        name: "¿Tienen envío a todo México?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sí, realizamos envíos a todo México con opciones de envío estándar y express. La guía de rastreo se comparte por WhatsApp o correo electrónico una vez que tu pedido sea despachado.",
        },
      },
      {
        "@type": "Question",
        name: "¿Desde cuánto es el envío gratis?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "El envío es gratis en pedidos desde $2,000 MXN en productos (subtotal sin incluir envío). El umbral se calcula sobre el subtotal de productos antes de aplicar cualquier descuento.",
        },
      },
      {
        "@type": "Question",
        name: "¿Cómo funcionan los puntos de lealtad?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Cada compra te genera puntos que puedes usar para obtener descuentos en futuros pedidos. Por cada $1 MXN pagado, recibes 1 punto. Al acumular al menos 1,000 puntos, puedes usarlos para obtener un 10% de descuento en un pedido. Al usar el descuento, se gastan exactamente 1,000 puntos, pero sigues ganando puntos por ese pedido (sobre el total pagado con descuento). Puedes consultar tus puntos acumulados en tu cuenta o en la sección de mis pedidos.",
        },
      },
      {
        "@type": "Question",
        name: "¿Puedo contactar por WhatsApp para ayuda?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sí, estamos disponibles para ayudarte antes, durante y después de tu compra. Puedes contactarnos usando el botón flotante de WhatsApp visible en todas las páginas (excepto checkout y cuenta) o el botón en cada producto para consultas específicas. Te ayudamos a elegir productos, resolver dudas sobre códigos, medidas, compatibilidad o cualquier pregunta relacionada con tu pedido.",
        },
      },
    ],
  };
}

