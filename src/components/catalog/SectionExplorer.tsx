import "server-only";
import Link from "next/link";
import { getSections } from "@/lib/catalog/getSections";
import { ROUTES } from "@/lib/routes";
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

/**
 * Mapeo de slugs a iconos Lucide
 * Fallback: Package genérico
 */
function getSectionIcon(slug: string) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    "consumibles": Package,
    "equipos": Grid3x3,
    "instrumental-clinico": Stethoscope,
    "instrumental-ortodoncia": Scissors,
    "ortodoncia": Smile,
    "ortodoncia-brackets-y-tubos": Sparkles,
    "ortodoncia-arcos-y-resortes": Scissors,
    "ortodoncia-accesorios-y-retenedores": Shield,
    "profilaxis": Droplet,
    "anestesia": Syringe,
    "consumibles-y-profilaxis": Package,
  };

  // Buscar por coincidencia parcial (slug contiene la clave)
  for (const [key, Icon] of Object.entries(iconMap)) {
    if (slug.toLowerCase().includes(key.toLowerCase())) {
      return Icon;
    }
  }

  return Package; // Fallback genérico
}

type SectionExplorerProps = {
  title?: string;
  subtitle?: string;
  limit?: number;
  showViewAll?: boolean;
};

/**
 * Sección "Explorar por categorías" premium
 * - Mobile: carrusel horizontal con snap
 * - Desktop: grid 3-4 columnas
 * - Dark mode compatible
 * - Accesible
 */
export default async function SectionExplorer({
  title = "Explorar por categorías",
  subtitle = "Navega por nuestras categorías de productos",
  limit = 12,
  showViewAll = true,
}: SectionExplorerProps) {
  const sections = await getSections(limit);

  if (sections.length === 0) {
    return null;
  }

  // Si hay más de limit secciones y showViewAll, agregar tarjeta "Ver todas"
  const displaySections = sections.slice(0, limit);
  const hasMore = sections.length > limit;

  return (
    <section
      className="mb-12"
      aria-labelledby="section-explorer-heading"
    >
      {/* Heading */}
      <div className="mb-6">
        <h2
          id="section-explorer-heading"
          className="text-2xl font-semibold text-foreground mb-1"
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Mobile: carrusel horizontal con snap */}
      <div className="lg:hidden">
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory no-scrollbar">
          {displaySections.map((section) => {
            const Icon = getSectionIcon(section.slug);
            return (
              <Link
                key={section.slug}
                href={ROUTES.section(section.slug)}
                className="flex-shrink-0 w-[calc(50%-0.5rem)] snap-start bg-card border border-border rounded-xl p-4 hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 group"
                aria-label={`Ver productos de ${section.name}`}
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 transition-colors">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
                      {section.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                      Ver productos
                      <ChevronRight className="w-3 h-3" aria-hidden="true" />
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
          {hasMore && showViewAll && (
            <Link
              href={ROUTES.tienda()}
              className="flex-shrink-0 w-[calc(50%-0.5rem)] snap-start bg-card border border-border rounded-xl p-4 hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 group"
              aria-label="Ver todas las categorías"
            >
              <div className="flex flex-col items-center justify-center text-center gap-3 h-full min-h-[140px]">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors">
                  <Grid3x3 className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    Ver todas
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Explorar más
                  </p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Desktop: grid 4 columnas */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-4">
        {displaySections.map((section) => {
          const Icon = getSectionIcon(section.slug);
          return (
            <Link
              key={section.slug}
              href={ROUTES.section(section.slug)}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 group"
              aria-label={`Ver productos de ${section.name}`}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 transition-colors">
                  <Icon className="w-7 h-7" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors mb-2">
                    {section.name}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    Ver productos
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
        {hasMore && showViewAll && (
          <Link
            href={ROUTES.tienda()}
            className="bg-card border border-border rounded-xl p-6 hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 group"
            aria-label="Ver todas las categorías"
          >
            <div className="flex flex-col items-center justify-center text-center gap-4 h-full min-h-[180px]">
              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors">
                <Grid3x3 className="w-7 h-7" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors mb-2">
                  Ver todas
                </h3>
                <p className="text-sm text-muted-foreground">
                  Explorar más categorías
                </p>
              </div>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}

