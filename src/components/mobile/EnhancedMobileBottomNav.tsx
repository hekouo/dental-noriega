"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, Search, ShoppingCart, User, Sparkles } from "lucide-react";
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
      label: "Tienda",
      href: ROUTES.tienda(),
      icon: Store,
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
      href: "/cuenta",
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

export default function EnhancedMobileBottomNav() {
  const pathname = usePathname();
  const cartTotalQty = useCartTotalQty();
  const prefersReducedMotion = usePrefersReducedMotion();
  const prevQtyRef = useRef(cartTotalQty);
  const [badgePulse, setBadgePulse] = useState(false);

  // Detectar incremento en cartTotalQty y activar animación
  useEffect(() => {
    const prevQty = prevQtyRef.current;
    const newQty = cartTotalQty;

    // Si incrementó y no hay reduced motion, activar pulse
    if (newQty > prevQty && newQty > 0 && !prefersReducedMotion) {
      setBadgePulse(true);
      const timer = setTimeout(() => {
        setBadgePulse(false);
      }, 300); // Duración de la animación
      return () => clearTimeout(timer);
    }

    prevQtyRef.current = newQty;
  }, [cartTotalQty, prefersReducedMotion]);

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
      <div
        className="flex items-center justify-around px-1 py-2"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== ROUTES.home() &&
              pathname?.startsWith(item.href)) ||
            (item.href === "/cuenta" && pathname?.startsWith("/cuenta")) ||
            (item.href === ROUTES.quiz() && pathname === "/quiz");

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
              className={`flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-lg transition-colors min-w-[44px] min-h-[44px] relative ${
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
                    className={`absolute -top-1.5 -right-2 min-w-[20px] h-[20px] px-1 rounded-full text-[11px] leading-[20px] font-bold text-white bg-primary-600 flex items-center justify-center shadow-sm ${
                      badgePulse && !prefersReducedMotion
                        ? "animate-[bounce_0.3s_ease-out] scale-110"
                        : "scale-100"
                    }`}
                    aria-hidden="true"
                  >
                    {badgeText}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium truncate max-w-[45px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
