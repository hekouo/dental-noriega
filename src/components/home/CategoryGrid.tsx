import "server-only";
import Link from "next/link";
import { getSections } from "@/lib/catalog/getSections";
import { ROUTES } from "@/lib/routes";
import GlassCard from "@/components/common/GlassCard";
import { cn } from "@/lib/utils";
import {
  Package,
  Stethoscope,
  Scissors,
  Smile,
  Droplet,
  Syringe,
  Shield,
  Sparkles,
  Grid3x3,
  ChevronRight,
} from "lucide-react";

function getSectionIcon(slug: string) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    consumibles: Package,
    equipos: Grid3x3,
    "instrumental-clinico": Stethoscope,
    "instrumental-ortodoncia": Scissors,
    ortodoncia: Smile,
    "ortodoncia-brackets-y-tubos": Sparkles,
    "ortodoncia-arcos-y-resortes": Scissors,
    "ortodoncia-accesorios-y-retenedores": Shield,
    profilaxis: Droplet,
    anestesia: Syringe,
    "consumibles-y-profilaxis": Package,
  };
  for (const [key, Icon] of Object.entries(iconMap)) {
    if (slug.toLowerCase().includes(key.toLowerCase())) return Icon;
  }
  return Package;
}

const FALLBACK_LARGE = [
  { slug: "destacados", name: "Destacados" },
  { slug: "catalogo", name: "Catálogo" },
];
const FALLBACK_SMALL = [
  { slug: "tienda", name: "Ver tienda" },
  { slug: "tienda", name: "Productos" },
  { slug: "tienda", name: "Explorar" },
  { slug: "tienda", name: "Más" },
];

export default async function CategoryGrid() {
  const sections = await getSections(10);
  const hasSections = sections.length > 0;
  const large = hasSections ? sections.slice(0, 2) : FALLBACK_LARGE;
  const small = hasSections ? sections.slice(2, 8) : FALLBACK_SMALL;

  const hrefFor = (slug: string) =>
    hasSections ? ROUTES.section(slug) : ROUTES.tienda();

  return (
    <section
      className="max-w-6xl mx-auto px-4 py-10 sm:py-14"
      aria-labelledby="category-grid-heading"
    >
      <h2
        id="category-grid-heading"
        className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2"
      >
        Explora por categorías
      </h2>
      <p className="text-muted-foreground mb-8 sm:mb-10 text-sm sm:text-base">
        Navega por nuestras categorías y encuentra lo que necesitas.
      </p>

      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5",
          "auto-rows-fr"
        )}
      >
        {/* 2 categorías grandes */}
        {large.map((section) => {
          const Icon = getSectionIcon(section.slug);
          return (
            <Link
              key={`${section.slug}-${section.name}-lg`}
              href={hrefFor(section.slug)}
              className={cn(
                "sm:col-span-2 min-h-[140px] sm:min-h-[160px]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-2xl"
              )}
              aria-label={`Ver productos de ${section.name}`}
            >
              <GlassCard
                className={cn(
                  "h-full p-5 sm:p-6 flex flex-row sm:flex-col gap-4",
                  "border border-gray-200/80 dark:border-gray-700/60",
                  "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                )}
              >
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0"
                  aria-hidden
                >
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base sm:text-lg">
                    {section.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mt-0.5 flex items-center gap-1">
                    Ver productos
                    <ChevronRight className="w-4 h-4 flex-shrink-0" aria-hidden />
                  </p>
                </div>
              </GlassCard>
            </Link>
          );
        })}

        {/* 4–6 categorías pequeñas */}
        {small.map((section, i) => {
          const Icon = getSectionIcon(section.slug);
          return (
            <Link
              key={`${section.slug}-${section.name}-sm-${i}`}
              href={hrefFor(section.slug)}
              className={cn(
                "min-h-[100px]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-2xl"
              )}
              aria-label={`Ver productos de ${section.name}`}
            >
              <GlassCard
                className={cn(
                  "h-full p-4 sm:p-5 flex flex-col gap-3",
                  "border border-gray-200/80 dark:border-gray-700/60",
                  "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                )}
              >
                <div
                  className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0"
                  aria-hidden
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base line-clamp-2">
                    {section.name}
                  </h3>
                  <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1">
                    Ver
                    <ChevronRight className="w-3 h-3 flex-shrink-0" aria-hidden />
                  </p>
                </div>
              </GlassCard>
            </Link>
          );
        })}
      </div>

      {/* Ver todas: link a /tienda */}
      <div className="mt-6 text-center">
        <Link
          href={ROUTES.tienda()}
          className={cn(
            "inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium text-sm sm:text-base",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg px-3 py-1.5"
          )}
          aria-label="Ver toda la tienda"
        >
          Ver toda la tienda
          <ChevronRight className="w-4 h-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
