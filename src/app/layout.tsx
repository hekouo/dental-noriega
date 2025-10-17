import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import WhatsappBubble from "@/components/WhatsappBubble";
import CartProvider from "@/components/CartProvider";
import CartBubble from "@/components/CartBubble";
import { ROUTES } from "@/lib/routes";
import { Search } from "lucide-react";

// Dynamic imports para componentes no críticos
const SiteFooter = dynamic(() => import("@/components/SiteFooter"), {
  ssr: false,
});
const FinalThanks = dynamic(() => import("@/components/FinalThanks"), {
  ssr: false,
});

// Font optimization
const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "DENTAL NORIEGA",
    template: "%s · DENTAL NORIEGA",
  },
  description: "Catálogo y compras de DENTAL NORIEGA",
  other: {
    viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://lh3.googleusercontent.com" />
        <link rel="preconnect" href="https://drive.google.com" />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-white text-gray-900 flex flex-col`}
      >
        <CartProvider>
          <header className="border-b bg-white sticky top-0 z-40">
            <nav className="max-w-6xl mx-auto flex items-center justify-between p-4 gap-4">
              <Link
                href={ROUTES.home()}
                className="text-xl font-bold tracking-wide"
              >
                <span>DENTAL NORIEGA</span>
              </Link>

              {/* Buscador */}
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

          {/* Burbujas flotantes */}
          <CartBubble />
          <WhatsappBubble />

          {/* Footer del sitio - Cargado dinámicamente */}
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
