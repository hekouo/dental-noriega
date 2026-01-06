import Link from "next/link";
import { Clock, Package, ReceiptText } from "lucide-react";

export function TrustBanners() {
  const banners = [
    {
      title: "Compra en 3 minutos",
      subtitle: "Guía rápida paso a paso.",
      href: "/como-comprar",
      icon: Clock,
      iconColor: "text-blue-500 dark:text-blue-400",
    },
    {
      title: "Envíos a todo México",
      subtitle: "Tiempos y cobertura.",
      href: "/envios",
      icon: Package,
      iconColor: "text-orange-500 dark:text-orange-400",
    },
    {
      title: "Facturación disponible",
      subtitle: "Cómo solicitar tu factura.",
      href: "/facturacion",
      icon: ReceiptText,
      iconColor: "text-green-500 dark:text-green-400",
    },
  ];

  return (
    <div className="w-full">
      {/* Desktop: Grid 3 cols */}
      <div className="hidden md:grid md:grid-cols-3 gap-4 lg:gap-6">
        {banners.map((banner) => {
          const Icon = banner.icon;
          return (
            <Link
              key={banner.href}
              href={banner.href}
              className="group bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 ${banner.iconColor}`}>
                  <Icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {banner.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{banner.subtitle}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Mobile: Horizontal scroll */}
      <div className="md:hidden overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-4 px-4">
        <div className="flex gap-4 w-max">
          {banners.map((banner) => {
            const Icon = banner.icon;
            return (
              <Link
                key={banner.href}
                href={banner.href}
                className="group snap-start flex-shrink-0 w-[280px] bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 ${banner.iconColor}`}>
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {banner.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{banner.subtitle}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

