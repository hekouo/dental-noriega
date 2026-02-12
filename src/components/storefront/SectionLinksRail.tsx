import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import type { SectionInfo } from "@/lib/catalog/getSections";

export type SectionLinksRailProps = {
  sections: SectionInfo[];
  title?: string;
  className?: string;
};

/**
 * Rail horizontal de enlaces a categorías (solo UI, sin backend).
 */
export default function SectionLinksRail({
  sections,
  title,
  className = "",
}: SectionLinksRailProps) {
  if (!sections?.length) return null;

  return (
    <section
      className={`relative ${className}`}
      aria-labelledby={title ? "section-links-rail-title" : undefined}
    >
      {title && (
        <h2
          id="section-links-rail-title"
          className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white mb-4"
        >
          {title}
        </h2>
      )}
      <div className="overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1 scroll-smooth snap-x snap-mandatory no-scrollbar">
        <div className="flex gap-3 w-max">
          {sections.map((section) => (
            <Link
              key={section.slug}
              href={ROUTES.section(section.slug)}
              className="flex-shrink-0 snap-start w-[180px] sm:w-[200px] rounded-xl border border-stone-200/90 dark:border-gray-700 bg-white dark:bg-gray-800/80 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus-premium tap-feedback min-h-[44px] flex items-center justify-between gap-2 group"
              aria-label={`Ver ${section.name}`}
            >
              <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 truncate">
                {section.name}
              </span>
              <ChevronRight className="w-4 h-4 text-stone-400 dark:text-gray-500 shrink-0" aria-hidden />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
