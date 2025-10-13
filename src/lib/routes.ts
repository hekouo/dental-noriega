// src/lib/routes.ts
// Fuente única de rutas del catálogo

export const ROUTES = {
  home: () => "/",
  catalogIndex: () => "/catalogo",
  section: (sectionSlug: string) => `/catalogo/${sectionSlug}`,
  product: (sectionSlug: string, productSlug: string) => `/catalogo/${sectionSlug}/${productSlug}`,
  destacados: () => "/destacados",
  cuenta: () => "/cuenta",
  carrito: () => "/carrito",
};

