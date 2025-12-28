"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Star, Search, ShoppingCart, User } from "lucide-react";
import { ROUTES } from "@/lib/routes";

const navItems = [
  {
    label: "Inicio",
    href: ROUTES.home(),
    icon: Home,
  },
  {
    label: "Destacados",
    href: ROUTES.destacados(),
    icon: Star,
  },
  {
    label: "Buscar",
    href: ROUTES.buscar(),
    icon: Search,
  },
  {
    label: "Carrito",
    href: ROUTES.carrito(),
    icon: ShoppingCart,
  },
  {
    label: "Cuenta",
    href: "/cuenta", // Ruta real es /cuenta, no /account
    icon: User,
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/80 backdrop-blur-md border-t border-gray-200">
      <div
        className="flex items-center justify-around px-2 py-2"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== ROUTES.home() &&
              pathname?.startsWith(item.href)) ||
            (item.href === "/cuenta" && pathname?.startsWith("/cuenta"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg min-w-[60px] transition-colors ${
                isActive
                  ? "text-primary-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              aria-label={item.label}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

