"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import QuantityInput from "@/components/cart/QuantityInput";
import { useCartStore } from "@/lib/store/cartStore";
import { useCheckoutStore, selectIsCheckoutDataComplete } from "@/lib/store/checkoutStore";
import { mxnFromCents, formatMXNFromCents } from "@/lib/utils/currency";

type Product = {
  id: string;
  title: string;
  section: string;
  product_slug: string;
  price_cents: number;
  image_url?: string | null;
  in_stock?: boolean | null;
  is_active?: boolean | null;
};

type Props = {
  product: Product;
};

export default function ProductActions({ product }: Props) {
  const [qty, setQty] = useState(1);
  const addToCart = useCartStore((s) => s.addToCart);
  const upsertSingleToCheckout = useCheckoutStore(
    (s) => s.upsertSingleToCheckout,
  );
  const router = useRouter();
  const busyRef = useRef(false);

  // Lógica correcta: soldOut = !in_stock || !is_active
  const soldOut = !product.in_stock || !product.is_active;
  const canBuy = !soldOut;
  const price = mxnFromCents(product.price_cents);
  const formattedPrice = formatMXNFromCents(product.price_cents);

  function handleAddToCart() {
    if (!canBuy || busyRef.current) return;

    busyRef.current = true;
    addToCart({
      id: product.id,
      title: product.title,
      price,
      qty,
      image_url: product.image_url ?? undefined,
      selected: true,
    });

    setTimeout(() => (busyRef.current = false), 250);
    console.info("✅ Agregado al carrito:", product.title, "x", qty);

    // Analítica: add_to_cart
    if (typeof window !== "undefined" && window.dataLayer) {
      window.dataLayer.push({
        event: "add_to_cart",
        ecommerce: {
          currency: "MXN",
          value: price * qty,
          items: [
            {
              item_id: product.id,
              item_name: product.title,
              price,
              quantity: qty,
            },
          ],
        },
      });
    }
  }

  function handleBuyNow() {
    if (!canBuy || busyRef.current) return;

    busyRef.current = true;
    
    // Agregar al carrito usando getState() para asegurar ejecución antes del push
    const { addToCart: addToCartFn } = useCartStore.getState();
    addToCartFn({
      id: product.id,
      title: product.title,
      price,
      qty,
      image_url: product.image_url ?? undefined,
      selected: true,
    });

    // Guardar en checkoutStore directamente
    upsertSingleToCheckout({
      id: product.id,
      title: product.title,
      price,
      qty,
      image_url: product.image_url ?? undefined,
    });

    // Analítica: buy_now
    if (typeof window !== "undefined" && window.dataLayer) {
      window.dataLayer.push({
        event: "buy_now",
        ecommerce: {
          currency: "MXN",
          value: price * qty,
          items: [
            {
              item_id: product.id,
              item_name: product.title,
              price,
              quantity: qty,
            },
          ],
        },
      });
    }

    // Decidir destino según datos completos
    const checkoutState = useCheckoutStore.getState();
    const isComplete = selectIsCheckoutDataComplete(checkoutState);
    
    if (isComplete) {
      router.push("/checkout/pago");
    } else {
      router.push("/checkout/datos");
    }
  }

  const whatsappMessage = `Hola, me interesa: ${product.title} (${product.section}). Cantidad: ${qty}. Precio: ${formattedPrice}`;
  const whatsappUrl = `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_PHONE}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="space-y-4">
      {/* Badge de stock */}
      {soldOut && (
        <div className="px-3 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium">
          Agotado
        </div>
      )}

      {/* Controles de cantidad y botones */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <label htmlFor="qty" className="text-sm font-medium text-gray-700">
            Cantidad:
          </label>
          <QuantityInput
            value={qty}
            onChange={setQty}
            min={1}
            max={999}
            disabled={!canBuy}
            ariaLabel="Cantidad de producto"
          />
        </div>

        <div className="space-y-2">
          <button
            onClick={handleAddToCart}
            disabled={!canBuy}
            aria-label="Agregar al carrito"
            className="w-full bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            title="Agregar al carrito"
          >
            Agregar al carrito
          </button>

          <button
            onClick={handleBuyNow}
            disabled={!canBuy}
            aria-label="Comprar ahora"
            className="w-full bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
            title="Comprar ahora"
          >
            Comprar ahora
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-green-500 text-white px-6 py-3 rounded-md hover:bg-green-600 transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
            </svg>
            Consultar por WhatsApp
          </a>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2 text-sm text-gray-600">
          <p className="text-center">Envíos a todo México.</p>
          <p className="text-center">Asesoría por WhatsApp antes y después de tu compra.</p>
          <p className="text-center">Pagos seguros con tarjeta en modo prueba.</p>
        </div>
      </div>
    </div>
  );
}
