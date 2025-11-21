/* eslint-disable react-refresh/only-export-components */
import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Inter } from "next/font/google";
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
import BrandMark from "@/components/BrandMark";
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

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://dental-noriega.vercel.app",
  ),
  title: {
    default: "Depósito Dental Noriega | Insumos dentales en México",
    template: "%s | Depósito Dental Noriega",
  },
  description:
    "Insumos y equipos dentales de calidad. Servicio a clínicas, consultorios y mayoristas. Envío a todo México.",
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
    url: "/",
    siteName: process.env.NEXT_PUBLIC_SITE_NAME ?? "Depósito Dental Noriega",
    title: "Depósito Dental Noriega | Insumos dentales en México",
    description:
      "Insumos y equipos dentales de calidad. Servicio a clínicas, consultorios y mayoristas. Envío a todo México.",
    images: [
      {
        url: "/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "Depósito Dental Noriega",
      },
    ],
    locale: "es_MX",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@dentalnoriega",
    title: "Depósito Dental Noriega | Insumos dentales en México",
    description:
      "Insumos y equipos dentales de calidad. Servicio a clínicas, consultorios y mayoristas.",
    images: ["/og-default.jpg"],
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
      </head>
      <body
        className={`${inter.className} min-h-screen bg-white text-gray-900 flex flex-col`}
      >
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

        {/* Drawer global */}
        {/* ConsultarDrawer removido */}
      </body>
    </html>
  );
}
