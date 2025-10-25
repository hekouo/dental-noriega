/* eslint-disable react-refresh/only-export-components */
import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import WhatsappBubble from "@/components/WhatsappBubble";
import CartBubble from "@/components/CartBubble";
import { ToothAccountMenu } from "@/components/ToothAccountMenu";
import { ROUTES } from "@/lib/routes";
import { Search } from "lucide-react";
import BrandMark from "@/components/BrandMark";

const ConsultarDrawer = dynamic(() => import("@/components/ConsultarDrawer"), {
  ssr: false,
});
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
  title: {
    default: "DENTAL NORIEGA",
    template: "%s · DENTAL NORIEGA",
  },
  description: "Catálogo y compras de DENTAL NORIEGA",
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
            <form
              action="/buscar"
              method="GET"
              className="hidden md:flex items-center gap-2 flex-1 max-w-md"
            >
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="search"
                  name="q"
                  placeholder="Buscar..."
                  autoComplete="off"
                  className="border rounded-lg pl-9 pr-3 py-2 text-sm w-full min-h-[44px]"
                />
              </div>
              <button
                className="btn btn-primary px-3 py-2 rounded-lg text-sm"
                type="submit"
              >
                <span>Buscar</span>
              </button>
            </form>

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
            <form action="/buscar" method="GET" className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="search"
                  name="q"
                  placeholder="Buscar productos..."
                  autoComplete="off"
                  className="border rounded-lg pl-9 pr-3 py-2 text-sm w-full min-h-[44px]"
                />
              </div>
              <button
                className="btn btn-primary px-3 py-2 rounded-lg text-sm"
                type="submit"
              >
                <span>Buscar</span>
              </button>
            </form>
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-4 flex-1 w-full pb-safe">
          {children}
          <FinalThanks />
        </main>

        {/* Flotantes */}
        <CartBubble />
        <WhatsappBubble />

        {/* Dev Guards */}
        <CheckoutDevGuard />
        <CartDevGuard />
        {process.env.NEXT_PUBLIC_DEBUG === "1" ? <WarmupTrigger /> : null}

        {/* Footer */}
        <SiteFooter />

        {/* Drawer global */}
        <ConsultarDrawer />
      </body>
    </html>
  );
}
