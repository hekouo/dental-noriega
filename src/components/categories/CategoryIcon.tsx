/**
 * Componente de icono SVG para categorías
 * Iconos ligeros inline sin dependencias externas
 */

type Props = {
  sectionSlug: string;
  className?: string;
  size?: number;
};

/**
 * Mapeo de slugs de sección a iconos SVG
 */
function getCategoryIcon(sectionSlug: string, iconSize: number = 20): React.ReactNode {
  const strokeWidth = 2;
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  // Mapeo de categorías a iconos
  const iconMap: Record<string, React.ReactNode> = {
    "consumibles-y-profilaxis": (
      <svg {...commonProps} width={iconSize} height={iconSize}>
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    "equipos": (
      <svg {...commonProps} width={iconSize} height={iconSize}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 3v18" />
      </svg>
    ),
    "instrumental-clinico": (
      <svg {...commonProps} width={iconSize} height={iconSize}>
        <path d="M12 2v20M2 12h20" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    "instrumental-ortodoncia": (
      <svg {...commonProps} width={iconSize} height={iconSize}>
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    "ortodoncia-brackets-y-tubos": (
      <svg {...commonProps} width={iconSize} height={iconSize}>
        <rect x="3" y="8" width="18" height="8" rx="1" />
        <path d="M8 8V4M16 8V4" />
        <circle cx="9" cy="12" r="1" />
        <circle cx="15" cy="12" r="1" />
      </svg>
    ),
    "ortodoncia-arcos-y-resortes": (
      <svg {...commonProps} width={iconSize} height={iconSize}>
        <path d="M3 12c0-1.657 4.03-3 9-3s9 1.343 9 3M3 12c0 1.657 4.03 3 9 3s9-1.343 9-3M3 12h18" />
        <path d="M12 3v18" />
      </svg>
    ),
    "ortodoncia-accesorios-y-retenedores": (
      <svg {...commonProps} width={iconSize} height={iconSize}>
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
        <path d="M12 2v20" />
      </svg>
    ),
  };

  return iconMap[sectionSlug] || (
    // Icono genérico (caja/paquete) como fallback
    <svg {...commonProps} width={iconSize} height={iconSize}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

/**
 * Componente de icono de categoría
 * Renderiza un SVG inline ligero según el slug de la sección
 */
export default function CategoryIcon({ sectionSlug, className = "", size = 20 }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center text-gray-600 group-hover:text-primary-600 transition-colors ${className}`}
      aria-hidden="true"
    >
      {getCategoryIcon(sectionSlug, size)}
    </span>
  );
}

