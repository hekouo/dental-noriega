"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Star, Search, ShoppingCart, User, Sparkles } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { useCartTotalQty } from "@/lib/store/cartSelectors";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

function getNavItems() {
  const baseItems = [
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

  // Agregar Quiz si está habilitado
  const isQuizEnabled = process.env.NEXT_PUBLIC_ENABLE_QUIZ === "true";
  if (isQuizEnabled) {
    // Insertar después de "Buscar" y antes de "Carrito"
    baseItems.splice(3, 0, {
      label: "Recom.",
      href: ROUTES.quiz(),
      icon: Sparkles,
    });
  }

  return baseItems;
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const cartTotalQty = useCartTotalQty();
  const prefersReducedMotion = usePrefersReducedMotion();
  const prevQtyRef = useRef(cartTotalQty);
  const [badgePulse, setBadgePulse] = useState(false);

  // Detectar incremento en cartTotalQty y activar animación pop
  useEffect(() => {
    const prevQty = prevQtyRef.current;
    const newQty = cartTotalQty;

    // Si incrementó y no hay reduced motion, activar pulse
    if (newQty > prevQty && newQty > 0 && !prefersReducedMotion) {
      setBadgePulse(true);
      const timer = setTimeout(() => {
        setBadgePulse(false);
      }, 220); // Duración de la animación
      return () => clearTimeout(timer);
    }

    prevQtyRef.current = newQty;
  }, [cartTotalQty, prefersReducedMotion]);

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/80 backdrop-blur-md border-t border-gray-200">
      <div
        className="flex items-center justify-around px-1 py-2"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== ROUTES.home() &&
              pathname?.startsWith(item.href)) ||
            (item.href === "/cuenta" && pathname?.startsWith("/cuenta"));

          // Badge solo para Carrito
          const isCart = item.href === ROUTES.carrito();
          const showBadge = isCart && cartTotalQty > 0;
          const badgeText = cartTotalQty > 99 ? "99+" : cartTotalQty.toString();
          const ariaLabel = isCart
            ? `Carrito, ${cartTotalQty} ${cartTotalQty === 1 ? "artículo" : "artículos"}`
            : item.href === ROUTES.quiz()
              ? "Recomendar productos (quiz)"
              : item.label;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 rounded-lg transition-colors min-w-[44px] min-h-[44px] relative ${
                isActive
                  ? "text-primary-600 bg-primary-50"
                  : "text-gray-600 hover:text-primary-600 hover:bg-gray-50"
              }`}
              aria-label={ariaLabel}
            >
              <span className="relative inline-flex items-center justify-center">
                <Icon className="w-5 h-5" aria-hidden="true" />
                {showBadge && (
                  <span
                    className={`absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] leading-[18px] font-semibold text-white bg-primary-600 text-center flex items-center justify-center transition-transform duration-200 ${
                      badgePulse && !prefersReducedMotion ? "scale-110" : "scale-100"
                    }`}
                    aria-hidden="true"
                  >
                    {badgeText}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium truncate max-w-[50px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

