/* eslint-disable react-refresh/only-export-components */
import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import WhatsappBubble from "@/components/WhatsappBubble";
import CartBubble from "@/components/CartBubble";
import CartSticky from "@/components/cart/CartSticky";
import { ToothAccountMenu } from "@/components/ToothAccountMenu";
import { ROUTES } from "@/lib/routes";
import BrandMark from "@/components/BrandMark";
import NavbarSearch from "@/components/NavbarSearch";

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
    default: "Depósito Dental Noriega",
    template: "%s | Depósito Dental Noriega",
  },
  description:
    "Catálogo dental con compra rápida, destacados y consulta por WhatsApp.",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "Depósito Dental Noriega",
  },
  twitter: {
    card: "summary",
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
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://lh3.googleusercontent.com"
          crossOrigin=""
        />
        <link rel="preconnect" href="https://drive.google.com" crossOrigin="" />
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
                href={ROUTES.catalogIndex()}
                className="min-h-[44px] flex items-center"
              >
                <span className="hover:text-primary-600">Catálogo</span>
              </Link>
              <Link
                href={ROUTES.destacados()}
                className="min-h-[44px] flex items-center"
              >
                <span className="hover:text-primary-600">Destacados</span>
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
