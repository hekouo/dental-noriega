/* eslint-disable react-refresh/only-export-components */
import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import Script from "next/script";
import dynamic from "next/dynamic";
const WhatsappBubble = dynamic(() => import("@/components/WhatsappBubble"), {
  ssr: false,
});
const CartBubble = dynamic(() => import("@/components/CartBubble"), {
  ssr: false,
});
const CartSticky = dynamic(() => import("@/components/cart/CartSticky"), {
  ssr: false,
});
const ToothAccountMenu = dynamic(
  () =>
    import("@/components/ToothAccountMenu").then((m) => ({
      default: m.ToothAccountMenu,
    })),
  {
    ssr: false,
  },
);
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";
import BrandMark from "@/components/BrandMark";
import {
  getOrganizationJsonLd,
  getWebsiteJsonLd,
} from "@/lib/seo/schema";
const NavbarSearch = dynamic(() => import("@/components/NavbarSearch"), {
  ssr: false,
});

// ConsultarDrawer removido - ya no se usa
const CheckoutDevGuard = dynamic(
  () => import("@/components/CheckoutDevGuard"),
  {
    ssr: false,
  },
);
const CartDevGuard = dynamic(() => import("@/components/CartDevGuard"), {
  ssr: false,
});
const SiteFooter = dynamic(() => import("@/components/SiteFooter"), {
  ssr: false,
});
const FinalThanks = dynamic(() => import("@/components/FinalThanks"), {
  ssr: false,
});
const WarmupTrigger = dynamic(() => import("@/components/dev/WarmupTrigger"), {
  ssr: false,
});
const AnalyticsGa4Bridge = dynamic(
  () => import("@/lib/analytics/ga4Bridge.client").then((m) => ({ default: m.AnalyticsGa4Bridge })),
  {
    ssr: false,
  },
);

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} | Insumos dentales en México`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "insumos dentales",
    "equipos dentales",
    "material dental",
    "instrumental odontológico",
    "productos dentales",
    "México",
  ],
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} | Insumos dentales en México`,
    description: SITE.description,
    images: [
      {
        url: `${SITE.url}${SITE.socialImage}`,
        width: 1200,
        height: 630,
        alt: SITE.name,
      },
    ],
    locale: "es_MX",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@dentalnoriega",
    title: `${SITE.name} | Insumos dentales en México`,
    description: SITE.description,
    images: [`${SITE.url}${SITE.socialImage}`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : null;

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://lh3.googleusercontent.com"
          crossOrigin=""
        />
        <link rel="preconnect" href="https://drive.google.com" crossOrigin="" />
        {supabaseOrigin ? (
          <link rel="preconnect" href={supabaseOrigin} crossOrigin="" />
        ) : null}
        {/* Google Analytics 4 */}
        {process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script
              id="gtag-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID}', {
                    send_page_view: true
                  });
                `,
              }}
            />
          </>
        )}
      </head>
      <body
        className={`${inter.className} min-h-screen bg-white text-gray-900 flex flex-col`}
      >
        {/* Structured Data: Organization + Website */}
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              getOrganizationJsonLd(),
              getWebsiteJsonLd(),
            ]),
          }}
        />
        <CheckoutDevGuard />
        <header className="border-b bg-white sticky top-0 z-40">
          <nav className="max-w-6xl mx-auto flex items-center justify-between p-4 gap-4">
            <Link href={ROUTES.home()}>
              <BrandMark />
            </Link>

            {/* Buscador desktop */}
            <div className="hidden md:block">
              <Suspense
                fallback={<div className="flex-1 max-w-md min-h-[44px]" />}
              >
                <NavbarSearch />
              </Suspense>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <Link
                href={ROUTES.tienda()}
                className="min-h-[44px] flex items-center hover:text-primary-600 transition-colors"
                aria-label="Ir a la tienda"
              >
                <span>Tienda</span>
              </Link>
              <Link
                href={ROUTES.destacados()}
                className="min-h-[44px] flex items-center hover:text-primary-600 transition-colors"
                aria-label="Ver productos destacados"
              >
                <span>Destacados</span>
              </Link>
              <Link
                href={ROUTES.buscar()}
                className="min-h-[44px] flex items-center hover:text-primary-600 transition-colors"
                aria-label="Buscar productos"
              >
                <span>Buscar</span>
              </Link>
              <Link
                href="/como-comprar"
                className="min-h-[44px] flex items-center hover:text-primary-600 transition-colors"
                aria-label="Cómo comprar"
              >
                <span>Cómo comprar</span>
              </Link>

              {/* Menú de cuenta con muela 3D */}
              <ToothAccountMenu />
            </div>
          </nav>

          {/* Buscador móvil */}
          <div className="md:hidden px-4 pb-3">
            <Suspense fallback={<div className="min-h-[44px]" />}>
              <NavbarSearch />
            </Suspense>
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-4 flex-1 w-full pb-safe">
          {children}
          <FinalThanks />
        </main>

        {/* Flotantes */}
        <CartBubble />
        <WhatsappBubble />
        <CartSticky />

        {/* Dev Guards */}
        <CheckoutDevGuard />
        <CartDevGuard />
        {process.env.NEXT_PUBLIC_DEBUG === "1" ? <WarmupTrigger /> : null}

        {/* Footer */}
        <SiteFooter />

        {/* Analytics GA4 Bridge */}
        <AnalyticsGa4Bridge />

        {/* Drawer global */}
        {/* ConsultarDrawer removido */}
      </body>
    </html>
  );
}
