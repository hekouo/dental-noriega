// src/lib/config.ts
// Flags de configuración para Fase 1 vs Fase 2

export const isAuthOn = process.env.NEXT_PUBLIC_ENABLE_AUTH === 'true';
export const isCheckoutOn = process.env.NEXT_PUBLIC_ENABLE_CHECKOUT === 'true';

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'DENTAL NORIEGA',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002',
  whatsappPhone: process.env.NEXT_PUBLIC_WA_PHONE || '525531033715',
  contact: {
    email: 'dental.noriega721@gmail.com',
    phone: '+52 55 3103 3715',
    address: 'DEPOSITO DENTAL NORIEGA, prolongacion division del norte #2 colonia san bartolo el chico, del tlalpan, 14380 Ciudad de México, CDMX',
    mapsUrl: 'https://maps.app.goo.gl/ruP2HHjLXtoKqnB57',
  },
  social: {
    facebook: 'https://www.facebook.com/dental.noriega/?locale=es_LA',
    instagram: 'https://www.instagram.com/deposito.dental.noriega',
  }
};

