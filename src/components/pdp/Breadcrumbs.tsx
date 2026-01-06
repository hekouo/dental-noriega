import Link from "next/link";
import { ROUTES } from "@/lib/routes";

type Props = {
  sectionSlug: string;
  sectionName?: string;
  productTitle: string;
};

export default function Breadcrumbs({
  sectionSlug,
  sectionName,
  productTitle,
}: Props) {
  const sectionLabel =
    sectionName ||
    sectionSlug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
        <li className="flex items-center">
          <Link
            href={ROUTES.tienda()}
            className="hover:text-foreground hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded"
          >
            Tienda
          </Link>
        </li>
        <li className="flex items-center" aria-hidden="true">
          <span className="mx-1">/</span>
        </li>
        <li className="flex items-center">
          <Link
            href={ROUTES.section(sectionSlug)}
            className="hover:text-foreground hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded"
          >
            {sectionLabel}
          </Link>
        </li>
        <li className="flex items-center" aria-hidden="true">
          <span className="mx-1">/</span>
        </li>
        <li className="flex items-center">
          <span className="font-medium text-foreground">{productTitle}</span>
        </li>
      </ol>
    </nav>
  );
}

