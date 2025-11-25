"use client";

import Link from "next/link";
import clsx from "clsx";

type AccountSectionHeaderProps = {
  user?: {
    email?: string | null;
    fullName?: string | null;
  } | null;
  currentSection?: "perfil" | "pedidos" | "direcciones" | "pagos";
};

const navItems = [
  { key: "perfil", label: "Perfil", href: "/cuenta/perfil" },
  { key: "pedidos", label: "Pedidos", href: "/cuenta/pedidos" },
  { key: "direcciones", label: "Direcciones", href: "/cuenta/direcciones" },
];

export default function AccountSectionHeader({
  user,
  currentSection,
}: AccountSectionHeaderProps) {
  const fullName = user?.fullName?.trim() || null;
  const email = user?.email?.trim() || null;
  const initial =
    fullName?.[0]?.toUpperCase() ||
    email?.[0]?.toUpperCase() ||
    "D";

  const secondaryLine = email || "Sin correo asociado";

  return (
    <div className="mb-8 rounded-2xl border border-slate-200/70 bg-white px-4 py-4 md:px-6 md:py-5 shadow-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <Link
        href="/cuenta"
        className="flex items-center"
        aria-label="Volver al panel de cuenta"
      >
        <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-semibold mr-3 hover:scale-105 transition-transform">
          {initial}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-900">
            Mi cuenta
          </span>
          <span className="text-xs text-slate-500 truncate max-w-[220px]">
            {secondaryLine}
          </span>
        </div>
      </Link>

      <nav className="flex flex-wrap gap-2 justify-start md:justify-end">
        {navItems.map((item) => {
          const isActive = currentSection === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={clsx(
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
        <span className="inline-flex items-center rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-medium text-slate-400 cursor-default">
          Métodos de pago (próximamente)
        </span>
      </nav>
    </div>
  );
}

