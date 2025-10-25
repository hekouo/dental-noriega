"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { useCartStore } from "@/lib/store/cartStore";
import { formatPrice } from "@/lib/utils/catalog";
import { pointsFor } from "@/lib/utils/points";
import ImageWithFallback from "@/components/ImageWithFallback";
import QtyStepper from "@/components/ui/QtyStepper";
import PointsBadge from "@/components/PointsBadge";
import RecentlyViewed from "@/components/RecentlyViewed";
import type { ProductLite } from "@/lib/data/catalog-index.server";

type Props = {
  product: ProductLite;
  section: string;
  slug: string;
};

export default function ProductDetailPage({ product, section, slug }: Props) {
  const [qty, setQty] = useState(1);
  const busyRef = useRef(false);
  const router = useRouter();
  const addToCart = useCartStore((s) => s.addToCart);
  const points = pointsFor(product.price);

  const handleAddToCart = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    
    try {
      addToCart({
        id: product.id,
        title: product.title,
        price: product.price,
        qty,
        imageUrl: product.image,
        selected: true
      });
      
      // Toast de confirmación y micro-animación
      console.info(`✅ Agregado al carrito: ${product.title} x${qty}`);
      
      // Micro-animación del carrito (bump)
      const cartBubble = document.querySelector('[data-cart-bubble]');
      if (cartBubble) {
        cartBubble.classList.add('animate-bounce');
        setTimeout(() => cartBubble.classList.remove('animate-bounce'), 1000);
      }
    } finally {
      busyRef.current = false;
    }
  };

  const handleBuyNow = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    
    try {
      // Agregar al carrito
      addToCart({
        id: product.id,
        title: product.title,
        price: product.price,
        qty,
        imageUrl: product.image,
        selected: true
      });
      
      // Navegar a checkout
      router.push("/checkout");
    } finally {
      busyRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link
          href={ROUTES.section(section)}
          className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
        >
          <span>← Volver a {section.replace(/-/g, ' ')}</span>
        </Link>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 p-6 md:p-8">
            {/* Imagen */}
            <div className="relative w-full aspect-square bg-gray-100 rounded-xl overflow-hidden">
              <ImageWithFallback
                src={product.image || "/placeholder.png"}
                alt={product.title}
                width={400}
                height={400}
                sizes="(min-width: 768px) 50vw, 100vw"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Detalles del Producto */}
            <div className="flex flex-col justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {product.title}
                </h1>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-extrabold text-primary-600">
                    {formatPrice(product.price)}
                  </span>
                </div>
                <PointsBadge points={points} />
              </div>

              <div className="mt-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad
                  </label>
                  <QtyStepper
                    value={qty}
                    onChange={setQty}
                    className="w-32"
                  />
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={handleAddToCart}
                    disabled={busyRef.current}
                    className="btn btn-primary flex-1"
                  >
                    {busyRef.current ? "Agregando..." : "Agregar al Carrito"}
                  </button>
                  <button
                    onClick={handleBuyNow}
                    disabled={busyRef.current}
                    className="btn btn-secondary flex-1"
                  >
                    {busyRef.current ? "Procesando..." : "Comprar Ahora"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Información Adicional */}
          <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Especificaciones
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>SKU: {product.id || 'N/A'}</li>
              <li>Categoría: {section}</li>
            </ul>
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-600">
                <strong>Nota:</strong> Los precios pueden variar sin previo
                aviso. Consulta disponibilidad y tiempos de entrega.
              </p>
            </div>
          </div>
        </div>

        {/* Vistos Recientemente */}
        <RecentlyViewed />
      </div>
    </div>
  );
}
