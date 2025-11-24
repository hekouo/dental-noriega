// src/lib/site.ts
// Configuración centralizada del sitio

export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "DENTAL NORIEGA",
  description:
    "Insumos y equipos dentales de calidad. Servicio a clínicas, consultorios y mayoristas. Envío a todo México.",
  waPhone: process.env.NEXT_PUBLIC_WA_PHONE || "525531033715",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "dental.noriega721@gmail.com",
  address:
    process.env.NEXT_PUBLIC_ADDRESS ||
    "DEPOSITO DENTAL NORIEGA, prolongacion division del norte #2 colonia san bartolo el chico, del tlalpan, 14380 Ciudad de México, CDMX",
  mapsUrl:
    process.env.NEXT_PUBLIC_MAPS_URL ||
    "https://maps.app.goo.gl/ruP2HHjLXtoKqnB57",
  facebook:
    process.env.NEXT_PUBLIC_FACEBOOK_URL ||
    "https://www.facebook.com/dental.noriega/?locale=es_LA",
  instagram:
    process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
    "https://www.instagram.com/deposito.dental.noriega",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  socialImage: "/og-default.jpg",
};

export function waLink(prefill: string) {
  return `https://wa.me/${SITE.waPhone}?text=${encodeURIComponent(prefill)}`;
}
