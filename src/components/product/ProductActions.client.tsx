"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import QuantityInput from "@/components/cart/QuantityInput";
import { useCartStore } from "@/lib/store/cartStore";
import { useCheckoutStore, selectIsCheckoutDataComplete } from "@/lib/store/checkoutStore";
import { mxnFromCents, formatMXNFromCents } from "@/lib/utils/currency";
import { Truck, MessageCircle, ShieldCheck } from "lucide-react";
import { getWhatsAppProductUrl } from "@/lib/whatsapp/config";
import { trackAddToCart, trackWhatsappClick } from "@/lib/analytics/events";
import { launchCartConfetti, launchPaymentCoins } from "@/lib/ui/confetti";
import ProductVariantSelectors from "@/components/pdp/ProductVariantSelectors";
import { requiresVariants, getVariantConfig } from "@/lib/products/variants";
import ColorSelector from "@/components/pdp/ColorSelector";
import { hasColorOptions, formatColorVariantDetail } from "@/lib/products/colors";
import Toast from "@/components/ui/Toast";

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
  const [variantDetail, setVariantDetail] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [colorNotes, setColorNotes] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
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
  const needsVariants = requiresVariants(product.title);
  const needsColor = hasColorOptions(product.product_slug, product.title);

  function handleAddToCart() {
    if (!canBuy || busyRef.current) return;

    // Validar variantes si son requeridas
    if (needsVariants && !variantDetail) {
      const config = getVariantConfig(product.title);
      if (config) {
        let message = "Selecciona las opciones requeridas antes de agregar este producto a tu pedido.";
        if (config.variantType === "arco-niti-redondo" || config.variantType === "arco-niti-rectangular") {
          message = "Selecciona medida y arcada antes de agregar este arco a tu pedido.";
        } else if (config.variantType === "tubos-malla") {
          message = "Selecciona la pieza antes de agregar este producto a tu pedido.";
        } else if (config.variantType === "brackets-carton") {
          message = "Selecciona el sistema antes de agregar este producto a tu pedido.";
        }
        setToast({ message, type: "error" });
        setTimeout(() => setToast(null), 4000);
        return;
      }
    }

    // Validar color si es requerido
    if (needsColor && !selectedColor) {
      setToast({
        message: "Selecciona un color antes de agregar este producto a tu pedido.",
        type: "error",
      });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    // Combinar variant_detail de variantes y color
    const colorDetail = selectedColor
      ? formatColorVariantDetail(selectedColor, colorNotes)
      : null;
    const combinedVariantDetail = [variantDetail, colorDetail]
      .filter(Boolean)
      .join(" · ") || undefined;

    busyRef.current = true;
    addToCart({
      id: product.id,
      title: product.title,
      price,
      qty,
      image_url: product.image_url ?? undefined,
      selected: true,
      variant_detail: combinedVariantDetail,
    });

    setTimeout(() => (busyRef.current = false), 250);
    console.info(
      "✅ Agregado al carrito:",
      product.title,
      "x",
      qty,
      combinedVariantDetail ? `(${combinedVariantDetail})` : "",
    );

    // Analytics: add_to_cart
    trackAddToCart({
      productId: product.id,
      section: product.section,
      slug: product.product_slug,
      title: product.title,
      priceCents: product.price_cents,
      quantity: qty,
      source: "pdp",
    });

    // Confeti al agregar al carrito
    void launchCartConfetti();
  }

  function handleBuyNow() {
    if (!canBuy || busyRef.current) return;

    // Validar variantes si son requeridas
    if (needsVariants && !variantDetail) {
      const config = getVariantConfig(product.title);
      if (config) {
        let message = "Selecciona las opciones requeridas antes de comprar este producto.";
        if (config.variantType === "arco-niti-redondo" || config.variantType === "arco-niti-rectangular") {
          message = "Selecciona medida y arcada antes de comprar este arco.";
        } else if (config.variantType === "tubos-malla") {
          message = "Selecciona la pieza antes de comprar este producto.";
        } else if (config.variantType === "brackets-carton") {
          message = "Selecciona el sistema antes de comprar este producto.";
        }
        setToast({ message, type: "error" });
        setTimeout(() => setToast(null), 4000);
        return;
      }
    }

    // Validar color si es requerido
    if (needsColor && !selectedColor) {
      setToast({
        message: "Selecciona un color antes de comprar este producto.",
        type: "error",
      });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    // Combinar variant_detail de variantes y color
    const colorDetail = selectedColor
      ? formatColorVariantDetail(selectedColor, colorNotes)
      : null;
    const combinedVariantDetail = [variantDetail, colorDetail]
      .filter(Boolean)
      .join(" · ") || undefined;

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
      variant_detail: combinedVariantDetail,
    });

    // Guardar en checkoutStore directamente
    upsertSingleToCheckout({
      id: product.id,
      title: product.title,
      price,
      qty,
      image_url: product.image_url ?? undefined,
      variant_detail: combinedVariantDetail,
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

    // Monedas al comprar ahora
    void launchPaymentCoins();

    // Decidir destino según datos completos
    const checkoutState = useCheckoutStore.getState();
    const isComplete = selectIsCheckoutDataComplete(checkoutState);
    
    if (isComplete) {
      router.push("/checkout/pago");
    } else {
      router.push("/checkout/datos");
    }
  }

  // Usar helper centralizado de WhatsApp
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const url = getWhatsAppProductUrl(
      product.title,
      product.section,
      qty,
      formattedPrice,
    );
    setWhatsappUrl(url);
  }, [product.title, product.section, qty, formattedPrice]);

  return (
    <div className="space-y-4">
      {/* Toast de notificación */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={4000}
          onClose={() => setToast(null)}
        />
      )}

      {/* Badge de stock */}
      {soldOut && (
        <div className="px-3 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium">
          Agotado
        </div>
      )}

      {/* Selectores de variantes */}
      {needsVariants && (
        <ProductVariantSelectors
          productTitle={product.title}
          onSelectionChange={setVariantDetail}
        />
      )}

      {/* Selector de color */}
      {needsColor && (
        <ColorSelector
          productSlug={product.product_slug}
          productTitle={product.title}
          value={selectedColor}
          notes={colorNotes}
          onChange={(color, notes) => {
            setSelectedColor(color);
            setColorNotes(notes);
          }}
          required={true}
        />
      )}

      {/* Mostrar color seleccionado debajo del nombre */}
      {needsColor && selectedColor && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">Color:</span>{" "}
          {selectedColor}
          {colorNotes && (
            <>
              {" "}
              <span className="text-gray-500">· Preferencia: {colorNotes}</span>
            </>
          )}
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
          {/* CTA Primario: Agregar al carrito */}
          <button
            onClick={handleAddToCart}
            disabled={!canBuy}
            aria-label="Agregar al carrito"
            className="w-full bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 font-semibold"
            title="Agregar al carrito"
          >
            Agregar al carrito
          </button>

          {/* CTA Secundario: Comprar ahora */}
          <button
            onClick={handleBuyNow}
            disabled={!canBuy}
            aria-label="Comprar ahora"
            className="w-full border-2 border-primary-600 text-primary-600 bg-white px-6 py-3 rounded-md hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 font-medium"
            title="Comprar ahora"
          >
            Comprar ahora
          </button>

          {/* Acción alternativa: WhatsApp */}
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackWhatsappClick({
                  context: "pdp",
                  productId: product.id,
                  section: product.section,
                  slug: product.product_slug,
                  title: product.title,
                });
              }}
              className="w-full bg-emerald-500 text-white px-6 py-3 rounded-md hover:bg-emerald-600 transition-colors font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <MessageCircle className="w-5 h-5" />
              Consultar por WhatsApp
            </a>
          ) : (
            <button
              disabled
              className="w-full bg-gray-400 text-white px-6 py-3 rounded-md cursor-not-allowed font-medium flex items-center justify-center gap-2"
              title="WhatsApp no configurado"
            >
              <MessageCircle className="w-5 h-5" />
              Consultar por WhatsApp
            </button>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white/60 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 rounded-full bg-blue-50 p-2 text-blue-600" aria-hidden="true">
                <Truck className="h-4 w-4" />
              </div>
              <p className="text-xs sm:text-sm text-gray-700">
                Envíos a todo México. En pedidos desde $2,000 MXN en productos, el envío es gratis.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 rounded-full bg-green-50 p-2 text-green-600" aria-hidden="true">
                <MessageCircle className="h-4 w-4" />
              </div>
              <p className="text-xs sm:text-sm text-gray-700">
                Tienda familiar con atención por WhatsApp antes y después de tu compra.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 rounded-full bg-emerald-50 p-2 text-emerald-600" aria-hidden="true">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <p className="text-xs sm:text-sm text-gray-700">
                Pagos seguros con tarjeta en modo prueba para tus pruebas de compra.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
