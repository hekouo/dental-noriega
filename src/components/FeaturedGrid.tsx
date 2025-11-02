"use client";

import FeaturedCard from "@/components/FeaturedCard";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";

type Props = { items: FeaturedItem[]; title?: string };

export default function FeaturedGrid({
  items,
  title = "Productos Destacados",
}: Props) {
  if (!items?.length) {
    return (
      <div className="text-center text-sm opacity-70 py-8">
        Aún no hay productos destacados
      </div>
    );
  }

  return (
    <section className="py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">{title}</h2>
          <p className="text-gray-600">
            Añade directo al carrito sin entrar al detalle
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((item) => (
            <FeaturedCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
